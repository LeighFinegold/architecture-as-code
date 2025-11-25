/* eslint-disable  @typescript-eslint/no-explicit-any */
import Handlebars from 'handlebars';
import { IndexFile, TemplateEntry, CalmTemplateTransformer } from './types.js';
import { ITemplateBundleLoader } from './template-bundle-file-loader.js';
import { initLogger, Logger } from '../logger.js';
import fs from 'fs';
import path from 'path';
import { TemplatePathExtractor } from './template-path-extractor.js';
import { TemplatePreprocessor } from './template-preprocessor.js';

export class TemplateEngine {
    private readonly templates: Record<string, Handlebars.TemplateDelegate>;
    private readonly config: IndexFile;
    private transformer: CalmTemplateTransformer;
    private static _logger: Logger | undefined;

    private static get logger(): Logger {
        if (!this._logger) {
            this._logger = initLogger(process.env.DEBUG === 'true', TemplateEngine.name);
        }
        return this._logger;
    }

    constructor(fileLoader: ITemplateBundleLoader, transformer: CalmTemplateTransformer) {
        this.config = fileLoader.getConfig();
        this.transformer = transformer;
        this.templates = this.compileTemplates(fileLoader.getTemplateFiles());
        this.registerTemplateHelpers();
    }

    private compileTemplates(templateFiles: Record<string, string>): Record<string, Handlebars.TemplateDelegate> {
        const logger = TemplateEngine.logger;
        const compiledTemplates: Record<string, Handlebars.TemplateDelegate> = {};

        for (const [fileName, content] of Object.entries(templateFiles)) {
            const preprocessed = TemplatePreprocessor.preprocessTemplate(content);
            logger.debug(preprocessed);
            compiledTemplates[fileName] = Handlebars.compile(preprocessed);
        }

        logger.info(`✅ Compiled ${Object.keys(compiledTemplates).length} Templates`);
        return compiledTemplates;
    }

    private registerTemplateHelpers(): void {
        const logger = TemplateEngine.logger;
        logger.info('🔧 Registering Handlebars Helpers...');
        const helperFunctions = this.transformer.registerTemplateHelpers();
        Handlebars.registerHelper('convertFromDotNotation', (context: unknown, path: string, options?: any) => {
            try {
                return TemplatePathExtractor.convertFromDotNotation(context, path, options?.hash || {});
            } catch (err) {
                logger.warn(`Failed to convert from DotNotation path "${path}": ${(err as Error).message}`);
                return [];
            }
        });
        // Register transformer-provided helpers
        Object.entries(helperFunctions).forEach(([name, fn]) => {
            Handlebars.registerHelper(name, fn);
            logger.info(`✅ Registered helper: ${name}`);
        });
        // New helper: aliasKeys lists keys on an alias object (including dashed shadows)
        Handlebars.registerHelper('aliasKeys', (aliasObj: unknown) => {
            if (!aliasObj || typeof aliasObj !== 'object') return [];
            const keys = Object.keys(aliasObj as Record<string, unknown>);
            return keys.sort();
        });
        logger.info('✅ Registered helper: aliasKeys');
    }

    public generate(data: any, outputDir: string): void {
        const logger = TemplateEngine.logger;
        logger.info('\n🔹 Starting Template Generation...');

        if (!fs.existsSync(outputDir)) {
            logger.info(`📂 Output directory does not exist. Creating: ${outputDir}`);
            fs.mkdirSync(outputDir, { recursive: true });
        }

        for (const templateEntry of this.config.templates) {
            this.processTemplate(templateEntry, data, outputDir);
        }

        logger.info('\n\u2705 Template Generation Completed!');
    }

    // New helper: resolve dot/bracket path in `from` with exact-key fallback.
    private resolveFromData(root: any, from: string): any {
        //log root and from
        TemplateEngine.logger.info(`Resolving 'from' path: ${from} in root: ${JSON.stringify(root)}`);

        if (!from) return undefined;
        // Exact key fallback (legacy behaviour)
        if (Object.prototype.hasOwnProperty.call(root, from)) {
            return root[from];
        }
        try {
            // Use the same path extractor semantics as templates for consistency.
            const resolved = TemplatePathExtractor.convertFromDotNotation(root, from, {});
            return resolved;
        } catch (err) {
            TemplateEngine.logger.warn(`Failed to resolve 'from' path "${from}": ${(err as Error).message}`);
            return undefined;
        }
    }

