import cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'
import dagre from 'cytoscape-dagre'

// register layouts/plugins
cytoscape.use(fcose)
cytoscape.use(dagre)

// Acquire VS Code API for posting
const vscode =
    typeof window !== 'undefined' && typeof (window as any).acquireVsCodeApi === 'function'
        ? (window as any).acquireVsCodeApi()
        : { postMessage: (_: any) => { /* noop */ } }

function postError(context: string, e: any) {
    try {
        const msg = `${context}: ${e?.message || e}`
        vscode.postMessage({ type: 'error', message: msg, stack: e?.stack })
    } catch { /* noop */ }
}

export default class GraphView {
    private nodePositions: Map<string, { x: number; y: number }>
    private cy?: cytoscape.Core
    private viewportAppliedFromHost = false
    private currentShowLabels = true
    private showDescriptions = false
    private currentLayout: string = 'dagre'
    private forceLayoutNextRender = false
    private currentData: any = { nodes: [], edges: [] }

    constructor(nodePositionsRef: Map<string, { x: number; y: number }>) {
        this.nodePositions = nodePositionsRef
    }

    init() {
        const container = document.getElementById('cy')!
        const grid = document.getElementById('container') as HTMLDivElement
        const divider = document.getElementById('divider') as HTMLDivElement
        try {
            this.cy = cytoscape({
                container,
                elements: [],
                layout: { name: 'dagre' },
                style: this.getThemeStyles(),
            })
        } catch (e: any) {
            postError('Cytoscape init failed', e)
        }

        // Single tap/click: show details only
        this.cy?.on('tap', 'node,edge', (e) => {
            const id = e.target.data('id')
            this.updateDetails(id)
            this.cy?.elements().removeClass('selected')
            e.target.addClass('selected')
            try { vscode.postMessage({ type: 'selected', id }) } catch { /* noop */ }
        })
        // Double tap: jump to source
        this.cy?.on('dbltap', 'node,edge', (e) => {
            const id = e.target.data('id')
            if (id) {
                vscode.postMessage({ type: 'revealInEditor', id })
            }
        })

        document.getElementById('fit')?.addEventListener('click', () => this.cy?.fit())
        document.getElementById('reset')?.addEventListener('click', () => {
            try {
                this.nodePositions.clear()
                vscode.postMessage({ type: 'clearPositions' })
                this.forceLayoutNextRender = true
                this.render(this.currentData)
            } catch { /* noop */ }
        })
        // Persist positions when user finishes dragging a node
        this.cy?.on('dragfree', 'node', () => {
            try { this.persistPositions() } catch { /* noop */ }
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
                this.cy?.resize()
            })
            window.addEventListener('mouseup', () => { dragging = false })
        }
        document.getElementById('labels')?.addEventListener('change', (e) => {
            const show = (e.target as HTMLInputElement).checked
            this.currentShowLabels = show
            this.applyTheme()
            if (this.nodePositions.size === 0) this.safeLayout(this.currentLayout)
            try { vscode.postMessage({ type: 'saveToggles', toggles: { showLabels: this.currentShowLabels, showDescriptions: this.showDescriptions } }) } catch { }
        })
        document.getElementById('descriptions')?.addEventListener('change', (e) => {
            this.showDescriptions = (e.target as HTMLInputElement).checked
            this.applyTheme()
            if (this.nodePositions.size === 0) this.safeLayout(this.currentLayout)
            try { vscode.postMessage({ type: 'saveToggles', toggles: { showLabels: this.currentShowLabels, showDescriptions: this.showDescriptions } }) } catch { }
        })

        // Apply theme and listen for changes
        this.applyTheme()
        const mo = new MutationObserver(() => this.applyTheme())
        mo.observe(document.body, { attributes: true, attributeFilter: ['class'] })

