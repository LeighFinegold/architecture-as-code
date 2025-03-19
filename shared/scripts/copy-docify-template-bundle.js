const fs = require("fs-extra");
const path = require("path");

console.log("Copying non-TS files to dist...");

const sourceDir = path.resolve(__dirname, "../src/docify/template-bundles");
const destDir = path.resolve(__dirname, "../dist/docify/template-bundles");

// Copy all files except TypeScript ones
fs.copySync(sourceDir, destDir, {
    overwrite: true,
    filter: (src) => !src.endsWith(".ts") && !src.endsWith(".tsx"),
});

console.log("✅ Non-TS files copied successfully!");
