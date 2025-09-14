// src/webview/main.ts
import cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'
import dagre from 'cytoscape-dagre'
import MarkdownIt from 'markdown-it'
import mermaid from 'mermaid'

// Compose labels safely (duplicated here by logic to avoid bundling node module path issues)
cytoscape.use(fcose)
cytoscape.use(dagre)

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

let cy: cytoscape.Core | undefined
let currentData: any
let currentShowLabels = true
let showDescriptions = false
let currentLayout: string = 'dagre'
const nodePositions: Map<string, { x: number; y: number }> = new Map()
let pendingSelect: string | undefined
let pendingSelectTimer: any
let forceLayoutNextRender = false
let viewportAppliedFromHost = false

// ---------------------------
// Markdown + Mermaid renderer
// ---------------------------
const md = new MarkdownIt({
    html: true,   // Docify output is local/trusted
    linkify: true,
    breaks: true,
})

let mermaidReady = false
function ensureMermaid() {
    if (!mermaidReady) {
        mermaid.initialize({
            startOnLoad: false,
            securityLevel: 'strict', // suits VS Code webview CSP
            theme: 'base',
        })
        mermaidReady = true
    }
}

// Expose a Promise-based renderer that previewPanel calls
window.renderMarkdown = async (mdText: string) => {
    const initialHtml = md.render(String(mdText ?? ''))

    // Replace Mermaid code blocks with rendered SVG
    ensureMermaid()
    const container = document.createElement('div')
    container.innerHTML = initialHtml

    const codes = container.querySelectorAll('code.language-mermaid')
    if (!codes.length) return container.innerHTML

    let i = 0
    for (const code of Array.from(codes)) {
        const graph = code.textContent ?? ''
        const pre = code.parentElement?.tagName.toLowerCase() === 'pre' ? code.parentElement! : code
        try {
            const id = `mmd-${++i}`
            const out = await mermaid.render(id, graph) // v10+: { svg, bindFunctions }
            const shell = document.createElement('div')
            shell.innerHTML = out.svg
            const svgEl = shell.firstElementChild
            if (svgEl) pre.replaceWith(svgEl)
        } catch (e) {
            const err = document.createElement('pre')
            err.textContent = 'Mermaid error: ' + String(e)
            pre.replaceWith(err)
        }
    }

    return container.innerHTML
}

// ---------------------------
// Cytoscape preview logic
// ---------------------------

