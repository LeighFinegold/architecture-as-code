# Validation Design

Technical design for CALM document validation in `shared` (`@finos/calm-models` model +
`shared/src/commands/validate`). Covers the current architecture, the phased-validation model, and a
proposal for a first-class **ValidationRule** abstraction with two implementations (Spectral and
custom-on-model).

> **Status: adopted.** The `ValidationRule` + `ValidationEngine` abstraction described in §6 is
> implemented. `validate()` now builds a `ValidationContext` and delegates to a
> `ValidationEngine` (`validation-engine.ts`) that runs the registered rules
> (`rules/spectral-rule.ts`, `rules/json-schema-rule.ts`, `rules/controls-rule.ts`,
> `rules/node-details-rule.ts`). Shared pure helpers live in `validation-helpers.ts`; the rule
> interfaces/types in `validation-rule.ts`. The external `ValidationOutcome` contract, error/warning
> flags, and output ordering are unchanged.

---

## 1. Objectives

- **O1 — One authoritative validator in `shared`.** Validation is a library concern, not a CLI
  concern. The CLI, CALM Hub (upload), CalmStudio, and any future tool call the same
  `validate(...)` entry point so guarantees cannot be bypassed by hitting an API directly.
- **O2 — Phased validation.** Run cheap/broad linting (Spectral) and structural schema validation
  (JSON Schema) as distinct phases, plus semantic/model checks (controls, node-details recursion).
  A failure in one phase still lets other phases report, so users get a complete picture.
- **O3 — Uniform, machine-readable output.** Every phase emits `ValidationOutput` items aggregated
  into a single `ValidationOutcome` with stable `code`, `severity`, JSON-pointer `path`, and
  `source`. Downstream (JUnit/JSON/pretty formatters, Hub UI) depends on this shape.
- **O4 — Cycle- and reference-safe traversal.** Detailed architectures and control configs are
  references that can form cycles; traversal must terminate and must not re-fetch or re-adapt more
  than necessary.
- **O5 — Extensibility.** Adding a new check should not require touching the orchestrator. Today it
  does (see §6).

## 2. Assumptions

- **A1 — Downstream expects the current `ValidationOutcome` contract.** `hasErrors`/`hasWarnings`
  drive process exit codes (`exitBasedOffOfValidationOutcome`); formatters read `jsonSchema*` and
  `spectral*` output arrays and each `ValidationOutput` field. Changing the *internals* of
  validation must **not** change this external contract.
- **A2 — `SchemaDirectory` is the single resolution boundary.** All remote/relative document and
  schema loading goes through `SchemaDirectory` (backed by a `DocumentLoader`). Validators never
  fetch directly.
- **A3 — The model owns references.** `Resolvable`/`ResolvableAndAdaptable` (calm-models) are the
  canonical representation of a `$ref`-like pointer. Raw documents are transient; only adapted model
  objects persist.
- **A4 — Spectral operates on raw JSON; model checks operate on the typed model.** Spectral rules
  use JSONPath (`given`/`then`) over the stringified document. Model checks (controls, node-details)
  operate on `CalmCore`. These are two different substrates today.
- **A5 — A pattern may be an explicit CALM pattern or the CALM core schema.** The orchestrator
  honours the architecture's `$schema` or an explicitly supplied pattern.
- **A6 — Validation is read-only and side-effect-free** apart from logging and cache population in
  `SchemaDirectory`.

## 3. Current architecture (as-built)

`validate(architecture?, patternOrSchema?, timeline?, schemaDirectory?, debug)` is the single entry
point. It dispatches by input combination to one of four flows, each returning a `ValidationOutcome`.