        // Persist positions on unload as a safety net
        window.addEventListener('beforeunload', () => {
            try { this.persistPositions() } catch { /* noop */ }
            try { this.persistViewport() } catch { /* noop */ }
        })
    }

    applyViewport(viewport: any) {
        if (!this.cy || !viewport || typeof viewport !== 'object') return
        try {
            if (typeof viewport.zoom === 'number') this.cy.zoom(viewport.zoom)
            if (viewport.pan && typeof viewport.pan.x === 'number' && typeof viewport.pan.y === 'number') {
                this.cy.pan({ x: viewport.pan.x, y: viewport.pan.y })
            }
            this.viewportAppliedFromHost = true
        } catch { /* noop */ }
    }

    render(graph: any) {
        try {
            this.currentData = graph || { nodes: [], edges: [] }
            if (!this.cy) return
            // Snapshot current viewport to restore later
            let prevPan: any | undefined
            let prevZoom: number | undefined
            let skipViewportRestore = false
            try {
                prevPan = this.cy.pan ? this.cy.pan() : undefined
                prevZoom = this.cy.zoom ? this.cy.zoom() : undefined
            } catch { /* noop */ }

            const nodes = Array.isArray(this.currentData.nodes) ? this.currentData.nodes : []
            const edges = Array.isArray(this.currentData.edges) ? this.currentData.edges : []
            const c = this.cy as cytoscape.Core

            const newNodeIds = new Set(nodes.map((n: any) => String(n.id)))
            const newEdgeIds = new Set(edges.map((e: any) => String(e.id)))

            const wasEmpty = this.cy.elements().length === 0
            const hasAnySavedPositions = nodes.some((n: any) => this.nodePositions.has(String(n.id)))

                ; (this.cy as any).startBatch?.()
            // Persist existing positions
            try {
                this.cy.nodes().forEach(n => {
                    const id = n.data('id')
                    if (id) this.nodePositions.set(id, { ...n.position() })
                })
            } catch { /* noop */ }

            // Remove edges not present anymore
            try {
                if (typeof (this.cy as any).edges === 'function') {
                    (this.cy as any).edges().forEach((e: any) => {
                        const id = e.data('id')
                        if (id && !newEdgeIds.has(String(id))) e.remove()
                    })
                }
            } catch { /* noop */ }
            // Remove nodes not present anymore
            try {
                this.cy.nodes().forEach(n => {
                    const id = n.data('id')
                    if (id && !newNodeIds.has(String(id))) n.remove()
                })
            } catch { /* noop */ }

            // Update existing nodes' data minimally and collect which are missing
            const existingNodeIds = new Set<string>()
            this.cy.nodes().forEach(n => { existingNodeIds.add(String(n.data('id'))) })

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
                    const ele = this.cy.$id(id)
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
                    this.cy.add({ data: n })
                }
            }

            // Update existing edges or add new ones
            const existingEdgeIds = new Set<string>()
            try { this.cy.edges().forEach(e => { existingEdgeIds.add(String(e.data('id'))) }) } catch { /* noop */ }
            for (const e of edges) {
                const id = String(e.id)
                if (existingEdgeIds.has(id)) {
                    const ele = this.cy.$id(id)
                    if (ele && ele.length) {
                        const cur = ele.data()
                        if (cur.label !== e.label) ele.data('label', e.label)
                        if (cur.description !== e.description) ele.data('description', e.description)
                    }
                } else {
                    this.cy.add({ data: e })
                }
            }

            // Final sanity: ensure all nodes from data exist
            try {
                let addedCount = 0
                const seen = new Set<string>()
                this.cy.nodes().forEach(n => { const i = String(n.data('id')); if (i) seen.add(i) })
                for (const n of nodes) {
                    const id = String(n.id)
                    if (!seen.has(id)) { (this.cy as any).add({ data: n }); addedCount++ }
                }
                if (addedCount > 0) vscode.postMessage({ type: 'log', message: `Sanity-added ${addedCount} missing nodes` })
            } catch { /* noop */ }

            try {
                const presentIds = new Set<string>()
                this.cy.nodes().forEach(n => { presentIds.add(String(n.data('id'))) })
                edges.forEach((e: any) => {
                    const src = String(e.source)
                    const dst = String(e.target)
                    if (src && !presentIds.has(src)) { (c as any).add({ data: { id: src, label: src } }); presentIds.add(src) }
                    if (dst && !presentIds.has(dst)) { (c as any).add({ data: { id: dst, label: dst } }); presentIds.add(dst) }
                })
            } catch { /* noop */ }

            // Ensure composed labels/styles before any layout for sizing
            this.applyTheme()

            // Place any newly-added nodes near a positioned neighbor
            const toPlace: cytoscape.NodeCollection = this.cy.nodes().filter(n => !this.nodePositions.has(String(n.data('id'))))
            let fallbackCount = 0
            toPlace.forEach((node) => {
                const id = String(node.data('id'))
                let placed = false
                try {
                    const connected = c.edges().filter(e => e.data('source') === id || e.data('target') === id)
                    for (const e of connected) {
                        const otherId = e.data('source') === id ? e.data('target') : e.data('source')
                        const op = this.nodePositions.get(String(otherId))
                        if (op) { node.position({ x: op.x + 60, y: op.y + 40 }); placed = true; break }
                    }
                } catch { /* noop */ }
                if (!placed) {
                    try {
                        const pId = (node as any).data('parent')
                        if (pId) {
                            const pp = this.nodePositions.get(String(pId)) || ((c.$id(String(pId)) as any).position?.() as any)
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
            this.cy.nodes().forEach(n => {
                const id = String(n.data('id'))
                const pos = this.nodePositions.get(id)
                if (pos) n.position(pos)
            })

            // Decide if we should run an initial or forced layout
            if (this.forceLayoutNextRender && nodes.length > 0) {
                this.safeLayout(this.currentLayout)
                this.cy.fit()
                this.forceLayoutNextRender = false
                skipViewportRestore = true
            } else if (wasEmpty && nodes.length > 0) {
                if (!hasAnySavedPositions) {
                    this.safeLayout(this.currentLayout)
                    if (!prevPan || typeof prevZoom !== 'number') { this.cy.fit(); skipViewportRestore = true }
                } else {
                    if (!this.viewportAppliedFromHost) { this.cy.fit(); skipViewportRestore = true }
                    else vscode.postMessage({ type: 'log', message: 'Skipped initial layout due to saved positions' })
                }
            }

            // First render visibility safety
            if (wasEmpty && nodes.length > 0 && !skipViewportRestore) {
                try {
                    const ext = c.extent?.()
                    if (ext) {
                        let inside = 0
                        this.cy.nodes().forEach(n => {
                            const p = (n as any).position()
                            if (p.x >= ext.x1 && p.x <= ext.x2 && p.y >= ext.y1 && p.y <= ext.y2) inside += 1
                        })
                        const total = Math.max(1, this.cy.nodes().length)
                        const ratio = inside / total
                        if (inside === 0 || ratio < 0.25) { this.cy.fit(); skipViewportRestore = true }
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
                if (!this.forceLayoutNextRender && !skipViewportRestore) {
                    if (prevPan && typeof this.cy!.pan === 'function') this.cy!.pan(prevPan)
                    if (typeof prevZoom === 'number' && typeof this.cy!.zoom === 'function') this.cy!.zoom(prevZoom)
                }
            } catch { /* noop */ }

            ; (this.cy as any).endBatch?.()
            this.cy.resize()

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

            try { this.persistViewport() } catch { /* noop */ }

            vscode.postMessage({ type: 'log', message: `Rendered ${nodes.length} nodes and ${edges.length} edges` })
        } catch (e: any) {
            postError('Render failed', e)
        }
    }

    selectById(id: string, center: boolean = true) {
        const ele = this.cy?.elements().filter((e) => e.data('id') === id)
        if (ele && ele.length > 0) {
            this.cy?.elements().unselect()
            this.cy?.elements().removeClass('selected')
            ele.select()
            ele.addClass('selected')
            if (center) this.cy?.center(ele)
            this.updateDetails(id)
        }
    }

    applySettings(s: any) {
        if (!this.cy) return
        if (s.layout) {
            this.currentLayout = s.layout
            if (this.nodePositions.size === 0) this.safeLayout(this.currentLayout)
        }
        if (typeof s.showLabels === 'boolean') {
            this.currentShowLabels = s.showLabels
            const cb = document.getElementById('labels') as HTMLInputElement | null
            if (cb) cb.checked = this.currentShowLabels
            this.applyTheme()
            if (this.nodePositions.size === 0) this.safeLayout(this.currentLayout)
        }
        if (typeof s.showDescriptions === 'boolean') {
            this.showDescriptions = s.showDescriptions
            const cb = document.getElementById('descriptions') as HTMLInputElement | null
            if (cb) cb.checked = this.showDescriptions
            this.applyTheme()
            if (this.nodePositions.size === 0) this.safeLayout(this.currentLayout)
        }
    }

    updateDetails(id: string) {
        const pre = document.getElementById('detailsPre')!
        const node = this.currentData.nodes.find((n: any) => n.id === id)
        const edge = this.currentData.edges.find((e: any) => e.id === id)
        const selected = node || edge
        if (!selected) { pre.textContent = ''; return }
        const raw = selected.raw || selected
        try { pre.textContent = JSON.stringify(raw, null, 2) } catch { pre.textContent = String(raw) }
    }

    applyTheme() {
        if (!this.cy) return
        try {
            this.cy.nodes().forEach(n => {
                const data = n.data()
                const title = data.label || data.id
                const desc = data.description || ''
                n.data('labelTitle', title)
                n.data('labelDesc', desc)
                n.data('labelComposed', desc ? `${title}\n${desc}` : title)
            })
            this.cy.edges().forEach(e => {
                const data = e.data()
                const lbl = (data.label || '').trim()
                const desc = (data.description || '').trim()
                const composed = !lbl && desc ? desc : desc && desc !== lbl && !lbl.includes(desc) ? `${lbl}${lbl ? ' — ' : ''}${desc}` : lbl
                e.data('labelTitle', lbl)
                e.data('labelDesc', desc)
                e.data('labelComposed', composed)
            })
            const styles = this.getThemeStyles()
            this.cy.style(styles as any)
        } catch (e) {
            postError('applyTheme failed', e)
        }
    }

    persistPositions() {
        if (!this.cy) return
        try {
            const map: Record<string, { x: number; y: number }> = {}
            this.cy.nodes().forEach(n => {
                if ((n as any).isParent && (n as any).isParent()) return
                const id = n.data('id')
                if (!id) return
                const p = n.position()
                map[String(id)] = { x: p.x, y: p.y }
            })
            vscode.postMessage({ type: 'savePositions', positions: map })
        } catch { /* noop */ }
    }

    persistViewport() {
        if (!this.cy) return
        try {
            const pan = this.cy.pan ? this.cy.pan() : undefined
            const zoom = this.cy.zoom ? this.cy.zoom() : undefined
            if (pan && typeof zoom === 'number') {
                vscode.postMessage({ type: 'saveViewport', viewport: { pan, zoom } })
            }
        } catch { /* noop */ }
    }

    safeLayout(preferred?: string) {
        if (!this.cy) return
        if (preferred) this.currentLayout = preferred
        const order = Array.from(new Set([this.currentLayout, 'dagre', 'fcose', 'cose'].filter(Boolean))) as string[]
        for (const name of order) {
            try {
                this.cy.layout({ name }).run()
                vscode.postMessage({ type: 'log', message: `Applied layout: ${name}` })
                this.currentLayout = name
                try {
                    this.nodePositions.clear()
                    this.cy.nodes().forEach(n => {
                        const id = n.data('id')
                        if (id) this.nodePositions.set(id, { ...n.position() })
                    })
                    this.persistPositions()
                    this.persistViewport()
                } catch { /* noop */ }
                return
            } catch {
                // try next
            }
        }
        vscode.postMessage({ type: 'error', message: 'No usable layout found (fcose/dagre/cose)' })
    }

    private getThemeStyles(): any[] {
        const dark = document.body.classList.contains('vscode-dark') || document.body.classList.contains('vscode-high-contrast')
        const palette = dark
            ? { nodeBg: '#3b82f6', text: '#111827', edge: '#9ca3af', selection: '#f59e0b' }
            : { nodeBg: '#4e79a7', text: '#222222', edge: '#aaaaaa', selection: '#f28e2b' }

        const nodeLabelField =
            this.currentShowLabels && this.showDescriptions
                ? 'data(labelComposed)'
                : this.currentShowLabels
                    ? 'data(labelTitle)'
                    : this.showDescriptions
                        ? 'data(labelDesc)'
                        : ''

        const edgeLabelField =
            this.currentShowLabels && this.showDescriptions
                ? 'data(labelComposed)'
                : this.currentShowLabels
                    ? 'data(labelTitle)'
                    : this.showDescriptions
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
}
