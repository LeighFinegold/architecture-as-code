import * as path from 'path'
import * as vscode from 'vscode'
import { detectCalmModel } from './model'
import { isTemplateFileWithArchitecture, getArchitecturePathFromTemplate } from './frontMatter'

export enum FileType {
    ArchitectureFile = 'architecture',
    TemplateFile = 'template',
    Other = 'other'
}

export interface FileInfo {
    type: FileType
    filePath: string
    architecturePath?: string
    isValid: boolean
}

/**
 * Detect the file type and validity for the TreeView
 */
export function detectFileType(filePath: string): FileInfo {
    const ext = path.extname(filePath).toLowerCase()

    // Check if it's a potential architecture file (JSON/YAML)
    if (['.json', '.yaml', '.yml'].includes(ext)) {
        try {
            const content = require('fs').readFileSync(filePath, 'utf8')
            const isArchitecture = detectCalmModel(content)

            return {
                type: FileType.ArchitectureFile,
                filePath,
                isValid: isArchitecture
            }
        } catch {
            return {
                type: FileType.ArchitectureFile,
                filePath,
                isValid: false
            }
        }
    }

    // For any other file type, check if it has front-matter with architecture reference
    try {
        const hasArchitecture = isTemplateFileWithArchitecture(filePath)
        const architecturePath = hasArchitecture ? getArchitecturePathFromTemplate(filePath) : undefined

        return {
            type: FileType.TemplateFile,
            filePath,
            architecturePath: architecturePath || undefined,
            isValid: hasArchitecture && !!architecturePath
        }
    } catch {
        return {
            type: FileType.Other,
            filePath,
            isValid: false
        }
    }
}

/**
 * Get file globs from VS Code configuration for file discovery
 */
export function getFileGlobs(): { architecture: string[], template: string[] } {
    const config = vscode.workspace.getConfiguration('calm')

    const architectureGlobs = config.get<string[]>('files.globs') || [
        'calm/**/*.json',
        'calm/**/*.y?(a)ml'
    ]

    const templateGlobs = config.get<string[]>('template.globs') || [
        '**/*.md',
        '**/*.markdown',
        '**/*.hbs',
        '**/*.handlebars',
        '**/*.html'
    ]

    return {
        architecture: architectureGlobs,
        template: templateGlobs
    }
}

/**
 * Check if a file should be processed by the extension based on configuration
 */
export function shouldProcessFile(filePath: string): boolean {
    const { architecture, template } = getFileGlobs()
    const allGlobs = [...architecture, ...template]

    return allGlobs.some(glob => {
        // Simple glob matching - just check if the file path matches the pattern
        const pattern = glob.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*').replace(/\?/g, '.')
        const regex = new RegExp(pattern)
        return regex.test(filePath)
    })
}

/**
 * Find all architecture and template files in the workspace
 */
export async function findWorkspaceFiles(): Promise<{ architecture: string[], template: string[] }> {
    const { architecture: archGlobs, template: templateGlobs } = getFileGlobs()

    const architectureFiles: string[] = []
    const templateFiles: string[] = []

    // Find architecture files
    for (const glob of archGlobs) {
        const files = await vscode.workspace.findFiles(glob)
        for (const file of files) {
            const filePath = file.fsPath
            const fileInfo = detectFileType(filePath)
            if (fileInfo.type === FileType.ArchitectureFile && fileInfo.isValid) {
                architectureFiles.push(filePath)
            }
        }
    }

    // Find template files
    for (const glob of templateGlobs) {
        const files = await vscode.workspace.findFiles(glob)
        for (const file of files) {
            const filePath = file.fsPath
            const fileInfo = detectFileType(filePath)
            if (fileInfo.type === FileType.TemplateFile && fileInfo.isValid) {
                templateFiles.push(filePath)
            }
        }
    }

    return { architecture: architectureFiles, template: templateFiles }
}