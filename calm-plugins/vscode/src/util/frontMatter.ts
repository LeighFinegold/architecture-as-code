import * as fs from 'fs'
import * as path from 'path'

export interface FrontMatter {
  architecture?: string
  [key: string]: any
}

export interface ParsedTemplate {
  frontMatter: FrontMatter
  content: string
  hasArchitecture: boolean
  architecturePath?: string
}

/**
 * Parse YAML front-matter from a template file
 */
export function parseFrontMatter(filePath: string): ParsedTemplate | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return parseFrontMatterFromContent(content, filePath)
  } catch (error) {
    return null
  }
}

/**
 * Parse YAML front-matter from file content
 */
export function parseFrontMatterFromContent(content: string, filePath?: string): ParsedTemplate | null {
  // Check if content starts with front-matter delimiter
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    return {
      frontMatter: {},
      content,
      hasArchitecture: false
    }
  }

  // Find the closing front-matter delimiter
  const lines = content.split(/\r?\n/)
  let endLineIndex = -1
  
  // Start from line 1 (skip the opening ---)
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endLineIndex = i
      break
    }
  }
  
  if (endLineIndex === -1) {
    // Invalid front-matter format - no closing ---
    return {
      frontMatter: {},
      content,
      hasArchitecture: false
    }
  }

  // Extract front-matter YAML (lines 1 to endLineIndex-1)
  const frontMatterLines = lines.slice(1, endLineIndex)
  const frontMatterYaml = frontMatterLines.join('\n')
  
  // Extract template content (everything after the closing ---)
  const templateContentLines = lines.slice(endLineIndex + 1)
  const templateContent = templateContentLines.join('\n')

  try {
    // Parse YAML front-matter
    const yaml = require('yaml')
    const frontMatter = yaml.parse(frontMatterYaml) || {}
    
    let architecturePath: string | undefined
    let hasArchitecture = false

    if (frontMatter.architecture) {
      hasArchitecture = true
      // Resolve relative paths relative to the template file
      if (filePath && !path.isAbsolute(frontMatter.architecture)) {
        architecturePath = path.resolve(path.dirname(filePath), frontMatter.architecture)
      } else {
        architecturePath = frontMatter.architecture
      }
    }

    return {
      frontMatter,
      content: templateContent,
      hasArchitecture,
      architecturePath
    }
  } catch (error) {
    // YAML parsing failed
    return {
      frontMatter: {},
      content,
      hasArchitecture: false
    }
  }
}

/**
 * Check if a file is a template file with architecture front-matter
 */
export function isTemplateFileWithArchitecture(filePath: string): boolean {
  // Check any file type - don't restrict by extension
  const parsed = parseFrontMatter(filePath)
  return parsed?.hasArchitecture || false
}

/**
 * Get the architecture file path from a template file
 */
export function getArchitecturePathFromTemplate(filePath: string): string | null {
  const parsed = parseFrontMatter(filePath)
  return parsed?.architecturePath || null
}