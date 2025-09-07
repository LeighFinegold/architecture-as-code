/** -----------------------------
 * Options (external API: CSV strings, flags)
 * ------------------------------ */
export interface BlockArchOptions {
    ['focus-nodes']?: string;                 // CSV: one or many
    ['focus-relationships']?: string;
    ['focus-flows']?: string;                 // id or name (CSV)
    ['focus-query']?: string;                 // reserved for future enhancement
    ['highlight-nodes']?: string;             // CSV list of nodes to highlight
    ['render-interfaces']?: boolean;
    ['include-containers']?: 'none' | 'parents' | 'all';
    ['include-children']?: 'none' | 'direct' | 'all';
    ['edges']?: 'connected' | 'seeded' | 'all' | 'none';
    ['node-types']?: string;
    ['direction']?: 'both' | 'in' | 'out';
    ['edge-labels']?: 'description' | 'none';
    ['link-prefix']?: string;
    ['link-map']?: string;
}

/** -----------------------------
 * VM Types
 * ------------------------------ */
export type VMInterface = { id: string; label: string };
export type VMLeafNode = { id: string; label: string; interfaces?: VMInterface[] };
export type VMContainer = { id: string; label: string; nodes: VMLeafNode[]; containers: VMContainer[] };
export type VMEdge = { id: string; source: string; target: string; label?: string };
export type VMAttach = { from: string; to: string };

export type BlockArchVM = {
    containers: VMContainer[];
    edges: VMEdge[];
    attachments: VMAttach[];
    looseNodes: VMLeafNode[];
    highlightNodeIds?: string[];  // union of highlight-nodes + focus-nodes
    linkPrefix?: string;
    linkMap?: Record<string, string>;
    warnings?: string[];
};

/** -----------------------------
 * Normalized options (internal shape)
 * ------------------------------ */
export type NormalizedOptions = {
    focusNodes?: string[];
    focusRelationships?: string[];
    focusFlows?: string[];
    focusQuery?: string;
    highlightNodes?: string[];  // list of node ids
    includeContainers: 'none' | 'parents' | 'all';
    includeChildren: 'none' | 'direct' | 'all';
    edges: 'connected' | 'seeded' | 'all' | 'none';
    nodeTypes?: string[];
    direction: 'both' | 'in' | 'out';
    renderInterfaces: boolean;
    edgeLabels: 'description' | 'none';
    linkPrefix?: string;
    linkMap?: Record<string, string>;
};

