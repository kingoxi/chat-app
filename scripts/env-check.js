/* eslint-disable @typescript-eslint/no-require-imports */
const { loadRuntimeEnv } = require("./load-env");

loadRuntimeEnv(process.cwd());

console.log("URL=", process.env.NEXT_PUBLIC_SUPABASE_URL || "YOK");
console.log(
  "KEY=",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.slice(0, 16)
    : "YOK",
);
console.log(
  "GIPHY=",
  process.env.NEXT_PUBLIC_GIPHY_API_KEY
    ? process.env.NEXT_PUBLIC_GIPHY_API_KEY.slice(0, 8)
    : "YOK",
);
console.log("NODE_ENV=", process.env.NODE_ENV || "YOK");
console.log("PORT=", process.env.PORT || "YOK");
