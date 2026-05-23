import { ImageResponse } from "next/og";

export const alt = "Cheesy Toast Vault — your personal encrypted password book";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        backgroundColor: "#fffbeb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      {/* Decorative inset border */}
      <div
        style={{
          position: "absolute",
          top: 28,
          left: 28,
          right: 28,
          bottom: 28,
          border: "1.5px solid #fde68a",
          borderRadius: 20,
        }}
      />

      {/* Centred content column */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        {/* App icon */}
        <div
          style={{
            width: 120,
            height: 120,
            background: "linear-gradient(145deg, #ffffff, #fef3c7)",
            borderRadius: 30,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 72,
            lineHeight: 1,
          }}
        >
          🧀
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            color: "#292524",
            letterSpacing: "-1.5px",
            fontFamily: "serif",
            lineHeight: 1,
          }}
        >
          Cheesy Toast Vault
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 26,
            color: "#78716c",
            fontFamily: "sans-serif",
            letterSpacing: "-0.2px",
          }}
        >
          Your personal encrypted password book
        </div>
      </div>
    </div>,
    { ...size },
  );
}
