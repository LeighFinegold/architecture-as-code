import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock VS Code API before importing the module under test
vi.mock('vscode', () => {
    // minimal Uri mock
    const Uri = {
        file: (f: string) => ({ fsPath: f, toString: () => f }),
        joinPath: (base: any, ...p: string[]) => ({ fsPath: (base?.fsPath || '') + '/' + p.join('/'), toString: () => (base?.fsPath || '') + '/' + p.join('/') })
    }
    return {
        window: {
            createWebviewPanel: vi.fn(),
            tabGroups: { all: [] },
            visibleTextEditors: []
        },
        ViewColumn: { Beside: 2 },
        Uri
    }
})
import * as vscode from 'vscode'
// Import after mock
import { CalmPreviewPanel } from '../src/previewPanel'

// Minimal fake GraphData payload
const sample = {
    graph: {
        nodes: [{ id: 'a', label: 'A' }],
        edges: []
    },
    selectedId: undefined,
    settings: { layout: 'dagre', showLabels: true }
}

// Helpers to build a fake webview panel
function createMockPanel() {
    const listeners: Array<(msg: any) => void> = []
    const posts: any[] = []
    const webview: any = {
        html: '',
        onDidReceiveMessage: (cb: (msg: any) => void) => {
            listeners.push(cb)
            return { dispose() { } }
        },
        postMessage: (msg: any) => {
            posts.push(msg)
            return Promise.resolve(true)
        },
        asWebviewUri: (u: vscode.Uri) => u,
        cspSource: 'vscode-resource:'
    }
    const panel: any = {
        webview,
        onDidDispose: vi.fn(),
        reveal: vi.fn(),
        dispose: vi.fn()
    }
    return { panel: panel as unknown as vscode.WebviewPanel, listeners, posts }
}

describe('CalmPreviewPanel readiness', () => {
    let ctx: any
    let cfg: any
    let out: any

    beforeEach(() => {
        ctx = { extensionUri: (vscode as any).Uri.file('/tmp/ext') }
        cfg = { get: vi.fn() }
        out = { appendLine: vi.fn() }
            // Reset singleton between tests to avoid state leakage
            ; (CalmPreviewPanel as any).currentPanel = undefined
    })

    it('queues setData until ready, then flushes', async () => {
        const { panel, listeners, posts } = createMockPanel()
        // Stub createWebviewPanel to return our mock
        const spyCreate = vi.spyOn(vscode.window, 'createWebviewPanel' as any).mockReturnValue(panel)

        const p = CalmPreviewPanel.createOrShow(ctx as any, (vscode as any).Uri.file('/tmp/doc.yml'), cfg as any, out as any)
        // setData before ready should not post setData immediately
        p.setData(sample as any)
        // Only the inline boot script log may have posted; verify no setData
        expect(posts.find(m => m?.type === 'setData')).toBeUndefined()

        // Send ready message from webview to extension
        listeners.forEach(l => l({ type: 'ready' }))
        // Now it should have flushed a setData
        expect(posts.filter(m => m?.type === 'setData').length).toBe(1)

        spyCreate.mockRestore()
    })

    it('posts select messages immediately', async () => {
        const { panel, listeners, posts } = createMockPanel()
        const spyCreate = vi.spyOn(vscode.window, 'createWebviewPanel' as any).mockReturnValue(panel)
        const p = CalmPreviewPanel.createOrShow(ctx as any, (vscode as any).Uri.file('/tmp/doc.yml'), cfg as any, out as any)
        // postSelect should send message regardless of ready
        p.postSelect('a')
        expect(posts.find(m => m?.type === 'select' && m.id === 'a')).toBeTruthy()
        // Then ready arrives and setData flushes
        p.setData(sample as any)
        listeners.forEach(l => l({ type: 'ready' }))
        expect(posts.find(m => m?.type === 'setData')).toBeTruthy()
        spyCreate.mockRestore()
    })

    it('clears persisted positions and viewport on clearPositions', async () => {
        const { panel, listeners } = createMockPanel()
        const spyCreate = vi.spyOn(vscode.window, 'createWebviewPanel' as any).mockReturnValue(panel)
        const state: any = { store: {}, update: vi.fn((k: string, v: any) => { state.store[k] = v }), get: (k: string) => state.store[k] }
        ctx = { extensionUri: (vscode as any).Uri.file('/tmp/ext'), workspaceState: state }
        const uri = (vscode as any).Uri.file('/tmp/doc.yml')
        const p = CalmPreviewPanel.createOrShow(ctx as any, uri, cfg as any, out as any)
        // Seed some state
        state.update(`calm.positions:${uri.toString()}`, { a: { x: 1, y: 2 } })
        state.update(`calm.viewport:${uri.toString()}`, { pan: { x: 0, y: 0 }, zoom: 1 })
        // Simulate webview message to clear
        listeners.forEach(l => l({ type: 'clearPositions' }))
        expect(state.store[`calm.positions:${uri.toString()}`]).toBeUndefined()
        expect(state.store[`calm.viewport:${uri.toString()}`]).toBeUndefined()
        spyCreate.mockRestore()
    })

    it('generates correct template content based on selection', async () => {
        const { panel } = createMockPanel()
        const spyCreate = vi.spyOn(vscode.window, 'createWebviewPanel' as any).mockReturnValue(panel)
        // Create a test CALM model file with flows
        const testModelData = {
            nodes: [
                { "unique-id": "test-node", name: "Test Node" },
                { "unique-id": "another-node", name: "Another Node" }
            ],
            relationships: [
                { "unique-id": "test-relationship", source: "test-node", target: "another-node" }
            ],
            flows: [
                { "unique-id": "test-flow", name: "Test Flow" }
            ]
        }
        
        // Write test model to temporary file
        const testModelPath = '/tmp/ext/test-model.json'
        require('fs').writeFileSync(testModelPath, JSON.stringify(testModelData, null, 2))
        
        const p = CalmPreviewPanel.createOrShow(ctx as any, (vscode as any).Uri.file(testModelPath), cfg as any, out as any)

        // Set graph data with nodes and edges
        const graphData = {
            graph: {
                nodes: [
                    { id: 'test-node', label: 'Test Node' },
                    { id: 'another-node', label: 'Another Node' }
                ],
                edges: [
                    { id: 'test-relationship', source: 'test-node', target: 'another-node', type: 'connects' }
                ]
            },
            selectedId: undefined,
            settings: { layout: 'dagre', showLabels: true }
        }
        p.setData(graphData as any)

        // Test access to private method through any cast
        const generateTemplate = (p as any).generateTemplateContent.bind(p)

        // Test default case (no selection)
        expect(await generateTemplate()).toBe('{{block-architecture}}')

        // Test group selection
        expect(await generateTemplate('group:architecture')).toBe('{{block-architecture}}')
        expect(await generateTemplate('group:nodes')).toBe('{{block-architecture}}')

        // Test node selection
        expect(await generateTemplate('test-node')).toBe('{{block-architecture focus-nodes="test-node"}}')

        // Test relationship selection
        expect(await generateTemplate('test-relationship')).toBe('{{block-architecture focus-relationships="test-relationship"}}')

        // Test flow selection
        expect(await generateTemplate('test-flow')).toBe('{{block-architecture focus-flows="test-flow"}}')

        // Test unknown selection (fallback)
        expect(await generateTemplate('unknown-id')).toBe('{{block-architecture}}')

        spyCreate.mockRestore()
    })
})
