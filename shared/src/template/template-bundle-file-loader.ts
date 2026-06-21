import fs from 'fs';
import path from 'path';
import { IndexFile, TemplateEntry } from './types.js';
import { initLogger, Logger } from '../logger.js';
import { parseFrontMatterFromContent, replaceVariables } from './front-matter.js';
import { WidgetsOptions } from '@finos/calm-widgets';
import { getErrorMessage } from '../error-utils.js';


export interface ITemplateBundleLoader {
    getConfig(): IndexFile;
    getTemplateFiles(): Record<string, string>;
}

interface ExtractedFrontMatter {
    content: string;
    variables: Record<string, string>;
    widgetOptions: WidgetsOptions;
}

/**
 * Recursively walk a directory, invoking `visit` for every file (not directory).
 * `relPath` is the file's path relative to `rootDir`, normalized to forward slashes
 * so keys are stable across platforms.
 */
export function walkTemplateDirectory(
    rootDir: string,
    visit: (fullPath: string, relPath: string) => void
): void {
    const recurse = (dir: string, relativePath: string): void => {
        for (const item of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, item);
            const relPath = relativePath ? `${relativePath}/${item}` : item;

            if (fs.statSync(fullPath).isDirectory()) {
                recurse(fullPath, relPath);
            } else {
                visit(fullPath, relPath);
            }
        }
    };
    recurse(rootDir, '');
}

/**
 * Parse and resolve front-matter for a template's content, returning the resolved
 * content alongside any string variables and widget options it declared.
 */
export function extractFrontMatter(content: string, dir: string): ExtractedFrontMatter {
    const parsed = parseFrontMatterFromContent(content, dir);
    const variables: Record<string, string> = {};
    const widgetOptions: WidgetsOptions = {};
    let resolvedContent = content;

    if (parsed && Object.keys(parsed.frontMatter).length > 0) {
        resolvedContent = replaceVariables(content, parsed.frontMatter);
        for (const [key, value] of Object.entries(parsed.frontMatter)) {
            if (typeof value === 'string') {
                variables[key] = value;
            }
            if (key === 'widget-options' && typeof value === 'object' && value !== null) {
                Object.assign(widgetOptions, value);
            }
        }
    }

    return { content: resolvedContent, variables, widgetOptions };
}

/**
 * Build a TemplateEntry `front-matter` object from extracted variables/widget options,
 * or `undefined` when neither is present.
 */
export function buildFrontMatterConfig(
    variables: Record<string, string>,
    widgetOptions: WidgetsOptions
): TemplateEntry['front-matter'] | undefined {
    const hasVariables = Object.keys(variables).length > 0;
    const hasWidgetOptions = Object.keys(widgetOptions).length > 0;

    if (!hasVariables && !hasWidgetOptions) {
        return undefined;
    }

    return {
        ...(hasVariables ? { variables } : {}),
        ...(hasWidgetOptions ? { widgetOptions } : {})
    };
}

export class SelfProvidedTemplateLoader implements ITemplateBundleLoader {
    private readonly config: IndexFile;
    private readonly templateFiles: Record<string, string>;

    constructor(templatePath: string, outputPath: string) {
        const templateName = path.basename(templatePath);
        const templateDir = path.dirname(templatePath);

        const isDir = !path.extname(outputPath) || (
            fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()
        );

        const outputFile = isDir
            ? 'output.md'
            : path.basename(outputPath);

        const rawContent = fs.readFileSync(templatePath, 'utf8');
        const { content, variables, widgetOptions } = extractFrontMatter(rawContent, templateDir);

        this.templateFiles = {
            [templateName]: content
        };

        this.config = {
            name: 'Self Provided Template',
            templates: [{
                template: templateName,
                from: 'document',
                output: outputFile,
                'output-type': 'single'
            }]
        };

        const frontMatter = buildFrontMatterConfig(variables, widgetOptions);
        if (frontMatter) {
            this.config.templates[0]['front-matter'] = frontMatter;
        }
    }

    getConfig(): IndexFile {
        return this.config;
    }

    getTemplateFiles(): Record<string, string> {
        return this.templateFiles;
    }
}

