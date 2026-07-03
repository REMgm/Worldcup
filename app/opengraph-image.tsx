import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Worldcup Signalroom — winning the knockouts";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 72,
          background:
            "radial-gradient(120% 90% at 50% -10%, #21382B 0%, #101E17 45%, #060D09 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            color: "#C8F542",
            fontSize: 26,
            letterSpacing: 12,
            marginBottom: 18,
          }}
        >
          KNOCKOUT STAGE · LIVE
        </div>
        <div
          style={{
            color: "#F5F2E8",
            fontSize: 110,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -3,
          }}
        >
          WORLDCUP
        </div>
        <div
          style={{
            color: "#C8F542",
            fontSize: 110,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -3,
          }}
        >
          SIGNALROOM
        </div>
        <div style={{ color: "#B9B7AC", fontSize: 28, marginTop: 24 }}>
          Winning the knockouts. Signals, not tips.
        </div>
      </div>
    ),
    { ...size },
  );
}
