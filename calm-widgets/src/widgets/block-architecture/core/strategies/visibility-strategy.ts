import { CalmCoreCanonicalModel, CalmRelationshipCanonicalModel } from '@finos/calm-models/canonical';
import { NormalizedOptions } from '../../types';

/**
 * Base interface for visibility filtering strategies.
 * Each strategy handles a specific aspect of visibility determination.
 */
export interface VisibilityFilterStrategy {
    /**
     * Applies the filtering strategy to determine visibility.
     * @param context The CALM canonical model
     * @param options Normalized filtering options
     * @param currentVisible Currently visible node IDs
     * @param relationships Active relationships (may be pre-filtered)
     * @returns Updated visibility state and any warnings
     */
    applyFilter(
        context: CalmCoreCanonicalModel,
        options: NormalizedOptions,
        currentVisible: Set<string>,
        relationships: CalmRelationshipCanonicalModel[]
    ): VisibilityFilterResult;
}

export interface VisibilityFilterResult {
    visibleNodes: Set<string>;
    activeRelationships?: CalmRelationshipCanonicalModel[];
    seedNodes?: Set<string>;
    warnings: string[];
}

/**
 * Orchestrates multiple visibility filtering strategies in sequence.
 * This implements the Chain of Responsibility pattern where each filter
 * can modify the visibility state and pass it to the next filter.
 */
export class VisibilityFilterChain {
    private strategies: VisibilityFilterStrategy[] = [];

    addStrategy(strategy: VisibilityFilterStrategy): this {
        this.strategies.push(strategy);
        return this;
    }

    applyFilters(
        context: CalmCoreCanonicalModel,
        options: NormalizedOptions,
        initialVisible: Set<string>,
        relationships: CalmRelationshipCanonicalModel[]
    ): VisibilityFilterResult {
        let currentVisible = new Set(initialVisible);
        let currentRelationships = relationships;
        const allWarnings: string[] = [];
        let seedNodes: Set<string> | undefined;

        for (const strategy of this.strategies) {
            const result = strategy.applyFilter(context, options, currentVisible, currentRelationships);

            currentVisible = result.visibleNodes;
            if (result.activeRelationships) {
                currentRelationships = result.activeRelationships;
            }
            if (result.seedNodes) {
                seedNodes = result.seedNodes;
            }
            allWarnings.push(...result.warnings);
        }

        return {
            visibleNodes: currentVisible,
            activeRelationships: currentRelationships,
            seedNodes,
            warnings: allWarnings
        };
    }
}
