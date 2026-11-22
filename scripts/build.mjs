import fs from "fs";
import path from "path";
import esbuild from "esbuild";

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const pubDir = path.join(rootDir, "public");
const distDir = path.join(rootDir, "dist");

const isWatch = process.argv.includes("--watch");

function copyPublicToDist() {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
  fs.cpSync(pubDir, distDir, { recursive: true, force: true });
}

const entryPoints = {
  b: path.join(srcDir, "background/index.js"),
  c: path.join(srcDir, "entries/content.jsx"),
  ca: path.join(srcDir, "entries/contentAllFrames.js"),
  o: path.join(srcDir, "entries/offscreen.js"),
  p: path.join(srcDir, "entries/popup.jsx"),
  s: path.join(srcDir, "entries/settings.jsx"),
};

const stubUnusedIconLoadersPlugin = {
  name: "stub-unused-blueprint-icon-loaders",
  setup(build) {
    build.onLoad({ filter: /@blueprintjs[\\/]icons[\\/]lib[\\/]esm[\\/]paths-loaders[\\/].*\.js$/ }, () => ({
      contents: "export async function allPathsLoader() { return []; }\nexport async function splitPathsBySizeLoader() { return []; }\n",
      loader: "js",
    }));
  },
};

const buildOptions = {
  entryPoints,
  outdir: distDir,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["chrome110"],
  jsx: "automatic",
  minify: !isWatch,
  sourcemap: isWatch ? "inline" : false,
  logLevel: "info",
  plugins: [stubUnusedIconLoadersPlugin],
  define: {
    "process.env.NODE_ENV": JSON.stringify(isWatch ? "development" : "production"),
  },
};

copyPublicToDist();

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(buildOptions);
  console.log("Build complete -> dist/");
}
