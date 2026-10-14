import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require2 = createRequire(import.meta.url);
const distServerPath = path.resolve(process.cwd(), "dist", "server.cjs");
const isTsx = process.execArgv.some((a) => a.includes("tsx")) || Boolean(process.env.TSX_LOADED);
const hasBuiltBundle = fs.existsSync(distServerPath);

if (hasBuiltBundle && (!isTsx || process.env.NODE_ENV === "production")) {
  require2(distServerPath);
} else {
  await import("./server-app.ts").then((s) => {
    const e = "default";
    return s[e] && typeof s[e] === "object" && "__esModule" in s[e] ? s[e] : s;
  });
}
