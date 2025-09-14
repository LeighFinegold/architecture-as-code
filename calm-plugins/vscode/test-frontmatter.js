const { parseFrontMatter, isTemplateFileWithArchitecture } = require('./dist/util/frontMatter.js');

// Test the parsing functions
console.log('Testing front-matter parsing...\n');

const testFiles = [
  '/Users/leighfinegold/IdeaProjects/architecture-as-code-1/test-template.md',
  '/Users/leighfinegold/IdeaProjects/architecture-as-code-1/node-focus-template.md',
  '/Users/leighfinegold/IdeaProjects/architecture-as-code-1/docs/flow-template.md'
];

testFiles.forEach(file => {
  console.log(`\n--- Testing: ${file} ---`);
  
  const isTemplate = isTemplateFileWithArchitecture(file);
  console.log(`Is template with architecture: ${isTemplate}`);
  
  if (isTemplate) {
    const parsed = parseFrontMatter(file);
    if (parsed) {
      console.log(`Has architecture: ${parsed.hasArchitecture}`);
      console.log(`Architecture path: ${parsed.architecturePath}`);
      console.log(`Front-matter:`, parsed.frontMatter);
      console.log(`Content preview: ${parsed.content.substring(0, 100)}...`);
    }
  }
});