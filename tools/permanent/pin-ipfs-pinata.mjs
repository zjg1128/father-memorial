import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const siteDir = path.join(root, "permanent-output", "site");
const outputPath = path.join(root, "permanent-output", "ipfs-pinata-result.json");
const jwt = process.env.PINATA_JWT;

if (!jwt) {
    console.error("Missing PINATA_JWT. Create a Pinata API JWT and set it before running this script.");
    process.exit(1);
}

async function collectFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            files.push(...await collectFiles(fullPath));
        } else if (entry.isFile()) {
            files.push(fullPath);
        }
    }

    return files;
}

const siteStats = await stat(siteDir).catch(() => null);
if (!siteStats?.isDirectory()) {
    console.error("Missing permanent-output/site. Run npm run archive:permanent first.");
    process.exit(1);
}

const files = await collectFiles(siteDir);
const form = new FormData();

for (const filePath of files) {
    const relativePath = path.relative(siteDir, filePath).replaceAll("\\", "/");
    const data = await readFile(filePath);
    form.append("file", new Blob([data]), relativePath);
}

form.append("pinataMetadata", JSON.stringify({
    name: "father-memorial-site",
    keyvalues: {
        source: "github.com/zjg1128/father-memorial",
        customDomain: "www.mingfu.ccwu.cc"
    }
}));

form.append("pinataOptions", JSON.stringify({
    cidVersion: 1,
    wrapWithDirectory: true
}));

const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
        Authorization: `Bearer ${jwt}`
    },
    body: form
});

const result = await response.json();

if (!response.ok) {
    console.error(result);
    process.exit(1);
}

const record = {
    ...result,
    gatewayUrl: `https://ipfs.io/ipfs/${result.IpfsHash}/`,
    pinataGatewayUrl: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}/`,
    createdAt: new Date().toISOString()
};

await writeFile(outputPath, JSON.stringify(record, null, 2), "utf8");

console.log(`Pinned to IPFS: ${result.IpfsHash}`);
console.log(`Gateway: ${record.gatewayUrl}`);
console.log(`Saved result: ${outputPath}`);
