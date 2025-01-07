import {Architecture} from "../models/architecture";
import path from "path";
import * as fs from "fs";
import Handlebars from 'handlebars';
import {Relationship} from "../models/relationship";
import {Flow} from "../models/flow";


export function generateMarkdown(architecture: Architecture, bundle: Map<string, string> = new Map<string,string>()): string {
    const flowDocs = architecture.flows;
    const flows = flowDocs.map(flowDoc => {
        return JSON.parse(bundle.get(flowDoc) || '{}') as Flow
    })
    const relationshipMap: Record<string, { source: string; destination: string }> = {};


    flows.forEach((flow) => {
        flow.transitions.forEach((transition) => {
            const relationships = architecture.relationships.filter(
                (r) => r["relationship-type"]?.connects
            );

            const relationship = relationships.find(
                (rel) => rel["unique-id"] === transition["relationship-unique-id"]
            );

            if (relationship) {
                relationshipMap[transition["relationship-unique-id"]] = {
                    source: relationship["relationship-type"]?.connects?.source?.node || "unknown",
                    destination: relationship["relationship-type"]?.connects?.destination?.node || "unknown",
                };
            } else {
                console.warn(
                    `No relationship found for unique ID: ${transition["relationship-unique-id"]}`
                );
            }
        });
    });


    // Register helpers
    Handlebars.registerHelper("getSource", function (relationshipId: string): string {
        const relationship = relationshipMap[relationshipId];
        return relationship ? relationship.source : "Unknown Source";
    });

    Handlebars.registerHelper("getDestination", function (relationshipId: string): string {
        const relationship = relationshipMap[relationshipId];
        return relationship ? relationship.destination : "Unknown Destination";
    });

    Handlebars.registerHelper("eq", function (a: any, b: any): boolean {
        return a === b;
    });


    const mermaidSequenceDiagram = path.join(__dirname, 'templates', 'flows.hbs');
    const templateContent = fs.readFileSync(mermaidSequenceDiagram, 'utf-8');


    const template = Handlebars.compile(templateContent);

    // Generate Mermaid diagrams for each flow
    const markdown = flows
        .map(flow => {
            const diagram = template(flow);
            return `${diagram}`;
        })
        .join('\n\n');

    return markdown;
}