function init() {
    const container = document.getElementById('cy')!
    const grid = document.getElementById('container') as HTMLDivElement
    const divider = document.getElementById('divider') as HTMLDivElement
    try {
        cy = cytoscape({
            container,
            elements: [],
            layout: { name: 'dagre' },
            style: getThemeStyles(),
        })
    } catch (e: any) {
        postError('Cytoscape init failed', e)
    }

    // Single tap/click: show details only
    cy?.on('tap', 'node,edge', (e) => {
        const id = e.target.data('id')
        updateDetails(id)
        cy?.elements().removeClass('selected')
        e.target.addClass('selected')
        try { vscode.postMessage({ type: 'selected', id }) } catch { /* noop */ }
    })
    // Double tap: jump to source
    cy?.on('dbltap', 'node,edge', (e) => {
        const id = e.target.data('id')
        if (id) {
            vscode.postMessage({ type: 'revealInEditor', id })
        }
    })

    document.getElementById('fit')?.addEventListener('click', () => cy?.fit())
    document.getElementById('reset')?.addEventListener('click', () => {
        try {
            nodePositions.clear()
            vscode.postMessage({ type: 'clearPositions' })
            forceLayoutNextRender = true
            render(currentData)
        } catch { /* noop */ }
    })
    // Persist positions when user finishes dragging a node
    cy?.on('dragfree', 'node', () => {
        try { persistPositions() } catch { /* noop */ }
    })
    // Draggable divider logic
    if (grid && divider) {
        let dragging = false
        const minRight = 200 // px
        const minLeft = 200 // px
        divider.addEventListener('mousedown', (e) => {
            dragging = true
            e.preventDefault()
        })
        window.addEventListener('mousemove', (e) => {
            if (!dragging) return
            const rect = grid.getBoundingClientRect()
            let left = e.clientX - rect.left
            if (left < minLeft) left = minLeft
            if (left > rect.width - minRight) left = rect.width - minRight
            const right = rect.width - left
            grid.style.gridTemplateColumns = `${left}px 4px ${right - 4}px`
            cy?.resize()
        })
        window.addEventListener('mouseup', () => { dragging = false })
    }
    document.getElementById('labels')?.addEventListener('change', (e) => {
        const show = (e.target as HTMLInputElement).checked
        currentShowLabels = show
        applyTheme()
        if (nodePositions.size === 0) safeLayout(currentLayout)
        try { vscode.postMessage({ type: 'saveToggles', toggles: { showLabels: currentShowLabels, showDescriptions } }) } catch { }
    })
    document.getElementById('descriptions')?.addEventListener('change', (e) => {
        showDescriptions = (e.target as HTMLInputElement).checked
        applyTheme()
        if (nodePositions.size === 0) safeLayout(currentLayout)
        try { vscode.postMessage({ type: 'saveToggles', toggles: { showLabels: currentShowLabels, showDescriptions } }) } catch { }
    })

    window.addEventListener('message', (event) => {
        const msg = event.data
        if (msg.type === 'setData') {
            // Seed cached positions from host persistence on first set
            if (msg.positions && typeof msg.positions === 'object' && nodePositions.size === 0) {
                try {
                    nodePositions.clear()
                    for (const [id, pos] of Object.entries(msg.positions)) {
                        if (pos && typeof (pos as any).x === 'number' && typeof (pos as any).y === 'number') {
                            nodePositions.set(String(id), { x: (pos as any).x, y: (pos as any).y })
                        }
                    }
                } catch { /* noop */ }
            }
            // Apply saved viewport if provided
            if (msg.viewport && typeof msg.viewport === 'object' && cy) {
                try {
                    if (typeof msg.viewport.zoom === 'number') cy.zoom(msg.viewport.zoom)
                    if (msg.viewport.pan && typeof msg.viewport.pan.x === 'number' && typeof msg.viewport.pan.y === 'number') {
                        cy.pan({ x: msg.viewport.pan.x, y: msg.viewport.pan.y })
                    }
                    viewportAppliedFromHost = true
                } catch { /* noop */ }
            }
            render(msg.graph)
            if (msg.selectedId) selectById(msg.selectedId, false)
            if (msg.settings) applySettings(msg.settings)
        } else if (msg.type === 'select') {
            // Debounce selection so it happens after render/pan-restore, without re-centering
            pendingSelect = msg.id
            if (pendingSelectTimer) clearTimeout(pendingSelectTimer)
            pendingSelectTimer = setTimeout(() => {
                if (pendingSelect) selectById(pendingSelect, false)
                pendingSelect = undefined
            }, 30)
        }
    })
    // notify ready
    vscode.postMessage({ type: 'ready' })

    // Apply theme and listen for changes (VS Code toggles body classes)
    applyTheme()
    const mo = new MutationObserver(() => applyTheme())
    mo.observe(document.body, { attributes: true, attributeFilter: ['class'] })

    // Persist positions on unload as a safety net
    window.addEventListener('beforeunload', () => {
        try { persistPositions() } catch { /* noop */ }
        try { persistViewport() } catch { /* noop */ }
    })
}

