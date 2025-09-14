import * as vscode from 'vscode'
import { getNonce } from './util/webview'

export interface GraphData {
    nodes: Array<{ id: string; label: string; type?: string }>
    edges: Array<{ id: string; source: string; target: string; label?: string; type?: string }>
}

export class CalmPreviewPanel {
    public static currentPanel: CalmPreviewPanel | undefined
    private readonly panel: vscode.WebviewPanel
    private disposables: vscode.Disposable[] = []
    private revealInEditorHandlers: Array<(id: string) => void> = []
    private selectHandlers: Array<(id: string) => void> = []
    private ready = false
    private lastData: { graph: GraphData; selectedId?: string; settings?: any; positions?: Record<string, { x: number; y: number }>; viewport?: { pan: { x: number; y: number }, zoom: number } } | undefined
    private currentUri: vscode.Uri | undefined

    static createOrShow(context: vscode.ExtensionContext, uri: vscode.Uri, config: vscode.WorkspaceConfiguration, output: vscode.OutputChannel) {
        const column = vscode.ViewColumn.Beside

        if (CalmPreviewPanel.currentPanel) {
            CalmPreviewPanel.currentPanel.reveal(uri)
            return CalmPreviewPanel.currentPanel
        }

        const panel = vscode.window.createWebviewPanel(
            'calmPreview',
            'CALM Preview',
            column,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'dist'), vscode.Uri.joinPath(context.extensionUri, 'media')]
            }
        )

        CalmPreviewPanel.currentPanel = new CalmPreviewPanel(panel, context, config, output)
        CalmPreviewPanel.currentPanel.currentUri = uri
        return CalmPreviewPanel.currentPanel
    }

    constructor(panel: vscode.WebviewPanel, private context: vscode.ExtensionContext, private cfg: vscode.WorkspaceConfiguration, private output: vscode.OutputChannel) {
        this.panel = panel

        // Attach message listener BEFORE setting HTML so early webview posts aren't missed
        this.panel.webview.onDidReceiveMessage((msg: any) => {
            if (msg.type === 'revealInEditor' && typeof msg.id === 'string') {
                this.revealInEditorHandlers.forEach(h => h(msg.id))
            } else if (msg.type === 'selected' && typeof msg.id === 'string') {
                this.selectHandlers.forEach(h => h(msg.id))
            } else if (msg.type === 'ready') {
                this.ready = true
                if (this.lastData) {
                    this.panel.webview.postMessage({ type: 'setData', ...this.lastData })
                }
            } else if (msg.type === 'savePositions' && msg.positions && this.currentUri) {
                // Persist per-document positions (if workspaceState available)
                const key = this.positionsKey(this.currentUri)
                try { (this.context as any).workspaceState?.update?.(key, msg.positions) } catch { }
            } else if (msg.type === 'saveViewport' && msg.viewport && this.currentUri) {
                const key = this.viewportKey(this.currentUri)
                try { (this.context as any).workspaceState?.update?.(key, msg.viewport) } catch { }
            } else if (msg.type === 'clearPositions' && this.currentUri) {
                try {
                    (this.context as any).workspaceState?.update?.(this.positionsKey(this.currentUri), undefined)
                        ; (this.context as any).workspaceState?.update?.(this.viewportKey(this.currentUri), undefined)
                } catch { }
            } else if (msg.type === 'saveToggles' && msg.toggles && this.currentUri) {
                const key = this.togglesKey(this.currentUri)
                try { (this.context as any).workspaceState?.update?.(key, msg.toggles) } catch { }
            } else if (msg.type === 'log' && msg.message) {
                this.output.appendLine(`[webview] ${msg.message}`)
            } else if (msg.type === 'error' && msg.message) {
                this.output.appendLine(`[webview][error] ${msg.message}`)
                if (msg.stack) this.output.appendLine(String(msg.stack))
            }
        }, undefined, this.disposables)

        // Now set HTML after listener registration
        this.panel.webview.html = this.getHtml()

        this.panel.onDidDispose(() => this.dispose(), null, this.disposables)
    }

    reveal(uri: vscode.Uri) {
        this.currentUri = uri
        this.panel.reveal(vscode.ViewColumn.Beside)
    }

    getCurrentUri(): vscode.Uri | undefined { return this.currentUri }

    onDidDispose(handler: () => void) {
        this.panel.onDidDispose(handler)
    }

    onRevealInEditor(handler: (id: string) => void) {
        this.revealInEditorHandlers.push(handler)
    }

    onDidSelect(handler: (id: string) => void) {
        this.selectHandlers.push(handler)
    }

    setData(payload: { graph: GraphData; selectedId?: string; settings?: any }) {
        // Attach persisted positions for this document, if any
        const positions = (this.currentUri && (this.context as any).workspaceState?.get)
            ? (((this.context as any).workspaceState.get(this.positionsKey(this.currentUri)) as any) || undefined)
            : undefined
        const viewport = (this.currentUri && (this.context as any).workspaceState?.get)
            ? (((this.context as any).workspaceState.get(this.viewportKey(this.currentUri)) as any) || undefined)
            : undefined
        const toggles = (this.currentUri && (this.context as any).workspaceState?.get)
            ? (((this.context as any).workspaceState.get(this.togglesKey(this.currentUri)) as any) || undefined)
            : undefined
        // Merge persisted toggles into settings (without mutating caller input)
        const settings = { ...(payload.settings || {}), ...(toggles || {}) }
        this.lastData = { ...payload, settings, positions, viewport }
        if (this.ready) {
            this.panel.webview.postMessage({ type: 'setData', ...this.lastData })
        } else {
            this.output.appendLine('[preview] Webview not ready yet; queued graph payload')
        }
    }

    postSelect(id: string) {
        this.panel.webview.postMessage({ type: 'select', id })
    }

    dispose() {
        CalmPreviewPanel.currentPanel = undefined
        while (this.disposables.length) {
            const d = this.disposables.pop()
            try { d?.dispose() } catch { }
        }
    }

    // Update the HTML structure to include three sections for Cytoscape, Docify, and Validation
    private getHtml() {
        // Read extension version from package.json on disk so we can show it in the preview
        let version = 'unknown'
        try {
            // package.json is next to this source at project level during development; when packaged the version will be injected at build time
            // Use extensionPath as base to find package.json in the extension source
            const pkgUri = vscode.Uri.joinPath(this.context.extensionUri, 'package.json')
            const pkg = require(pkgUri.fsPath)
            if (pkg && pkg.version) version = String(pkg.version)
        } catch (e) {
            try { this.output.appendLine('[preview] Could not read package.json to get version: ' + String(e)) } catch { }
        }
        try {
            this.output.appendLine(`[preview] Preview version: ${version}`)
        } catch { /* noop */ }
        const webview = this.panel.webview;
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'main.global.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'preview.css'));
        const nonce = getNonce();
        return `<!DOCTYPE html>
    <html lang="en">
    <head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}'; font-src ${webview.cspSource};">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="${styleUri}" rel="stylesheet" />
    <title>CALM Preview</title>
    </head>
    <body>
        <!-- Header + Tabs -->
        <header style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid rgba(0,0,0,0.08)">
            <div style="font-weight:600">CALM Preview</div>
            <div style="font-size:12px;color:var(--vscode-editor-foreground)">Version: ${version}</div>
        </header>
        <!-- Tabs -->
        <!-- toolbar moved into Cytoscape tab -->
    

        <!-- Tabs -->
        <div class="tabs" role="tablist" aria-label="Preview Tabs">
            <button class="tab-button active" role="tab" data-target="cytoscape-panel">Cytoscape</button>
            <button class="tab-button" role="tab" data-target="docify-panel">Docify</button>
            <button class="tab-button" role="tab" data-target="validation-panel">Validation</button>
        </div>

        <!-- Tabbed content: only one .tab-content is visible at a time -->
        <div id="container">
            <div id="cytoscape-panel" class="tab-content active">
                    <h2>Cytoscape</h2>
                    <div id="toolbar">
                        <label><input type="checkbox" id="labels" checked /> Labels</label>
                        <label><input type="checkbox" id="descriptions" /> Descriptions</label>
                        <button id="fit">Fit</button>
                        <button id="reset">Reset</button>
                    </div>
                    <div id="cy"></div>
                </div>
            <div id="docify-panel" class="tab-content">
                <h2>Docify</h2>
                <div id="docify-content"></div>
            </div>
            <div id="validation-panel" class="tab-content">
                <h2>Validation</h2>
                <div id="validation-content"></div>
            </div>
        </div>

        <script nonce="${nonce}">
            // Tab switching logic: show only the selected panel and set accessibility attributes
            (function(){
                const buttons = Array.from(document.querySelectorAll('.tab-button'));
                const contents = Array.from(document.querySelectorAll('.tab-content'));
                function activate(targetId){
                    buttons.forEach(b => {
                        const isActive = b.getAttribute('data-target') === targetId;
                        b.classList.toggle('active', isActive);
                        b.setAttribute('aria-selected', String(isActive));
                    });
                    contents.forEach(c => {
                        const isActive = c.id === targetId;
                        c.classList.toggle('active', isActive);
                        if (isActive) {
                            c.removeAttribute('hidden');
                            c.setAttribute('aria-hidden', 'false');
                        } else {
                            c.setAttribute('hidden', '');
                            c.setAttribute('aria-hidden', 'true');
                        }
                    });
                    // If Cytoscape tab became active, trigger a short resize so Cytoscape can redraw
                    if(targetId === 'cytoscape-panel'){
                        setTimeout(()=>{ try{ window.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('resize')); }catch(e){} }, 75);
                    }
                }
                // initialize hidden attributes so only the active panel is visible
                contents.forEach(c => { if (!c.classList.contains('active')) { c.setAttribute('hidden',''); c.setAttribute('aria-hidden','true'); } else { c.removeAttribute('hidden'); c.setAttribute('aria-hidden','false'); } });
                buttons.forEach(b => b.addEventListener('click', () => activate(b.getAttribute('data-target'))));
                // keyboard accessibility
                buttons.forEach((b,i)=> b.addEventListener('keydown', (e)=>{
                    if(e.key === 'ArrowRight') buttons[(i+1)%buttons.length].focus();
                    if(e.key === 'ArrowLeft') buttons[(i-1+buttons.length)%buttons.length].focus();
                    if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); }
                }));
            })();
        </script>

        <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
    }

    private positionsKey(uri: vscode.Uri) {
        return `calm.positions:${uri.toString()}`
    }

    private viewportKey(uri: vscode.Uri) {
        return `calm.viewport:${uri.toString()}`
    }

    private togglesKey(uri: vscode.Uri) {
        return `calm.toggles:${uri.toString()}`
    }
}
