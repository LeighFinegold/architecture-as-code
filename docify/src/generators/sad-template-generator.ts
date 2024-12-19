import {Architecture} from "../models/architecture";
import path from "path";
import * as fs from "fs";
import Handlebars from 'handlebars';
import {Relationship} from "../models/relationship";

export function generateMarkdownForArchitecture(architecture: Architecture, bundle: Map<string, string>): string {
    const templatePath = path.join(__dirname, 'templates', 'sad-template.hbs');
    const template = fs.readFileSync(templatePath, 'utf-8');
    Handlebars.registerHelper('getProperty', function (obj, property) {
        return obj[property];
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

    const compiledTemplate = Handlebars.compile(template);

    return compiledTemplate(architecture);
}