import {Docify, DocifyMode, OutputFormat} from './docify';
import {Failure, Success} from './models/try';
import {FileNotFoundException, NotImplementedException} from './models/exception';
import * as JsonParser from './utils/json-parser';
import {promises as fs} from 'fs';
import * as SadTemplateGenerator from './generators/sad-template-generator';
import {Architecture} from './models/architecture';

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
    },
}));
jest.mock('./utils/json-parser');

describe('Docify Class', () => {
    let docify: Docify;

    beforeEach(() => {
        docify = new Docify();
    });

    describe('execute', () => {
        it('should call fetchCalmBundle and transform with proper arguments', async () => {
            const docLink = 'someDocumentLink';
            const mode: DocifyMode = DocifyMode.OFFLINE;
            const outputFormat: OutputFormat = OutputFormat.SAD_TEMPLATE;

            const fetchCalmBundleSpy = jest
                .spyOn(docify, 'fetchCalmBundle' as any)
                .mockResolvedValue(new Map([['someDocumentLink', 'document content']]));
            const transformSpy = jest
                .spyOn(docify, 'transform' as any)
                .mockResolvedValue(undefined);

            await docify.execute(docLink, mode, outputFormat);

            expect(fetchCalmBundleSpy).toHaveBeenCalledWith(docLink, mode);
            expect(transformSpy).toHaveBeenCalledWith(docLink, new Map([['someDocumentLink', 'document content']]), outputFormat);
        });
    });

    describe('fetchCalmBundle', () => {
        it('should read document from file in offline mode', async () => {
            const docLink = 'documentPath';
            const mode: DocifyMode = DocifyMode.OFFLINE;
            const visited = new Set<string>();

            jest.spyOn(docify, 'readDocumentFromFile' as any).mockResolvedValue(Success('Document Content'));

            const result = await docify.fetchCalmBundle(docLink, mode, visited);

            expect(result).toEqual(new Map([['documentPath', 'Document Content']]));
        });

        it('should return failure if document is not found in offline mode', async () => {
            const docLink = 'nonExistentFile';
            const mode: DocifyMode = DocifyMode.OFFLINE;
            const visited = new Set<string>();

            jest.spyOn(docify, 'readDocumentFromFile' as any).mockResolvedValue(Failure(new FileNotFoundException('File not found')));

            const result = await docify.fetchCalmBundle(docLink, mode, visited);

            expect(result).toEqual(new Map());
        });

        it('should call fetchDocumentFromCalmHub when mode is online', async () => {
            const docLink = 'documentLink';
            const mode: DocifyMode = DocifyMode.ONLINE;
            const visited = new Set<string>();

            jest.spyOn(docify, 'fetchDocumentFromCalmHub' as any).mockResolvedValue(Failure(new NotImplementedException('CalmHub Not Yet Available')));

            const result = await docify.fetchCalmBundle(docLink, mode, visited);

            expect(result).toEqual(new Map());
        });
    });

    describe('transform', () => {
        it('should call parseArchitectureJson and generateMarkdownForArchitecture', async () => {
            const docLink = 'documentLink';
            const bundle = new Map([['documentLink', '{"key": "value"}']]);
            const outputFormat: OutputFormat = OutputFormat.SAD_TEMPLATE;

            const architecture = new Architecture({
                name: 'Example Architecture',
                description: 'This is an example architecture.',
                nodes: [],
                relationships: [],
            });

            jest.spyOn(JsonParser, 'parseArchitectureJson' as any).mockReturnValue(architecture);
            jest.spyOn(SadTemplateGenerator, 'generateMarkdownForArchitecture' as any).mockReturnValue('Markdown Content');

            await docify.transform(docLink, bundle, outputFormat);

            expect(JsonParser.parseArchitectureJson).toHaveBeenCalledWith('{"key": "value"}');
            expect(SadTemplateGenerator.generateMarkdownForArchitecture).toHaveBeenCalledWith(architecture);
        });
    });

    describe('resolveLinks', () => {
        it('should return an empty array for documents without links', async () => {
            const doc = 'Some document content';
            const result = await docify.resolveLinks(doc);

            expect(result).toEqual([]);
        });
    });

    describe('mergeMaps', () => {
        it('should correctly merge two maps', () => {
            const map1 = new Map([['key1', 'value1']]);
            const map2 = new Map([['key2', 'value2']]);

            docify.mergeMaps(map1, map2);

            expect(map1).toEqual(new Map([['key1', 'value1'], ['key2', 'value2']]));
        });
    });

    describe('readDocumentFromFile', () => {
        it('should return Success when file is read successfully', async () => {
            const filePath = 'someFilePath';
            const content = 'File Content';
            (fs.readFile as jest.Mock).mockResolvedValue(content);

            const result = await docify.readDocumentFromFile(filePath);

            expect(result).toEqual(Success(content));
        });

        it('should return Failure when file is not found', async () => {
            const filePath = 'nonExistentFile';
            (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

            const result = await docify.readDocumentFromFile(filePath);

            expect(result).toEqual(Failure(new FileNotFoundException('Failed to read document from file')));
        });
    });
});
