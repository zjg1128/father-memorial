import { createReadStream } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { ArweaveSigner, TurboFactory } from "@ardrive/turbo-sdk";

const root = process.cwd();
const archivePath = process.env.PERMANENT_ARCHIVE || path.join(root, "permanent-output", "father-memorial-site.zip");
const outputPath = path.join(root, "permanent-output", "arweave-turbo-result.json");
const walletPath = process.env.ARWEAVE_WALLET_FILE;

if (!walletPath) {
    console.error("Missing ARWEAVE_WALLET_FILE. Set it to an Arweave JWK wallet file with Turbo credits or AR funding.");
    process.exit(1);
}

const archiveStats = await stat(archivePath).catch(() => null);
if (!archiveStats?.isFile()) {
    console.error("Missing archive. Run npm run archive:permanent first.");
    process.exit(1);
}

const jwk = JSON.parse(await readFile(walletPath, "utf8"));
const signer = new ArweaveSigner(jwk);
const turbo = TurboFactory.authenticated({ signer });

const result = await turbo.uploadFile({
    fileStreamFactory: () => createReadStream(archivePath),
    fileSizeFactory: () => archiveStats.size,
    dataItemOpts: {
        tags: [
            { name: "Content-Type", value: "application/zip" },
            { name: "App-Name", value: "father-memorial" },
            { name: "Archive-Type", value: "static-website" },
            { name: "Source-Repository", value: "https://github.com/zjg1128/father-memorial" },
            { name: "Custom-Domain", value: "www.mingfu.ccwu.cc" }
        ]
    },
    events: {
        onProgress: ({ totalBytes, processedBytes, step }) => {
            console.log(`${step}: ${processedBytes}/${totalBytes}`);
        },
        onError: ({ error, step }) => {
            console.error(`${step}:`, error);
        }
    }
});

const record = {
    ...result,
    archivePath,
    archiveSize: archiveStats.size,
    arweaveUrl: `https://arweave.net/${result.id}`,
    createdAt: new Date().toISOString()
};

await writeFile(outputPath, JSON.stringify(record, null, 2), "utf8");

console.log(`Uploaded to Arweave via Turbo: ${result.id}`);
console.log(`Arweave URL: ${record.arweaveUrl}`);
console.log(`Saved result: ${outputPath}`);
