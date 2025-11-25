// scripts/find-prisma-issues.js

import fs from "fs";
import path from "path";

const SRC_DIR = path.join(process.cwd(), "src");

const prismaImportPatterns = [
    'import prisma from "@/lib/prisma"',
    'import prisma from "@/src/lib/prisma"',
    'import { PrismaClient } from "@prisma/client"',
    "import prisma from '../lib/prisma'",
    'import prisma from "../../lib/prisma"',
    'from "@/lib/prisma"',
    'from "@/src/lib/prisma"',
    "/lib/prisma",
];

function walk(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;

    const files = fs.readdirSync(dir);

    files.forEach((file) => {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);

        if (stat.isDirectory()) {
            walk(filepath, fileList);
        } else if (
            file.endsWith(".js") ||
            file.endsWith(".jsx") ||
            file.endsWith(".ts") ||
            file.endsWith(".tsx")
        ) {
            fileList.push(filepath);
        }
    });

    return fileList;
}

function scanFile(filepath) {
    const content = fs.readFileSync(filepath, "utf8");

    const hasUseClient =
        content.includes('"use client"') || content.includes("'use client'");
    const hasUseServer =
        content.includes('"use server"') || content.includes("'use server'");
    const hasPrismaImport = prismaImportPatterns.some((p) =>
        content.includes(p)
    );

    if (hasUseClient || hasPrismaImport) {
        console.log("\n🔍 Found issue in:", filepath);

        if (hasUseClient) console.log("  ⚠ Contains: 'use client'");
        if (hasUseServer) console.log("  🔸 Contains: 'use server'");
        if (hasPrismaImport) console.log("  ❌ Contains Prisma import");
    }
}

console.log("🔎 Scanning /src for Prisma issues...\n");

const files = walk(SRC_DIR);
files.forEach(scanFile);

console.log("\n✅ Scan complete!");
