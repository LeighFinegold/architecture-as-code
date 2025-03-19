import * as fs from 'fs';
import * as path from 'path';

const BASE_DIR = path.join(__dirname);
const CONTROL_REQUIREMENT_DIR = path.join(BASE_DIR, 'control-requirement');

type IdMapping = { [key: string]: string };

const getFilesRecursively = (dir: string): string[] => {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getFilesRecursively(filePath));
        } else if (file.endsWith('.json')) {
            results.push(filePath);
        }
    });
    return results;
};

const extractIdAndMap = (files: string[]): IdMapping => {
    const idMap: IdMapping = {};
    files.forEach((file) => {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const json = JSON.parse(content);
            if (json.$id) {
                const relativePath = path.relative(BASE_DIR, file);
                idMap[json.$id] = relativePath;
            }
        } catch (error) {
            console.error(`Error processing file: ${file}`, error);
        }
    });
    return idMap;
};

const files = getFilesRecursively(CONTROL_REQUIREMENT_DIR);
const idMapping = extractIdAndMap(files);
const outputFilePath = path.join(__dirname, 'control_requirement_mapping.json');
fs.writeFileSync(outputFilePath, JSON.stringify(idMapping, null, 2), 'utf-8');
console.log(`✅ Mapping file created: ${outputFilePath}`);
