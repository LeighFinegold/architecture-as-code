import { CalmNodeCanonicalModel, CalmRelationshipCanonicalModel } from '@finos/calm-models/canonical';
import { VMLeafNode, VMEdge, VMAttach } from '../../types';

/**
 * Factory interface for creating view model nodes
 */
export interface VMNodeFactory {
    createLeafNode(node: CalmNodeCanonicalModel, renderInterfaces: boolean): { node: VMLeafNode; attachments: VMAttach[] };
}

/**
 * Factory interface for creating view model edges
 */
export interface VMEdgeFactory {
    createEdge(relationship: CalmRelationshipCanonicalModel, config: EdgeConfig): VMEdge[];
}

/**
 * Configuration object for edge creation
 */
export interface EdgeConfig {
    renderInterfaces: boolean;
    edgeLabelMode: 'description' | 'none';
    ifaceNames: Map<string, Map<string, string>>;
    nodesById: Map<string, CalmNodeCanonicalModel>;
}
