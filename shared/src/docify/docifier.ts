import { TemplateProcessingMode, TemplateProcessor } from '../template/template-processor.js';

export type DocifyMode = 'SAD' | 'WEBSITE' | 'USER_PROVIDED';

export class Docifier {
    private static readonly TEMPLATE_BUNDLE_PATHS: Record<DocifyMode, string> = {
        SAD: __dirname + '/template-bundles/sad',
        WEBSITE: __dirname + '/template-bundles/docusaurus_v2',
        USER_PROVIDED: __dirname + '/template-bundles/null-pattern'
    };

    private templateProcessor: TemplateProcessor;
    private readonly scaffold: boolean; // new flag

    constructor(
        mode: DocifyMode,
        inputPath: string,
        outputPath: string,
        urlToLocalPathMapping: Map<string, string>,
        templateProcessingMode: TemplateProcessingMode = 'bundle',
        templatePath?: string,
        clearOutputDirectory: boolean = false,
        scaffold: boolean = false // new param
    ) {
        if (mode === 'SAD') {
            throw new Error('Mode "SAD" is not supported.');
        }

        if (mode === 'USER_PROVIDED' && !templatePath) {
            throw new Error('USER_PROVIDED mode requires an explicit templatePath.');
        }

        const finalTemplatePath =
            templatePath ?? Docifier.TEMPLATE_BUNDLE_PATHS[mode];

        //TODO: need to move docifier and graphing package to widget framework. Until then widgets will clash
        const supportWidgetEngine = true;

        this.scaffold = scaffold;
        // Log scaffold flag state for visibility
        console.info(`[Docifier] scaffold flag: ${this.scaffold}`);
        // Expose scaffold mode to downstream template engine via env var (minimal wiring)
        process.env.DOCIFY_SCAFFOLD = this.scaffold ? 'true' : 'false';

        this.templateProcessor = new TemplateProcessor(
            inputPath,
            finalTemplatePath,
            outputPath,
            urlToLocalPathMapping,
            templateProcessingMode,
            supportWidgetEngine,
            clearOutputDirectory
        );
    }

    public async docify(): Promise<void> {
        // Placeholder: future scaffold behavior could act here based on this.scaffold
        await this.templateProcessor.processTemplate();
    }
}
