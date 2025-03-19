import * as fs from 'fs';
import * as path from 'path';

// Define the folder containing the control requirement files
const controlRequirementFolder = path.join(__dirname, 'control-requirement');
const oldUrl = "https://calm.finos.org/draft/2024-12";
const newUrl = "https://calm.finos.org/draft/2025-03";

// Function to process files recursively
function processFiles(directory: string): void {
    const files = fs.readdirSync(directory);

    for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            processFiles(filePath); // Recursively process subdirectories
        } else if (file.endsWith(".json")) {
            try {
                let content = fs.readFileSync(filePath, 'utf-8');
                if (content.includes(oldUrl)) {
                    content = content.replace(new RegExp(oldUrl, 'g'), newUrl);
                    fs.writeFileSync(filePath, content, 'utf-8');
                    console.log(`✅ Updated URL in ${filePath}`);
                }
            } catch (error) {
                console.error(`❌ Error processing ${filePath}:`, (error as Error).message);
            }
        }
    }
}

// Main function
function main() {
    if (!fs.existsSync(controlRequirementFolder)) {
        console.error(`Folder not found: ${controlRequirementFolder}`);
        process.exit(1);
    }

    console.log("🔍 Scanning and updating files...");
    processFiles(controlRequirementFolder);
    console.log("✅ Completed URL replacements.");
}

// Run the script
main();