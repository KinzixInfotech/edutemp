const fs = require('fs');
const path = require('path');
const { BYPASS_ROUTES } = require('./school-access-audit-config.cjs');

const apiRoot = path.join(process.cwd(), 'src', 'app', 'api');
const ignoredPrefixes = [
    path.join('auth', 'callback'),
    path.join('public'),
    path.join('health'),
    path.join('image-proxy'),
    path.join('check-domain'),
    path.join('account-status'),
    path.join('app-config', 'check-update'),
];

function walk(dir, output = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walk(fullPath, output);
        } else if (/^route\.(js|jsx|ts|tsx)$/.test(entry.name)) {
            output.push(fullPath);
        }
    }
    return output;
}

function isIgnored(relativePath) {
    return ignoredPrefixes.some((prefix) => relativePath.startsWith(prefix)) || Boolean(BYPASS_ROUTES[relativePath]);
}

function isProbablySchoolScoped(source, relativePath) {
    return (
        relativePath.includes('[schoolId]') ||
        source.includes('schoolId') ||
        source.includes('where: { schoolId') ||
        source.includes('where:{ schoolId')
    );
}

function hasGuard(source) {
    return (
        source.includes('withSchoolAccess(') ||
        source.includes('enforceSchoolStateAccess') ||
        source.includes('getSchoolAccessSnapshotForUser') ||
        source.includes('verifyAdminAccess(') ||
        source.includes('verifyRoleAccess(') ||
        source.includes('verifyAuthWithRole(')
    );
}

const files = walk(apiRoot);
const findings = [];

for (const file of files) {
    const relativePath = path.relative(apiRoot, file);
    const normalizedRelativePath = relativePath.split(path.sep).join('/');
    if (isIgnored(normalizedRelativePath)) {
        continue;
    }

    const source = fs.readFileSync(file, 'utf8');
    if (!isProbablySchoolScoped(source, normalizedRelativePath)) {
        continue;
    }

    if (!hasGuard(source)) {
        findings.push(normalizedRelativePath);
    }
}

if (!findings.length) {
    console.log('No obvious school-state coverage gaps found.');
    if (Object.keys(BYPASS_ROUTES).length) {
        console.log(`Explicit bypass routes: ${Object.keys(BYPASS_ROUTES).length}`);
    }
    process.exit(0);
}

console.log('Potential school-state coverage gaps:');
for (const finding of findings) {
    console.log(` - ${finding}`);
}

process.exitCode = 1;
