import type { ApplicationStoreApi } from '../application-store'
import { createOpenPreviewCommand } from './open-preview-command'
import { createSearchTreeViewCommand } from './search-tree-view-command'
import { createClearTreeViewSearchCommand } from './clear-tree-view-search-command'
import * as vscode from 'vscode'

export class CommandRegistrar {
    constructor(
        private context: vscode.ExtensionContext,
        private store: ApplicationStoreApi
    ) {}

    registerAll() {
        const commands = [
            createOpenPreviewCommand(this.store),
            createSearchTreeViewCommand(this.store),
            createClearTreeViewSearchCommand(this.store)
        ]

        commands.forEach(disposable => {
            this.context.subscriptions.push(disposable)
        })
    }
}