function render(graph: any) {
    try {
        currentData = graph || { nodes: [], edges: [] }
        if (!cy) return
        // Snapshot current viewport to restore later
        let prevPan: any | undefined
        let prevZoom: number | undefined
        let skipViewportRestore = false
        try {
            prevPan = cy.pan ? cy.pan() : undefined
            prevZoom = cy.zoom ? cy.zoom() : undefined
        } catch { /* noop */ }

        const nodes = Array.isArray(currentData.nodes) ? currentData.nodes : []
        const edges = Array.isArray(currentData.edges) ? currentData.edges : []
        const c = cy as cytoscape.Core

        const newNodeIds = new Set(nodes.map((n: any) => String(n.id)))
        const newEdgeIds = new Set(edges.map((e: any) => String(e.id)))

        const wasEmpty = cy.elements().length === 0
        const hasAnySavedPositions = nodes.some((n: any) => nodePositions.has(String(n.id)))

            ; (cy as any).startBatch?.()
        // Persist existing positions
        try {
            cy.nodes().forEach(n => {
                const id = n.data('id')
                if (id) nodePositions.set(id, { ...n.position() })
            })
        } catch { /* noop */ }

        // Remove edges not present anymore
        try {
            if (typeof (cy as any).edges === 'function') {
                (cy as any).edges().forEach((e: any) => {
                    const id = e.data('id')
                    if (id && !newEdgeIds.has(String(id))) e.remove()
                })
            }
        } catch { /* noop */ }
        // Remove nodes not present anymore
        try {
            cy.nodes().forEach(n => {
                const id = n.data('id')
                if (id && !newNodeIds.has(String(id))) n.remove()
            })
        } catch { /* noop */ }

        // Update existing nodes' data minimally and collect which are missing
        const existingNodeIds = new Set<string>()
        cy.nodes().forEach(n => { existingNodeIds.add(String(n.data('id'))) })

        // Add/update nodes ensuring parents before children for compounds
        const orderedNodes = (() => {
            const ns: any[] = nodes as any[]
            const pmap = new Map<string, string | undefined>()
            ns.forEach((n: any) => pmap.set(String(n.id), (n as any).parent))
            const emitted = new Set<string>()
            const result: any[] = []
            const byId = new Map(ns.map((n: any) => [String(n.id), n]))
            const queue: string[] = []
            for (const n of ns) {
                const id = String((n as any).id)
                const p = (n as any).parent
                if (!p || !byId.has(String(p))) queue.push(id)
            }
            while (queue.length) {
                const id = queue.shift()!
                if (emitted.has(id)) continue
                const n = byId.get(id)
                if (!n) continue
                const p = (n as any).parent
                if (p && byId.has(String(p)) && !emitted.has(String(p))) {
                    queue.unshift(id)
                    queue.unshift(String(p))
                    continue
                }
                result.push(n)
                emitted.add(id)
                for (const [cid, cp] of pmap) {
                    if (cp === id && !emitted.has(cid)) queue.push(cid)
                }
            }
            for (const n of ns) if (!emitted.has(String((n as any).id))) result.push(n as any)
            return result
        })()
        for (const n of orderedNodes) {
            const id = String(n.id)
            if (existingNodeIds.has(id)) {
                const ele = cy.$id(id)
                if (ele && ele.length) {
                    const cur = ele.data()
                    if (cur.label !== n.label) ele.data('label', n.label)
                    if (cur.description !== n.description) ele.data('description', n.description)
                    if (cur['node-type'] !== n['node-type']) ele.data('node-type', n['node-type'])
                    const curParent = (ele as any).parent()?.id() || undefined
                    const nextParent = n.parent
                    if (curParent !== nextParent) {
                        try { (ele as any).move({ parent: nextParent }) } catch { /* noop */ }
                    }
                }
            } else {
                cy.add({ data: n })
            }
        }

        // Update existing edges or add new ones
        const existingEdgeIds = new Set<string>()
        try { cy.edges().forEach(e => { existingEdgeIds.add(String(e.data('id'))) }) } catch { /* noop */ }
        for (const e of edges) {
            const id = String(e.id)
            if (existingEdgeIds.has(id)) {
                const ele = cy.$id(id)
                if (ele && ele.length) {
                    const cur = ele.data()
                    if (cur.label !== e.label) ele.data('label', e.label)
                    if (cur.description !== e.description) ele.data('description', e.description)
                }
            } else {
                cy.add({ data: e })
            }
        }

        // Final sanity: ensure all nodes from data exist
        try {
            let addedCount = 0
            const seen = new Set<string>()
            cy.nodes().forEach(n => { const i = String(n.data('id')); if (i) seen.add(i) })
            for (const n of nodes) {
                const id = String(n.id)
                if (!seen.has(id)) { (cy as any).add({ data: n }); addedCount++ }
            }
            if (addedCount > 0) vscode.postMessage({ type: 'log', message: `Sanity-added ${addedCount} missing nodes` })
        } catch { /* noop */ }

        try {
            const presentIds = new Set<string>()
            cy.nodes().forEach(n => { presentIds.add(String(n.data('id'))) })
            edges.forEach((e: any) => {
                const src = String(e.source)
                const dst = String(e.target)
                if (src && !presentIds.has(src)) { (c as any).add({ data: { id: src, label: src } }); presentIds.add(src) }
                if (dst && !presentIds.has(dst)) { (c as any).add({ data: { id: dst, label: dst } }); presentIds.add(dst) }
            })
        } catch { /* noop */ }

        // Ensure composed labels/styles before any layout for sizing
        applyTheme()

        // Place any newly-added nodes near a positioned neighbor
        const toPlace: cytoscape.NodeCollection = cy.nodes().filter(n => !nodePositions.has(String(n.data('id'))))
        let fallbackCount = 0
        toPlace.forEach((node) => {
            const id = String(node.data('id'))
            let placed = false
            try {
                const connected = c.edges().filter(e => e.data('source') === id || e.data('target') === id)
                for (const e of connected) {
                    const otherId = e.data('source') === id ? e.data('target') : e.data('source')
                    const op = nodePositions.get(String(otherId))
                    if (op) { node.position({ x: op.x + 60, y: op.y + 40 }); placed = true; break }
                }
            } catch { /* noop */ }
            if (!placed) {
                try {
                    const pId = (node as any).data('parent')
                    if (pId) {
                        const pp = nodePositions.get(String(pId)) || ((c.$id(String(pId)) as any).position?.() as any)
                        if (pp && typeof pp.x === 'number' && typeof pp.y === 'number') {
                            node.position({ x: pp.x + 60, y: pp.y + 40 })
                            placed = true
                        }
                    }
                } catch { /* noop */ }
            }
            if (!placed) {
                try {
                    const ext = c.extent?.()
                    if (ext) {
                        const cx = (ext.x1 + ext.x2) / 2
                        const cyv = (ext.y1 + ext.y2) / 2
                        const col = fallbackCount % 3
                        const row = Math.floor(fallbackCount / 3)
                        const dx = (col - 1) * 90
                        const dy = (row - 1) * 70
                        node.position({ x: cx + dx, y: cyv + dy })
                        fallbackCount += 1
                    } else {
                        node.position({ x: 50, y: 50 })
                    }
                } catch {
                    node.position({ x: 50, y: 50 })
                }
            }
        })

        if (wasEmpty && hasAnySavedPositions && toPlace.length > 0) {
            try {
                const ext = c.extent?.()
                const bbox = ext ? { x1: ext.x1, y1: ext.y1, w: ext.x2 - ext.x1, h: ext.y2 - ext.y1 } : undefined
                toPlace.layout({ name: 'grid', boundingBox: bbox, avoidOverlap: true } as any).run()
            } catch { /* noop */ }
        }

        // Restore known positions explicitly
        cy.nodes().forEach(n => {
            const id = String(n.data('id'))
            const pos = nodePositions.get(id)
            if (pos) n.position(pos)
        })

        // Decide if we should run an initial or forced layout
        if (forceLayoutNextRender && nodes.length > 0) {
            safeLayout(currentLayout)
            cy.fit()
            forceLayoutNextRender = false
            skipViewportRestore = true
        } else if (wasEmpty && nodes.length > 0) {
            if (!hasAnySavedPositions) {
                safeLayout(currentLayout)
                if (!prevPan || typeof prevZoom !== 'number') { cy.fit(); skipViewportRestore = true }
            } else {
                if (!viewportAppliedFromHost) { cy.fit(); skipViewportRestore = true }
                else vscode.postMessage({ type: 'log', message: 'Skipped initial layout due to saved positions' })
            }
        }

        // First render visibility safety
        if (wasEmpty && nodes.length > 0 && !skipViewportRestore) {
            try {
                const ext = c.extent?.()
                if (ext) {
                    let inside = 0
                    cy.nodes().forEach(n => {
                        const p = (n as any).position()
                        if (p.x >= ext.x1 && p.x <= ext.x2 && p.y >= ext.y1 && p.y <= ext.y2) inside += 1
                    })
                    const total = Math.max(1, cy.nodes().length)
                    const ratio = inside / total
                    if (inside === 0 || ratio < 0.25) { cy.fit(); skipViewportRestore = true }
                }
            } catch { /* noop */ }
        }

        if (!wasEmpty && toPlace.length > 0) {
            try {
                const ext = c.extent?.()
                if (ext) {
                    let outside = false
                    toPlace.forEach((n) => {
                        const p = (n as any).position()
                        if (p.x < ext.x1 || p.x > ext.x2 || p.y < ext.y1 || p.y > ext.y2) outside = true
                    })
                    if (outside && typeof c.center === 'function') { c.center(toPlace); skipViewportRestore = true }
                }
            } catch { /* noop */ }
        }

        // Always restore previous viewport if we didn't intentionally change it
        try {
            if (!forceLayoutNextRender && !skipViewportRestore) {
                if (prevPan && typeof cy.pan === 'function') cy.pan(prevPan)
                if (typeof prevZoom === 'number' && typeof cy.zoom === 'function') cy.zoom(prevZoom)
            }
        } catch { /* noop */ }

        ; (cy as any).endBatch?.()
        cy.resize()

        if (wasEmpty && hasAnySavedPositions && toPlace.length > 0) {
            try {
                const ext = c.extent?.()
                if (ext) {
                    let outside = false
                    toPlace.forEach((n) => {
                        const p = (n as any).position()
                        if (p.x < ext.x1 || p.x > ext.x2 || p.y < ext.y1 || p.y > ext.y2) outside = true
                    })
                    if (outside && typeof c.center === 'function') c.center(toPlace)
                }
            } catch { /* noop */ }
        }

        try { persistViewport() } catch { /* noop */ }

        vscode.postMessage({ type: 'log', message: `Rendered ${nodes.length} nodes and ${edges.length} edges` })
        if (pendingSelect) selectById(pendingSelect, false)
    } catch (e: any) {
        postError('Render failed', e)
    }
}

