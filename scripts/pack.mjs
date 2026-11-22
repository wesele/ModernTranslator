import fs from "fs";
import path from "path";
import zlib from "zlib";
import { execFileSync } from "child_process";

const rootDir = process.cwd();
const buildScript = path.join(rootDir, "scripts", "build.mjs");
const distDir = path.join(rootDir, "dist");
const releaseDir = path.join(rootDir, "release");

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosTimeDate(date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((year - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0x0f) << 5) |
    (date.getDate() & 0x1f);
  return { dosTime, dosDate };
}

function collectFiles(dir, baseDir = dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, baseDir));
    } else if (entry.isFile()) {
      const relPath = path.relative(baseDir, fullPath).split(path.sep).join("/");
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

function createZipBuffer(files) {
  const localChunks = [];
  const centralChunks = [];
  let offset = 0;

  for (const file of files) {
    const raw = fs.readFileSync(file.fullPath);
    const stat = fs.statSync(file.fullPath);
    const { dosTime, dosDate } = toDosTimeDate(stat.mtime);
    const nameBuf = Buffer.from(file.relPath, "utf8");
    const crc = crc32(raw);

    const compressed = raw.length > 0 ? zlib.deflateRawSync(raw, { level: 9 }) : raw;
    const useDeflate = compressed.length < raw.length;
    const payload = useDeflate ? compressed : raw;
    const method = useDeflate ? 8 : 0;

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, nameBuf, payload);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralChunks.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralSize = centralChunks.reduce((sum, buf) => sum + buf.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, ...centralChunks, eocd]);
}

function validateDist(files) {
  const relSet = new Set(files.map((f) => f.relPath));
  if (!relSet.has("manifest.json")) {
    throw new Error("dist/manifest.json is missing");
  }
  const mapFiles = files.filter((f) => f.relPath.endsWith(".map"));
  if (mapFiles.length > 0) {
    throw new Error(`Unexpected sourcemap files in dist/: ${mapFiles.map((f) => f.relPath).join(", ")}`);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(distDir, "manifest.json"), "utf8"));
  if (manifest.manifest_version !== 3) {
    throw new Error(`Expected manifest_version 3, got ${manifest.manifest_version}`);
  }

  const iconPaths = [
    ...Object.values(manifest.icons || {}),
    ...(typeof manifest.action?.default_icon === "string"
      ? [manifest.action.default_icon]
      : Object.values(manifest.action?.default_icon || {})),
  ];
  for (const iconPath of iconPaths) {
    if (!relSet.has(iconPath)) {
      throw new Error(`Icon referenced in manifest.json is missing in dist/: ${iconPath}`);
    }
  }

  for (const group of manifest.web_accessible_resources || []) {
    for (const resPath of group.resources || []) {
      if (!relSet.has(resPath)) {
        throw new Error(`web_accessible_resources entry missing in dist/: ${resPath}`);
      }
    }
  }

  const localeFiles = files.filter((f) => /^_locales\/[^/]+\/messages\.json$/.test(f.relPath));
  for (const locFile of localeFiles) {
    const messages = JSON.parse(fs.readFileSync(locFile.fullPath, "utf8"));
    const desc = messages?.description?.message;
    if (typeof desc === "string" && desc.length > 132) {
      throw new Error(
        `Chrome Web Store limit exceeded: ${locFile.relPath} description is ${desc.length} chars (max 132)`
      );
    }
  }

  if (typeof manifest.short_name === "string" && !manifest.short_name.startsWith("__MSG_")) {
    if (manifest.short_name.length > 12) {
      console.warn(
        `Warning: manifest.short_name ("${manifest.short_name}") is ${manifest.short_name.length} chars (recommended <= 12)`
      );
    }
  }

  return manifest;
}

execFileSync(process.execPath, [buildScript], { stdio: "inherit" });

const files = collectFiles(distDir);
const manifest = validateDist(files);
const version = manifest.version || "0.0.0";

fs.mkdirSync(releaseDir, { recursive: true });
const outName = `modern-translator-v${version}.zip`;
const outPath = path.join(releaseDir, outName);
const zipBuffer = createZipBuffer(files);
fs.writeFileSync(outPath, zipBuffer);

console.log(`Packed ${files.length} files -> ${path.relative(rootDir, outPath)} (${(zipBuffer.length / 1024).toFixed(1)} KB)`);
