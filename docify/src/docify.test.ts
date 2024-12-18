import {Docify, DocifyMode, OutputFormat} from './docify';
import {Failure, Success} from './models/try';
import {CalmException, FileNotFoundException} from './models/exception';
import * as JsonParser from './utils/json-parser';
import {promises as fs} from 'fs';
import * as SadTemplateGenerator from './generators/sad-template-generator';
import {Architecture} from './models/architecture';
import axios from 'axios';

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
    },
}));

jest.mock('axios');
jest.mock('./utils/json-parser');

jest.mock('./generators/sad-template-generator');

describe('Docify Class', () => {
    let docify: Docify;

    beforeEach(() => {
        docify = new Docify();
    });

    describe('execute', () => {

        const docLink = 'someDocumentLink';
        const mode = DocifyMode.OFFLINE;
        const outputFormat = OutputFormat.SAD_TEMPLATE;
        it('should fetch and transform a document successfully', async () => {


            jest.spyOn(docify, 'fetchCalmBundle' as any).mockResolvedValue(new Map([['someDocumentLink', 'document content']]));
            jest.spyOn(docify, 'transform' as any).mockResolvedValue('Markdown Content');
            const result = await docify.execute(docLink, mode, outputFormat);

            expect(result).toEqual('Markdown Content');
        });
        it('should throw an error if fetching fails', async () => {

            jest.spyOn(docify, 'fetchCalmBundle' as any).mockRejectedValue(new Error('Network Error'));
            await expect(docify.execute(docLink, DocifyMode.ONLINE, outputFormat)).rejects.toThrow('Network Error');
        });
    });

    describe('fetchCalmBundle', () => {
        it('should fetch documents recursively and resolve links', async () => {
            jest.spyOn(docify, 'resolveLinks' as any).mockResolvedValue(['link1', 'link2']);
            jest.spyOn(docify, 'fetchDocumentFromCalmHub' as any).mockImplementation((link) => {
                if (link === 'documentPath') {
                    return Promise.resolve(Success('{"links": ["link1", "link2"]}'));
                }
                if (link === 'link1') return Promise.resolve(Success('content1'));
                if (link === 'link2') return Promise.resolve(Success('content2'));
            });

            const result = await docify.fetchCalmBundle('documentPath', DocifyMode.ONLINE);

            expect(result).toEqual(
                new Map([
                    ['documentPath', '{"links": ["link1", "link2"]}'],
                    ['link1', 'content1'],
                    ['link2', 'content2'],
                ])
            );
        });

    });

    describe('transform', () => {
        it('should parse JSON and generate Markdown', async () => {
            const docLink = 'documentLink';
            const bundle = new Map([['documentLink', '{"key": "value"}']]);
            const outputFormat = OutputFormat.SAD_TEMPLATE;

            const architecture = new Architecture({
                name: 'Example',
                description: 'An example architecture',
                nodes: [],
                relationships: [],
            });

            jest.spyOn(JsonParser, 'parseArchitectureJson' as any).mockReturnValue(architecture);
            jest.spyOn(SadTemplateGenerator, 'generateMarkdownForArchitecture' as any).mockReturnValue('Generated Markdown');

            const result = await docify.transform(docLink, bundle, outputFormat);

            expect(JsonParser.parseArchitectureJson).toHaveBeenCalledWith('{"key": "value"}');
            expect(SadTemplateGenerator.generateMarkdownForArchitecture).toHaveBeenCalledWith(architecture);
            expect(result).toEqual('Generated Markdown');
        });
    });

    describe('resolveLinks', () => {
        it('should extract links from JSON content', async () => {
            const doc = '{"links": ["https://example.com", "https://nested.com"] }';
            jest.spyOn(JSON, 'parse' as any).mockReturnValue(JSON.parse(doc));

            const result = await docify.resolveLinks(doc);
            expect(result).toEqual(['https://example.com', 'https://nested.com']);
        });

        it('should return an empty array for content without links', async () => {
            const doc = '{"noLinks": "value"}';

            const result = await docify.resolveLinks(doc);

            expect(result).toEqual([]);
        });
    });

    describe('readDocumentFromFile', () => {
        it('should return Success when reading succeeds', async () => {
            const filePath = 'somePath';
            (fs.readFile as jest.Mock).mockResolvedValue('File Content');

            const result = await docify.readDocumentFromFile(filePath);

            expect(result).toEqual(Success('File Content'));
        });

        it('should return Failure when reading fails', async () => {
            const filePath = 'invalidPath';
            (fs.readFile as jest.Mock).mockRejectedValue(new Error('Not Found'));

            const result = await docify.readDocumentFromFile(filePath);

            expect(result).toEqual(Failure(new FileNotFoundException('Failed to read document from file')));
        });
    });

    describe('fetchDocumentFromCalmHub', () => {
        it('should return Success for a valid response', async () => {
            const docLink = 'https://example.com';
            (axios.get as jest.Mock).mockResolvedValue({status: 200, data: 'Document Content'});

            const result = await docify.fetchDocumentFromCalmHub(docLink);

            expect(result).toEqual(Success('Document Content'));
        });

        it('should return Failure for an error response', async () => {
            (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));
            const docLink = 'https://example.com';
            const result = await docify.fetchDocumentFromCalmHub(docLink);

            expect(result).toEqual(Failure(new CalmException('Failed to fetch document')));
        });
    });

    describe('mergeMaps', () => {
        it('should merge two maps correctly', () => {
            const map1 = new Map([['key1', 'value1']]);
            const map2 = new Map([['key2', 'value2']]);

            docify.mergeMaps(map1, map2);

            expect(map1).toEqual(new Map([
                ['key1', 'value1'],
                ['key2', 'value2']
            ]));
        });

        it('should override existing keys with values from the source map', () => {
            const map1 = new Map([['key1', 'value1']]);
            const map2 = new Map([['key1', 'newValue']]);

            docify.mergeMaps(map1, map2);

            expect(map1).toEqual(new Map([
                ['key1', 'newValue']
            ]));
        });
    });
});