export class SelfProvidedDirectoryTemplateLoader implements ITemplateBundleLoader {
    private readonly config: IndexFile;
    private readonly templateFiles: Record<string, string> = {};

    constructor(templateDir: string) {
        const entries: TemplateEntry[] = [];

        walkTemplateDirectory(templateDir, (fullPath, relPath) => {
            const rawContent = fs.readFileSync(fullPath, 'utf8');
            const { content, variables, widgetOptions } = extractFrontMatter(rawContent, path.dirname(fullPath));

            this.templateFiles[relPath] = content;

            const entry: TemplateEntry = {
                template: relPath,
                from: 'document',
                output: relPath,
                'output-type': 'single'
            };

            const frontMatter = buildFrontMatterConfig(variables, widgetOptions);
            if (frontMatter) {
                entry['front-matter'] = frontMatter;
            }

            entries.push(entry);
        });

        this.config = {
            name: 'Self Provided Template Directory',
            templates: entries
        };
    }

    getConfig(): IndexFile {
        return this.config;
    }

    getTemplateFiles(): Record<string, string> {
        return this.templateFiles;
    }
}

export class TemplateBundleFileLoader implements ITemplateBundleLoader {
    private readonly templateBundlePath: string;
    private readonly config: IndexFile;
    private readonly templateFiles: Record<string, string>;
    private static _logger: Logger | undefined;

    private static get logger(): Logger {
        if (!this._logger) {
            this._logger = initLogger(process.env.DEBUG === 'true', TemplateBundleFileLoader.name);
        }
        return this._logger;
    }

    constructor(templateBundlePath: string) {
        this.templateBundlePath = templateBundlePath;
        this.config = this.loadConfig();
        this.templateFiles = this.loadTemplateFiles();
    }

    private loadConfig(): IndexFile {
        const logger = TemplateBundleFileLoader.logger;
        const indexFilePath = path.join(this.templateBundlePath, 'index.json');

        if (!fs.existsSync(indexFilePath)) {
            logger.error(`❌ index.json not found: ${indexFilePath}`);
            throw new Error(`index.json not found in template bundle: ${indexFilePath}`);
        }

        try {
            logger.info(`📥 Loading index.json from ${indexFilePath}`);
            const rawConfig = JSON.parse(fs.readFileSync(indexFilePath, 'utf8'));

            if (!rawConfig.name || !Array.isArray(rawConfig.templates)) {
                logger.error('❌ Invalid index.json format: Missing required fields');
                throw new Error('Invalid index.json format: Missing required fields');
            }

            logger.info(`✅ Successfully loaded template bundle: ${rawConfig.name}`);
            return rawConfig as IndexFile;
        } catch (error) {
            const message = getErrorMessage(error);
            logger.error(`❌ Error reading index.json: ${message}`);
            throw new Error(`Failed to parse index.json: ${message}`);
        }
    }

    private loadTemplateFiles(): Record<string, string> {
        const logger = TemplateBundleFileLoader.logger;
        const templates: Record<string, string> = {};

        logger.info(`📂 Loading template files from: ${this.templateBundlePath}`);

        walkTemplateDirectory(this.templateBundlePath, (fullPath, relPath) => {
            if (!this.isLoadableTemplate(relPath, path.basename(fullPath))) {
                return;
            }
            templates[relPath] = fs.readFileSync(fullPath, 'utf8');
            logger.debug(`✅ Loaded template file: ${relPath}`);
        });

        logger.info(`🎯 Total Templates Loaded: ${Object.keys(templates).length}`);
        return templates;
    }

    /**
     * A bundle file is loadable as a template unless it is the index.json manifest
     * or the transformer source file. Files without an extension are ignored.
     */
    private isLoadableTemplate(relPath: string, fileName: string): boolean {
        if (relPath === 'index.json') {
            return false;
        }

        const transformer = this.config.transformer;
        if (transformer && (relPath === `${transformer}.ts` || relPath === `${transformer}.js`)) {
            return false;
        }

        return fileName.includes('.');
    }

    public getConfig(): IndexFile {
        return this.config;
    }

    public getTemplateFiles(): Record<string, string> {
        return this.templateFiles;
    }

}
