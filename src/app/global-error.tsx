"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fafaf9",
          fontFamily: "sans-serif",
          padding: "1rem",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "24rem" }}>
          <p
            style={{
              fontSize: "0.65rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#a8a29e",
              marginBottom: "0.75rem",
            }}
          >
            Unexpected error
          </p>
          <h1
            style={{
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "#1c1917",
              marginBottom: "0.5rem",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#78716c", marginBottom: "1.5rem" }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={unstable_retry}
            style={{
              padding: "0.625rem 1.5rem",
              borderRadius: "0.5rem",
              background: "#1c1917",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p
              style={{
                marginTop: "1.25rem",
                fontSize: "0.7rem",
                color: "#d6d3d1",
                fontFamily: "monospace",
              }}
            >
              ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