function selectById(id: string, center: boolean = true) {
    const ele = cy?.elements().filter((e) => e.data('id') === id)
    if (ele && ele.length > 0) {
        cy?.elements().unselect()
        cy?.elements().removeClass('selected')
        ele.select()
        ele.addClass('selected')
        if (center) cy?.center(ele)
        updateDetails(id)
    }
}

function applySettings(s: any) {
    if (!cy) return
    if (s.layout) {
        currentLayout = s.layout
        if (nodePositions.size === 0) safeLayout(currentLayout)
    }
    if (typeof s.showLabels === 'boolean') {
        currentShowLabels = s.showLabels
        const cb = document.getElementById('labels') as HTMLInputElement | null
        if (cb) cb.checked = currentShowLabels
        applyTheme()
        if (nodePositions.size === 0) safeLayout(currentLayout)
    }
    if (typeof s.showDescriptions === 'boolean') {
        showDescriptions = s.showDescriptions
        const cb = document.getElementById('descriptions') as HTMLInputElement | null
        if (cb) cb.checked = showDescriptions
        applyTheme()
        if (nodePositions.size === 0) safeLayout(currentLayout)
    }
}

function updateDetails(id: string) {
    const pre = document.getElementById('detailsPre')!
    const node = currentData.nodes.find((n: any) => n.id === id)
    const edge = currentData.edges.find((e: any) => e.id === id)
    const selected = node || edge
    if (!selected) { pre.textContent = ''; return }
    const raw = selected.raw || selected
    try { pre.textContent = JSON.stringify(raw, null, 2) } catch { pre.textContent = String(raw) }
}

