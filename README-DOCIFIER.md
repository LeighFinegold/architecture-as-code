# CALM Monorepo Guide: calm-models, calm-widgets, and shared/docifier

This README is a compact reference you can paste back into a new session to quickly rehydrate context. It maps the key packages, the docifier pipeline, and how to run, test, and extend it.

- Repo packages covered here:
  - calm-models: domain classes and canonical mappers for CALM JSON.
  - calm-widgets: reusable Handlebars widgets + widget engine.
  - shared: docifier orchestration + template engine, preprocessor, path extractor, resolvers, and graphing utilities. Includes the Docusaurus template bundle.

## Package overview

- calm-models (packages: `@finos/calm-models`)
  - Core class: CalmCore (aggregate of nodes, relationships, flows, controls, metadata, adrs)
  - Models: CalmNode(+details), CalmRelationship (interacts/connects/deployed-in/composed-of/options), CalmFlow, CalmControls/CalmControl/CalmControlDetail, CalmMetadata
  - Resolvable wrappers: Resolvable<T> and ResolvableAndAdaptable<S,T> for late-binding URLs to values/models
  - Conversions:
    - fromSchema/toSchema: raw JSON schema ↔ model classes
    - toCanonicalSchema: canonical shape for templates
  - Exports: via package.json, `@finos/calm-models/model`, `@finos/calm-models/types`, `@finos/calm-models/canonical`

- calm-widgets (packages: `@finos/calm-widgets`)
  - WidgetEngine + WidgetRegistry + WidgetRenderer
  - Global template helpers: eq, ne, lookup, json, kebabCase, kebabToTitleCase, notEmpty, or, eachInMap, etc.
  - Built-in widgets: table, list, json-viewer, flow-sequence, related-nodes, block-architecture
  - Usage: registers each widget as a Handlebars helper (same id), renders as a partial with optional transform/validation

- shared (packages: `@finos/calm-shared`)
  - Docifier orchestration (Docifier class) and full templating pipeline
  - Template engine components:
    - TemplateProcessor: loads bundle, dereferences model, runs transformer, renders
    - TemplateEngine: compiles templates, registers helpers, renders files per index.json
    - TemplatePreprocessor: rewrites mustache paths/helpers into convertFromDotNotation for intuitive dot/bracket syntax
    - TemplatePathExtractor: implements the path mini-language using JSONPath (supports filter/sort/limit)
    - Bundle loaders: TemplateBundleFileLoader, SelfProvidedTemplateLoader, SelfProvidedDirectoryTemplateLoader
  - Resolvers & deref:
    - FileReferenceResolver, HttpReferenceResolver, CompositeReferenceResolver, MappedReferenceResolver
    - DereferencingVisitor: walks CalmCore to resolve Resolvables
  - Docify graphing helpers:
    - CalmRelationshipGraph: adjacency and BFS, related nodes/relationships
    - C4Model: builds Person/System/Container set + relationships
    - FlowSequenceHelper: resolves flow transition source/target names
    - ControlRegistry: aggregates requirements/configurations, grouped by domain
  - Docusaurus bundle: `shared/src/docify/template-bundles/docusaurus` with index.json + templates + transformer

## Docifier: what it does

Inputs:
- A CALM `.arch.json` file
- A template bundle (WEBSITE mode uses the built-in Docusaurus bundle)
- Optional URL→local path mapping (for offline or E2E usage)

Process:
1) Parse CALM: `CalmCore.fromSchema`
2) Dereference any Resolvable URLs in the model:
   - MappedReferenceResolver → Composite (File first, then HTTP)
   - DereferencingVisitor mutates Resolvable nodes into in-memory values/models
3) Transform model to a bundle-specific view model (e.g., DocusaurusTransformer)
4) Compile templates:
   - Preprocess mustache expressions to enable intuitive paths
   - Register helpers
   - Render all templates per index.json rules into the output directory

Outputs:
- A generated docs site tree (e.g., Docusaurus docs: nodes, relationships, flows, controls, sidebars, configs, static assets)

## Docifier usage

Programmatic (TypeScript/ESM, from `@finos/calm-shared` exports):

```ts
import { Docifier } from "@finos/calm-shared";

const mode = "WEBSITE"; // or "USER_PROVIDED" (requires templatePath)
const inputPath = "path/to/architecture.arch.json";
const outputPath = "out/docs";
const urlToLocalPathMapping = new Map<string, string>([
  ["https://example/config.json", "./local/config.json"],
]);

const docifier = new Docifier(
  mode,
  inputPath,
  outputPath,
  urlToLocalPathMapping
);
await docifier.docify();
```

Notes:
- WEBSITE mode uses the Docusaurus bundle and disables the widget engine (to avoid helper collisions for now).
- USER_PROVIDED mode requires a templatePath and enables the widget engine so you can use widgets in your templates.

Using TemplateProcessor directly (advanced):

```ts
import { TemplateProcessor } from "@finos/calm-shared";

const processor = new TemplateProcessor(
  inputPath,
  templateBundlePath,  // folder with index.json and templates
  outputPath,
  urlToLocalPathMapping,
  "bundle",           // or "template" or "template-directory"
  /* supportWidgetEngine */ false,
  /* clearOutputDirectory */ true
);
await processor.processTemplate();
```

Exports available from `@finos/calm-shared`:
- Docifier, DocifyMode
- TemplateProcessor, TemplateProcessingMode
- CalmTemplateTransformer, IndexFile, TemplateEntry
- C4Model, CalmRelationshipGraph
- validate/runGenerate utilities, logger, SchemaDirectory, etc.

## Docusaurus bundle anatomy

