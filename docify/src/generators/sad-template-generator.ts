import {Architecture} from "../models/architecture";
import path from "path";
import * as fs from "fs";
import Handlebars from 'handlebars';
import {Relationship} from "../models/relationship";
import {Flow} from "../models/flow";

export function generateMarkdownForArchitecture(architecture: Architecture, bundle: Map<string, string> = new Map<string, string>()): string {
    const sadTemplatePath = path.join(__dirname, 'templates', 'sad-template.hbs');
    const flowTemplatePath = path.join(__dirname, 'templates', 'flow.hbs');
    const nodeTemplatePath = path.join(__dirname, 'templates', 'nodes.hbs');
    const architectureTemplatePath = path.join(__dirname, 'templates', 'architecture.hbs');
    const relationshipsTemplatePath = path.join(__dirname, 'templates', 'nodes.hbs');
    const sadTemplate = fs.readFileSync(sadTemplatePath, 'utf-8');
    const flowTemplate = fs.readFileSync(flowTemplatePath, 'utf-8');
    const nodesTemplate = fs.readFileSync(nodeTemplatePath, 'utf-8');
    const relationshipsTemplate = fs.readFileSync(relationshipsTemplatePath, 'utf-8')
    const architectureTemplate = fs.readFileSync(architectureTemplatePath, 'utf-8')

    Handlebars.registerPartial('flow', flowTemplate);
    Handlebars.registerPartial('nodes', nodesTemplate);
    Handlebars.registerPartial('relationships', relationshipsTemplate);
    Handlebars.registerPartial('architecture', architectureTemplate);

    const flows = architecture.flows.map(flowDoc => {
        return JSON.parse(bundle.get(flowDoc)) as Flow
    })
    const relationshipMap: Record<string, { source: string; destination: string }> = {};


    flows.forEach(flow => {

        flow.transitions.forEach(transition => {
            // Assuming metadata contains the relationship source/destination
            const relationships = architecture.relationships.filter(r => r["relationship-type"]["connects"]);
            const relationship = relationships.find(rel => rel["unique-id"] === transition["relationship-unique-id"]);

            if (relationship) {
                relationshipMap[transition["relationship-unique-id"]] = {
                    source: relationship["relationship-type"].connects.source.node,
                    destination: relationship["relationship-type"].connects.destination.node,
                };
            }
        });
    });


    Handlebars.registerHelper('getProperty', function (obj, property) {
        return obj[property];
    });

    Handlebars.registerHelper('getFlow', function (flowPath: string) {
        return JSON.parse(bundle.get(flowPath));
    });

    Handlebars.registerHelper('getInteractRelationships', function (relationships: Relationship[]) {
        return relationships.filter(r => r["relationship-type"]["interacts"]);
    });

    Handlebars.registerHelper('getConnectRelationships', function (relationships: Relationship[]) {
        return relationships.filter(r => r["relationship-type"]["connects"]);
    });

    Handlebars.registerHelper('getDeployedInRelationship', function (relationships: Relationship[]) {
        return relationships.filter(r => r["relationship-type"]["connects"]);
    });

    Handlebars.registerHelper('getContainsRelationships', function (relationships: Relationship[]) {
        return relationships.filter(r => r["relationship-type"]["connects"]);
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


    const compiledTemplate = Handlebars.compile(sadTemplate);

    return compiledTemplate(architecture);
}