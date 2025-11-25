/* eslint-disable  @typescript-eslint/no-explicit-any */
import { CalmCore } from '@finos/calm-models/model';

export interface IndexFile {
    name: string;
    transformer?: string;
    templates: TemplateEntry[];
}

export interface TemplateFrontMatterConfig {
    enabled: boolean;
    // Additional arbitrary front-matter fields whose values can be literal or Handlebars expressions
    [key: string]: unknown;
}

export interface TemplateEntry {
    template: string;
    from: string;
    output: string;
    'output-type': string;
    partials?: string[];
    alias?: string; // optional alias providing the variable name used inside output path expressions
    frontmatter?: TemplateFrontMatterConfig; // optional front-matter configuration
}

export interface CalmTemplateTransformer {
    getTransformedModel(architecture: CalmCore): any;
    registerTemplateHelpers(): Record<string, (...args: any[]) => any>;
}
