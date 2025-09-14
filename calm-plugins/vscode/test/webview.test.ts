/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Minimal VS Code API shim
;(global as any).acquireVsCodeApi = () => ({ postMessage: vi.fn() })

describe('webview render pipeline', () => {
    beforeEach(() => {
        document.body.innerHTML = `
      <div id="toolbar">
        <input type="checkbox" id="labels" checked>
        <input type="checkbox" id="descriptions">
        <button id="fit"></button>
        <button id="reset"></button>
      </div>
      <div id="container">
        <div id="docify-content"></div>
      </div>
    `
        // Import fresh module each test
        vi.resetModules()
    })

    it('imports main module without errors', async () => {
        expect(async () => {
            await import('../src/webview/main')
        }).not.toThrow()
    })

    it('exposes renderMarkdown function', async () => {
        await import('../src/webview/main')
        expect(typeof window.renderMarkdown).toBe('function')
    })
})
