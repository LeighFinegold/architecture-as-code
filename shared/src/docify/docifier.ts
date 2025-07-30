import {TemplateProcessingMode, TemplateProcessor} from '../template/template-processor.js';

export type DocifyMode = 'SAD' | 'WEBSITE' | 'USER_PROVIDED';

export class Docifier {
    private static readonly TEMPLATE_BUNDLE_PATHS: Record<DocifyMode, string> = {
        SAD: __dirname + '/template-bundles/sad',
        WEBSITE: __dirname + '/template-bundles/docusaurus',
        USER_PROVIDED: __dirname + '/template-bundles/null-pattern'
    };

    private templateProcessor: TemplateProcessor;

    constructor(
        mode: DocifyMode,
        inputPath: string,
        outputPath: string,
        urlToLocalPathMapping: Map<string, string>,
        templateProcessingMode: TemplateProcessingMode = 'bundle',
        templatePath?: string
    ) {
        if (mode === 'SAD') {
            throw new Error('Mode "SAD" is not supported.');
        }

        if (mode === 'USER_PROVIDED' && !templatePath) {
            throw new Error('USER_PROVIDED mode requires an explicit templatePath.');
        }

        const finalTemplatePath =
            templatePath ?? Docifier.TEMPLATE_BUNDLE_PATHS[mode];

        this.templateProcessor = new TemplateProcessor(
            inputPath,
            finalTemplatePath,
            outputPath,
            urlToLocalPathMapping,
            templateProcessingMode
        );
    }

    public async docify(): Promise<void> {
        await this.templateProcessor.processTemplate();
    }
}
