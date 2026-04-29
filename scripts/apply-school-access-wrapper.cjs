const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);
const API_AUTH_IMPORT = '@/lib/api-auth';
const DEFAULT_TARGETS = [
    path.join('src', 'app', 'api', 'schools', '[schoolId]'),
    path.join('src', 'app', 'api', 'documents', '[schoolId]'),
    path.join('src', 'app', 'api', 'notices', '[schoolId]'),
];
const SKIP_PATTERNS = [
    `${path.sep}schools${path.sep}[schoolId]${path.sep}freeze${path.sep}route.js`,
    `${path.sep}schools${path.sep}[schoolId]${path.sep}delete${path.sep}route.js`,
];
const SCHOOL_ID_SEGMENT = `${path.sep}[schoolId]${path.sep}`;

function walkRoutes(dir, output = []) {
    if (!fs.existsSync(dir)) {
        return output;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkRoutes(fullPath, output);
        } else if (entry.name === 'route.js') {
            output.push(fullPath);
        }
    }

    return output;
}

function shouldSkip(filePath) {
    return SKIP_PATTERNS.some((pattern) => filePath.endsWith(pattern));
}

function parseSource(source, filePath) {
    return parser.parse(source, {
        sourceType: 'module',
        sourceFilename: filePath,
        plugins: [
            'jsx',
            'asyncGenerators',
            'classProperties',
            'dynamicImport',
            'objectRestSpread',
            'optionalChaining',
            'nullishCoalescingOperator',
            'topLevelAwait',
        ],
    });
}

function ensureWithSchoolAccessImport(programPath) {
    let hasImport = false;

    for (const nodePath of programPath.get('body')) {
        if (!nodePath.isImportDeclaration()) {
            continue;
        }

        if (nodePath.node.source.value !== API_AUTH_IMPORT) {
            continue;
        }

        const existingSpecifier = nodePath.node.specifiers.find(
            (specifier) =>
                t.isImportSpecifier(specifier) &&
                specifier.imported.name === 'withSchoolAccess'
        );

        if (!existingSpecifier) {
            nodePath.node.specifiers.push(
                t.importSpecifier(t.identifier('withSchoolAccess'), t.identifier('withSchoolAccess'))
            );
        }

        hasImport = true;
    }

    if (!hasImport) {
        const importDeclaration = t.importDeclaration(
            [t.importSpecifier(t.identifier('withSchoolAccess'), t.identifier('withSchoolAccess'))],
            t.stringLiteral(API_AUTH_IMPORT)
        );

        programPath.unshiftContainer('body', importDeclaration);
    }
}

function hasWrappedExport(programPath) {
    return programPath.node.body.some(
        (node) =>
            t.isExportNamedDeclaration(node) &&
            t.isVariableDeclaration(node.declaration) &&
            node.declaration.declarations.some(
                (declaration) =>
                    t.isIdentifier(declaration.id) &&
                    t.isCallExpression(declaration.init) &&
                    t.isIdentifier(declaration.init.callee, { name: 'withSchoolAccess' })
            )
    );
}

function wrapExportedHandlers(ast) {
    let changed = false;

    traverse(ast, {
        Program(programPath) {
            if (hasWrappedExport(programPath)) {
                return;
            }

            const replacements = [];

            for (const nodePath of programPath.get('body')) {
                if (!nodePath.isExportNamedDeclaration()) {
                    continue;
                }

                const declaration = nodePath.node.declaration;
                if (!t.isFunctionDeclaration(declaration) || !declaration.id) {
                    continue;
                }

                if (!HTTP_METHODS.has(declaration.id.name)) {
                    continue;
                }

                const wrappedFunction = t.callExpression(
                    t.identifier('withSchoolAccess'),
                    [
                        t.functionExpression(
                            declaration.id,
                            declaration.params,
                            declaration.body,
                            declaration.generator,
                            declaration.async
                        ),
                    ]
                );

                const wrappedExport = t.exportNamedDeclaration(
                    t.variableDeclaration('const', [
                        t.variableDeclarator(t.identifier(declaration.id.name), wrappedFunction),
                    ])
                );

                replacements.push({ nodePath, wrappedExport });
                changed = true;
            }

            if (replacements.length) {
                ensureWithSchoolAccessImport(programPath);
                for (const { nodePath, wrappedExport } of replacements) {
                    nodePath.replaceWith(wrappedExport);
                }
            }
        },
    });

    return changed;
}

function formatRelative(filePath) {
    return path.relative(process.cwd(), filePath).split(path.sep).join('/');
}

const cliArgs = process.argv.slice(2);
const wrapAllTargets = cliArgs.includes('--all-target-routes');
const targetArgs = cliArgs.filter((arg) => arg !== '--all-target-routes');

const targets = targetArgs.length
    ? targetArgs.map((target) => path.resolve(process.cwd(), target))
    : DEFAULT_TARGETS.map((target) => path.resolve(process.cwd(), target));

const routeFiles = targets.flatMap((target) => walkRoutes(target));
let changedFiles = 0;

for (const filePath of routeFiles) {
    if (!wrapAllTargets && !filePath.includes(SCHOOL_ID_SEGMENT)) {
        continue;
    }

    if (shouldSkip(filePath)) {
        continue;
    }

    const source = fs.readFileSync(filePath, 'utf8');
    const ast = parseSource(source, filePath);
    const changed = wrapExportedHandlers(ast);

    if (!changed) {
        continue;
    }

    fs.writeFileSync(
        filePath,
        generate(ast, {
            retainLines: true,
            comments: true,
            jsescOption: { minimal: true },
        }, source).code
    );
    changedFiles += 1;
    console.log(`wrapped ${formatRelative(filePath)}`);
}

console.log(`Updated ${changedFiles} route files.`);
