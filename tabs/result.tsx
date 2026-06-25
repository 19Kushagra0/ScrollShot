import { useEffect, useState } from "react"

interface Capture {
  y: number
  dataUrl: string
}

interface ScreenshotData {
  captures: Capture[]
  scrollHeight: number
  viewportHeight: number
  viewportWidth: number
  devicePixelRatio: number
}

export default function ResultTab() {
  const [data, setData] = useState<ScreenshotData | null>(null)
  const [stitchedImage, setStitchedImage] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [loadingStatus, setLoadingStatus] = useState("Processing slices...")
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    chrome.storage.local.get(["screenshotData"], (result) => {
      if (chrome.runtime.lastError) {
        setError("Failed to retrieve data: " + chrome.runtime.lastError.message)
        setLoading(false)
        return
      }
      if (result && result.screenshotData) {
        setData(result.screenshotData)
      } else {
        setError("No screenshot data found. Try capturing a page again.")
        setLoading(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!data) return

    const stitch = async () => {
      try {
        setLoadingStatus("Loading slices...")

        const loadImage = (src: string): Promise<HTMLImageElement> =>
          new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => resolve(img)
            img.onerror = () => reject(new Error("Failed to load image slice"))
            img.src = src
          })

        const loadedImages = await Promise.all(data.captures.map((cap) => loadImage(cap.dataUrl)))

        setLoadingStatus("Stitching...")

        const canvas = document.createElement("canvas")
        const dpr = data.devicePixelRatio || 1
        canvas.width = data.viewportWidth * dpr
        canvas.height = Math.max(data.scrollHeight, data.viewportHeight) * dpr

        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Could not get canvas context")

        for (let i = 0; i < data.captures.length; i++) {
          const capture = data.captures[i]
          const img = loadedImages[i]
          ctx.drawImage(
            img,
            0, 0, img.width, img.height,
            0, capture.y * dpr,
            data.viewportWidth * dpr,
            data.viewportHeight * dpr
          )
        }

        setLoadingStatus("Rendering...")
        const finalUrl = canvas.toDataURL("image/png")
        setStitchedImage(finalUrl)
        setLoading(false)
      } catch (err: any) {
        setError(err.message || "An error occurred during stitching.")
        setLoading(false)
      }
    }

    stitch()
  }, [data])

  const handleDownload = () => {
    if (!stitchedImage) return
    const a = document.createElement("a")
    a.href = stitchedImage
    a.download = `scrollshot_${Date.now()}.png`
    a.click()
  }

  const handleCopy = async () => {
    if (!stitchedImage) return
    try {
      const res = await fetch(stitchedImage)
      const blob = await res.blob()
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert("Failed to copy. Right-click the image and choose 'Copy image'.")
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f5f5f5",
      color: "#111111",
      fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
      display: "flex",
      flexDirection: "column"
    }}>
      {/* Navbar */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 32px",
        height: 52,
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #111111",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            ScrollShot
          </span>
          {data && !loading && (
            <span style={{
              marginLeft: 8,
              fontSize: 11,
              color: "#888888",
              borderLeft: "1px solid #dddddd",
              paddingLeft: 12,
              letterSpacing: "0.02em"
            }}>
              {data.viewportWidth} × {Math.max(data.scrollHeight, data.viewportHeight)} px — {data.captures.length} slices
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {!loading && stitchedImage && (
            <>
              <button
                id="copy-btn"
                onClick={handleCopy}
                style={{
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  backgroundColor: "#ffffff",
                  color: "#111111",
                  border: "1px solid #111111",
                  borderRadius: 0,
                  fontFamily: "inherit",
                  transition: "background 0.15s"
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f0f0f0" }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#ffffff" }}>
                {copied ? "Copied ✓" : "Copy"}
              </button>

              <button
                id="download-btn"
                onClick={handleDownload}
                style={{
                  padding: "7px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  backgroundColor: "#111111",
                  color: "#ffffff",
                  border: "1px solid #111111",
                  borderRadius: 0,
                  fontFamily: "inherit",
                  transition: "background 0.15s"
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#333333" }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#111111" }}>
                Download PNG
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main */}
      <main style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        alignItems: loading || error ? "center" : "flex-start",
        padding: loading || error ? 40 : "40px 40px",
        overflow: "auto"
      }}>
        {loading && (
          <div style={{ textAlign: "center" }}>
            {/* Thin animated line */}
            <div style={{ width: 200, height: 1, backgroundColor: "#dddddd", margin: "0 auto 24px", position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute",
                top: 0, left: 0,
                height: "100%",
                width: "40%",
                backgroundColor: "#111111",
                animation: "slide 1.4s ease-in-out infinite"
              }} />
            </div>
            <p style={{ margin: 0, fontSize: 12, color: "#888888", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {loadingStatus}
            </p>
          </div>
        )}

        {error && (
          <div style={{
            maxWidth: 360,
            padding: "24px 28px",
            border: "1px solid #111111",
            backgroundColor: "#ffffff"
          }}>
            <p style={{ margin: "0 0 4px 0", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#888888" }}>Error</p>
            <p style={{ margin: 0, fontSize: 13, color: "#111111", lineHeight: 1.6 }}>{error}</p>
          </div>
        )}

        {!loading && stitchedImage && (
          <div style={{ width: "100%" }}>
            {/* Thin top rule */}
            <div style={{ borderTop: "1px solid #cccccc", marginBottom: 28 }} />
            <div
              id="image-container"
              style={{
                display: "block",
                margin: "0 auto",
                maxWidth: 900,
                border: "1px solid #cccccc",
                backgroundColor: "#ffffff",
                boxShadow: "4px 4px 0px #111111"
              }}>
              <img
                src={stitchedImage}
                alt="Full page screenshot"
                style={{
                  display: "block",
                  width: "100%",
                  height: "auto"
                }}
              />
            </div>
            <div style={{ borderTop: "1px solid #cccccc", marginTop: 28 }} />
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes slide {
          0%   { left: -50%; width: 40%; }
          50%  { left: 60%;  width: 40%; }
          100% { left: 110%; width: 40%; }
        }
        button:focus { outline: 2px solid #111111; outline-offset: 2px; }
      `}</style>
    </div>
  )
}
