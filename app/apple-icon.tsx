import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, rgb(178, 77, 116) 0%, rgb(94, 39, 67) 100%)",
          color: "white",
          fontSize: 72,
          fontWeight: 700,
          borderRadius: 42,
          letterSpacing: "-0.08em",
        }}
      >
        H
      </div>
    ),
    size,
  );
}
