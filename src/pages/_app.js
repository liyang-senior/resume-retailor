import React from "react";
import "@/styles/globals.css";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err) {
    return {
      hasError: true,
      message: err && err.message ? String(err.message) : "Something went wrong.",
    };
  }

  componentDidCatch(err, info) {
    console.error("App render error:", err, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100dvh",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
            background: "#0f172a",
            color: "#f1f5f9",
            boxSizing: "border-box",
          }}
        >
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: "0 0 12px 0" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0 0 20px 0", lineHeight: 1.5, maxWidth: 560 }}>
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: "" })}
            style={{
              padding: "10px 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "#fff",
              background: "#3b82f6",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App({ Component, pageProps }) {
  return (
    <AppErrorBoundary>
      <Component {...pageProps} />
    </AppErrorBoundary>
  );
}
