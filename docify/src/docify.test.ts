/*
import { Docify } from './docify'; // Assuming your class is in Docify.ts

describe('Docify', () => {
    let docify: Docify;
    let mockDoc: any;

    beforeEach(() => {
        // Mock the document data and output format
        mockDoc = { content: 'Some document content' }; // Example mock document
        docify = new Docify(mockDoc, 'md');
    });

    it('should spy on async methods and call them during execute', async () => {
        // Mock private methods using jest-mock-extended
        const fetchDocumentMock = jest.spyOn(docify, 'fetchDocument' as any).mockImplementation()
        const resolveLinksMock = jest.spyOn(docify, 'resolveLinks' as any).mockImplementation();
        const validateDocumentMock =jest.spyOn(docify, 'validateDocument' as any).mockImplementation();
        const transformMock = jest.spyOn(docify, 'transform' as any).mockImplementation();

        // Call the execute method, which internally calls the private methods
        await docify.execute();

        // Assertions
        expect(fetchDocumentMock).toHaveBeenCalledTimes(1); // Expect it to be called once
        expect(resolveLinksMock).toHaveBeenCalledTimes(1); // Expect it to be called once
        expect(validateDocumentMock).toHaveBeenCalledTimes(1); // Expect it to be called once
        expect(transformMock).toHaveBeenCalledTimes(1); // Expect it to be called once
    });

    it('should handle error in fetchDocument gracefully', async () => {
        const fetchDocumentMock = jest.spyOn(docify, 'fetchDocument' as any).mockRejectedValue(new Error('Fetch error'));

        // We expect that execute should fail gracefully, but let's just test for the spy call
        await expect(docify.execute()).rejects.toThrow('Fetch error');

        expect(fetchDocumentMock).toHaveBeenCalledTimes(1);
    });
});
*/

import {Docify, DocifyMode, OutputFormat} from './docify';
import {Failure, Success} from './models/try';
import {FileNotFoundException, NotImplementedException} from './models/exception';
import * as JsonParser from './utils/json-parser';
import {promises as fs} from 'fs';

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(), // Mocking the promises API of fs
    },
}));
jest.mock('./utils/json-parser');

describe('Docify Class', () => {
    let docify: Docify;

    beforeEach(() => {
        docify = new Docify();
    });


    // Test for the execute method
    describe('execute', () => {
        it('should call fetchCalmBundle and transform', async () => {
            const docLink = 'someDocumentLink';
            const mode: DocifyMode = DocifyMode.OFFLINE;
            const outputFormat: OutputFormat = OutputFormat.SAD_TEMPLATE;

            const fetchCalmBundleSpy = jest.spyOn(docify, 'fetchCalmBundle' as any).mockResolvedValue(new Map([['someDocumentLink', 'document content']]));
            const transformSpy = jest.spyOn(docify, 'transform' as any).mockResolvedValue(undefined);

            await docify.execute(docLink, mode, outputFormat);

            expect(fetchCalmBundleSpy).toHaveBeenCalledWith(docLink, mode);
            expect(transformSpy).toHaveBeenCalledWith(docLink, new Map([['someDocumentLink', 'document content']]), outputFormat);
        });
    });

    // Test for the fetchCalmBundle method with offline mode
    describe('fetchCalmBundle', () => {
        it('should read document from file in offline mode', async () => {
            const docLink = 'documentPath';
            const mode: DocifyMode = DocifyMode.OFFLINE
            const visited = new Set<string>();

            const readDocumentFromFileSpy = jest.spyOn(docify, 'readDocumentFromFile' as any).mockResolvedValue(Success('Document Content'));

            const result = await docify.fetchCalmBundle(docLink, mode, visited);

            expect(readDocumentFromFileSpy).toHaveBeenCalledWith(docLink);
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

            const fetchDocumentFromCalmHubSpy = jest.spyOn(docify, 'fetchDocumentFromCalmHub' as any).mockResolvedValue(Failure(new NotImplementedException('CalmHub Not Yet Available')));

            const result = await docify.fetchCalmBundle(docLink, mode, visited);

            expect(fetchDocumentFromCalmHubSpy).toHaveBeenCalledWith(docLink);
            expect(result).toEqual(new Map());
        });
    });


    describe('transform', () => {
        it('should call parseArchitectureJson with the document content', async () => {
            const docLink = 'documentLink';
            const bundle = new Map([['documentLink', '{"key": "value"}']]);
            const outputFormat: OutputFormat = OutputFormat.SAD_TEMPLATE;
            const parseArchitectureJsonSpy = jest.spyOn(JsonParser, "parseArchitectureJson" as any).mockReturnValue(undefined);

            await docify.transform(docLink, bundle, outputFormat);

            expect(parseArchitectureJsonSpy).toHaveBeenCalledWith('{"key": "value"}');
        });
    });

    // Test for resolveLinks method
    describe('resolveLinks', () => {
        it('should return an empty array', async () => {
            const doc = 'Some document content';
            const result = await docify.resolveLinks(doc);

            expect(result).toEqual([]);
        });
    });

    // Test for mergeMaps method
    describe('mergeMaps', () => {
        it('should merge two maps correctly', async () => {
            const map1 = new Map([['key1', 'value1']]);
            const map2 = new Map([['key2', 'value2']]);

            docify.mergeMaps(map1, map2);

            expect(map1).toEqual(new Map([['key1', 'value1'], ['key2', 'value2']]));
        });
    });


    describe('readDocumentFromFile', () => {
       it('should return Success if file is read correctly', async () => {
            const filePath = 'someFilePath';
            const content = 'File Content';
           (fs.readFile as jest.Mock).mockResolvedValue(content);

            const result = await docify.readDocumentFromFile(filePath);

            expect(result).toEqual(Success(content));
        });

        it('should return Failure if file is not found', async () => {
            const filePath = 'nonExistentFile';
            (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));


            const result = await docify.readDocumentFromFile(filePath);

            expect(result).toEqual(Failure(new FileNotFoundException('Failed to read document from file')));
        });
    });
});
