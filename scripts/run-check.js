import fs from "fs";
import path from "path";

const rootDir = process.argv[2] || "."; // default = current folder

let totalFiles = 0;
let totalFolders = 0;
let totalLines = 0;

function countLinesInFile(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    return content.split(/\r?\n/).length;
}

function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // ⛔ Skip node_modules and hidden folders
        if (entry.isDirectory()) {
            if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;

            totalFolders++;
            walkDir(fullPath);
        } else if (entry.isFile()) {
            totalFiles++;
            // Skip non-code files
            if (!/\.(png|jpg|jpeg|gif|svg|mp4|mp3|ico|pdf|lock|json)$/i.test(entry.name)) {
                totalLines += countLinesInFile(fullPath);
            }
        }
    }
}

walkDir(rootDir);

console.log("📁 Total folders:", totalFolders);
console.log("📄 Total files:", totalFiles);
console.log("🧾 Total lines of code:", totalLines);
