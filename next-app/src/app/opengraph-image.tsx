import { ImageResponse } from "next/og";

export const alt = "PIA — Analyze documents using AI privately";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#0a0a0b",
          color: "#ededef",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#2dd4bf",
            letterSpacing: 6,
            fontWeight: 600,
          }}
        >
          PIA
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 58,
            marginTop: 24,
            lineHeight: 1.15,
            maxWidth: 980,
            fontWeight: 600,
          }}
        >
          Analyze documents using AI privately
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 26,
            marginTop: 28,
            color: "#c8c8cc",
            maxWidth: 860,
            lineHeight: 1.4,
          }}
        >
          Summarize, review, and extract in your browser. Documents stay on your
          device.
        </div>
      </div>
    ),
    { ...size },
  );
}
