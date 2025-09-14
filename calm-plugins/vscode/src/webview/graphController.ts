type PostMessageFn = (msg: any) => void

interface ControllerOptions {
    render: (graph: any) => void
    selectById: (id: string, center?: boolean) => void
    applySettings: (s: any) => void
    applyViewport: (v: any) => void
    nodePositions: Map<string, { x: number; y: number }>
    postMessage: PostMessageFn
}

export default class GraphController {
    private opts: ControllerOptions
    private pendingSelect?: string
    private pendingSelectTimer: any

    constructor(opts: ControllerOptions) {
        this.opts = opts
    }

    init() {
        window.addEventListener('message', (event) => {
            const msg = (event as any).data
            if (!msg) return
            if (msg.type === 'setData') {
                // Seed cached positions from host persistence on first set
                if (msg.positions && typeof msg.positions === 'object' && this.opts.nodePositions.size === 0) {
                    try {
                        this.opts.nodePositions.clear()
                        const entries = Object.entries(msg.positions)
                        for (let i = 0; i < entries.length; i++) {
                            const pair = entries[i] as [string, any]
                            const id = String(pair[0])
                            const pos = pair[1]
                            if (pos && typeof pos.x === 'number' && typeof pos.y === 'number') {
                                this.opts.nodePositions.set(id, { x: pos.x, y: pos.y })
                            }
                        }
                    } catch (e) { /* noop */ }
                }
                // Apply saved viewport if provided (delegate to view)
                if (msg.viewport && typeof msg.viewport === 'object') {
                    try { this.opts.applyViewport(msg.viewport) } catch (e) { /* noop */ }
                }
                // Render graph and apply other directives
                this.opts.render(msg.graph)
                if (msg.selectedId) this.opts.selectById(msg.selectedId, false)
                if (msg.settings) this.opts.applySettings(msg.settings)
            } else if (msg.type === 'select') {
                // Debounce selection so it happens after render/pan-restore, without re-centering
                this.pendingSelect = msg.id
                if (this.pendingSelectTimer) clearTimeout(this.pendingSelectTimer)
                this.pendingSelectTimer = setTimeout(() => {
                    if (this.pendingSelect) this.opts.selectById(this.pendingSelect, false)
                    this.pendingSelect = undefined
                }, 30)
            }
        })

        // notify ready
        try { this.opts.postMessage({ type: 'ready' }) } catch (e) { /* noop */ }
    }
}
