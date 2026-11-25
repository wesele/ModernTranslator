import fs from "fs";
import path from "path";
import esbuild from "esbuild";

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const pubDir = path.join(rootDir, "public");

const isWatch = process.argv.includes("--watch");
const targetArg = process.argv.find((arg) => arg.startsWith("--target="));
const requestedTarget = targetArg ? targetArg.slice("--target=".length).toLowerCase() : "chrome";

const VALID_TARGETS = new Set(["chrome", "firefox", "all"]);
if (!VALID_TARGETS.has(requestedTarget)) {
  console.error(`Unsupported --target="${requestedTarget}". Use chrome, firefox, or all.`);
  process.exit(1);
}

const FIREFOX_GECKO_SETTINGS = {
  id: "modern-translator@wesele.github.io",
  strict_min_version: "140.0",
  data_collection_permissions: {
    required: ["none"],
  },
};

const FIREFOX_GECKO_ANDROID_SETTINGS = {
  strict_min_version: "142.0",
};

function createFirefoxManifest(chromeManifest) {
  const manifest = structuredClone(chromeManifest);
  const bgScript = manifest.background?.service_worker || "b.js";
  manifest.background = {
    scripts: [bgScript],
  };
  manifest.permissions = (manifest.permissions || []).filter((perm) => perm !== "offscreen");
  delete manifest.minimum_chrome_version;
  manifest.browser_specific_settings = {
    gecko: FIREFOX_GECKO_SETTINGS,
    gecko_android: FIREFOX_GECKO_ANDROID_SETTINGS,
  };
  return manifest;
}

function prepareOutputDir(target) {
  const outDir = path.join(rootDir, target === "firefox" ? "dist-firefox" : "dist");
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.cpSync(pubDir, outDir, {
    recursive: true,
    force: true,
    filter: (src) => {
      if (target === "firefox" && path.basename(src) === "offscreen.html") {
        return false;
      }
      return true;
    },
  });

  if (target === "firefox") {
    const manifestPath = path.join(outDir, "manifest.json");
    const chromeManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const firefoxManifest = createFirefoxManifest(chromeManifest);
    fs.writeFileSync(manifestPath, JSON.stringify(firefoxManifest, null, 3) + "\n", "utf8");
  }

  return outDir;
}

const stubUnusedIconLoadersPlugin = {
  name: "stub-unused-blueprint-icon-loaders",
  setup(build) {
    build.onLoad(
      { filter: /@blueprintjs[\\/]icons[\\/]lib[\\/]esm[\\/]paths-loaders[\\/].*\.js$/ },
      () => ({
        contents:
          "export async function allPathsLoader() { return []; }\nexport async function splitPathsBySizeLoader() { return []; }\n",
        loader: "js",
      })
    );
  },
};

const patchLodashRootForCspPlugin = {
  name: "patch-lodash-root-for-csp",
  setup(build) {
    build.onLoad({ filter: /[\\/]lodash[\\/]_root\.js$/ }, () => ({
      contents:
        'var root = typeof globalThis === "object" && globalThis ? globalThis : typeof self === "object" && self ? self : {};\nmodule.exports = root;\n',
      loader: "js",
    }));
  },
};

function createBuildOptions(target, outDir) {
  const entryPoints = {
    b: path.join(srcDir, "background/index.js"),
    c: path.join(srcDir, "entries/content.jsx"),
    ca: path.join(srcDir, "entries/contentAllFrames.js"),
    p: path.join(srcDir, "entries/popup.jsx"),
    s: path.join(srcDir, "entries/settings.jsx"),
  };
  if (target === "chrome") {
    entryPoints.o = path.join(srcDir, "entries/offscreen.js");
  }

  return {
    entryPoints,
    outdir: outDir,
    bundle: true,
    format: "iife",
    platform: "browser",
    target: target === "firefox" ? ["firefox115"] : ["chrome110"],
    jsx: "automatic",
    minify: !isWatch,
    sourcemap: isWatch ? "inline" : false,
    logLevel: "info",
    plugins: [stubUnusedIconLoadersPlugin, patchLodashRootForCspPlugin],
    define: {
      "process.env.NODE_ENV": JSON.stringify(isWatch ? "development" : "production"),
      __TARGET_BROWSER__: JSON.stringify(target),
    },
  };
}

const targetsToBuild = requestedTarget === "all" ? ["chrome", "firefox"] : [requestedTarget];

if (isWatch) {
  const contexts = [];
  for (const target of targetsToBuild) {
    const outDir = prepareOutputDir(target);
    const ctx = await esbuild.context(createBuildOptions(target, outDir));
    await ctx.watch();
    contexts.push(ctx);
    console.log(`Watching [${target}] -> ${path.relative(rootDir, outDir)}/`);
  }
} else {
  for (const target of targetsToBuild) {
    const outDir = prepareOutputDir(target);
    await esbuild.build(createBuildOptions(target, outDir));
    console.log(`Build complete [${target}] -> ${path.relative(rootDir, outDir)}/`);
  }
}
