export {}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_CAPTURE") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].id) {
        sendResponse({ success: false, error: "No active tab found" });
        return;
      }
      const activeTabId = tabs[0].id;
      // Send a message to content script to start capture
      chrome.tabs.sendMessage(activeTabId, { action: "START_SCROLL_AND_CAPTURE" }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ 
            success: false, 
            error: "Failed to connect to page. Make sure it is a web page (not a chrome:// page) and reload it." 
          });
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // Keep message port open for async response
  }

  if (message.action === "CAPTURE_VISIBLE_TAB") {
    const windowId = sender.tab?.windowId || null;
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true; // Keep message port open
  }

  if (message.action === "OPEN_RESULT_TAB") {
    chrome.tabs.create({ url: chrome.runtime.getURL("tabs/result.html") }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

