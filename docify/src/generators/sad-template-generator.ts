import {Architecture} from "../models/architecture";
import path from "path";
import * as fs from "fs";
import Handlebars from 'handlebars';

export function generateMarkdownForArchitecture(architecture: Architecture): string {
    const templatePath = path.join(__dirname, 'templates', 'sad-template.hbs');
    const template = fs.readFileSync(templatePath, 'utf-8');
    Handlebars.registerHelper('getProperty', function(obj, property) {
        return obj[property];
    });
    const compiledTemplate = Handlebars.compile(template);

    return compiledTemplate(architecture);
}