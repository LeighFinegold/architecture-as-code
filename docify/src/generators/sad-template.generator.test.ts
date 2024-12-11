import { Architecture } from '../models/architecture'; // Import the Architecture class
import { generateMarkdownForArchitecture } from './sad-template-generator'; // Import the generator function
describe('Markdown Generator', () => {
    it('should generate the correct markdown for architecture', () => {
        const architecture = new Architecture({
            "name": "Example Architecture",
            "description": "This is an example architecture with several relationship types.",
            "nodes": [
                {
                    "name": "Node1",
                    "node-type": "TypeA",
                    "description": "A sample node",
                    "data-classification": "Public",
                    "run-as": "User1",
                    "instance": "Instance1"
                },
                {
                    "name": "Node2",
                    "node-type": "TypeB",
                    "description": "Another node",
                    "data-classification": "Confidential",
                    "run-as": "User2",
                    "instance": "Instance2"
                }
            ],
            "relationships": [
                {
                    "unique-id": "1",
                    "description": "Interacts with services",
                    "relationship-type": {
                        "interacts": {
                            "actor": "ServiceA",
                            "nodes": ["Node1", "Node2"]
                        }
                    }
                },
                {
                    "unique-id": "2",
                    "description": "Connects database",
                    "relationship-type": {
                        "connects": {
                            "source": { "node": "Node1" },
                            "destination": { "node": "Node2" }
                        }
                    }
                },
                {
                    "unique-id": "3",
                    "description": "Deployed in container",
                    "relationship-type": {
                        "deployed-in": {
                            "container": "Container1",
                            "nodes": ["Node1", "Node2"]
                        }
                    }
                },
                {
                    "unique-id": "4",
                    "description": "Composed of container",
                    "relationship-type": {
                        "composed-of": {
                            "container": "Container2",
                            "nodes": ["Node1", "Node2"]
                        }
                    }
                }
            ]
        });

        console.log(JSON.stringify(architecture.relationships));


        const actualMarkdown = generateMarkdownForArchitecture(architecture);

        // Define the expected markdown string with complete node and relationship details
        const expectedMarkdown = `
# Example Architecture

**Description**: This is an example architecture with several relationship types.

## Nodes

| Name      | Node Type | Description   | Data Classification | Run As | Instance |
|-----------|-----------|---------------|---------------------|--------|----------|
| Node1     | TypeA     | A sample node | Public              | User1  | Instance1 |
| Node2     | TypeB     | Another node  | Confidential        | User2  | Instance2 |

## Relationships

### Interacts

| Actor    | Nodes                |
|----------|----------------------|
| ServiceA | Node1,Node2 |

### Connects

| Source Node  | Destination Node  |
|--------------|-------------------|
| Node1        | Node2             |

### Deployed In

| Container  | Nodes             |
|------------|-------------------|
| Container1 | Node1,Node2 |

### Composed Of

| Container  | Nodes             |
|------------|-------------------|
| Container2 | Node1,Node2 |
`.trim();

        // Normalize both generated and expected markdown by removing extra whitespaces
        function normalizeMarkdown(markdown:string) {
            markdown.replace(/\s+/g, ' ').trim();
        }

        expect(normalizeMarkdown(actualMarkdown)).toBe(normalizeMarkdown(expectedMarkdown));
    });
});
