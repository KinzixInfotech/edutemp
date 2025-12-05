
const fs = require('fs');
const path = require('path');

const API_DIR = path.join(process.cwd(), 'src/app/api');

function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });

    return arrayOfFiles;
}

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const errors = [];
    const lines = content.split('\n');

    // Check 1: Multiple exports of same method (GET, POST etc)
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    methods.forEach(method => {
        const activeExports = lines.filter(l => l.match(new RegExp(`^export\\s+async\\s+function\\s+${method}\\s*\\(`))).length;
        if (activeExports > 1) {
            errors.push(`Multiple active exports for ${method}: found ${activeExports} times.`);
        }
    });

    // Check 2: Missing 'props' argument but using 'props.params'
    // Heuristic: Active `const params = await props.params` but closest active export above lacks `props`
    lines.forEach((line, index) => {
        if (line.includes('const params = await props.params') && !line.trim().startsWith('//')) {
            // Look backwards for the function definition
            let foundDef = false;
            for (let i = index; i >= 0; i--) {
                const activeExportMatch = lines[i].match(/^export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/);
                if (activeExportMatch) {
                    if (!lines[i].includes('props') && !lines[i].includes('params')) {
                        errors.push(`Line ${index + 1}: Usage of active 'props.params' but 'props' might be missing in function signature at line ${i + 1}`);
                    }
                    foundDef = true;
                    break;
                }
            }
        }
    });

    // Check 3: Suspicious active code inside large commented blocks
    // If we see `const params = await props.params` line is active (no //)
    // BUT the lines around it are commented out?
    lines.forEach((line, index) => {
        if (line.trim().startsWith('const params = await props.params')) {
            const prevLine = lines[index - 1]?.trim();
            const nextLine = lines[index + 1]?.trim();
            if (prevLine && prevLine.startsWith('//') && nextLine && nextLine.startsWith('//')) {
                errors.push(`Line ${index + 1}: Suspicious active code 'const params = ...' surrounded by comments.`);
            }
        }
    });

    // Check 4: Merge Conflict Markers
    lines.forEach((line, index) => {
        if (line.startsWith('<<<<<<<') || line.startsWith('=======')) {
            errors.push(`Line ${index + 1}: Merge conflict marker found: "${line}"`);
        }
        if (line.startsWith('>>>>>>>')) {
            errors.push(`Line ${index + 1}: Merge conflict marker found: "${line}"`);
        }
    });

    if (errors.length > 0) {
        console.log(`\n❌ Issues in ${path.relative(process.cwd(), filePath)}:`);
        errors.forEach(e => console.log(`   - ${e}`));
    }
}

console.log('🔍 Scanning API routes for common errors...\n');
try {
    const files = getAllFiles(API_DIR);
    files.forEach(checkFile);
    console.log(`\n✅ Scan complete. Checked ${files.length} files.`);
} catch (e) {
    console.error("Scan failed:", e);
}
