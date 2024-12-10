export interface Relationship {
    'unique-id': string;
    description: string;
    'relationship-type': RelationshipType;
    protocol?: string;
}

export interface RelationshipType {
    interacts?: InteractsType;
    connects?: ConnectsType;
    'deployed-in'?: DeployedInType;
    'composed-of'?: ComposedOfType;
}
export interface InteractsType {
    actor: string;
    nodes: string[];
}

export interface ConnectsType {
    source: NodeInterface;
    destination: NodeInterface;
}

export interface DeployedInType {
    container: string;
    nodes: string[];
}

export interface ComposedOfType {
    container: string;
    nodes: string[];
}

export interface NodeInterface {
    node: string;
}
