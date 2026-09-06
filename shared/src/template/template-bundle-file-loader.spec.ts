import fs from 'fs';
import path from 'path';
import { TemplateBundleFileLoader, SelfProvidedTemplateLoader, SelfProvidedDirectoryTemplateLoader, walkTemplateDirectory, buildFrontMatterConfig } from './template-bundle-file-loader';
import { IndexFile } from './types';
import { Mock } from 'vitest';

vi.mock('fs');

describe('TemplateBundleFileLoader', () => {
    const mockBundlePath = '/mock/template-bundle';
    const mockIndexJsonPath = path.join(mockBundlePath, 'index.json');
    const mockTemplateFiles: Record<string, string> = {
        'template1.hbs': '{{name}} template',
        'template2.hbs': '{{name}} another template',
    };

    beforeEach(() => {
        vi.resetAllMocks();
        // Default: treat every entry as a file unless a test overrides this.
        (fs.statSync as Mock).mockReturnValue({ isDirectory: () => false });
    });

    it('should load index.json and template files correctly', () => {
        (fs.existsSync as Mock).mockImplementation(function (filePath) {
            return filePath === mockIndexJsonPath || Object.keys(mockTemplateFiles).includes(path.basename(filePath));
        });

        (fs.readFileSync as Mock).mockImplementation(function (filePath: string) {
            if (filePath === mockIndexJsonPath) {
                return JSON.stringify({
                    name: 'mock-template',
                    transformer: 'mock-transformer',
                    templates: [{ template: 'template1.hbs', from: 'data', output: 'output.md', 'output-type': 'single' }]
                } as IndexFile);
            }
            return mockTemplateFiles[path.basename(filePath)];
        });

        (fs.readdirSync as Mock).mockReturnValue(Object.keys(mockTemplateFiles));

        const loader = new TemplateBundleFileLoader(mockBundlePath);

        expect(loader.getConfig()).toEqual({
            name: 'mock-template',
            transformer: 'mock-transformer',
            templates: [{ template: 'template1.hbs', from: 'data', output: 'output.md', 'output-type': 'single' }]
        });

        expect(loader.getTemplateFiles()).toEqual(mockTemplateFiles);
    });

    it('should throw an error if index.json is missing', () => {
        (fs.existsSync as Mock).mockReturnValue(false);

        expect(() => new TemplateBundleFileLoader(mockBundlePath))
            .toThrowError(`index.json not found in template bundle: ${mockIndexJsonPath}`);
    });

    it('should throw an error if index.json is malformed', () => {
        (fs.existsSync as Mock).mockReturnValue(true);
        (fs.readFileSync as Mock).mockReturnValue('{ invalid-json }');

        expect(() => new TemplateBundleFileLoader(mockBundlePath))
            .toThrowError(/Failed to parse index.json/);
    });

    it('should throw an error if index.json is missing required fields', () => {
        (fs.existsSync as Mock).mockReturnValue(true);
        (fs.readFileSync as Mock).mockReturnValue(JSON.stringify({}));

        expect(() => new TemplateBundleFileLoader(mockBundlePath))
            .toThrowError('Invalid index.json format: Missing required fields');
    });

    it('should return an empty object if no template files exist', () => {
        (fs.existsSync as Mock).mockImplementation(function (filePath) { return filePath === mockIndexJsonPath; });
        (fs.readFileSync as Mock).mockImplementation(function (filePath: string) {
            if (filePath === mockIndexJsonPath) {
                return JSON.stringify({
                    name: 'mock-template',
                    transformer: 'mock-transformer',
                    templates: [],
                });
            }
            return '';
        });

        (fs.readdirSync as Mock).mockReturnValue([]);

        const loader = new TemplateBundleFileLoader(mockBundlePath);
        expect(loader.getTemplateFiles()).toEqual({});
    });

    it('should recursively load templates from nested directories keyed by relative path', () => {
        const dirs = new Set([
            mockBundlePath,
            path.join(mockBundlePath, 'templates'),
            path.join(mockBundlePath, 'templates', 'pages'),
            path.join(mockBundlePath, 'partials'),
        ]);

        const fileContents: Record<string, string> = {
            [mockIndexJsonPath]: JSON.stringify({
                name: 'nested-bundle',
                transformer: 'my-transformer',
                templates: [{
                    template: 'templates/pages/node.hbs',
                    from: 'document.nodes',
                    output: '{{id}}.md',
                    'output-type': 'repeated',
                    partials: ['partials/rel.hbs'],
                }],
            } as IndexFile),
            [path.join(mockBundlePath, 'templates', 'pages', 'node.hbs')]: '{{name}} {{> partials/rel.hbs}}',
            [path.join(mockBundlePath, 'partials', 'rel.hbs')]: 'rel partial',
            [path.join(mockBundlePath, 'my-transformer.ts')]: 'export default {}',
        };

        const childrenOf: Record<string, string[]> = {
            [mockBundlePath]: ['index.json', 'my-transformer.ts', 'templates', 'partials'],
            [path.join(mockBundlePath, 'templates')]: ['pages'],
            [path.join(mockBundlePath, 'templates', 'pages')]: ['node.hbs'],
            [path.join(mockBundlePath, 'partials')]: ['rel.hbs'],
        };

        (fs.existsSync as Mock).mockImplementation((filePath: string) => filePath === mockIndexJsonPath);
        (fs.readFileSync as Mock).mockImplementation((filePath: string) => fileContents[filePath]);
        (fs.readdirSync as Mock).mockImplementation((dirPath: string) => childrenOf[dirPath] ?? []);
        (fs.statSync as Mock).mockImplementation((p: string) => ({ isDirectory: () => dirs.has(p) }));

        const loader = new TemplateBundleFileLoader(mockBundlePath);
        const files = loader.getTemplateFiles();

        expect(Object.keys(files).sort()).toEqual(['partials/rel.hbs', 'templates/pages/node.hbs']);
        expect(files['templates/pages/node.hbs']).toContain('{{> partials/rel.hbs}}');
        expect(files).not.toHaveProperty('index.json');
        expect(files).not.toHaveProperty('my-transformer.ts');
    });
});


