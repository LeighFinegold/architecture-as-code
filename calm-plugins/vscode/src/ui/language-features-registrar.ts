import * as vscode from 'vscode'
import { provideHovers, provideCodeLens } from '../util/language'
import type { ModelIndex } from '../util/model'

export class LanguageFeaturesRegistrar {
    private disposables: vscode.Disposable[] = []

    constructor(private getModelIndex: () => ModelIndex | undefined) {}

    registerAll() {
        this.disposables.push(
            vscode.languages.registerHoverProvider(
                [{ language: 'json' }, { language: 'yaml' }],
                provideHovers(this.getModelIndex)
            ),
            vscode.languages.registerCodeLensProvider(
                [{ language: 'json' }, { language: 'yaml' }],
                provideCodeLens(this.getModelIndex)
            )
        )
    }

    dispose() {
        for (const d of this.disposables) {
            try { d.dispose() } catch {}
        }
        this.disposables = []
    }
}
