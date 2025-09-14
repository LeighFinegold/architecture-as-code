// src/webview/main.ts
import GraphView from './graphView'
import MermaidRenderer from './mermaidRenderer'
import GraphController from './graphController'

// Access VS Code API if present; otherwise fall back to no-op poster.
const vscode =
    typeof window !== 'undefined' && typeof (window as any).acquireVsCodeApi === 'function'
        ? (window as any).acquireVsCodeApi()
        : { postMessage: (_: any) => { /* noop */ } }

declare global {
    interface Window {
        renderMarkdown?: (md: string) => Promise<string>
    }
}

// Keep only the shared nodePositions here; other state lives in GraphView/Controller
const nodePositions: Map<string, { x: number; y: number }> = new Map()

// Instantiate renderer and forward legacy API
const markdownRenderer = new MermaidRenderer()
window.renderMarkdown = async (mdText: string) => markdownRenderer.render(mdText)

// Instantiate view and controller
const graphView = new GraphView(nodePositions)
const controller = new GraphController({
    render: (g: any) => graphView.render(g),
    selectById: (id: string, center = true) => graphView.selectById(id, center),
    applySettings: (s: any) => graphView.applySettings(s),
    applyViewport: (v: any) => graphView.applyViewport(v),
    nodePositions,
    postMessage: (m: any) => { try { vscode.postMessage(m) } catch { /* noop */ } }
})

// init hook (runs once DOM is ready)
function init() { graphView.init(); controller.init(); }
window.addEventListener('DOMContentLoaded', init)

// Error/log helpers
function postError(context: string, e: any) {
    try {
        const msg = `${context}: ${e?.message || e}`
        vscode.postMessage({ type: 'error', message: msg, stack: e?.stack })
    } catch { /* noop */ }
}

window.addEventListener('error', (ev) => {
    postError('Window error', (ev as any).error || (ev as any).message)
})

window.addEventListener('unhandledrejection', (ev: any) => {
    postError('Unhandled rejection', ev.reason)
})
window.addEventListener('error', (ev) => {
    postError('Window error', (ev as any).error || (ev as any).message)
})

window.addEventListener('unhandledrejection', (ev: any) => {
    postError('Unhandled rejection', ev.reason)
})
