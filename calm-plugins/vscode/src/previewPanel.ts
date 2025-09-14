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
  private currentSelectedId: string | undefined = undefined  // Track current selection
  private getCurrentTreeSelection: (() => string | undefined) | undefined = undefined  // Function to get TreeView selection
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
  private lastSelectedId: string | undefined

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
          this.output.appendLine('[preview] runDocify received; templatePath=' + String(msg.templatePath || 'auto') + '; selectedId=' + String(this.currentSelectedId || 'none'))
          this.handleRunDocify(msg.templatePath, this.currentSelectedId).catch(e => {
            this.panel.webview.postMessage({ type: 'docifyError', message: String(e?.message || e) })
          })
        } else if (msg.type === 'requestModelData') {
          this.output.appendLine('[preview] requestModelData received')
          this.handleRequestModelData()
        } else if (msg.type === 'requestTemplateData') {
          this.output.appendLine('[preview] requestTemplateData received')
          this.handleRequestTemplateData()
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
    const previousUri = this.currentUri
    this.currentUri = uri
    
    // If switching to a different file, clear the current selection
    if (previousUri && previousUri.fsPath !== uri.fsPath) {
      this.currentSelectedId = undefined
      this.output.appendLine(`[preview] Switched from ${previousUri.fsPath} to ${uri.fsPath}, clearing selection`)
    }
    
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
    this.currentSelectedId = id || undefined  // Track the current selection, treat empty string as undefined
    this.lastSelectedId = id || undefined     // Also store for model filtering
    this.output.appendLine(`[preview] TreeView selection changed to: ${id || 'none'}`)
    this.panel.webview.postMessage({ type: 'select', id })
    
    // Also trigger docify refresh if docify tab is active
    this.panel.webview.postMessage({ type: 'refreshDocifyIfActive' })
  }

  setGetCurrentTreeSelection(fn: () => string | undefined) {
    this.getCurrentTreeSelection = fn
  }

  dispose() {
    CalmPreviewPanel.currentPanel = undefined
    while (this.disposables.length) {
      const d = this.disposables.pop()
      try { d?.dispose() } catch { }
    }
  }

  private async handleRunDocify(templatePathRaw?: string, selectedId?: string) {
    const archUri = this.currentUri
    if (!archUri) {
      this.panel.webview.postMessage({ type: 'docifyError', message: 'No current architecture open in preview' })
      return
    }

    // If no selectedId was passed, try to get the current TreeView selection
    if (!selectedId && this.getCurrentTreeSelection) {
      selectedId = this.getCurrentTreeSelection()
      this.output.appendLine('[preview] Got current TreeView selection: ' + (selectedId || 'none'))
    }
    
    // If still no selection, use the stored current selection
    if (!selectedId) {
      selectedId = this.currentSelectedId
      this.output.appendLine('[preview] Using stored selection: ' + (selectedId || 'none'))
    }

    let templatePath = templatePathRaw
    if (templatePath === '__DEFAULT__') {
      // Instead of using the packaged template, use our dynamic generation
      templatePath = undefined  // This will trigger our dynamic template generation
      this.output.appendLine('[preview] Using dynamic template based on selection: ' + (selectedId || 'none'))
    }

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'calm-docify-'))
    const outFile = path.join(tmpDir, 'output.md')

    if (!templatePath) {
      const autoTpl = path.join(tmpDir, 'auto-template.hbs')
      const templateContent = await this.generateTemplateContent(selectedId)
      await fs.promises.writeFile(autoTpl, templateContent, 'utf8')
      templatePath = autoTpl
      this.output.appendLine('[preview] Generated dynamic template: ' + templateContent.replace(/\n/g, '\\n'))
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

  private handleRequestModelData() {
    if (!this.currentUri) {
      this.panel.webview.postMessage({ type: 'modelData', data: null })
      return
    }

    try {
      // Read the current CALM file and send its content
      const content = fs.readFileSync(this.currentUri.fsPath, 'utf8')
      let fullModelData: any
      
      if (this.currentUri.fsPath.endsWith('.json')) {
        fullModelData = JSON.parse(content)
      } else if (this.currentUri.fsPath.endsWith('.yml') || this.currentUri.fsPath.endsWith('.yaml')) {
        // Use YAML parsing if available
        try {
          const yaml = require('yaml')
          fullModelData = yaml.parse(content)
        } catch {
          // Fallback: send raw content if YAML parsing fails
          this.panel.webview.postMessage({ type: 'modelData', data: { raw: content, format: 'yaml' } })
          return
        }
      } else {
        this.panel.webview.postMessage({ type: 'modelData', data: { raw: content, format: 'unknown' } })
        return
      }

      // Filter model data based on current selection
      const filteredData = this.filterModelDataBySelection(fullModelData, this.lastSelectedId)
      
      this.panel.webview.postMessage({ type: 'modelData', data: filteredData })
      this.output.appendLine(`[preview] Sent filtered model data for selection: ${this.lastSelectedId || 'none'}`)
    } catch (error) {
      this.output.appendLine('[preview] Error reading model data: ' + String(error))
      this.panel.webview.postMessage({ type: 'modelData', data: null })
    }
  }

  private async handleRequestTemplateData() {
    try {
      // Get the current template content based on selection
      const templateContent = await this.generateTemplateContent(this.lastSelectedId)
      const templateName = this.getTemplateNameForSelection(this.lastSelectedId)
      
      this.panel.webview.postMessage({ 
        type: 'templateData', 
        data: {
          content: templateContent,
          name: templateName,
          selectedId: this.lastSelectedId || 'none'
        }
      })
      this.output.appendLine(`[preview] Sent template data: ${templateName} for selection: ${this.lastSelectedId || 'none'}`)
    } catch (error) {
      this.output.appendLine('[preview] Error reading template data: ' + String(error))
      this.panel.webview.postMessage({ type: 'templateData', data: null })
    }
  }

  private getTemplateNameForSelection(selectedId?: string): string {
    if (!selectedId) {
      return 'default-template.hbs'
    }

    // Handle group selections
    if (selectedId.startsWith('group:')) {
      return 'default-template.hbs'
    }

    // For individual items, determine the type
    if (this.lastData?.graph) {
      const graph = this.lastData.graph

      // Check if it's a node
      const isNode = graph.nodes?.some(n => n.id === selectedId)
      if (isNode) {
        return 'node-focus-template.hbs'
      }

      // Check if it's an edge (relationship or flow)
      const edge = graph.edges?.find(e => e.id === selectedId)
      if (edge) {
        if (edge.type === 'flow') {
          return 'flow-focus-template.hbs'
        } else {
          return 'relationship-focus-template.hbs'
        }
      }
    }

    // Fallback
    return 'default-template.hbs'
  }

  private filterModelDataBySelection(fullModelData: any, selectedId?: string): any {
    if (!selectedId || selectedId.startsWith('group:')) {
      // No selection or group selection - return full model
      return fullModelData
    }

    // Check if it's a node
    if (fullModelData.nodes) {
      const node = fullModelData.nodes.find((n: any) => n['unique-id'] === selectedId)
      if (node) {
        return node
      }
    }

    // Check if it's a relationship
    if (fullModelData.relationships) {
      const relationship = fullModelData.relationships.find((r: any) => r['unique-id'] === selectedId)
      if (relationship) {
        return relationship
      }
    }

    // Check if it's a flow
    if (fullModelData.flows) {
      const flow = fullModelData.flows.find((f: any) => f['unique-id'] === selectedId)
      if (flow) {
        return flow
      }
    }

    // If not found, return full model as fallback
    return fullModelData
  }

  private async generateTemplateContent(selectedId?: string): Promise<string> {
    // Debug: log current graph data structure
    if (this.lastData?.graph) {
      const graph = this.lastData.graph
      this.output.appendLine(`[template] Graph has ${graph.nodes?.length || 0} nodes and ${graph.edges?.length || 0} edges`)
      if (graph.nodes?.length > 0) {
        this.output.appendLine(`[template] Node IDs: ${graph.nodes.map(n => n.id).join(', ')}`)
      }
      if (graph.edges?.length > 0) {
        this.output.appendLine(`[template] Edge IDs: ${graph.edges.map(e => `${e.id}(${e.type})`).join(', ')}`)
      }
    } else {
      this.output.appendLine('[template] No graph data available')
    }

    if (!selectedId) {
      this.output.appendLine('[template] No selection - using default template')
      return await this.loadTemplate('default-template.hbs')
    }

    // Handle group selections
    if (selectedId.startsWith('group:')) {
      this.output.appendLine(`[template] Group selection "${selectedId}" - using default template`)
      return await this.loadTemplate('default-template.hbs')
    }

    // For individual items, we need to determine the type
    if (this.lastData?.graph) {
      const graph = this.lastData.graph

      // Check if it's a node
      const isNode = graph.nodes?.some(n => n.id === selectedId)
      if (isNode) {
        this.output.appendLine(`[template] Node selection "${selectedId}" - using focus-nodes template`)
        const template = await this.loadTemplate('node-focus-template.hbs')
        return template.replace(/\{\{focused-node-id\}\}/g, selectedId)
      }

      // Check if it's an edge (relationship)
      const edge = graph.edges?.find(e => e.id === selectedId)
      if (edge) {
        this.output.appendLine(`[template] Relationship selection "${selectedId}" (type: ${edge.type}) - using focus-relationships template`)
        const template = await this.loadTemplate('relationship-focus-template.hbs')
        return template.replace(/\{\{focused-relationship-id\}\}/g, selectedId)
      }
    }

    // Check if it's a flow from the original model data
    if (this.currentUri) {
      try {
        const content = fs.readFileSync(this.currentUri.fsPath, 'utf8')
        let modelData: any
        
        if (this.currentUri.fsPath.endsWith('.json')) {
          modelData = JSON.parse(content)
        } else if (this.currentUri.fsPath.endsWith('.yml') || this.currentUri.fsPath.endsWith('.yaml')) {
          const yaml = require('yaml')
          modelData = yaml.parse(content)
        }

        if (modelData?.flows) {
          const flow = modelData.flows.find((f: any) => f['unique-id'] === selectedId)
          if (flow) {
            this.output.appendLine(`[template] Flow selection "${selectedId}" - using focus-flows template`)
            const template = await this.loadTemplate('flow-focus-template.hbs')
            return template.replace(/\{\{focused-flow-id\}\}/g, selectedId)
          }
        }
      } catch (error) {
        this.output.appendLine(`[template] Error reading model data for flow check: ${error}`)
      }
    }

    // Fallback: default template
    this.output.appendLine(`[template] Unknown selection "${selectedId}" - using fallback default template`)
    return await this.loadTemplate('default-template.hbs')
  }

  private async loadTemplate(templateName: string): Promise<string> {
    try {
      const templatePath = path.join(this.context.extensionUri.fsPath, 'templates', templateName)
      return await fs.promises.readFile(templatePath, 'utf8')
    } catch (error) {
      this.output.appendLine(`[template] Failed to load ${templateName}: ${error}`)
      // Fallback to inline template
      return '{{block-architecture}}'
    }
  }

  private getHtml() {
    // version
    let version = 'unknown'
    try {
      const pkgUri = vscode.Uri.joinPath(this.context.extensionUri, 'package.json')
       
      const pkg = require(pkgUri.fsPath)
      if (pkg && pkg.version) version = String(pkg.version)
    } catch { }

    const webview = this.panel.webview
    const nonce = getNonce()

    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'main.global.js')
    )
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'preview.css')
    )

    // Load external HTML and inject placeholders
    const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'preview.html')
    let html = fs.readFileSync(htmlPath.fsPath, 'utf8')

    html = html
      .replace(/{{cspSource}}/g, webview.cspSource)
      .replace(/{{styleUri}}/g, String(styleUri))
      .replace(/{{scriptUri}}/g, String(scriptUri))
      .replace(/{{nonce}}/g, nonce)
      .replace(/{{version}}/g, version)

    return html
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