describe('SelfProvidedTemplateLoader', () => {
    const templatePath = '/mock/single/template.md';
    const templateContent = '# Hello {{name}}';
    const outputPath = '/mock/output/output.md';

    beforeEach(() => {
        vi.resetAllMocks();
        (fs.readFileSync as Mock).mockReturnValue(templateContent);
        (fs.existsSync as Mock).mockReturnValue(true);
        (fs.statSync as Mock).mockReturnValue({ isDirectory: () => false });
    });

    it('should load a single template and default output file correctly', () => {
        const loader = new SelfProvidedTemplateLoader(templatePath, outputPath);

        expect(loader.getTemplateFiles()).toEqual({
            'template.md': templateContent,
        });

        expect(loader.getConfig()).toEqual({
            name: 'Self Provided Template',
            templates: [{
                template: 'template.md',
                from: 'document',
                output: 'output.md',
                'output-type': 'single'
            }]
        });
    });

    it('should default output file to "output.md" if output path is a directory', () => {
        (fs.statSync as Mock).mockReturnValue({ isDirectory: () => true });

        const loader = new SelfProvidedTemplateLoader(templatePath, '/mock/output/');
        expect(loader.getConfig().templates[0].output).toBe('output.md');
    });
});

describe('SelfProvidedTemplateLoaderFrontmatter', () => {
    const templatePath = '/mock/single/template.md';
    const templateContent = `---
widget-options:
    a-widget:
        option1: true
---
# Hello {{ name }}`;
    const outputPath = '/mock/output/output.md';

    beforeEach(() => {
        vi.resetAllMocks();
        (fs.readFileSync as Mock).mockReturnValue(templateContent);
        (fs.existsSync as Mock).mockReturnValue(true);
        (fs.statSync as Mock).mockReturnValue({ isDirectory: () => false });
    });

    it('should load a single template and default output file correctly', () => {
        const loader = new SelfProvidedTemplateLoader(templatePath, outputPath);

        expect(loader.getTemplateFiles()).toEqual({
            'template.md': templateContent,
        });

        expect(loader.getConfig()).toEqual({
            name: 'Self Provided Template',
            templates: [{
                template: 'template.md',
                from: 'document',
                output: 'output.md',
                'output-type': 'single',
                'front-matter': {
                    widgetOptions: {
                        'a-widget': {
                            option1: true
                        }
                    }
                }
            }]
        });
    });
});

describe('SelfProvidedTemplateLoaderFrontmatterNull', () => {
    const templatePath = '/mock/single/template.md';
    const templateContent = `---
name: Test Document
widget-options:
---
# Hello {{ name }}`;
    const outputPath = '/mock/output/output.md';

    beforeEach(() => {
        vi.resetAllMocks();
        (fs.readFileSync as Mock).mockReturnValue(templateContent);
        (fs.existsSync as Mock).mockReturnValue(true);
        (fs.statSync as Mock).mockReturnValue({ isDirectory: () => false });
    });

    it('should load a single template and default output file correctly', () => {
        const loader = new SelfProvidedTemplateLoader(templatePath, outputPath);

        expect(loader.getTemplateFiles()).toEqual({
            'template.md': templateContent,
        });

        expect(loader.getConfig()).toEqual({
            name: 'Self Provided Template',
            templates: [{
                template: 'template.md',
                from: 'document',
                output: 'output.md',
                'output-type': 'single',
                'front-matter': {
                    variables: {
                        name: 'Test Document'
                    }
                }
            }]
        });
    });
});

