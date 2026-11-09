import { mkdir, copyFile } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("dist", { recursive: true });
await Promise.all(["index.html", "styles.css"].map(name => copyFile("web/" + name, "dist/" + name)));
await build({
  entryPoints: ["src/app.mjs"],
  outfile: "dist/app.js",
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
});
