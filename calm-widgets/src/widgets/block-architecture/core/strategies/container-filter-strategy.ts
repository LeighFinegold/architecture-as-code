import { CalmCoreCanonicalModel, CalmRelationshipCanonicalModel } from '@finos/calm-models/canonical';
import { NormalizedOptions } from '../../types';
import { VisibilityFilterStrategy, VisibilityFilterResult } from './visibility-strategy';

/**
 * Strategy that handles container visibility rules.
 * Removes container nodes when include-containers is 'none' unless explicitly focused.
 */
export class ContainerFilterStrategy implements VisibilityFilterStrategy {
    constructor(
        private allMentionedContainers: Set<string>
    ) {}

    applyFilter(
        context: CalmCoreCanonicalModel,
        options: NormalizedOptions,
        currentVisible: Set<string>,
        _relationships: CalmRelationshipCanonicalModel[]
    ): VisibilityFilterResult {
        const newVisible = new Set(currentVisible);

        if (options.includeContainers === 'none') {
            for (const cid of this.allMentionedContainers) {
                // Remove container unless explicitly focused
                if (!options.focusNodes || !options.focusNodes.includes(cid)) {
                    newVisible.delete(cid);
                }
            }
        }

        return {
            visibleNodes: newVisible,
            warnings: []
        };
    }
}
