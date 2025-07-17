export type CalmInterfaceDefinitionSchema = {
    'unique-id': string;
    'definition-url': string;
    config: Record<string, unknown>;
}

export type CalmInterfaceTypeSchema = {
    'unique-id': string;
}

export type CalmNodeInterfaceSchema = {
    node: string;
    interfaces?: string[];
}

