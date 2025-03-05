import {
    CalmContainerImageInterface, CalmCore,
    CalmInterface, CalmMetadata,
    CalmPortInterface,
    CalmTemplateTransformer,
    Architecture
} from "@finos/calm-shared";
import {CalmCoreSchema} from "@finos/calm-shared/dist/types/core-types";
import {CalmNode} from "@finos/calm-shared/dist/model/node";
import {CalmRelationship, CalmRelationshipType} from "@finos/calm-shared/dist/model/relationship";

export class DocusaurusTransformer implements CalmTemplateTransformer {
    getTransformedModel(calmJson: string) {
        const calmSchema: CalmCoreSchema = JSON.parse(calmJson);
        const architecture: Architecture = CalmCore.fromJson(calmSchema);

        if (!architecture.nodes || !Array.isArray(architecture.nodes)) {
            throw new Error("Invalid CALM model: missing 'nodes' array.");
        }

        const visitedModel: any = {
            systems: [],
            nodes: [],
            relationships: [],
            flows: []
        };

        // Process nodes into categories
        architecture.nodes.forEach((node: CalmNode) => {
            const docEntry = {
                id: node.uniqueId,
                title: node.name,
                slug: `${node.uniqueId}`,
                content: node.description || 'No description available.',
                type: node.nodeType || 'unknown'
            };

            if (node.nodeType === "system") {
                visitedModel.systems.push(docEntry);
            } else {
                visitedModel.nodes.push(docEntry);
            }
        });

        // Process relationships
        architecture.relationships.forEach((relationship: CalmRelationship) => {
            visitedModel.flows.push({
                id: relationship.uniqueId,
                title: `Flow: ${relationship.relationshipType}`,
                slug: `/docs/flows/${relationship.relationshipType}`,
                content: `This flow describes the relationship: ${relationship.relationshipType}`
            });
        });

        return {
            docs: [
                ...visitedModel.systems,
                ...visitedModel.nodes,
                ...visitedModel.relationships,
                ...visitedModel.flows
            ],
            sidebar: this.generateSidebar(visitedModel)
        };
    }

    private generateSidebar(visitedModel: any) {
        return [
            {
                type: 'category',
                label: 'Systems',
                items: visitedModel.systems.map((doc: any) => doc.id)
            },
            {
                type: 'category',
                label: 'Nodes',
                items: visitedModel.nodes.map((doc: any) => doc.id)
            },
            {
                type: 'category',
                label: 'Relationships',
                items: visitedModel.relationships.map((doc: any) => doc.id)
            },
            {
                type: 'category',
                label: 'Flows',
                items: visitedModel.flows.map((doc: any) => doc.id)
            }
        ];
    }

    registerTemplateHelpers(): Record<string, (...args: any[]) => any> {
        return {};
    }
}

export default DocusaurusTransformer;
