/* eslint-disable  @typescript-eslint/no-explicit-any */
import Handlebars from 'handlebars';
import { IndexFile, TemplateEntry, CalmTemplateTransformer } from './types.js';
import { ITemplateBundleLoader } from './template-bundle-file-loader.js';
import { initLogger, Logger } from '../logger.js';
import fs from 'fs';
import path from 'path';
import { TemplatePathExtractor } from './template-path-extractor.js';
import { TemplatePreprocessor } from './template-preprocessor.js';
import yaml from 'js-yaml';

export class TemplateEngine {
    private readonly templates: Record<string, Handlebars.TemplateDelegate>;
    private readonly rawTemplates: Record<string, string>; // store raw sources for scaffold mode
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
        const files = fileLoader.getTemplateFiles();
        this.rawTemplates = files;
        this.templates = this.compileTemplates(files);
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
     * Generate YAML front-matter for a document based on template configuration and alias context
     */
    private generateFrontMatter(templateEntry: TemplateEntry, context: any): string {
        const logger = TemplateEngine.logger;

        if (!templateEntry.frontmatter?.enabled) {
            return '';
        }

        const fm = templateEntry.frontmatter;
        const frontMatterObj: Record<string, any> = {};

        Object.entries(fm).forEach(([key, value]) => {
            if (key === 'enabled') return;

            if (typeof value === 'string') {
                try {
                    const compiled = Handlebars.compile(value);
                    const evaluated = compiled(context);
                    frontMatterObj[key] = evaluated;
                } catch (err) {
                    logger.warn(`Failed to evaluate front-matter field "${key}": ${(err as Error).message}`);
                }
            } else {
                frontMatterObj[key] = value;
            }
        });

        // Do not inject alias or alias-json into FM; variables will be hydrated by context builder

        const lines = ['---'];
        Object.entries(frontMatterObj).forEach(([key, value]) => {
            lines.push(`${key}: ${value}`);
        });
        lines.push('---', '');
        return lines.join('\n');
    }

    private extractFrontMatter(raw: string): Record<string, any> | null {
        if (!this.hasFrontMatter(raw)) return null;
        const end = raw.indexOf('\n---', 4);
        const block = end > 0 ? raw.substring(4, end) : raw.substring(4);
        try {
            const doc = yaml.load(block);
            return typeof doc === 'object' && doc ? (doc as Record<string, any>) : null;
        } catch {
            return null;
        }
    }

    private hasFrontMatter(content: string): boolean {
        return /^\s*---\s*\n/.test(content);
    }