init()

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

function safeLayout(preferred?: string) {
    if (!cy) return
    if (preferred) currentLayout = preferred
    const order = Array.from(new Set([currentLayout, 'dagre', 'fcose', 'cose'].filter(Boolean))) as string[]
    for (const name of order) {
        try {
            cy.layout({ name }).run()
            vscode.postMessage({ type: 'log', message: `Applied layout: ${name}` })
            currentLayout = name
            try {
                nodePositions.clear()
                cy.nodes().forEach(n => {
                    const id = n.data('id')
                    if (id) nodePositions.set(id, { ...n.position() })
                })
                persistPositions()
                persistViewport()
            } catch { /* noop */ }
            return
        } catch {
            // try next
        }
    }
    vscode.postMessage({ type: 'error', message: 'No usable layout found (fcose/dagre/cose)' })
}

// Theme helpers
function isDarkTheme(): boolean {
    const c = document.body.classList
    return c.contains('vscode-dark') || c.contains('vscode-high-contrast')
}

function getThemeStyles(): any[] {
    const dark = isDarkTheme()
    const palette = dark
        ? { nodeBg: '#3b82f6', text: '#111827', edge: '#9ca3af', selection: '#f59e0b' }
        : { nodeBg: '#4e79a7', text: '#222222', edge: '#aaaaaa', selection: '#f28e2b' }

    const nodeLabelField =
        currentShowLabels && showDescriptions
            ? 'data(labelComposed)'
            : currentShowLabels
                ? 'data(labelTitle)'
                : showDescriptions
                    ? 'data(labelDesc)'
                    : ''

    const edgeLabelField =
        currentShowLabels && showDescriptions
            ? 'data(labelComposed)'
            : currentShowLabels
                ? 'data(labelTitle)'
                : showDescriptions
                    ? 'data(labelDesc)'
                    : ''

    return [
        {
            selector: 'node',
            style: {
                label: nodeLabelField,
                'text-opacity': 1,
                'background-color': '#f5f5f5',
                color: palette.text,
                'font-size': 14,
                'text-wrap': 'wrap',
                'text-max-width': '180px',
                'text-valign': 'center',
                'text-halign': 'center',
                'font-family': 'Arial',
                'border-color': 'black',
                'border-width': 1,
                padding: '10px',
                width: '200px',
                height: 'label',
                shape: 'rectangle',
            },
        },
        {
            selector: ':parent',
            style: {
                label: 'data(label)',
                'text-valign': 'top',
                'text-halign': 'center',
                'background-color': 'white',
                'border-style': 'dashed',
                'border-width': 2,
                'border-dash-pattern': [8, 10],
                padding: '20px',
            },
        },
        { selector: ':parent:selected', style: { 'border-color': palette.selection, 'border-width': 3 } },
        {
            selector: 'edge',
            style: {
                'curve-style': 'bezier',
                'target-arrow-shape': 'triangle',
                width: 2,
                'line-color': palette.edge,
                'target-arrow-color': palette.edge,
                label: edgeLabelField,
                color: palette.text,
                'font-size': 14,
                'text-wrap': 'ellipsis',
                'text-background-color': 'white',
                'text-background-opacity': 1,
                'text-background-padding': '5px',
            },
        },
        { selector: '.selected', style: { 'border-width': 3, 'border-color': palette.selection } },
    ]
}

