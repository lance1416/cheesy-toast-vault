import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        background: "linear-gradient(145deg, #ffffff, #fef3c7)",
        borderRadius: 7,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        lineHeight: 1,
      }}
    >
      🧀
    </div>,
    { ...size },
  );
}
