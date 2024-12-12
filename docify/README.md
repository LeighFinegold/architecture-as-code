# `docify` CLI Documentation

The `docify` CLI is a powerful tool for generating structured and readable documentation from CALM documents, whether they are stored locally or retrieved from a centralized document store known as **CALM Hub**. This CLI simplifies the process of fetching, validating, and transforming CALM documents into formats like Markdown.

---

## Overview

The `docify` CLI works in **stages** to automate the documentation process:

1. **Retrieve**: Fetch CALM documents from the specified location, which can be:
    - A CALM Hub URL (e.g., `https://calm.finos.org/traderx/flow/add-account`)
    - A local file path for offline processing.

2. **Resolve Links**: If the CALM document contains links to other CALM documents, `docify` recursively retrieves and processes those linked documents.

3. **Parse and Validate**: The CLI parses the document and ensures it adheres to the CALM specification.

4. **Transform**: Based on the specified output format (e.g., Markdown), `docify` transforms the document into the desired format.

---

## Usage

### Basic Command

```bash
docify --uri <source> --output <format>
```

### Parameters

| Parameter       | Description                                                   |
|------------------|---------------------------------------------------------------|
| `--uri`         | The source location of the document (CALM Hub URL or file).   |
| `--output`      | The desired output format (e.g., `md`).                       |

---

# Example Documentation for `docify` CLI

---

## Documentation Generated from Example Commands

### Fetch from CALM Hub and generate Markdown

Command:
```bash
docify --uri https://calm.finos.org/traderx/flow/add-account --output md
```

### Fetch a local CALM document and generate Markdown:

```bash
docify --uri ./local-file.json --output md
```
