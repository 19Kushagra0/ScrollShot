import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["http://*/*", "https://*/*"]
}

async function captureFullPage() {
  const scrollHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const originalX = window.scrollX;
  const originalY = window.scrollY;

  // Save original style and hide scrollbars
  const originalOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "hidden";

  // Hide fixed and sticky elements to prevent them from repeating in every slice
  const hiddenElements: { el: HTMLElement; origVisibility: string; origTransition: string }[] = [];
  
  // We do a quick pass to find fixed/sticky elements. We only hide them AFTER the first capture
  // so the header appears at the top of the final image.
  const allElements = document.querySelectorAll('*');
  allElements.forEach((el) => {
    if (el instanceof HTMLElement) {
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') {
        const rect = el.getBoundingClientRect();
        
        // Skip elements that are not visible or have zero dimensions
        if (rect.width === 0 || rect.height === 0 || style.display === 'none' || style.visibility === 'hidden') {
          return;
        }

        // Only hide elements that are likely headers, footers, or small floating widgets.
        // Avoid hiding large content panels, sidebars, or page wrappers.
        const isHeaderFooter = rect.height < 180 && rect.width > viewportWidth * 0.4;
        const isFloatingWidget = rect.width < 250 && rect.height < 250;

        if (isHeaderFooter || isFloatingWidget) {
          hiddenElements.push({
            el,
            origVisibility: el.style.visibility,
            origTransition: el.style.transition
          });
        }
      }
    }
  });

  // Force scroll to top first
  window.scrollTo(0, 0);
  await new Promise((resolve) => setTimeout(resolve, 300));

  const captures: Array<{ y: number; dataUrl: string }> = [];
  let currentY = 0;

  const captureWithRetry = async (yOffset: number, maxRetries = 3) => {
    let retries = 0;
    while (retries < maxRetries) {
      const response = await new Promise<any>((resolve) => {
        chrome.runtime.sendMessage({ action: "CAPTURE_VISIBLE_TAB" }, resolve);
      });
      if (response && response.success && response.dataUrl) {
        return response.dataUrl;
      }
      console.warn("Capture failed, retrying...", response?.error);
      retries++;
      await new Promise((resolve) => setTimeout(resolve, 800)); // wait longer on fail
    }
    throw new Error("Failed to capture after multiple retries");
  };

  while (currentY < scrollHeight) {
    window.scrollTo(0, currentY);
    await new Promise((resolve) => setTimeout(resolve, 400)); // Increased delay to avoid rate limit

    try {
      const dataUrl = await captureWithRetry(currentY);
      captures.push({
        y: currentY,
        dataUrl
      });
    } catch (e) {
      console.error(e);
      // Even if one fails completely, we shouldn't just skip without knowing.
      // But we will continue to try and capture the rest.
    }

    // Hide fixed elements after the first screenshot so they don't repeat
    if (currentY === 0) {
      hiddenElements.forEach(item => {
        item.el.style.transition = 'none';
        item.el.style.visibility = 'hidden';
      });
    }

    if (currentY + viewportHeight >= scrollHeight) {
      // If we've reached the bottom, check if there was a gap
      const bottomY = scrollHeight - viewportHeight;
      if (bottomY > currentY) {
        window.scrollTo(0, bottomY);
        await new Promise((resolve) => setTimeout(resolve, 400));
        
        try {
          const finalDataUrl = await captureWithRetry(bottomY);
          captures.push({
            y: bottomY,
            dataUrl: finalDataUrl
          });
        } catch (e) {
          console.error(e);
        }
      }
      break;
    }

    currentY += viewportHeight;
  }

  // Restore fixed elements
  hiddenElements.forEach(item => {
    item.el.style.visibility = item.origVisibility;
    // slightly delay restoring transition so it doesn't animate back in
    setTimeout(() => {
      item.el.style.transition = item.origTransition;
    }, 100);
  });

  // Restore scroll and overflow style
  document.documentElement.style.overflow = originalOverflow;
  window.scrollTo(originalX, originalY);

  // Store data in chrome.storage.local
  await chrome.storage.local.set({
    screenshotData: {
      captures,
      scrollHeight,
      viewportHeight,
      viewportWidth,
      devicePixelRatio: window.devicePixelRatio || 1
    }
  });

  // Open result tab
  await chrome.runtime.sendMessage({ action: "OPEN_RESULT_TAB" });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_SCROLL_AND_CAPTURE") {
    captureFullPage()
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((err) => {
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep port open
  }
});
