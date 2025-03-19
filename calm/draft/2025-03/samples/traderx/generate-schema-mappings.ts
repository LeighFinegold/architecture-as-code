import * as fs from "fs";

// Load the JSON file
const jsonFilePath = "local-directory.json";
if (!fs.existsSync(jsonFilePath)) {
    console.error(`❌ Error: ${jsonFilePath} not found.`);
    process.exit(1);
}

const rawData = fs.readFileSync(jsonFilePath, "utf-8");
const schemas: Record<string, string> = JSON.parse(rawData);

// Filter only "control-requirement" schemas
const filteredSchemas = Object.entries(schemas)
    .filter(([key, _]) => key.includes("control-requirement"))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

if (Object.keys(filteredSchemas).length === 0) {
    console.error("❌ No matching control-requirement schemas found in local-directory.json.");
    process.exit(1);
}

// Function to generate XML entries
const generateXmlEntries = (): string => {
    return Object.entries(filteredSchemas)
        .map(([url, path]) => {
            const schemaName = url.split("/").pop()?.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "Unknown";
            return `
        <entry key="CALM ${schemaName}">
          <value>
            <SchemaInfo>
              <option name="name" value="CALM ${schemaName}" />
              <option name="relativePathToSchema" value="calm/draft/2025-03/samples/traderx/${path}" />
              <option name="schemaVersion" value="JSON Schema 2020-12" />
              <option name="applicationDefined" value="true" />              
            </SchemaInfo>
          </value>
        </entry>`;
        })
        .join("\n");
};

// Generate the final XML content
const generateXml = (): string => {
    return `<?xml version="1.0" encoding="UTF-8"?>
<project version="4">
  <component name="JsonSchemaMappingsProjectConfiguration">
    <state>
      <map>
        ${generateXmlEntries()}
      </map>
    </state>
  </component>
</project>`;
};

// Write the generated XML to `misc.xml`
const outputPath = "test.xml";
fs.writeFileSync(outputPath, generateXml(), "utf8");
console.log(`✅ IntelliJ schema mappings generated: ${outputPath}`);
