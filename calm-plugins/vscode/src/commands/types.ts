import * as vscode from 'vscode'
import type { SelectionService } from '../core/services/SelectionService'
import type { RefreshService } from '../core/services/RefreshService'
import type { ConfigService } from '../core/services/ConfigService'
import type { TreeViewManager } from '../ui/tree-view-manager'
import type { PreviewManager } from '../ui/PreviewManager'

export type RegisterFn = (ctx: vscode.ExtensionContext) => void

export interface CommandDeps {
    ctx: vscode.ExtensionContext
    output: vscode.OutputChannel
    config: ConfigService
    refresh: RefreshService
    selection: SelectionService
    tree: TreeViewManager
    preview: PreviewManager
    setTemplateMode: (enabled: boolean) => void
}
