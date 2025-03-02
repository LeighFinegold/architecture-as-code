import {CalmFlow, CalmFlowTransition, CalmTemplateTransformer} from "@finos/calm-shared";


export class FlowTransformer implements CalmTemplateTransformer {
    registerTemplateHelpers(): Record<string, (...args: any[]) => any> {
        return {
            eq: (a, b) => a === b
        };
    }

    getTransformedModel(calmJson: string): any {
        const flow: CalmFlow = CalmFlow.fromJson(JSON.parse(calmJson));

        const transformedTransitions = flow.transitions.map((transition: CalmFlowTransition) => ({
            relationshipId: transition.relationshipUniqueId,
            sequenceNumber: transition.sequenceNumber,
            summary: transition.summary,
            direction: transition.direction,
            source: this.getSourceFromRelationship(transition.relationshipUniqueId),
            target: this.getTargetFromRelationship(transition.relationshipUniqueId)
        }));

        return { flow: {
                id: flow.uniqueId,
                name: flow.name,
                description: flow.description,
                transitions: transformedTransitions
            }
        };
    }

    private getSourceFromRelationship(relationshipId: string): string {
        return relationshipId.split("-uses-")[0];
    }

    private getTargetFromRelationship(relationshipId: string): string {
        return relationshipId.split("-uses-").slice(-1)[0];
    }

    private parseFlowTransitions(flowTransitions: any[]): CalmFlowTransition[] {
        return flowTransitions.map(flowTransition => new CalmFlowTransition(
            flowTransition['relationship-unique-id'],
            flowTransition['sequence-number'],
            flowTransition['summary'],
            flowTransition['direction']
        ));
    }
}

export default FlowTransformer;
