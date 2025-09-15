import * as vscode from 'vscode'

export class CalmTreeProvider implements vscode.TreeDataProvider<CalmItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<CalmItem | undefined | null | void>()
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event
    private architectureGroup = new CalmItem('Architecture', vscode.TreeItemCollapsibleState.Expanded, 'group:architecture')
    private groupNodes = new CalmItem('Nodes', vscode.TreeItemCollapsibleState.Collapsed, 'group:nodes')
    private groupRels = new CalmItem('Relationships', vscode.TreeItemCollapsibleState.Collapsed, 'group:relationships')
    private groupFlows = new CalmItem('Flows', vscode.TreeItemCollapsibleState.Collapsed, 'group:flows')
    private tree: vscode.TreeView<CalmItem> | undefined
    private isTemplateMode: boolean = false

    constructor(private getIndex: () => ModelIndex | undefined) { }

    // Helper function to capitalize node type for display
    private capitalizeNodeType(nodeType: string | undefined): string {
        if (!nodeType) return 'Other'
        return nodeType.charAt(0).toUpperCase() + nodeType.slice(1).toLowerCase()
    }

    // Helper function to normalize node type for grouping (case-insensitive)
    private normalizeNodeType(nodeType: string | undefined): string {
        if (!nodeType) return 'other'
        return nodeType.toLowerCase()
    }

    // Get grouped nodes by node type
    private getGroupedNodes(): Map<string, { id: string; label: string; nodeType?: string }[]> {
        const index = this.getIndex()
        if (!index) return new Map()

        const grouped = new Map<string, { id: string; label: string; nodeType?: string }[]>()

        for (const node of index.nodes) {
            const normalizedType = this.normalizeNodeType(node.nodeType)
            if (!grouped.has(normalizedType)) {
                grouped.set(normalizedType, [])
            }
            grouped.get(normalizedType)!.push(node)
        }

        return grouped
    }

    setModel(_index?: ModelIndex) {
        this._onDidChangeTreeData.fire()
    }

    setTemplateMode(isTemplateMode: boolean) {
        this.isTemplateMode = isTemplateMode
        this._onDidChangeTreeData.fire()
    }

    attach(view: vscode.TreeView<CalmItem>) { this.tree = view }

    async revealById(id: string) {
        if (!this.tree) return
        try {
            const index = this.getIndex()
            if (!index) return
            // Determine which group contains the id
            let item: CalmItem | undefined
            if (index.nodes.find(n => n.id === id)) {
                const node = index.nodes.find(n => n.id === id)!
                item = CalmItem.leaf(id, node.label, 'node')
            } else if (index.relationships.find(r => r.id === id)) {
                item = CalmItem.leaf(id, index.relationships.find(r => r.id === id)!.label || id, 'relationship')
            } else if (index.flows.find(f => f.id === id)) {
                item = CalmItem.leaf(id, index.flows.find(f => f.id === id)!.label || id, 'flow')
            }
            if (item) await this.tree.reveal(item, { select: true, focus: true, expand: true })
        } catch { /* noop */ }
    }

    getTreeItem(element: CalmItem): vscode.TreeItem {
        return element
    }

    getChildren(element?: CalmItem): Promise<CalmItem[]> {
        // In template mode, show a disabled message
        if (this.isTemplateMode) {
            if (!element) {
                const messageItem = new CalmItem(
                    'Navigation unavailable in Live Docify mode',
                    vscode.TreeItemCollapsibleState.None,
                    'template-mode-message'
                )
                messageItem.tooltip = 'Switch to an architecture file to use navigation features'
                messageItem.iconPath = new vscode.ThemeIcon('info')
                messageItem.contextValue = 'template-mode-message'
                return Promise.resolve([messageItem])
            }
            return Promise.resolve([])
        }

        // Normal architecture mode
        const index = this.getIndex()
        if (!index) return Promise.resolve([])

        if (!element) {
            return Promise.resolve([this.architectureGroup])
        }

        const [kind, group, ...rest] = element.id.split(':')
        if (kind === 'group') {
            if (group === 'architecture') {
                // Return the main groups: Nodes, Relationships, Flows
                return Promise.resolve([this.groupNodes, this.groupRels, this.groupFlows])
            }
            if (group === 'nodes') {
                // Return node type groups under Nodes
                const groupedNodes = this.getGroupedNodes()
                const nodeTypeGroups: CalmItem[] = []

                // Create groups for each node type
                for (const [normalizedType, nodes] of groupedNodes) {
                    const displayType = this.capitalizeNodeType(nodes[0]?.nodeType)
                    const groupItem = new CalmItem(
                        `${displayType} (${nodes.length})`,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        `group:nodetype:${normalizedType}`
                    )
                    nodeTypeGroups.push(groupItem)
                }

                // Sort node type groups alphabetically
                nodeTypeGroups.sort((a, b) => {
                    const labelA = (a as vscode.TreeItem).label as string
                    const labelB = (b as vscode.TreeItem).label as string
                    return labelA.localeCompare(labelB)
                })

                return Promise.resolve(nodeTypeGroups)
            }
            if (group === 'relationships') {
                return Promise.resolve(index.relationships.map(r => CalmItem.leaf(r.id, r.label || r.id, 'relationship')))
            }
            if (group === 'flows') {
                return Promise.resolve(index.flows.map(f => CalmItem.leaf(f.id, f.label || f.id, 'flow')))
            }
            // Handle node type groups: group:nodetype:service
            if (group === 'nodetype' && rest.length > 0) {
                const nodeType = rest[0] // This is the actual node type (e.g., 'service')
                const groupedNodes = this.getGroupedNodes()
                const nodes = groupedNodes.get(nodeType) || []
                return Promise.resolve(nodes.map(n => CalmItem.leaf(n.id, n.label, 'node')))
            }
        }
        return Promise.resolve([])
    }

    getParent(element: CalmItem): CalmItem | undefined {
        if (!element) return undefined
        if (element.id === 'group:architecture') return undefined
        if (element.id === 'group:nodes' || element.id === 'group:relationships' || element.id === 'group:flows') {
            return this.architectureGroup
        }
        if (element.id.startsWith('group:nodetype:')) {
            return this.groupNodes
        }

        const index = this.getIndex()
        if (!index) return undefined

        // Find which node type group this node belongs to
        if (index.nodes.find(n => n.id === element.id)) {
            const node = index.nodes.find(n => n.id === element.id)!
            const normalizedType = this.normalizeNodeType(node.nodeType)
            return new CalmItem(
                `${this.capitalizeNodeType(node.nodeType)} (${this.getGroupedNodes().get(normalizedType)?.length || 0})`,
                vscode.TreeItemCollapsibleState.Collapsed,
                `group:nodetype:${normalizedType}`
            )
        }
        if (index.relationships.find(r => r.id === element.id)) return this.groupRels
        if (index.flows.find(f => f.id === element.id)) return this.groupFlows
        return undefined
    }
}

export class CalmItem extends vscode.TreeItem {
    public contextValue?: string
    public tooltip?: string | vscode.MarkdownString
    public iconPath?: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } | vscode.ThemeIcon

    constructor(label: string, collapsibleState: vscode.TreeItemCollapsibleState, public readonly id: string) {
        super(label, collapsibleState)
    }

    static leaf(id: string, label: string, contextValue: string) {
        const item = new CalmItem(label, vscode.TreeItemCollapsibleState.None, id)
        item.contextValue = contextValue
        // No command; selection navigation is handled from the preview
        return item
    }
}

export interface ModelIndex {
    nodes: { id: string; label: string; nodeType?: string }[]
    relationships: { id: string; label?: string }[]
    flows: { id: string; label?: string }[]
}
