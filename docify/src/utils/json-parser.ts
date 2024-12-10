import {Architecture} from "../models/architecture";
import {Flow} from "../models/flow";

export function parseJson<T>(json: string): T {
    try {
        return JSON.parse(json) as T;
    } catch (error) {
        throw new Error("Invalid JSON format");
    }
}

// Function to parse Node JSON data
export function parseArchitectureJson(json: string): Architecture {
    return parseJson<Architecture>(json);
}

export function parseFlowJson(json: string): Flow {
    return parseJson<Flow>(json);
}