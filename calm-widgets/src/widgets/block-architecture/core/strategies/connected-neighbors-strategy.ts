import { CalmCoreCanonicalModel, CalmRelationshipCanonicalModel, toKindView, CalmRelationshipTypeKindView } from '@finos/calm-models/canonical';
import { NormalizedOptions } from '../../types';
import { VisibilityFilterStrategy, VisibilityFilterResult } from './visibility-strategy';

/**
 * Strategy that expands visibility to include connected neighbors.
 */
export class ConnectedNeighborsStrategy implements VisibilityFilterStrategy {
    applyFilter(
        context: CalmCoreCanonicalModel,
        options: NormalizedOptions,
        currentVisible: Set<string>,
        relationships: CalmRelationshipCanonicalModel[]
    ): VisibilityFilterResult {
        let newVisible = currentVisible;

        // Expand neighbors when edges="connected" AND we have focus nodes
        if (options.edges === 'connected' && options.focusNodes?.length) {
            // Check if we're in a flow-focused scenario (which should skip neighbor expansion)
            const allNodeIds = new Set((context.nodes ?? []).map(n => n['unique-id']));
            const hasFlowSeeds = currentVisible.size > 0 && currentVisible.size < allNodeIds.size &&
                                 !options.focusNodes.every(id => currentVisible.has(id));

            if (!hasFlowSeeds) {
                newVisible = this.expandWithConnectedNeighbors(currentVisible, relationships);
            }
        }

        return {
            visibleNodes: newVisible,
            warnings: []
        };
    }

    /**
     * Expands the visible node set by adding direct neighbors connected via relationships.
     * For each visible node, adds nodes that are directly connected to it through
     * 'connects' type relationships, creating a neighborhood view.
     */
    private expandWithConnectedNeighbors(
        visible: Set<string>,
        relationships: CalmRelationshipCanonicalModel[]
    ): Set<string> {
        const out = new Set(visible);
        for (const rel of relationships) {
            const relTypeWithKind = toKindView(rel['relationship-type']);
            if (relTypeWithKind.kind !== 'connects') continue;

            // Use proper type narrowing with Extract utility type
            const connectsRel = relTypeWithKind as Extract<CalmRelationshipTypeKindView, { kind: 'connects' }>;
            const a = connectsRel.source.node;
            const b = connectsRel.destination.node;

            if (visible.has(a)) out.add(b);
            if (visible.has(b)) out.add(a);
        }
        return out;
    }
}
