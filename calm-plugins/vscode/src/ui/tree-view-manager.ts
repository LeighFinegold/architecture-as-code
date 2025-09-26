import * as vscode from 'vscode'
import { CalmTreeProvider, CalmItem } from '../tree-view'
import { ModelIndex } from '../util/model'
import type { SelectionService } from '../core/services/selection-service'

export class TreeViewManager {
    private provider: CalmTreeProvider
    private view: vscode.TreeView<CalmItem>
    private disposables: vscode.Disposable[] = []

    constructor(getModelIndex: () => ModelIndex | undefined) {
        this.provider = new CalmTreeProvider(getModelIndex)
        this.view = vscode.window.createTreeView('calmSidebar', {
            treeDataProvider: this.provider,
            showCollapseAll: true
        })
        this.provider.attach(this.view)
    }

    getTreeView() {
        return this.view
    }

    getProvider() {
        return this.provider
    }

    /** Bridge tree selection events to the SelectionService. */
    bindSelectionService(selection: SelectionService) {
        const d = this.view.onDidChangeSelection(async ev => {
            const id = ev.selection?.[0]?.id ?? ''
            await selection.syncFromTree(id)
        })
        this.disposables.push(d)
    }

    dispose() {
        for (const d of this.disposables) {
            try { d.dispose() } catch {}
        }
        this.disposables = []
    }

    getCurrentSelectionId(): string | undefined {
        return this.view.selection?.[0]?.id
    }

    async revealById(id: string) {
        await this.provider.revealById(id)
    }

    setModel(model: ModelIndex) {
        this.provider.setModel(model)
    }

    setTemplateMode(enabled: boolean) {
        this.provider.setTemplateMode(enabled)
    }

    setSearchFilter(text: string) {
        this.provider.setSearchFilter(text)
    }

    getSearchFilter(): string {
        return this.provider.getSearchFilter()
    }

    expandRoot() {
        const rootItem = this.provider.getTreeItem(
            new CalmItem('Architecture', vscode.TreeItemCollapsibleState.Expanded, 'group:architecture')
        )
        if (rootItem && rootItem.id) {
            this.view.reveal(rootItem, { expand: true })
        }
    }
}
