import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const BASE_DIR = path.join(__dirname);
const CONTROL_CONFIG_DIR = path.join(BASE_DIR, 'control-configuration');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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

const promptUser = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
        rl.question(`${message} (Press Enter to accept, any other key to skip): `, (answer) => {
            resolve(answer.trim() === '');
        });
    });
};

const processFiles = async () => {
    const files = getFilesRecursively(CONTROL_CONFIG_DIR);

    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf8');
            let json = JSON.parse(content);
            let modified = false;

            if (json.$schema && json.$schema.includes('control-requirements')) {
                const newSchema = json.$schema.replace('control-requirements', 'control-requirement');
                const confirm = await promptUser(`Change schema in ${file} to: ${newSchema}?`);
                if (confirm) {
                    json.$schema = newSchema;
                    modified = true;
                }
            }

            if (json.$id && json.$id.includes('/config/')) {
                const newId = json.$id.replace('/config/', '/control-configuration/');
                const confirm = await promptUser(`Change $id in ${file} to: ${newId}?`);
                if (confirm) {
                    json.$id = newId;
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(file, JSON.stringify(json, null, 2));
                console.log(`Updated: ${file}`);
            }
        } catch (error) {
            console.error(`Error processing file: ${file}`, error);
        }
    }
    rl.close();
};

processFiles();