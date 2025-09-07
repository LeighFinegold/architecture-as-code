import { BlockArchOptions, NormalizedOptions } from '../types';
import { compact } from 'lodash';

/**
 * Parses a comma-separated string into an array of trimmed, non-empty strings.
 * Returns undefined if the input is falsy or results in an empty array.
 */
const csv = (s?: string) => s ? compact(s.split(',').map(x => x.trim())) : undefined;

/**
 * Parses raw widget options from the external API format (with kebab-case keys and string values)
 * into a normalized internal format with proper types and defaults.
 */
export function parseOptions(raw?: BlockArchOptions): NormalizedOptions {
    const o: NormalizedOptions = {
        includeContainers: 'all',
        includeChildren: 'all',
        edges: 'connected',
        direction: 'both',
        renderInterfaces: false,
        edgeLabels: 'description',
    };

    if (!raw) return o;

    if (raw['focus-nodes']) o.focusNodes = csv(raw['focus-nodes']);
    if (raw['focus-relationships']) o.focusRelationships = csv(raw['focus-relationships']);
    if (raw['focus-flows']) o.focusFlows = csv(raw['focus-flows']);
    if (raw['focus-query']) o.focusQuery = raw['focus-query'];

    if (raw['highlight-nodes']) o.highlightNodes = csv(raw['highlight-nodes']);

    if (raw['node-types']) o.nodeTypes = csv(raw['node-types']);
    if (raw['render-interfaces']) o.renderInterfaces = true;
    if (raw['edge-labels']) o.edgeLabels = raw['edge-labels'] as NormalizedOptions['edgeLabels'];
    if (raw['direction']) o.direction = raw['direction'];
    if (raw['link-prefix']) o.linkPrefix = raw['link-prefix'];
    if (raw['link-map']) {
        try {
            o.linkMap = typeof raw['link-map'] === 'string' ? JSON.parse(raw['link-map']) : (raw['link-map'] as Record<string, string>);
        } catch {
            // ignore bad JSON; keep linkMap undefined
        }
    }

    if (raw['include-containers']) o.includeContainers = raw['include-containers'];
    if (raw['include-children']) o.includeChildren = raw['include-children'];
    if (raw['edges']) o.edges = raw['edges'];

    return o;
}