```mermaid
classDiagram
    class validate {
        <<entry point>>
        +validate(architecture, patternOrSchema, timeline, schemaDirectory, debug) ValidationOutcome
    }
    class Dispatch {
        <<module functions>>
        +validateArchitectureAgainstPattern(arch, pattern, dir, debug, visited)
        +validateArchitectureOnly(arch, dir, debug, visited)
        +validatePatternOnly(pattern, dir, debug)
        +validateTimeline(timeline, schema, dir, debug)
        -validateArchitectureDispatch: ArchitectureValidator
    }
    class SpectralPhase {
        +runSpectralValidations(doc, ruleset, source) SpectralResult
    }
    class JsonSchemaValidator {
        -ajv: Ajv2020
        +initialize() Promise
        +validate(instance) ErrorObject[]
    }
    class validateAllControls {
        <<function>>
        +validateAllControls(arch, pattern, dir, debug)
    }
    class validateNodeDetails {
        <<function>>
        +validateNodeDetails(arch, dir, debug, recursiveValidator, visited)
    }
    class SchemaDirectory {
        +getSchema(id) object
        +loadDocument(id, type) object
        +fork() SchemaDirectory
        +loadSchemas()
        +storeDocument(...)
    }
    class DocumentLoader {
        <<interface>>
        +loadMissingDocument(id, type)
    }
    class ValidationOutcome {
        +jsonSchemaValidationOutputs: ValidationOutput[]
        +spectralSchemaValidationOutputs: ValidationOutput[]
        +hasErrors: boolean
        +hasWarnings: boolean
    }
    class ValidationOutput {
        +code
        +severity
        +message
        +path
        +schemaPath
        +source
        +error(code,msg,path,opts)$
        +warning(code,msg,path,opts)$
    }
    class SpectralResult {
        +errors: boolean
        +warnings: boolean
        +spectralIssues: ValidationOutput[]
    }

    validate --> Dispatch
    Dispatch --> SpectralPhase
    Dispatch --> JsonSchemaValidator
    Dispatch --> validateAllControls
    Dispatch --> validateNodeDetails
    validateNodeDetails ..> Dispatch : recursiveValidator (ArchitectureValidator)
    Dispatch --> ValidationOutcome
    SpectralPhase --> SpectralResult
    JsonSchemaValidator --> SchemaDirectory
    validateAllControls --> SchemaDirectory
    validateNodeDetails --> SchemaDirectory
    SchemaDirectory --> DocumentLoader
    ValidationOutcome o-- ValidationOutput
    SpectralResult o-- ValidationOutput
```

### Supporting model & traversal (calm-models + shared)

```mermaid
classDiagram
    class Resolvable~T~ {
        +reference: string
        +isResolved: boolean
        +value: T
        +dereference(resolver) Promise
    }
    class ResolvableAndAdaptable~S,T~ {
        +reference: string
        +dereference(resolver) Promise
    }
    class AnyResolvable {
        <<type>>
    }
    class ModelWalker {
        -resolver: CalmReferenceResolver
        -hook?: ResolvableHook
        +errors: ModelWalkError[]
        +walk(obj, path, activeRefs)
    }
    class ResolvableHook {
        <<interface>>
        +onResolvable(node, path)
    }
    class DereferencingVisitor {
        +visit(obj)
    }
    class iterateControls {
        <<generator>>
        +iterateControls(architecture) ControlLocation
    }
    AnyResolvable <|.. Resolvable
    AnyResolvable <|.. ResolvableAndAdaptable
    ModelWalker --> CalmReferenceResolver
    ModelWalker ..> ResolvableHook : optional
    ModelWalker ..> AnyResolvable
    DereferencingVisitor --> ModelWalker
```

**Notes on the current design**
- Both paths now dereference through a single resolver interface, `CalmReferenceResolver`
  (`canResolve`/`resolve`). The **dereference visitor** (template/docify path) drives `ModelWalker`
  with a resolver, and validation node-details loads sub-architectures through the same interface.
- Cycle safety lives in two independent places, by design: `ModelWalker` uses path-scoped
  `activeRefs` (resolve *every* occurrence, stop only true cycles — what docify needs), while the
  validation node-details recursion uses the `CachingTrackingResolver`'s global visited-tracking
  (validate each sub-architecture *once*). The *traversals* stay separate — validation needs the raw
  JSON, forks a `SchemaDirectory` and re-enters the phase engine, none of which `ModelWalker` does.