describe('SelfProvidedDirectoryTemplateLoader', () => {
    const templateDir = '/mock/templates';
    const files = ['doc1.md', 'doc2.hbs', 'doc3.md', 'readme.txt'];
    const fileContents: Record<string, string> = {
        'doc1.md': `---
name: Sample Document
widget-options:
    sample-widget:
        enabled: false
---
# Markdown template`,
        'doc2.hbs': '{{data}} handlebars template',
        'doc3.md': `---
widget-options:
    sample-widget:
        enabled: false
---
# Markdown template`,
        'readme.txt': ''
    };

    beforeEach(() => {
        vi.resetAllMocks();

        (fs.readdirSync as Mock).mockReturnValue(files);
        (fs.readFileSync as Mock).mockImplementation(function (filePath: string) {
            const fileName = path.basename(filePath);
            return fileContents[fileName] || '';
        });
        (fs.existsSync as Mock).mockReturnValue(true);
        // Files should return isDirectory: false to prevent infinite recursion
        (fs.statSync as Mock).mockReturnValue({ isDirectory: () => false });
    });

    it('should load all .md and .hbs files and build config entries', () => {
        const loader = new SelfProvidedDirectoryTemplateLoader(templateDir);

        expect(loader.getTemplateFiles()).toEqual({
            'doc1.md': `---
name: Sample Document
widget-options:
    sample-widget:
        enabled: false
---
# Markdown template`,
            'doc2.hbs': '{{data}} handlebars template',
            'doc3.md': `---
widget-options:
    sample-widget:
        enabled: false
---
# Markdown template`,
            'readme.txt': ''
        });

        expect(loader.getConfig()).toEqual({
            name: 'Self Provided Template Directory',
            templates: [
                {
                    template: 'doc1.md',
                    from: 'document',
                    output: 'doc1.md',
                    'output-type': 'single',
                    'front-matter': {
                        variables: {
                            name: 'Sample Document'
                        },
                        widgetOptions: {
                            'sample-widget': {
                                enabled: false
                            }
                        }
                    }
                },
                {
                    template: 'doc2.hbs',
                    from: 'document',
                    output: 'doc2.hbs',
                    'output-type': 'single'
                },
                {
                    template: 'doc3.md',
                    from: 'document',
                    output: 'doc3.md',
                    'output-type': 'single',
                    'front-matter': {
                        widgetOptions: {
                            'sample-widget': {
                                enabled: false
                            }
                        }
                    }
                },
                {
                    template: 'readme.txt',
                    from: 'document',
                    output: 'readme.txt',
                    'output-type': 'single'
                }
            ]
        });
    });
});

describe('walkTemplateDirectory', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should visit every file with forward-slash relative paths, recursing into subdirectories', () => {
        const root = '/root';
        const dirs = new Set([root, path.join(root, 'sub'), path.join(root, 'sub', 'deep')]);
        const childrenOf: Record<string, string[]> = {
            [root]: ['top.hbs', 'sub'],
            [path.join(root, 'sub')]: ['mid.hbs', 'deep'],
            [path.join(root, 'sub', 'deep')]: ['leaf.hbs'],
        };

        (fs.readdirSync as Mock).mockImplementation((dir: string) => childrenOf[dir] ?? []);
        (fs.statSync as Mock).mockImplementation((p: string) => ({ isDirectory: () => dirs.has(p) }));

        const visited: string[] = [];
        walkTemplateDirectory(root, (_fullPath, relPath) => visited.push(relPath));

        expect(visited.sort()).toEqual(['sub/deep/leaf.hbs', 'sub/mid.hbs', 'top.hbs']);
    });

    it('should pass the absolute full path to the visitor', () => {
        const root = '/root';
        (fs.readdirSync as Mock).mockImplementation((dir: string) => (dir === root ? ['a.hbs'] : []));
        (fs.statSync as Mock).mockReturnValue({ isDirectory: () => false });

        const fullPaths: string[] = [];
        walkTemplateDirectory(root, (fullPath) => fullPaths.push(fullPath));

        expect(fullPaths).toEqual([path.join(root, 'a.hbs')]);
    });
});

describe('buildFrontMatterConfig', () => {
    it('should return undefined when neither variables nor widget options are present', () => {
        expect(buildFrontMatterConfig({}, {})).toBeUndefined();
    });

    it('should include only variables when no widget options are present', () => {
        expect(buildFrontMatterConfig({ name: 'Doc' }, {})).toEqual({
            variables: { name: 'Doc' }
        });
    });

    it('should include only widget options when no variables are present', () => {
        expect(buildFrontMatterConfig({}, { 'sample-widget': { enabled: false } })).toEqual({
            widgetOptions: { 'sample-widget': { enabled: false } }
        });
    });

    it('should include both variables and widget options when present', () => {
        expect(buildFrontMatterConfig({ name: 'Doc' }, { 'sample-widget': { enabled: true } })).toEqual({
            variables: { name: 'Doc' },
            widgetOptions: { 'sample-widget': { enabled: true } }
        });
    });
});
