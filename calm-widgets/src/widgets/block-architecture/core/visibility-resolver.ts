import {
    CalmCoreCanonicalModel,
    CalmNodeCanonicalModel,
    CalmRelationshipCanonicalModel,
    toKindView,
    CalmRelationshipTypeKindView,
} from '@finos/calm-models/canonical';
import { NormalizedOptions } from '../types';
import { ParentHierarchyResult } from './relationship-analyzer';
import { VisibilityFilterChain } from './strategies/visibility-strategy';
import { FlowFocusStrategy } from './strategies/flow-focus-strategy';
import { NodeSeedingStrategy } from './strategies/node-seeding-strategy';
import { ChildrenExpansionStrategy } from './strategies/children-expansion-strategy';
import { NodeTypeFilterStrategy } from './strategies/node-type-filter-strategy';
import { ConnectedNeighborsStrategy } from './strategies/connected-neighbors-strategy';
import { ContainerFilterStrategy } from './strategies/container-filter-strategy';

export interface VisibilityResult {
    visibleNodes: Set<string>;
    filteredNodes: CalmNodeCanonicalModel[];
    filteredRels: CalmRelationshipCanonicalModel[];
    containerIds: Set<string>;
    warnings: string[];
}

/**
 * Determines which container IDs should be rendered based on the visibility policy.
 * 'none' = no containers, 'all' = all mentioned containers, 'parents' = only containers
 * that are direct parents of visible nodes.
 */
function collectContainerIdsForVisible(
    visible: Set<string>,
    parentOf: Map<string, string>,
    include: 'none' | 'parents' | 'all',
    allMentioned: Set<string>
): Set<string> {
    if (include === 'none') return new Set();
    if (include === 'all') return new Set(allMentioned);

    // parents
    const wanted = new Set<string>();
    for (const nid of visible) {
        const p = parentOf.get(nid);
        if (p) wanted.add(p);
    }
    return wanted;
}

/**
 * Orchestrates visibility determination using the Strategy pattern.
 * Creates a chain of filtering strategies and applies them in sequence.
 */
export function resolveVisibilityWithStrategies(
    context: CalmCoreCanonicalModel,
    opts: NormalizedOptions,
    parentHierarchyResult: ParentHierarchyResult,
    nodesById: Map<string, CalmNodeCanonicalModel>
): VisibilityResult {
    const { parentOf, allMentionedContainers, childrenOfContainer } = parentHierarchyResult;
    const nodes = context.nodes ?? [];
    const relationships = context.relationships ?? [];

    const filterChain = new VisibilityFilterChain()
        .addStrategy(new FlowFocusStrategy())
        .addStrategy(new NodeSeedingStrategy())
        .addStrategy(new ChildrenExpansionStrategy(childrenOfContainer))
        .addStrategy(new NodeTypeFilterStrategy(nodesById))
        .addStrategy(new ConnectedNeighborsStrategy())
        .addStrategy(new ContainerFilterStrategy(allMentionedContainers));

    const result = filterChain.applyFilters(
        context,
        opts,
        new Set(), // Start with empty set to properly detect focused vs unfocused scenarios
        relationships
    );

    const filteredNodes = nodes.filter(n => result.visibleNodes.has(n['unique-id']));
    const activeRelationships = result.activeRelationships || relationships;

    const filteredRels = activeRelationships.filter(r => {
        if (opts.edges === 'none') return false;
        const relTypeWithKind = toKindView(r['relationship-type']);

        // For "seeded" edges, only show relationships where ALL participants are visible
        if (opts.edges === 'seeded') {
            if (relTypeWithKind.kind === 'connects') {
                const connectsRel = relTypeWithKind as Extract<CalmRelationshipTypeKindView, { kind: 'connects' }>;
                return result.visibleNodes.has(connectsRel.source.node) && result.visibleNodes.has(connectsRel.destination.node);
            }
            if (relTypeWithKind.kind === 'interacts') {
                const interactsRel = relTypeWithKind as Extract<CalmRelationshipTypeKindView, { kind: 'interacts' }>;
                const actor = interactsRel.actor;
                const nodes = interactsRel.nodes || [];
                return result.visibleNodes.has(actor) && nodes.every((n: string) => result.visibleNodes.has(n));
            }
            return false;
        }

        if (relTypeWithKind.kind === 'connects') {
            const connectsRel = relTypeWithKind as Extract<CalmRelationshipTypeKindView, { kind: 'connects' }>;
            return result.visibleNodes.has(connectsRel.source.node) &&
                   result.visibleNodes.has(connectsRel.destination.node);
        }
        if (relTypeWithKind.kind === 'interacts') {
            const interactsRel = relTypeWithKind as Extract<CalmRelationshipTypeKindView, { kind: 'interacts' }>;
            return result.visibleNodes.has(interactsRel.actor) &&
                   (interactsRel.nodes || []).some((n: string) => result.visibleNodes.has(n));
        }
        return false;
    });

    // Determine which containers to render
    const containerIds = collectContainerIdsForVisible(
        result.visibleNodes,
        parentOf,
        opts.includeContainers,
        allMentionedContainers
    );

    return {
        visibleNodes: result.visibleNodes,
        filteredNodes,
        filteredRels,
        containerIds,
        warnings: [...parentHierarchyResult.warnings, ...result.warnings]
    };
}