- Location: `shared/src/docify/template-bundles/docusaurus`
- `index.json` fields:
  - name: bundle name
  - transformer: module filename (TS/JS) providing the transformer class (default export)
  - templates: array of template entries:
    - template: file name to compile
    - from: key in the transformed model to use as data (e.g., `nodes`, `docs`, `flows`)
    - output: relative output path (supports `{{id}}` for repeated)
    - output-type: `single` | `repeated`
    - partials: optional array of partial template names to register before rendering
- Transformer: `docusaurus-transformer.ts` provides `getTransformedModel` and helpers
- Build:
  - `tsup` compiles the transformer to `dist/template-bundles/docusaurus/docusaurus-transformer.js`
  - `scripts/copy-templates.mjs` copies the rest (excluding the TypeScript transformer) into the dist bundle folder

## Template preprocessor mini-language

- Goal: Allow intuitive Handlebars in templates:
  - Standalone paths: `{{nodes['unique-id=="auth-service"'].name}}`
  - Helpers on paths: `{{table nodes filter='node-type=="service"' sort='name'}}`
  - Block helpers: `{{#each nodes as |n|}}...{{/each}}`
- Rewrites:
  - `{{foo.bar}}` → `{{convertFromDotNotation this "foo.bar"}}`
  - `{{helper nodes filter='x'}}` → `{{helper (convertFromDotNotation this "nodes" filter='x') filter='x'}}`
  - `{{#each items as |i|}}` → `{{#each (convertFromDotNotation this "items") as |i|}}`
- Not rewritten:
  - Control tags: `{{/each}}`, `{{! comment }}`, `{{> partial}}`, `{{else}}`
  - Subexpressions: `(eq x y)`
  - Relative paths: `../x`, `./y`
  - Reserved paths: `this`, `.`, `@index`, `@root`, `true`, `false`, `null`, `undefined`, `lookup`
- Widget shorthand:
  - Certain widget helpers imply the current context when called bare: e.g., `{{json-viewer}}` → `{{json-viewer this}}`
- Hash semantics:
  - `filter`, `sort`, `limit` are interpreted by `convertFromDotNotation` to refine results

## Path extraction rules (convertFromDotNotation)

- Fast path: direct property access for simple names without options
- JSONPath conversion for complex paths:
  - `nodes['id']` → `nodes[?(@['unique-id']=='id')]`
  - `[key=='value']` → `[?(@['key']=='value')]`
  - Keys in brackets are quoted if needed
  - Certain roots (`controls`, `metadata`) are non-filterable (literal bracket access kept)
- Returns:
  - Either a single object or an array; array return is likely when path ends after brackets or JSONPath yields multiple
- Options:
  - `filter`: object like `{ key: value }` or string `key=='value'`
  - `sort`: key or array of keys for `_.orderBy`
  - `limit`: maximum number of items

## Widgets (USER_PROVIDED templates)

- Widget engine registers built-ins: table, list, json-viewer, flow-sequence, related-nodes, block-architecture
- Helpers and partials are loaded from each widget’s folder; a widget helper named after the widget id renders its partial
- Global helpers (from widgets) include eq, ne, lookup, json, kebabCase, notEmpty, or, eachInMap, etc.
- Preprocessor recognizes known widget ids and injects `this` context when none is provided

## Reference resolution & dereferencing

- MappedReferenceResolver: rewrites URLs to local paths (e.g., for workshop fixtures)
- CompositeReferenceResolver: tries File → HTTP
- DereferencingVisitor walks the model and resolves Resolvable / ResolvableAndAdaptable values, recursing into resolved values

## Build, test, run

Monorepo uses npm workspaces.

Install and build:

```sh
npm i
npm -w calm-models run build
npm -w calm-widgets run build
npm -w shared run build
```

Run tests:

```sh
npm -w calm-models test
npm -w calm-widgets test
npm -w shared test
```

Docifier website generation (programmatic example, see usage above):
- Use `Docifier('WEBSITE', input.arch.json, outDir, mapping)`
- WEBSITE disables widget engine; USER_PROVIDED requires `templatePath` and enables widgets

## Gotchas & best practices

- Helper collisions: transformers and widgets register helpers with overlapping names (eq, json, lookup, etc.). WEBSITE mode disables widgets to prevent clashes. Prefer centralizing common helpers and using a single Handlebars instance per run.
- Hash duplication: for helper calls, `filter/sort/limit` appear both in convertFromDotNotation and as outer helper hash. Treat these as primarily for path extraction unless your helper opts into them.
- Filenames: repeated outputs rely on `{{id}}`. Ensure your transformer sets a safe `id` (e.g., uniqueId or a kebab-cased name) to avoid `undefined` or unsafe filenames.
- Global Handlebars: current pipeline uses the global instance. For isolation in complex flows/tests, prefer injecting/using a local instance.

## Useful exports (from `@finos/calm-shared`)

- Docifier, DocifyMode
- TemplateProcessor, TemplateProcessingMode
- CalmTemplateTransformer, IndexFile, TemplateEntry
- C4Model, CalmRelationshipGraph
- validate, runGenerate, logger, SchemaDirectory, etc.

## File path references (for quick navigation)

- calm-models: `src/model/*`, `src/canonical/*`, `src/types/*`
- calm-widgets: `src/widget-*.ts`, `src/widgets/*`
- shared:
  - Docifier: `src/docify/docifier.ts`
  - Template engine: `src/template/*`
  - Resolvers & visitor: `src/resolver/*`, `src/model-visitor/*`
  - Graphing: `src/docify/graphing/*`
  - Docusaurus bundle: `src/docify/template-bundles/docusaurus/*`