function applyTheme() {
    if (!cy) return
    try {
        cy.nodes().forEach(n => {
            const data = n.data()
            const title = data.label || data.id
            const desc = data.description || ''
            n.data('labelTitle', title)
            n.data('labelDesc', desc)
            n.data('labelComposed', desc ? `${title}\n${desc}` : title)
        })
        cy.edges().forEach(e => {
            const data = e.data()
            const lbl = (data.label || '').trim()
            const desc = (data.description || '').trim()
            const composed = !lbl && desc ? desc : desc && desc !== lbl && !lbl.includes(desc) ? `${lbl}${lbl ? ' — ' : ''}${desc}` : lbl
            e.data('labelTitle', lbl)
            e.data('labelDesc', desc)
            e.data('labelComposed', composed)
        })
        const styles = getThemeStyles()
        cy.style(styles as any)
    } catch (e) {
        postError('applyTheme failed', e)
    }
}

function persistPositions() {
    if (!cy) return
    try {
        const map: Record<string, { x: number; y: number }> = {}
        cy.nodes().forEach(n => {
            if ((n as any).isParent && (n as any).isParent()) return
            const id = n.data('id')
            if (!id) return
            const p = n.position()
            map[String(id)] = { x: p.x, y: p.y }
        })
        vscode.postMessage({ type: 'savePositions', positions: map })
    } catch { /* noop */ }
}

function persistViewport() {
    if (!cy) return
    try {
        const pan = cy.pan ? cy.pan() : undefined
        const zoom = cy.zoom ? cy.zoom() : undefined
        if (pan && typeof zoom === 'number') {
            vscode.postMessage({ type: 'saveViewport', viewport: { pan, zoom } })
        }
    } catch { /* noop */ }
}
