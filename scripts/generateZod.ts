import { format } from "prettier";
import jsonSchemaToZod from "json-schema-to-zod";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
const $RefParser = require('json-schema-ref-parser') as any;


(async () => {


    // Define the directory containing schema files
    const schemaDir = join(__dirname, '../calm/draft/2025-01/meta'); // Adjust the directory path if needed

    // Define the main entry schema (typically core.json)
    const rootSchemaPath = join(schemaDir, 'core.json');

    console.log('Resolving references for:', rootSchemaPath);

    // Dereference the root schema (core.json), pulling in all references from other files
    const resolvedSchema = await $RefParser.dereference(rootSchemaPath, {
        resolve: {
            file: { order: 1 },
            http: { order: 2 },
        },
    });
    const schema:string = JSON.stringify(resolvedSchema, null, 4);

    try {
        // Generate the formatted Zod schema code.
        // Convert the resolved JSON Schema into a Zod schema string.
        const code = jsonSchemaToZod(JSON.parse(schema),{
            name: "core",
            module: "esm",
            type: true});

        // Format the generated code using Prettier with the TypeScript parser.
        const generatedCode = await format(code, {   parser: "typescript",
            singleQuote: true,
            tabWidth: 4 });

        const outputDir = join(__dirname, "../shared", "src", "generated");
        const outputFile = join(outputDir, "zodSchema.ts");

        // Ensure the output directory exists.
        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
        }

        // Write the formatted code to the output file.
        writeFileSync(outputFile, generatedCode, "utf-8");

        console.log(`Generated Zod schema saved to ${outputFile}`);
    } catch (error) {
        console.error("Error generating Zod schema:", error);
    }
})();