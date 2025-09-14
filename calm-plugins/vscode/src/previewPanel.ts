import * as vscode from 'vscode'
import { getNonce } from './util/webview'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

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
    private lastData:
        | {
            graph: GraphData
            selectedId?: string
            settings?: any
            positions?: Record<string, { x: number; y: number }>
            viewport?: { pan: { x: number; y: number }; zoom: number }
        }
        | undefined
    private currentUri: vscode.Uri | undefined

    static createOrShow(
        context: vscode.ExtensionContext,
        uri: vscode.Uri,
        config: vscode.WorkspaceConfiguration,
        output: vscode.OutputChannel
    ) {
        const column = vscode.ViewColumn.Beside

        if (CalmPreviewPanel.currentPanel) {
            CalmPreviewPanel.currentPanel.reveal(uri)
            return CalmPreviewPanel.currentPanel
        }

        const panel = vscode.window.createWebviewPanel('calmPreview', 'CALM Preview', column, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(context.extensionUri, 'dist'),
                vscode.Uri.joinPath(context.extensionUri, 'media'),
                vscode.Uri.joinPath(context.extensionUri, 'templates'),
            ],
        })

        CalmPreviewPanel.currentPanel = new CalmPreviewPanel(panel, context, config, output)
        CalmPreviewPanel.currentPanel.currentUri = uri
        return CalmPreviewPanel.currentPanel
    }

    constructor(
        panel: vscode.WebviewPanel,
        private context: vscode.ExtensionContext,
        private cfg: vscode.WorkspaceConfiguration,
        private output: vscode.OutputChannel
    ) {
        this.panel = panel

        this.panel.webview.onDidReceiveMessage(
            (msg: any) => {
                try { this.output.appendLine('[preview][rawMsg] ' + JSON.stringify(msg)) } catch { }

                if (msg.type === 'revealInEditor' && typeof msg.id === 'string') {
                    this.revealInEditorHandlers.forEach(h => h(msg.id))
                } else if (msg.type === 'selected' && typeof msg.id === 'string') {
                    this.selectHandlers.forEach(h => h(msg.id))
                } else if (msg.type === 'ready') {
                    this.ready = true
                    if (this.lastData) this.panel.webview.postMessage({ type: 'setData', ...this.lastData })
                } else if (msg.type === 'savePositions' && msg.positions && this.currentUri) {
                    try { (this.context as any).workspaceState?.update?.(this.positionsKey(this.currentUri), msg.positions) } catch { }
                } else if (msg.type === 'saveViewport' && msg.viewport && this.currentUri) {
                    try { (this.context as any).workspaceState?.update?.(this.viewportKey(this.currentUri), msg.viewport) } catch { }
                } else if (msg.type === 'clearPositions' && this.currentUri) {
                    try {
                        (this.context as any).workspaceState?.update?.(this.positionsKey(this.currentUri), undefined)
                            ; (this.context as any).workspaceState?.update?.(this.viewportKey(this.currentUri), undefined)
                    } catch { }
                } else if (msg.type === 'saveToggles' && msg.toggles && this.currentUri) {
                    try { (this.context as any).workspaceState?.update?.(this.togglesKey(this.currentUri), msg.toggles) } catch { }
                } else if (msg.type === 'runDocify') {
                    this.output.appendLine('[preview] runDocify received; templatePath=' + String(msg.templatePath || 'auto'))
                    this.handleRunDocify(msg.templatePath).catch(e => {
                        this.panel.webview.postMessage({ type: 'docifyError', message: String(e?.message || e) })
                    })
                } else if (msg.type === 'log' && msg.message) {
                    this.output.appendLine(`[webview] ${msg.message}`)
                } else if (msg.type === 'error' && msg.message) {
                    this.output.appendLine(`[webview][error] ${msg.message}`)
                    if (msg.stack) this.output.appendLine(String(msg.stack))
                }
            },
            undefined,
            this.disposables
        )

        this.panel.webview.html = this.getHtml()
        this.panel.onDidDispose(() => this.dispose(), null, this.disposables)
    }

    reveal(uri: vscode.Uri) {
        this.currentUri = uri
        this.panel.reveal(vscode.ViewColumn.Beside)
    }

    getCurrentUri(): vscode.Uri | undefined { return this.currentUri }
    onDidDispose(handler: () => void) { this.panel.onDidDispose(handler) }
    onRevealInEditor(handler: (id: string) => void) { this.revealInEditorHandlers.push(handler) }
    onDidSelect(handler: (id: string) => void) { this.selectHandlers.push(handler) }

    setData(payload: { graph: GraphData; selectedId?: string; settings?: any }) {
        const positions =
            this.currentUri && (this.context as any).workspaceState?.get
                ? ((this.context as any).workspaceState.get(this.positionsKey(this.currentUri)) as any) || undefined
                : undefined
        const viewport =
            this.currentUri && (this.context as any).workspaceState?.get
                ? ((this.context as any).workspaceState.get(this.viewportKey(this.currentUri)) as any) || undefined
                : undefined
        const toggles =
            this.currentUri && (this.context as any).workspaceState?.get
                ? ((this.context as any).workspaceState.get(this.togglesKey(this.currentUri)) as any) || undefined
                : undefined
        const settings = { ...(payload.settings || {}), ...(toggles || {}) }
        this.lastData = { ...payload, settings, positions, viewport }
        if (this.ready) this.panel.webview.postMessage({ type: 'setData', ...this.lastData })
        else this.output.appendLine('[preview] Webview not ready yet; queued graph payload')
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

    private async handleRunDocify(templatePathRaw?: string) {
        const archUri = this.currentUri
        if (!archUri) {
            this.panel.webview.postMessage({ type: 'docifyError', message: 'No current architecture open in preview' })
            return
        }

        let templatePath = templatePathRaw
        if (templatePath === '__DEFAULT__') {
            try {
                templatePath = path.join(this.context.extensionUri.fsPath, 'templates', 'default-template.hbs')
                this.output.appendLine('[preview] Using packaged default template: ' + templatePath)
            } catch { templatePath = undefined }
        }

        const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'calm-docify-'))
        const outFile = path.join(tmpDir, 'output.md')

        if (!templatePath) {
            const autoTpl = path.join(tmpDir, 'auto-template.hbs')
            await fs.promises.writeFile(autoTpl, '{{block-architecture}}', 'utf8')
            templatePath = autoTpl
            this.output.appendLine('[preview] Created auto template at ' + autoTpl)
        }

        const mod: any = await import('@finos/calm-shared')
        const Docifier = mod.Docifier || mod.default?.Docifier || (mod as any).Docifier
        if (!Docifier) throw new Error('Docifier not found in @finos/calm-shared')

        const docifyMode = templatePath ? 'USER_PROVIDED' : 'BUNDLE'
        const templateMode = templatePath ? 'template' : 'bundle'
        const d = new Docifier(docifyMode, archUri.fsPath, outFile, {}, templateMode, templatePath, false)

        await d.docify()
        this.output.appendLine('[preview] Docify finished')

        let content: string | undefined = undefined
        let outputPath: string | undefined = undefined
        try {
            content = await fs.promises.readFile(outFile, 'utf8')
            outputPath = outFile
        } catch {
            const files = await fs.promises.readdir(tmpDir)
            const candidates = files.filter(f => f.endsWith('.html') || f.endsWith('.md') || f.endsWith('.txt'))
            if (candidates.length) {
                outputPath = path.join(tmpDir, candidates[0])
                content = await fs.promises.readFile(outputPath, 'utf8')
            } else if (files.length) {
                outputPath = path.join(tmpDir, files[0])
                content = await fs.promises.readFile(outputPath, 'utf8')
            }
        }

        if (!content) {
            this.panel.webview.postMessage({ type: 'docifyError', message: 'Docify completed but no output file was found' })
            return
        }

        this.panel.webview.postMessage({
            type: 'docifyResult',
            content,
            format: content.trim().startsWith('<') ? 'html' : 'markdown',
            sourceFile: outputPath || outFile,
        })
    }

    private getHtml() {
        let version = 'unknown'
        try {
            const pkgUri = vscode.Uri.joinPath(this.context.extensionUri, 'package.json')
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const pkg = require(pkgUri.fsPath)
            if (pkg && pkg.version) version = String(pkg.version)
        } catch { }

        const webview = this.panel.webview
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'main.global.js'))
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'preview.css'))
        const nonce = getNonce()

        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'nonce-${nonce}'; font-src ${webview.cspSource};">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link href="${styleUri}" rel="stylesheet" />
