
export type Direction = "source-to-destination" | "destination-to-source";

export interface Transition {
    "relationship-unique-id": string;
    "sequence-number": number;
    summary: string;
    direction?: Direction;
}

export interface Metadata {
    [key: string]: any;
}

// Flow type
export interface Flow {
    "unique-id": string;
    name: string;
    description: string;
    "requirement-url"?: string;
    transitions: Transition[];
    metadata: Metadata[];
}