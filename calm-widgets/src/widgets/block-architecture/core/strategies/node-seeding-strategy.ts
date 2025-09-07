import { CalmCoreCanonicalModel, CalmRelationshipCanonicalModel } from '@finos/calm-models/canonical';
import { NormalizedOptions } from '../../types';
import { VisibilityFilterStrategy, VisibilityFilterResult } from './visibility-strategy';

/**
 * Strategy that handles node seeding (initial visible set determination).
 * Uses focus nodes if specified, otherwise keeps all nodes visible.
 */
export class NodeSeedingStrategy implements VisibilityFilterStrategy {
    applyFilter(
        context: CalmCoreCanonicalModel,
        options: NormalizedOptions,
        currentVisible: Set<string>,
        _relationships: CalmRelationshipCanonicalModel[]
    ): VisibilityFilterResult {
        const allNodeIds = new Set((context.nodes ?? []).map(n => n['unique-id']));

        // Check if FlowFocusStrategy provided actual flow seeds
        const hasFlowSeeds = currentVisible.size > 0 && currentVisible.size < allNodeIds.size;

        if (hasFlowSeeds) {
            // Flow seeds were provided, filter them to valid node IDs
            return {
                visibleNodes: new Set([...currentVisible].filter(id => allNodeIds.has(id))),
                warnings: []
            };
        }

        // No flow seeds - apply focus node logic or default to all
        let newVisible: Set<string>;
        if (options.focusNodes?.length) {
            // Focus on specific nodes
            newVisible = new Set(options.focusNodes.filter(id => allNodeIds.has(id)));
        } else {
            // No focus specified - show all nodes
            newVisible = new Set(allNodeIds);
        }

        return {
            visibleNodes: newVisible,
            warnings: []
        };
    }
}
