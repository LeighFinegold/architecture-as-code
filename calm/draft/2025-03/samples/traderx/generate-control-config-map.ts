import * as fs from 'fs';
import * as path from 'path';

// Define the folder containing the control configuration files
const controlConfigFolder = path.join(__dirname, 'control-configuration');
const baseUrl = "https://calm.finos.org/traderx/control-configuration/";

// Function to generate the key-value mapping
function generateMapping(): Record<string, string> {
    if (!fs.existsSync(controlConfigFolder)) {
        console.error(`Folder not found: ${controlConfigFolder}`);
        process.exit(1);
    }

    const mapping: Record<string, string> = {};
    const files = fs.readdirSync(controlConfigFolder);

    for (const file of files) {
        const filePath = path.join(controlConfigFolder, file);
        if (fs.statSync(filePath).isFile() && file.endsWith(".json")) {
            const key = baseUrl + file.replace(".json", "");
            const value = `control-configuration/${file}`;
            mapping[key] = value;
        }
    }

    return mapping;
}

// Main function
function main() {
    console.log("🔍 Generating control configuration mapping...");
    const mapping = generateMapping();
    const outputFilePath = path.join(__dirname, 'control_configuration_mapping.json');
    fs.writeFileSync(outputFilePath, JSON.stringify(mapping, null, 2), 'utf-8');
    console.log(`✅ Mapping file created: ${outputFilePath}`);
}

// Run the script
main();
