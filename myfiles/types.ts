/**
 * PROMPTOOL IDE Type Definitions & Domain Schemas
 */

export type SectionRole =
  | 'system'
  | 'instruction'
  | 'context'
  | 'constraint'
  | 'few-shot'
  | 'output-format'

export interface PromptVariable {
  id: string
  key: string
  label: string
  defaultValue: string
  type: 'string' | 'number' | 'enum' | 'json'
  options?: string[]
}

export interface PromptSection {
  id: string
  title: string
  role: SectionRole
  content: string
  enabled: boolean
  collapsed: boolean
  tokensEstimated: number
}

export interface TermBankItem {
  id: string
  term: string
  category: 'role' | 'constraint' | 'format' | 'reasoning'
  snippet: string
  tags: string[]
}

export interface PromptDocument {
  id: string
  name: string
  description: string
  modelTarget: 'gemini-2.5' | 'claude-3.7' | 'gpt-4o' | 'deepseek-r1'
  temperature: number
  topP: number
  variables: PromptVariable[]
  sections: PromptSection[]
  createdAt: number
  updatedAt: number
}

export interface CompilationResult {
  raw: string
  openaiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  anthropicXml: string
  langchainCode: {
    python: string
    typescript: string
  }
  tokenCount: number
  estimatedCostUsd: number
}