- `validateNodeDetails` recurses by calling back into the engine via the injected
  `ArchitectureValidator` (avoids a circular import) and forks a cache-seeded `SchemaDirectory` per
  sub-architecture for AJV schema-id isolation.
- Reference loading, caching and visited-tracking are owned by a single `CachingTrackingResolver`
  decorator (see §3.1), replacing the earlier ad-hoc `loadDocument` + `visitedUrls: Set<string>`
  pairing.

## 3.1 Reference tracking + caching seam (`CachingTrackingResolver`)

The CALM model is *lazily* dereferenced — a `ResolvableAndAdaptable<CalmCoreSchema, CalmCore>`
only calls `resolve(ref)` when a caller chooses to dereference it, and the resolve function returns
the **raw** `CalmCoreSchema` before it is adapted to `CalmCore`. Node-details validation needs that
raw document (for Spectral + JSON-Schema), so the resolve seam is the natural place to centralise:

- **caching** — a reference is fetched at most once; repeat requests return the cached raw document;
- **tracking** — every attempted reference is recorded, giving dedupe ("validate each
  detailed-architecture once") and cycle safety without each caller keeping its own `Set`.

`CachingTrackingResolver` is a **decorator** that `implements CalmReferenceResolver`, wrapping any
inner resolver. This is the single resolver interface used by both the model dereference path and
validation:

```mermaid
classDiagram
    class CalmReferenceResolver {
        <<interface>>
        +canResolve(ref) boolean
        +resolve(ref) Promise
    }
    class CachingTrackingResolver {
        -delegate: CalmReferenceResolver
        -cache: Map~string, unknown~
        -seen: Set~string~
        +canResolve(ref) boolean
        +resolve(ref) Promise
        +has(ref) boolean
        +get(ref) unknown
        +markSeen(ref) void
        +resolvedReferences: ReadonlySet~string~
    }
    class SchemaDirectoryReferenceResolver {
        -schemaDirectory: SchemaDirectory
        +canResolve(ref) boolean
        +resolve(ref) Promise
    }
    CalmReferenceResolver <|.. CachingTrackingResolver
    CalmReferenceResolver <|.. SchemaDirectoryReferenceResolver
    CachingTrackingResolver o-- CalmReferenceResolver : decorates
```

A reference is marked *seen* before the underlying load is awaited, so a failed load still counts as
seen (a sibling referencing the same failing URL is not retried) — preserving the historical
`visitedUrls.add`-before-load semantics. Only successful loads populate the value cache. In
validation the decorator wraps a `SchemaDirectoryReferenceResolver` (which loads architecture
documents via `schemaDirectory.loadDocument(ref, 'architecture')`); in docify the **caller**
(`TemplateProcessor`) composes the decorator around its resolver (`Mapped` → `Composite`) so repeated
references are fetched once. `DereferencingVisitor` itself is agnostic — it dereferences through
whatever `CalmReferenceResolver` it is given. `ModelWalker` drives dereferencing through whichever
`CalmReferenceResolver` it is given.

## 4. Phased validation

For an architecture-against-pattern validation the phases are:

```mermaid
flowchart TD
    A[validate entry] --> B[Phase 1: Spectral lint<br/>pattern rules + architecture rules]
    B --> C[Phase 2: JSON Schema<br/>compile pattern, validate architecture]
    C --> D[Phase 3: Controls<br/>iterateControls -> requirement schema -> AJV]
    D --> E[Phase 4: Node details<br/>recurse detailed-architecture<br/>two-phase per sub-arch]
    E --> F[Aggregate -> ValidationOutcome]
    F --> G[exitBasedOffOfValidationOutcome / formatOutput]
```

- **Phase 1 — Spectral (lint / semantic-on-JSON).** `runSpectralValidations` runs a `RulesetDefinition`
  (`rules-architecture`, `rules-pattern`, `rules-timeline`). Custom checks such as `idsAreUnique`,
  `nodeIdExists`, `interfaceIdExistsOnNode`, `sequenceNumbersAreUnique` are Spectral **custom
  functions** over JSONPath.
- **Phase 2 — JSON Schema (structural).** `JsonSchemaValidator` compiles the pattern/core schema with
  AJV (async schema loading via `SchemaDirectory`) and validates the architecture.
- **Phase 3 — Controls (semantic-on-model).** `validateAllControls` enumerates controls via
  `iterateControls`, resolves each requirement schema (URL or `#`-pointer into the pattern) and
  validates the control config against it with AJV.
- **Phase 4 — Node details (recursive).** `validateNodeDetails` loads each
  `details.detailed-architecture` through the shared `CachingTrackingResolver`, discovers its pattern
  (`required-pattern` or `$schema`) and re-enters phases 1–4 for the sub-architecture, cycle-guarded
  by that resolver's visited-reference tracking.

Phases 3–4 only run when a `SchemaDirectory` is available; all phases contribute to the same
`ValidationOutcome` and OR their `hasErrors`/`hasWarnings` together.

## 5. The problem this exposes

The four phases are **not uniform**. Phases 1–2 are engine-driven (Spectral, AJV). Phases 3–4 are
hand-written traversals wired directly into the orchestrator. Two consequences:

1. **Two substrates for "custom" checks.** A semantic rule (e.g. "every node id is unique") is a
   Spectral function over JSON; a semantic rule like "control config satisfies its requirement" is
   bespoke TypeScript over the model. There is no common notion of "a validation rule".
2. **The orchestrator knows every check.** Adding a check means editing
   `validateArchitectureAgainstPattern`/`validateArchitectureOnly` (they already hand-inline the
   controls and node-details calls in both branches). This violates O5.

## 6. Proposal — a first-class `ValidationRule` abstraction

Introduce `ValidationRule` as the unit of validation, with a `ValidationContext` input and
`ValidationOutput[]` output, executed by a `ValidationEngine`. Provide **two implementations**:

- `SpectralValidationRule` — adapts a Spectral `RulesetDefinition` (raw-JSON / JSONPath rules).
- `ModelValidationRule` — a check over the **typed** `CalmCore` model. `validateAllControls` and
  `validateNodeDetails` become `ModelValidationRule`s. As built, they traverse with bespoke
  iteration (`iterateControls`, node iteration); node-details tracks visited references through a
  `CachingTrackingResolver`. `ModelWalker` is available as a shared cycle-safe traversal they *may*
  adopt in future but do not use today.

```mermaid
classDiagram
    class ValidationRule {
        <<interface>>
        +id: string
        +description: string
        +phase: ValidationPhase
        +run(context) Promise~ValidationOutput[]~
    }
    class ValidationContext {
        +architecture: object
        +model: CalmCore
        +pattern?: object
        +schemaDirectory: SchemaDirectory
        +references: CachingTrackingResolver
        +debug: boolean
    }
    class ValidationPhase {
        <<enumeration>>
        LINT
        STRUCTURAL
        SEMANTIC
        RECURSIVE
    }
    class SpectralValidationRule {
        -ruleset: RulesetDefinition
        -source: string
        +run(context)
    }
    class ModelValidationRule {
        <<abstract>>
        +run(context)
    }
    class ControlsRule {
        +run(context)
    }
    class NodeDetailsRule {
        +run(context)
    }
    class JsonSchemaRule {
        +run(context)
    }
    class ValidationEngine {
        -rules: ValidationRule[]
        +register(rule)
        +validate(context) ValidationOutcome
    }

    ValidationRule <|.. SpectralValidationRule
    ValidationRule <|.. JsonSchemaRule
    ValidationRule <|.. ModelValidationRule
    ModelValidationRule <|-- ControlsRule
    ModelValidationRule <|-- NodeDetailsRule
    ModelValidationRule ..> ModelWalker : optional (future)
    ValidationEngine o-- ValidationRule
    ValidationEngine --> ValidationContext
    ValidationEngine --> ValidationOutcome
    ValidationRule --> ValidationOutput
```

**Execution flow with the engine**

```mermaid
sequenceDiagram
    participant Caller
    participant Engine as ValidationEngine
    participant R1 as SpectralValidationRule
    participant R2 as JsonSchemaRule
    participant R3 as ControlsRule
    participant R4 as NodeDetailsRule
    Caller->>Engine: validate(context)
    Engine->>R1: run(context)   %% LINT
    Engine->>R2: run(context)   %% STRUCTURAL
    Engine->>R3: run(context)   %% SEMANTIC
    Engine->>R4: run(context)   %% RECURSIVE (re-enters Engine per sub-arch)
    R4-->>Engine: outputs
    Engine-->>Caller: aggregated ValidationOutcome
```

### What this buys us
- **O5 extensibility:** new checks = new `ValidationRule` registered with the engine; the
  orchestrator stops growing.
- **Uniform semantics for "custom" checks:** a rule author chooses substrate — JSONPath
  (`SpectralValidationRule`) or typed model (`ModelValidationRule`) — but both produce
  `ValidationOutput[]` and are scheduled the same way.
- **Node-details recursion becomes ordinary:** `NodeDetailsRule.run` builds a child
  `ValidationContext` (forked `SchemaDirectory`, shared `CachingTrackingResolver`) and calls
  `engine.validate` again — the recursion the orchestrator hand-threads today.
- **Migration path for Spectral custom functions:** model-oriented checks (`idsAreUnique`,
  `nodeIdExists`, …) *can* move to `ModelValidationRule`s over `CalmCore` if/when we want type-safe,
  non-JSONPath checks — but this is optional and can be incremental.

### Costs / risks
- New indirection; the current four-phase flow is simple and well-tested (44 ported + suite).
- Ordering/short-circuit semantics must be defined (today: all phases always run and OR their
  flags). The engine must preserve A1 exactly (same `ValidationOutcome` shape and flag semantics).
- `ValidationContext` couples several inputs; needs care so `ModelValidationRule`s don't reach for
  things they shouldn't (keep raw JSON vs model access explicit).

## 7. Recommendation

- **Adopt `ValidationRule` + `ValidationEngine` incrementally**, without changing the external
  contract (A1) or behaviour: **✅ done.**
  1. Introduce `ValidationRule`, `ValidationContext`, `ValidationEngine` and wrap the **existing**
     four phases as rules (`SpectralValidationRule`, `JsonSchemaValidationRule`,
     `ControlsValidationRule`, `NodeDetailsValidationRule`). Orchestrator is now "build context →
     `engine.validate`". **✅ implemented.**
  2. Keep Spectral custom functions as-is under `SpectralValidationRule` (no rewrite). **✅ kept.**
  3. Optionally, later, migrate selected JSONPath custom functions to `ModelValidationRule`s where
     type-safety/readability wins. *(future work — not done.)*
- **Do not** collapse Spectral into the model layer or vice-versa; the two-implementation split is
  the point — Spectral stays best for declarative JSONPath assertions, `ModelValidationRule` for
  reference-following / typed-model semantics (controls, node-details, cross-entity invariants).

### As-built notes
- Cycle short-circuit for a failed pattern compilation (architecture-with-pattern) is modelled by an
  optional `abort` flag on `RuleResult`; the engine stops after an aborting rule. Architecture-only
  compile failures deliberately do **not** abort (matching prior behaviour).
- Within-phase order is preserved via a stable sort, so `spectral-pattern` lints before
  `spectral-architecture`, keeping output ordering identical to the old `mergeSpectralResults`.

## 8. Open questions

- ~~Should phases be **short-circuiting**?~~ Resolved: always-run, except the historical
  pattern-compile abort, encoded as `RuleResult.abort`.
- ~~Where should the `ValidationEngine` own **cycle state**?~~ Resolved: a single
  `CachingTrackingResolver` on `ValidationContext` owns reference loading, caching and
  visited-tracking (no behaviour change). Folding node-details into `ModelWalker`'s path-scoped set
  remains possible future work.
- Do we expose rule **ids/phases** in `ValidationOutput` (better UX / filtering) — additive to A1?
- Is `ValidationContext` the right seam for CALM Hub upload (it already has `SchemaDirectory`), or
  does Hub need a thinner facade?
