import { Docifier } from './docifier';
import { TemplateProcessor } from '../template/template-processor';
import { Mock } from 'vitest';
vi.mock('../template/template-processor');

// Get the mocked constructor (the class itself)
const MockedTemplateProcessor = vi.mocked(TemplateProcessor);

describe('Docifier', () => {
    const inputPath = 'some/input/path';
    const outputPath = 'some/output/path';
    const urlToLocalPathMapping = new Map<string, string>();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should throw an error when mode is "SAD"', () => {
        expect(() => {
            new Docifier('SAD', inputPath, outputPath, urlToLocalPathMapping);
        }).toThrowError('Mode "SAD" is not supported.');
    });

    it('should instantiate TemplateProcessor for mode "WEBSITE" and call processTemplate', async () => {
        const processTemplateMock = vi.fn().mockResolvedValue(undefined);

        // Mock the constructor return value
        (MockedTemplateProcessor as Mock).mockImplementationOnce(() => ({
            processTemplate: processTemplateMock,
        }));

        const docifier = new Docifier('WEBSITE', inputPath, outputPath, urlToLocalPathMapping);
        await docifier.docify();

        // Assert constructor was called with the right args
        expect(MockedTemplateProcessor).toHaveBeenCalledWith(
            inputPath,
            expect.stringContaining('template-bundles/docusaurus'),
            outputPath,
            urlToLocalPathMapping
        );

        // Assert method was called
        expect(processTemplateMock).toHaveBeenCalled();
    });
});
