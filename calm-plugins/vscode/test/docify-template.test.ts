import { describe, it, expect } from 'vitest'

// Simple unit test for template generation logic without dependencies
describe('Docify Template Generation', () => {
    // Extracted logic from CalmPreviewPanel.generateTemplateContent for isolated testing
    function generateTemplateContent(selectedId?: string, graphData?: any): string {
        if (!selectedId) {
            return '{{block-architecture}}'
        }

        // Handle group selections
        if (selectedId.startsWith('group:')) {
            return '{{block-architecture}}'  // Use default for group selections
        }

        // For individual items, we need to determine the type
        if (graphData?.graph) {
            const graph = graphData.graph

            // Check if it's a node
            const isNode = graph.nodes?.some((n: any) => n.id === selectedId)
            if (isNode) {
                return `{{block-architecture focus-nodes="${selectedId}"}}`
            }

            // Check if it's an edge (relationship or flow)
            const edge = graph.edges?.find((e: any) => e.id === selectedId)
            if (edge) {
                // Determine if it's a flow or relationship based on type
                if (edge.type === 'flow') {
                    return `{{block-architecture focus-flows="${selectedId}"}}`
                } else {
                    return `{{block-architecture focus-relationships="${selectedId}"}}`
                }
            }
        }

        // Fallback: default template
        return '{{block-architecture}}'
    }

    it('generates default template for no selection', () => {
        expect(generateTemplateContent()).toBe('{{block-architecture}}')
    })

    it('generates default template for group selections', () => {
        expect(generateTemplateContent('group:architecture')).toBe('{{block-architecture}}')
        expect(generateTemplateContent('group:nodes')).toBe('{{block-architecture}}')
        expect(generateTemplateContent('group:relationships')).toBe('{{block-architecture}}')
        expect(generateTemplateContent('group:flows')).toBe('{{block-architecture}}')
    })

    it('generates node-focused template for node selections', async () => {
        const graphData = {
            graph: {
                nodes: [
                    { id: 'test-node', label: 'Test Node' },
                    { id: 'another-node', label: 'Another Node' }
                ],
                edges: []
            }
        }

        const result1 = await generateTemplateContent('test-node', graphData)
        const result2 = await generateTemplateContent('another-node', graphData)

        expect(result1).toBe('{{block-architecture focus-nodes="test-node"}}')
        expect(result2).toBe('{{block-architecture focus-nodes="another-node"}}')
    })

    it('generates relationship-focused template for relationship selections', () => {
        const graphData = {
            graph: {
                nodes: [],
                edges: [
                    { id: 'test-relationship', source: 'a', target: 'b', type: 'connects' },
                    { id: 'another-rel', source: 'c', target: 'd', type: 'uses' }
                ]
            }
        }

        expect(generateTemplateContent('test-relationship', graphData)).toBe('{{block-architecture focus-relationships="test-relationship"}}')
        expect(generateTemplateContent('another-rel', graphData)).toBe('{{block-architecture focus-relationships="another-rel"}}')
    })

    it('generates flow-focused template for flow selections', () => {
        const graphData = {
            graph: {
                nodes: [],
                edges: [
                    { id: 'test-flow', source: 'a', target: 'b', type: 'flow' },
                    { id: 'conference-signup-flow', source: 'x', target: 'y', type: 'flow' }
                ]
            }
        }

        expect(generateTemplateContent('test-flow', graphData)).toBe('{{block-architecture focus-flows="test-flow"}}')
        expect(generateTemplateContent('conference-signup-flow', graphData)).toBe('{{block-architecture focus-flows="conference-signup-flow"}}')
    })

    it('generates default template for unknown selections', () => {
        const graphData = {
            graph: {
                nodes: [{ id: 'known-node', label: 'Known' }],
                edges: [{ id: 'known-edge', source: 'a', target: 'b', type: 'connects' }]
            }
        }

        expect(generateTemplateContent('unknown-id', graphData)).toBe('{{block-architecture}}')
    })

    it('handles missing graph data gracefully', () => {
        expect(generateTemplateContent('some-id', null)).toBe('{{block-architecture}}')
        expect(generateTemplateContent('some-id', {})).toBe('{{block-architecture}}')
        expect(generateTemplateContent('some-id', { graph: null })).toBe('{{block-architecture}}')
    })
})