<style>
  .tab-content[hidden]{display:none!important}
  #detailsPre {
    margin-top: 8px; padding: 8px;
    border: 1px solid var(--vscode-editorWidget-border);
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
    max-height: 200px; overflow: auto; font-size: 12px;
  }
</style>
<title>CALM Preview</title>
</head>
<body>
<header style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;border-bottom:1px solid rgba(0,0,0,0.08)">
  <div style="font-weight:600">CALM Preview</div>
  <div style="font-size:12px;color:var(--vscode-editor-foreground)">Version: ${version}</div>
</header>

<div class="tabs" role="tablist" aria-label="Preview Tabs">
  <button class="tab-button active" role="tab" data-target="cytoscape-panel">Cytoscape</button>
  <button class="tab-button" role="tab" data-target="docify-panel">Docify</button>
  <button class="tab-button" role="tab" data-target="validation-panel">Validation</button>
</div>

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
    <pre id="detailsPre" aria-live="polite"></pre>
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

<!-- 1) Bootstrap VS Code API exactly once and override acquireVsCodeApi -->
<script nonce="${nonce}">
(function(){
  try {
    var api = acquireVsCodeApi();              // may throw if already acquired elsewhere
    window.__vscodeApi = api;
    // Override so future calls (bundle or our scripts) reuse, not throw
    window.acquireVsCodeApi = function(){ return api; };
  } catch(e) {
    // If already acquired, try to reuse our cached one (if any)
    window.__vscodeApi = window.__vscodeApi || undefined;
    // And ensure future calls don't throw
    if (typeof window.acquireVsCodeApi !== 'function') {
      window.acquireVsCodeApi = function(){ return window.__vscodeApi; };
    }
  }
})();
</script>