    /**
     * Generate YAML front-matter for a document based on template configuration
     * @param templateEntry - The template entry containing front-matter configuration
     * @param context - The context data used to evaluate Handlebars expressions
     * @returns A string containing the YAML front-matter with delimiters, or empty string if disabled
     */
    private generateFrontMatter(templateEntry: TemplateEntry, context: any): string {
        const logger = TemplateEngine.logger;

        if (!templateEntry.frontmatter?.enabled) {
            return '';
        }

        const fm = templateEntry.frontmatter;
        const frontMatterObj: Record<string, any> = {};

        // Compile and evaluate each front-matter field
        Object.entries(fm).forEach(([key, value]) => {
            if (key === 'enabled') return;

            if (typeof value === 'string') {
                try {
                    // Compile the handlebars expression and evaluate with context
                    const compiled = Handlebars.compile(value);
                    const evaluated = compiled(context);
                    frontMatterObj[key] = evaluated;
                } catch (err) {
                    logger.warn(`Failed to evaluate front-matter field "${key}": ${(err as Error).message}`);
                }
            } else {
                // Use literal value if not a string
                frontMatterObj[key] = value;
            }
        });

        // Generate YAML front-matter
        const lines = ['---'];
        Object.entries(frontMatterObj).forEach(([key, value]) => {
            lines.push(`${key}: ${value}`);
        });
        lines.push('---', '');

        return lines.join('\n');
    }

    private processTemplate(templateEntry: TemplateEntry, data: any, outputDir: string): void {
        const logger = TemplateEngine.logger;
        const { template, from, output, 'output-type': outputType, partials, alias } = templateEntry;

        if (!this.templates[template]) {
            logger.warn(`\u26a0\ufe0f Skipping unknown template: ${template}`);
            return;
        }

        if (partials) {
            for (const partial of partials) {
                if (this.templates[partial]) {
                    logger.info(`✅ Registering partial template: ${partial}`);
                    Handlebars.registerPartial(partial, this.templates[partial]);
                } else {
                    logger.warn(`⚠️ Missing partial template: ${partial}`);
                }
            }
        }

        const dataSource = this.resolveFromData(data, from);
        const aliasName = alias || 'item';
        const outputTemplate = Handlebars.compile(output);

        const buildAliasContext = (instance: any): Record<string, unknown> => {
            if (!instance || typeof instance !== 'object') return { [aliasName]: instance };
            // shallow clone to avoid mutating original
            const aliasObj: Record<string, unknown> = { ...instance };
            // add dashed/kebab shadow properties for camelCase keys
            Object.keys(instance).forEach(k => {
                if (typeof k === 'string' && /[A-Z]/.test(k)) {
                    const kebab = k
                        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                        .toLowerCase();
                    if (!(kebab in aliasObj)) aliasObj[kebab] = (instance as Record<string, unknown>)[k];
                }
            });
            return { [aliasName]: aliasObj, ...instance }; // keep original root fields accessible
        };

        if (outputType === 'repeated') {
            if (!Array.isArray(dataSource)) {
                logger.warn(`\u26a0\ufe0f Expected array for repeated output, but found non-array for ${template}`);
                return;
            }
            for (const instance of dataSource) {
                const ctx = buildAliasContext(instance);
                const filename = outputTemplate(ctx);
                const outputPath = path.join(outputDir, filename);
                fs.mkdirSync(path.dirname(outputPath), { recursive: true });
                // Generate front-matter and prepend to template content
                const frontMatter = this.generateFrontMatter(templateEntry, ctx);
                const templateContent = this.templates[template](ctx);
                const finalContent = frontMatter + templateContent;
                fs.writeFileSync(outputPath, finalContent, 'utf8');
                logger.info(`\u2705 Generated: ${outputPath}`);
            }
        }
        else if (outputType === 'single') {
            if (!dataSource) {
                logger.warn(`\u26a0\ufe0f Single output template '${template}' resolved to undefined/null from path '${from}'.`);
                return;
            }
            const ctx = buildAliasContext(dataSource);
            const filename = outputTemplate(ctx);
            const outputPath = path.join(outputDir, filename);
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            // Generate front-matter and prepend to template content
            const frontMatter = this.generateFrontMatter(templateEntry, ctx);
            const templateContent = this.templates[template](ctx);
            const finalContent = frontMatter + templateContent;
            fs.writeFileSync(outputPath, finalContent, 'utf8');
            logger.info(`\u2705 Generated: ${outputPath}`);
        }
        else {
            logger.warn(`\u26a0\ufe0f Unknown output-type: ${outputType}`);
        }
    }
}
