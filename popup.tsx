import { useEffect, useState, useRef } from "react"

function IndexPopup() {
  const [status, setStatus] = useState("Capturing page...")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const hasStarted = useRef(false)

  const startCapture = async () => {
    if (hasStarted.current) return
    hasStarted.current = true

    setStatus("Capturing page...")
    setError("")
    setLoading(true)

    chrome.runtime.sendMessage({ action: "START_CAPTURE" }, (response) => {
      setLoading(false)
      if (chrome.runtime.lastError) {
        setError("Could not connect to page. Please refresh the tab and try again.")
        setStatus("")
        return
      }
      if (response && response.success) {
        setStatus("Done.")
      } else {
        setError(response?.error || "Something went wrong.")
        setStatus("")
      }
    })
  }

  useEffect(() => {
    startCapture()
  }, [])

  return (
    <div style={{
      width: 300,
      backgroundColor: "#ffffff",
      color: "#111111",
      fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
      border: "1px solid #111111",
      boxSizing: "border-box"
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px",
        borderBottom: "1px solid #111111",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            ScrollShot
          </span>
        </div>
        <span style={{ fontSize: 11, color: "#888888", letterSpacing: "0.03em" }}>
          {loading ? "WORKING" : error ? "ERROR" : "DONE"}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 18px" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Progress bar */}
            <div style={{ height: 1, backgroundColor: "#e5e5e5", position: "relative", overflow: "hidden" }}>
              <div style={{
                position: "absolute",
                top: 0,
                left: 0,
                height: "100%",
                width: "40%",
                backgroundColor: "#111111",
                animation: "slide 1.4s ease-in-out infinite"
              }} />
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#444444", lineHeight: "1.5" }}>
              {status}<br />
              <span style={{ fontSize: 11, color: "#888888" }}>Do not scroll or switch tabs.</span>
            </p>
          </div>
        )}

        {!loading && !error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span style={{ fontSize: 13, color: "#111111" }}>Capture complete. Check new tab.</span>
          </div>
        )}

        {error && (
          <div style={{ borderLeft: "2px solid #111111", paddingLeft: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: "#111111", lineHeight: "1.6" }}>{error}</p>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        @keyframes slide {
          0% { left: -50%; width: 40%; }
          50% { left: 60%; width: 40%; }
          100% { left: 110%; width: 40%; }
        }
      `}</style>
    </div>
  )
}

export default IndexPopup