    private unwrapDocument(root: any): any {
        let current = root;
        const hasDomainKeys = (obj: any) => obj && typeof obj === 'object' && (obj.nodes || obj.relationships || obj.flows);
        // Peel nested document.document layers
        let safety = 0;
        while (current && typeof current === 'object' && current.document && typeof current.document === 'object' && safety < 5) {
            if (hasDomainKeys(current.document)) {
                current = current.document; // found domain keys one level down
                break;
            }
            // If next level has another .document with domain keys, keep unwrapping
            if (current.document.document && hasDomainKeys(current.document.document)) {
                current = current.document.document;
                break;
            }
            // Otherwise move one level down and continue
            current = current.document;
            safety++;
        }
        return current;
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
        let aliasName = alias || 'item';
        const outputTemplate = Handlebars.compile(output);
        const scaffoldMode = process.env.DOCIFY_SCAFFOLD === 'true';
        const rawTemplate = this.rawTemplates[template] ?? '';

        // If template has existing front-matter and no alias provided in config, recover alias from FM
        const fmParsed = this.extractFrontMatter(rawTemplate);
        let fmVars: Record<string, string> | undefined;
        if (fmParsed) {
            const evaluationContext: Record<string, any> = { ...fmParsed };
            const evaluated: Record<string, string> = {};
            for (const [k, v] of Object.entries(fmParsed)) {
                if (typeof v === 'string') {
                    try {
                        const compiled = Handlebars.compile(v);
                        const result = compiled(evaluationContext);
                        evaluated[k] = result;
                        evaluationContext[k] = result;
                    } catch (err) {
                        TemplateEngine.logger.warn(`Failed to evaluate FM Handlebars for key ${k}: ${(err as Error).message}`);
                        evaluated[k] = v;
                    }
                }
            }
            fmVars = evaluated;
        }

        const isPathExpression = (expr: string): boolean => {
            // Contains dot or brackets OR starts with document. OR begins with known collection name
            return /[\[\].]/.test(expr) || expr.startsWith('document.') || /^(nodes|relationships|flows|controls|metadata)\b/.test(expr);
        };

        const resolveVariablePaths = (vars: Record<string, string> | undefined, rootModel: any): Record<string, unknown> => {
            if (!vars) return {};
            const resolved: Record<string, unknown> = {};
            const modelRoot = this.unwrapDocument(rootModel);
            const rootCtx = { ...modelRoot, document: modelRoot };
            const idValue = vars.id; // capture id FM value if present
            for (const [varName, expr] of Object.entries(vars)) {
                if (!isPathExpression(expr)) {
                    resolved[varName] = expr;
                    continue;
                }
                let value: unknown;
                const tryResolve = (pathExpr: string): unknown => {
                    try {
                        return TemplatePathExtractor.convertFromDotNotation(rootCtx, pathExpr, {});
                    } catch {
                        return undefined;
                    }
                };
                value = tryResolve(expr);
                if (value === undefined && !expr.startsWith('document.')) {
                    value = tryResolve(`document.${expr}`);
                }
                // Fallback: auto-correct nodes['unique-id'] to nodes['<id>'] if id FM present and resolution empty
                if ((value === undefined || (Array.isArray(value) && value.length === 0)) && idValue && expr === "nodes['unique-id']") {
                    const correctedExpr = `nodes['${idValue}']`;
                    TemplateEngine.logger.info(`Auto-correcting FM path ${expr} -> ${correctedExpr}`);
                    value = tryResolve(correctedExpr);
                    if (value === undefined) {
                        value = tryResolve(`document.${correctedExpr}`);
                    }
                }
                if (value === undefined) {
                    TemplateEngine.logger.warn(`FM variable '${varName}' path '${expr}' did not resolve; keeping literal.`);
                    value = expr;
                }
                // Heuristic unwrap: if a single-element array and variable name is singular domain alias
                if (Array.isArray(value) && value.length === 1 && ['node','relationship','flow','control','controlRequirement'].includes(varName)) {
                    value = value[0];
                }
                resolved[varName] = value;
            }
            return resolved;
        };

        const buildAliasContext = (instance: any, rootModel: any): Record<string, unknown> => {
            const fmResolved = resolveVariablePaths(fmVars, rootModel);
            const modelRoot = this.unwrapDocument(rootModel);
            const domainVars = ['node', 'relationship', 'flow', 'control', 'controlRequirement'];
            const hasDomainAliasInFM = domainVars.some(d => d in fmResolved);

            const aliasObj: Record<string, unknown> = {};
            // Suppress default 'item' alias if FM provides a domain-specific variable
            if (aliasName !== 'item' || !hasDomainAliasInFM) {
                if (aliasName && instance && typeof instance === 'object') {
                    const shadow: Record<string, unknown> = { ...instance };
                    Object.keys(instance).forEach(k => {
                        if (typeof k === 'string' && /[A-Z]/.test(k)) {
                            const kebab = k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
                            if (!(kebab in shadow)) shadow[kebab] = (instance as Record<string, unknown>)[k];
                        }
                    });
                    aliasObj[aliasName] = shadow;
                } else if (aliasName) {
                    aliasObj[aliasName] = instance;
                }
            }

            const context: Record<string, unknown> = { document: modelRoot, ...aliasObj };
            for (const [k, v] of Object.entries(fmResolved)) {
                if (k === aliasName && aliasName in context) {
                    context[k] = v; // explicit override of alias
                } else if (!(k in context)) {
                    context[k] = v;
                }
            }
            return context;
        };

        if (outputType === 'repeated') {
            if (!Array.isArray(dataSource)) {
                logger.warn(`\u26a0\ufe0f Expected array for repeated output, but found non-array for ${template}`);
                return;
            }
            for (const instance of dataSource) {
                const ctx = buildAliasContext(instance, data);
                const filename = outputTemplate(ctx);
                const outputPath = path.join(outputDir, filename);
                fs.mkdirSync(path.dirname(outputPath), { recursive: true });

                if (scaffoldMode) {
                    const hasFM = this.hasFrontMatter(rawTemplate);
                    const frontMatter = hasFM ? '' : this.generateFrontMatter(templateEntry, ctx);
                    fs.writeFileSync(outputPath, frontMatter + rawTemplate, 'utf8');
                    logger.info(`\u2705 Scaffolded: ${outputPath}`);
                    continue;
                }

                const frontMatter = this.generateFrontMatter(templateEntry, ctx);
                const templateContent = this.templates[template](ctx);
                const finalContent = frontMatter + templateContent;
                fs.writeFileSync(outputPath, finalContent, 'utf8');
                logger.info(`\u2705 Generated: ${outputPath}`);
            }
        } else if (outputType === 'single') {
            if (!dataSource) {
                logger.warn(`\u26a0\ufe0f Single output template '${template}' resolved to undefined/null from path '${from}'.`);
                return;
            }
            const ctx = buildAliasContext(dataSource, data);
            const filename = outputTemplate(ctx);
            const outputPath = path.join(outputDir, filename);
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });

            if (scaffoldMode) {
                const hasFM = this.hasFrontMatter(rawTemplate);
                const frontMatter = hasFM ? '' : this.generateFrontMatter(templateEntry, ctx);
                fs.writeFileSync(outputPath, frontMatter + rawTemplate, 'utf8');
                logger.info(`\u2705 Scaffolded: ${outputPath}`);
                return;
            }

            const frontMatter = this.generateFrontMatter(templateEntry, ctx);
            const templateContent = this.templates[template](ctx);
            const finalContent = frontMatter + templateContent;
            fs.writeFileSync(outputPath, finalContent, 'utf8');
            logger.info(`\u2705 Generated: ${outputPath}`);
        } else {
            logger.warn(`\u26a0\ufe0f Unknown output-type: ${outputType}`);
        }
    }
}
