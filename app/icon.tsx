import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 208,
          fontWeight: 700,
          borderRadius: 112,
          letterSpacing: "-0.08em",
        }}
      >
        H
      </div>
    ),
    size,
  );
}
