import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const manifest = JSON.parse(
  await readFile("docs/import-provenance.json", "utf8"),
);
for (const file of manifest.files) {
  const bytes = await readFile(path.join("legacy/menhel", file.path));
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== file.sha256 || bytes.length !== file.bytes)
    throw new Error(`Archive changed: ${file.path}`);
}
async function count(dir) {
  let total = 0;
  for (const entry of await readdir(dir, { withFileTypes: true }))
    total += entry.isDirectory() ? await count(path.join(dir, entry.name)) : 1;
  return total;
}
if ((await count("legacy/menhel")) !== manifest.files.length)
  throw new Error("Archive file count changed");
console.log(
  `Verified ${manifest.files.length} archived files against import hashes`,
);
