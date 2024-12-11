import {parseArchitectureJson, parseFlowJson} from "./json-parser";
import {Architecture} from "../models/architecture";

describe("jsonParser", () => {

    // Test for parsing Architecture JSON data
    it("should parse Architecture JSON correctly", () => {
        const architectureJson = `{
      "nodes": [
        {"id": "node1", "name": "Database Server", "type": "Database"},
        {"id": "node2", "name": "Web Server", "type": "Server"}
      ],
      "relationships": [
        {"connects": {"source": {"id": "node1", "name": "Database Server", "type": "Database"}, "destination": {"id": "node2", "name": "Web Server", "type": "Server"}}},
        {"interacts": {"actor": "User", "nodes": ["node2"]}}
      ]
    }`;

        const parsedArchitecture:Architecture = parseArchitectureJson(architectureJson);

        expect(parsedArchitecture).toEqual({
            nodes: [
                { id: "node1", name: "Database Server", type: "Database" },
                { id: "node2", name: "Web Server", type: "Server" }
            ],
            relationships: [
                {
                    connects: {
                        source: { id: "node1", name: "Database Server", type: "Database" },
                        destination: { id: "node2", name: "Web Server", type: "Server" }
                    }
                },
                {
                    interacts: { actor: "User", nodes: ["node2"] }
                }
            ]
        });
    });

    it("should throw an error for invalid Architecture JSON", () => {
        const invalidJson = `{
      "nodes": [
        {"id": "node1", "name": "Database Server", "type": "Database"},
        {"id": "node2", "name": "Web Server", "type": "Server"}
      ]`; // Missing relationships

        expect(() => parseArchitectureJson(invalidJson)).toThrow("Invalid JSON format");
    });

    it('should correctly parse valid JSON into Flow type', () => {

        const validJson = `
            {
              "unique-id": "flow-add-update-account",
              "name": "Add or Update Account",
              "description": "Flow for adding or updating account information in the database",
              "transitions": [
                {
                  "relationship-unique-id": "web-gui-process-uses-accounts-service",
                  "sequence-number": 1,
                  "summary": "Submit Account Create/Update"
                },
                {
                  "relationship-unique-id": "accounts-service-uses-traderx-db-for-accounts",
                  "sequence-number": 2,
                  "summary": "inserts or updates account"
                },
                {
                  "relationship-unique-id": "web-gui-process-uses-accounts-service",
                  "sequence-number": 3,
                  "summary": "Returns Account Create/Update Response Status",
                  "direction": "destination-to-source"
                }
              ],
              "metadata": []
            }
            `;

        const parsedFlow = parseFlowJson(validJson);

        // Validate the parsed object matches the Flow structure
        expect(parsedFlow).toHaveProperty('unique-id', 'flow-add-update-account');
        expect(parsedFlow).toHaveProperty('name', 'Add or Update Account');
        expect(parsedFlow).toHaveProperty('description', 'Flow for adding or updating account information in the database');
        expect(parsedFlow).toHaveProperty('transitions');
        expect(Array.isArray(parsedFlow.transitions)).toBe(true);
        expect(parsedFlow.transitions).toHaveLength(3);

        // Validate first transition properties
        const firstTransition = parsedFlow.transitions[0];
        expect(firstTransition).toHaveProperty('relationship-unique-id', 'web-gui-process-uses-accounts-service');
        expect(firstTransition).toHaveProperty('sequence-number', 1);
        expect(firstTransition).toHaveProperty('summary', 'Submit Account Create/Update');
        expect(firstTransition.direction).toBeUndefined(); // direction is optional for the first transition

        // Validate third transition properties
        const thirdTransition = parsedFlow.transitions[2];
        expect(thirdTransition).toHaveProperty('relationship-unique-id', 'web-gui-process-uses-accounts-service');
        expect(thirdTransition).toHaveProperty('sequence-number', 3);
        expect(thirdTransition).toHaveProperty('summary', 'Returns Account Create/Update Response Status');
        expect(thirdTransition.direction).toBe('destination-to-source'); // direction should be set for this transition

        // Validate metadata (empty array in this case)
        expect(parsedFlow.metadata).toBeInstanceOf(Array);
        expect(parsedFlow.metadata).toHaveLength(0);
    });

    it('should throw an error if invalid JSON is provided', () => {
        const invalidJson = `
            {
              "unique-id": "flow-add-update-account",
              "name": "Invalid Flow",
              "description": 1232"
            }`;

        expect(() => parseFlowJson(invalidJson)).toThrowError(); // Assuming parseJson will throw an error for invalid JSON
    });



});