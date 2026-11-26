/*
 * Run a single SonarScanner analysis of the Maven and npm source trees.
 * Each workspace owns its build and tests. Only report paths are combined here.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { delimiter, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = join(root, 'sandbox', 'sonar');
const javaModules = ['calm-hub', 'calm-models'];
const { workspaces } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function repositoryPath(path) {
    return relative(root, path).split(sep).join('/');
}

function compileLibraries() {
    const libraries = new Set();
    for (const module of javaModules) {
        const target = join(root, module, 'target');
        const classpath = join(target, 'sonar-classpath.txt');
        if (!existsSync(join(target, 'classes')) || !existsSync(classpath)) {
            throw new Error(`Missing Java build output for ${module}. Run npm run sonar:prepare first.`);
        }
        for (const library of readFileSync(classpath, 'utf8').trim().split(delimiter).filter(Boolean)) {
            libraries.add(library);
        }
    }
    return [...libraries].join(',');
}

function combineLcovReports() {
    const records = [];
    for (const workspace of workspaces) {
        const report = join(root, workspace, 'coverage', 'lcov.info');
        if (!existsSync(report)) {
            continue;
        }
        const contents = readFileSync(report, 'utf8').trimEnd();
        if (!contents) {
            continue;
        }
        // Vitest writes SF paths relative to the workspace. Make them relative
        // to the repository so identically named files in different modules
        // cannot be assigned each other's coverage.
        records.push(contents.replace(/^SF:(.+)$/gm, (_, source) => {
            const path = resolve(root, workspace, source.trim());
            const repoPath = repositoryPath(path);
            if (repoPath === '..' || repoPath.startsWith('../') || isAbsolute(repoPath)) {
                throw new Error(`LCOV source outside the repository: ${source}`);
            }
            return `SF:${repoPath}`;
        }));
    }
    if (!records.length) {
        return undefined;
    }
    const combined = join(output, 'lcov.info');
    writeFileSync(combined, records.join('\n') + '\n');
    return repositoryPath(combined);
}

function sourceOnlyConfig() {
    const declaration = join(output, 'empty.d.ts');
    const config = join(output, 'tsconfig.json');
    writeFileSync(declaration, 'export {};\n');
    writeFileSync(config, JSON.stringify({
        compilerOptions: { types: [], noLib: true },
        files: ['empty.d.ts'],
    }));
    return repositoryPath(config);
}

function scan() {
    if (!process.env.SONAR_TOKEN) {
        throw new Error('Set SONAR_TOKEN to a token for your SonarQube server.');
    }
    mkdirSync(output, { recursive: true });
    const extraArgs = process.argv.slice(2);
    const sourceOnly = extraArgs.includes('--source-only');
    const args = [
        `-Dsonar.host.url=${process.env.SONAR_HOST_URL || 'http://127.0.0.1:9000'}`,
        `-Dsonar.java.libraries=${compileLibraries()}`,
    ];
    if (process.env.JAVA_HOME) {
        args.push(`-Dsonar.java.jdkHome=${process.env.JAVA_HOME}`);
    }
    const lcov = combineLcovReports();
    if (lcov) {
        args.push(`-Dsonar.javascript.lcov.reportPaths=${lcov}`);
    }
    const jacoco = javaModules.flatMap(module => [
        `${module}/target/site/jacoco/jacoco.xml`,
        `${module}/target/jacoco-report/jacoco.xml`,
    ]).filter(path => existsSync(join(root, path)));
    if (jacoco.length) {
        args.push(`-Dsonar.coverage.jacoco.xmlReportPaths=${jacoco.join(',')}`);
    }
    if (sourceOnly) {
        args.push(`-Dsonar.typescript.tsconfigPaths=${sourceOnlyConfig()}`);
    }
    const result = spawnSync('npm', [
        'exec', '--', 'sonar-scanner-npm',
        ...args, ...extraArgs.filter(arg => arg !== '--source-only'),
    ], { cwd: root, stdio: 'inherit' });
    if (result.error) {
        throw result.error;
    }
    process.exitCode = result.status ?? 1;
}

scan();