<!-- 2) Original tab switcher (unchanged for Cytoscape stability) -->
<script nonce="${nonce}">
(function(){
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.tab-button'));
  var contents = Array.prototype.slice.call(document.querySelectorAll('.tab-content'));

  function activate(targetId){
    buttons.forEach(function(b){
      var isActive = b.getAttribute('data-target') === targetId;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-selected', String(isActive));
    });
    contents.forEach(function(c){
      var isActive = c.id === targetId;
      c.classList.toggle('active', isActive);
      if (isActive) { c.removeAttribute('hidden'); c.setAttribute('aria-hidden','false'); }
      else { c.setAttribute('hidden',''); c.setAttribute('aria-hidden','true'); }
    });

    if (targetId === 'cytoscape-panel') {
      setTimeout(function(){ try{ window.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('resize')); }catch(e){} }, 75);
    }
  }

  contents.forEach(function(c){
    if (!c.classList.contains('active')) { c.setAttribute('hidden',''); c.setAttribute('aria-hidden','true'); }
    else { c.removeAttribute('hidden'); c.setAttribute('aria-hidden','false'); }
  });

  buttons.forEach(function(b){ b.addEventListener('click', function(){ activate(b.getAttribute('data-target')); }); });
  buttons.forEach(function(b,i){
    b.addEventListener('keydown', function(e){
      if(e.key === 'ArrowRight') buttons[(i+1)%buttons.length].focus();
      if(e.key === 'ArrowLeft') buttons[(i-1+buttons.length)%buttons.length].focus();
      if(e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); }
    });
  });
})();
</script>

<!-- 3) Load your main webview bundle (Cytoscape, etc.) -->
<script nonce="${nonce}" src="${scriptUri}"></script>

<!-- 4) Docify glue: runs EVERY time you click the Docify tab; debounced while a run is in flight -->
<script nonce="${nonce}">
(function(){
  var vscodeApi = window.__vscodeApi || (typeof acquireVsCodeApi === 'function' ? acquireVsCodeApi() : null);
  var docifyRunning = false;

  function isDocifyActive(){
    var panel = document.getElementById('docify-panel');
    return panel && panel.classList.contains('active');
  }

  function triggerDocify(){
    if (docifyRunning) return;
    if (!isDocifyActive()) return;
    docifyRunning = true;

    var content = document.getElementById('docify-content');
    if (content) content.innerHTML = '<em>Rendering...</em>';
    if (vscodeApi && vscodeApi.postMessage) {
      try { vscodeApi.postMessage({ type:'log', message:'docify-run' }); } catch(e){}
      vscodeApi.postMessage({ type:'runDocify', templatePath:'__DEFAULT__' });
    } else {
      if (content) content.innerHTML = '<div style="color:var(--vscode-editorError-foreground)">VS Code API unavailable</div>';
    }
  }

  var docifyButton = Array.prototype.find.call(document.querySelectorAll('.tab-button'), function(b){
    return b.getAttribute('data-target') === 'docify-panel';
  });
  if (docifyButton) {
    docifyButton.addEventListener('click', function(){
      setTimeout(triggerDocify, 0); // run after tab becomes active
    });
  }

  window.addEventListener('message', function(ev){
    var msg = ev.data || {};
    var content = document.getElementById('docify-content');
    function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

    if (msg.type === 'docifyResult') {
      docifyRunning = false;
      if (!content) return;
      if (msg.format === 'html') {
        content.innerHTML = msg.content;
      } else {
        var r = (window && window.renderMarkdown) ? window.renderMarkdown : undefined;
        if (typeof r === 'function') {
          r(msg.content).then(function(html){ content.innerHTML = html; })
            .catch(function(e){ content.innerHTML = '<pre style="white-space:pre-wrap">'+esc(String(e))+'</pre>'; });
        } else {
          content.innerHTML = '<pre style="white-space:pre-wrap">'+esc(msg.content)+'</pre>';
        }
      }
    } else if (msg.type === 'docifyError') {
      docifyRunning = false;
      if (content) content.innerHTML = '<div style="color:var(--vscode-editorError-foreground)">Error: '+esc(msg.message)+'</div>';
    }
  });
})();
</script>

</body>
</html>`
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
