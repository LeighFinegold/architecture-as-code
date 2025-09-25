import type { ModelIndex } from '../../util/model'

export interface TreeAdapter {
    setModel(model: ModelIndex): void
    setTemplateMode(enabled: boolean): void
}
