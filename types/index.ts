export type PromptKind = 'filled' | 'template'

export interface Section {
  id: string
  tag: string
  body: string
  include: boolean
}

export interface Prompt {
  id: string
  name: string
  kind: PromptKind
  created: number
  updated: number
  sections: Section[]
}

export interface BankTerm {
  id: string
  text: string
  created: number
}

export interface PromptStoreData {
  version: number
  prompts: Prompt[]
  bank: (string | BankTerm)[]
}

export interface SearchPromptOptions {
  kind?: PromptKind | ''
}

export interface SearchSectionOptions {
  tag?: string
}

export interface SectionSearchResult {
  promptId: string
  promptName: string
  section: Section
}

// RevX Smart Contract IDE Types
export interface IdeFile {
  id: string
  name: string
  path: string
  content: string
  language: 'rust' | 'toml' | 'json' | 'markdown' | 'xml'
  isFolder?: boolean
  children?: IdeFile[]
}

export interface ContractTemplate {
  id: string
  name: string
  description: string
  category: string
  files: IdeFile[]
  systemPrompt?: string
}

export interface BuildLog {
  id: string
  timestamp: string
  type: 'info' | 'success' | 'warning' | 'error' | 'cmd'
  text: string
}

export interface DeploymentContract {
  address: string
  name: string
  network: string
  deployedAt: string
  abi: string
  methods: {
    name: string
    mutates: boolean
    args: { name: string; type: string }[]
    returns?: string
  }[]
}
