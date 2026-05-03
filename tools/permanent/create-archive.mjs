import { createWriteStream } from "node:fs";
import { copyFile, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import archiver from "archiver";

const root = process.cwd();
const outputDir = path.join(root, "permanent-output");
const stagingDir = path.join(outputDir, "site");
const archivePath = path.join(outputDir, "father-memorial-site.zip");

const publicFiles = [
    ".nojekyll",
    "CNAME",
    "README.md",
    "admin.css",
    "admin.html",
    "admin.js",
    "album-data.js",
    "index.html",
    "script.js",
    "site-data.js",
    "style.css"
];

async function copyDirectory(source, target) {
    await mkdir(target, { recursive: true });
    const entries = await readdir(source, { withFileTypes: true });

    for (const entry of entries) {
        const from = path.join(source, entry.name);
        const to = path.join(target, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(from, to);
        } else if (entry.isFile()) {
            await copyFile(from, to);
        }
    }
}

async function sha256(filePath) {
    const { createReadStream } = await import("node:fs");
    const hash = createHash("sha256");

    await new Promise((resolve, reject) => {
        createReadStream(filePath)
            .on("data", (chunk) => hash.update(chunk))
            .on("error", reject)
            .on("end", resolve);
    });

    return hash.digest("hex");
}

async function zipDirectory(source, target) {
    await new Promise((resolve, reject) => {
        const output = createWriteStream(target);
        const archive = archiver("zip", { zlib: { level: 9 } });

        output.on("close", resolve);
        archive.on("warning", reject);
        archive.on("error", reject);
        archive.pipe(output);
        archive.directory(source, false);
        archive.finalize();
    });
}

await rm(stagingDir, { recursive: true, force: true });
await mkdir(stagingDir, { recursive: true });

for (const file of publicFiles) {
    const source = path.join(root, file);
    const exists = await stat(source).catch(() => null);

    if (exists?.isFile()) {
        await mkdir(path.dirname(path.join(stagingDir, file)), { recursive: true });
        await copyFile(source, path.join(stagingDir, file));
    }
}

await copyDirectory(path.join(root, "images"), path.join(stagingDir, "images"));
await rm(archivePath, { force: true });
await zipDirectory(stagingDir, archivePath);

const digest = await sha256(archivePath);
const manifest = {
    generatedAt: new Date().toISOString(),
    archive: "father-memorial-site.zip",
    sha256: digest,
    source: "https://github.com/zjg1128/father-memorial",
    liveUrl: "https://zjg1128.github.io/father-memorial/",
    customDomain: "www.mingfu.ccwu.cc"
};

await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");

console.log(`Archive created: ${archivePath}`);
console.log(`SHA256: ${digest}`);
