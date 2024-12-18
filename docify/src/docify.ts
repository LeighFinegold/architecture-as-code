import {parseArchitectureJson} from "./utils/json-parser";
import {promises as fs} from 'fs';
import {CalmException, FileNotFoundException, NotImplementedException} from "./models/exception";
import {Failure, isSuccess, Success, Try} from "./models/try"
import {generateMarkdownForArchitecture} from "./generators/sad-template-generator";

export enum DocifyMode {
    OFFLINE = 'Offline',
    ONLINE = 'Online'
}

export enum OutputFormat {
    SAD_TEMPLATE = 'SadTemplate'
}

export type CalmDocument = string;

export class Docify {

    private urlFileMapping: Map<string, string>;

    constructor(urlFileMapping: Map<string, string> = new Map()) {
        this.urlFileMapping = urlFileMapping;
    }

    public async execute(docLink: string, mode: DocifyMode, outputFormat: OutputFormat) {
        const bundle = await this.fetchCalmBundle(docLink, mode);
        return await this.transform(docLink, bundle, outputFormat);
    }

    public async transform(docLink: string, bundle: Map<string, string>, outputFormat: OutputFormat) {
        console.log(`Transforming ${docLink} to output of type ${outputFormat}`)

        const calmDocument = bundle.get(docLink);
        if (calmDocument) {
            const architecture = parseArchitectureJson(calmDocument);
            if (outputFormat === OutputFormat.SAD_TEMPLATE) {
                console.log("Generating Markdown");
                return generateMarkdownForArchitecture(architecture);
            }
        }
    }

    public async fetchCalmBundle(docLink: string, mode: DocifyMode, visited: Set<string> = new Set()): Promise<Map<string, string>> {
        if (visited.has(docLink)) {
            return new Map();
        }

        visited.add(docLink);

        let doc: Try<CalmDocument, CalmException>

        if (mode === DocifyMode.OFFLINE) {
            const mappedPath = this.urlFileMapping.get(docLink);
            const filePath = mappedPath || docLink;
            console.log(`fetching ${filePath}`)
            doc = await this.readDocumentFromFile(filePath);
        } else {
            doc = await this.fetchDocumentFromCalmHub(docLink);
        }

        const linkToDocumentMap = new Map<string, string>();
        if (isSuccess(doc)) {
            const links: string[] = await this.resolveLinks(doc.value);

            linkToDocumentMap.set(docLink, doc.value);

            for (const link of links) {
                const linkedDocMap = await this.fetchCalmBundle(link, mode, visited);
                this.mergeMaps(linkToDocumentMap, linkedDocMap);
            }
        }

        return linkToDocumentMap;
    }

    public mergeMaps(targetMap: Map<string, string>, sourceMap: Map<string, string>): void {
        sourceMap.forEach((value, key) => {
            targetMap.set(key, value);
        });
    }

    public async readDocumentFromFile(docLink: string): Promise<Try<CalmDocument, CalmException>> {
        try {
            console.log(`Reading ${docLink}`);
            const docContent = await fs.readFile(docLink, 'utf-8');
            return Success(docContent);
        } catch (error) {
            console.log(`Read Error: ${error}`);
            return Failure(new FileNotFoundException(`Failed to read document from file`));
        }
    }

    public async fetchDocumentFromCalmHub(docLink: string): Promise<Try<CalmDocument, CalmException>> {
        return Failure(new NotImplementedException("CalmHub Not Yet Available"));
    }

    public async resolveLinks(doc: CalmDocument): Promise<string[]> {
        const extractLinks = (data: any): string[] => {
            let links: string[] = [];

            if (typeof data === 'string') {
                // Check if the string contains a URL (we'll use a simple regex for this)
                const urlRegex = /(?<=["']|^)(https:\/\/\S+)(?=["']|$)/g;
                const matches = data.match(urlRegex);
                if (matches) {
                    // Add each match to the links array
                    links.push(...matches);
                }
            } else if (Array.isArray(data)) {
                // If data is an array, recursively process each item
                data.forEach(item => links.push(...extractLinks(item)));
            } else if (typeof data === 'object' && data !== null) {
                // If data is an object, recursively process each key-value pair
                Object.values(data).forEach(value => links.push(...extractLinks(value)));
            }

            return links;
        };
        const allLinks = extractLinks(doc);
        console.log(`Extracted links ${JSON.stringify(allLinks)}`)
        return extractLinks(doc);
    }
}
