export type NodeType = 'system' | 'actor' | 'web-client' | 'domain';  // Example of Node types
export interface Node {
    'unique-id': string;
    'node-type': NodeType;
    name: string;
    description: string;
    'data-classification'?: string;
}
