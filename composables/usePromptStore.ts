import type { Prompt, Section, PromptStoreData, PromptKind, SectionSearchResult, BankTerm } from '~/types'

const STORAGE_KEY = 'promptool_v1'
const VERSION = 1
const DEFAULT_TAGS = ['role', 'context', 'goal', 'background', 'state', 'output']

export const SEED_BLOCKS: [string, string][] = [
  ['investigate_first',
    '<investigate_before_answering>\nNever speculate about code you have not opened. If the user references a specific file, read it before answering. Investigate relevant files BEFORE making any claim about the codebase. Give grounded, hallucination-free answers.\n</investigate_before_answering>'],
  ['no_overengineering',
    "Avoid over-engineering. Only make changes that are directly requested or clearly necessary. Don't add features, refactors, docs, defensive code, or abstractions beyond the task. The right amount of complexity is the minimum needed."],
  ['general_solution',
    "Write a high-quality, general-purpose solution using standard tools. Don't hard-code to specific test inputs; implement logic that works for all valid inputs. Tests verify correctness — they don't define the solution. If a task is infeasible or a test is wrong, say so rather than working around it."],
  ['autonomy_safety',
    'Take local, reversible actions freely (editing files, running tests), but for actions that are hard to reverse, affect shared systems, or are destructive (deleting files/branches, dropping tables, rm -rf, git push --force, posting to PRs/issues), ask before proceeding. Never use destructive shortcuts like --no-verify.'],
  ['cleanup_temp_files',
    'If you create any temporary files, scripts, or helper files for iteration, remove them at the end of the task.'],
  ['parallel_tools',
    '<use_parallel_tool_calls>\nIf you intend to call multiple tools with no dependencies between them, make all the independent calls in parallel. If a call depends on a previous result, call them sequentially. Never use placeholders or guess missing parameters.\n</use_parallel_tool_calls>'],
  ['conservative_action',
    '<do_not_act_before_instructions>\nDo not change files unless clearly instructed. When intent is ambiguous, default to information, research, and recommendations rather than action.\n</do_not_act_before_instructions>'],
  ['self_check',
    'Before you finish, verify your answer against the success criteria / constraints above.'],
  ['avoid_markdown',
    '<avoid_excessive_markdown>\nWrite in clear flowing prose using complete paragraphs. Reserve markdown for inline code, code blocks, and simple headings. Avoid bullet/numbered lists unless presenting truly discrete items or asked for a list.\n</avoid_excessive_markdown>'],
  ['no_preamble',
    'Respond directly without preamble. Do not start with phrases like "Here is..." or "Based on...".']
]

export function newId(prefix: string): string {
  let s = ''
  while (s.length < 8) {
    s += Math.random().toString(36).slice(2)
  }
  return prefix + '_' + s.slice(0, 8)
}

export function slugTag(label: string | null | undefined): string {
  const s = String(label == null ? '' : label).toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  if (!s) return 'section'
  if (/^[0-9]/.test(s)) return 's_' + s
  return s
}

export function newSection(opts?: Partial<Section>): Section {
  const o = opts || {}
  return {
    id: o.id || newId('s'),
    tag: slugTag(o.tag || 'section'),
    body: o.body == null ? '' : String(o.body),
    include: o.include === undefined ? true : !!o.include
  }
}

export function newPrompt(opts?: Partial<Prompt>): Prompt {
  const o = opts || {}
  const now = Date.now()
  return {
    id: o.id || newId('p'),
    name: o.name == null ? '' : String(o.name),
    kind: o.kind === 'template' ? 'template' : 'filled',
    created: o.created || now,
    updated: o.updated || now,
    sections: o.sections || DEFAULT_TAGS.map(t => newSection({ tag: t }))
  }
}

export function cloneSection(section: Section): Section {
  return {
    id: newId('s'),
    tag: section.tag,
    body: section.body,
    include: true
  }
}

export function toXml(prompt: Prompt | null | undefined): string {
  if (!prompt || !Array.isArray(prompt.sections)) return ''
  return prompt.sections
    .filter(s => s && s.include && String(s.body).trim() !== '')
    .map(s => `<${s.tag}>\n${s.body}\n</${s.tag}>`)
    .join('\n\n')
}

// Autocomplete harvest & candidate ranking
const MIN_WORD = 3
const WORD_REGEX = /[A-Za-z][A-Za-z0-9_-]{2,}/g
const PHRASE_REGEX = /\b[A-Z][a-z0-9]*(?:\s+[A-Z][a-z0-9]*)+\b/g

export function harvest(text: string): string[] {
  if (typeof text !== 'string' || !text) return []
  const out: string[] = []
  const seen: Record<string, boolean> = Object.create(null)

  const collect = (re: RegExp) => {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const v = m[0]
      if (!seen[v]) {
        seen[v] = true
        out.push(v)
      }
    }
  }

  collect(WORD_REGEX)
  collect(PHRASE_REGEX)
  return out
}

export function getCandidates(prefix: string, docTerms: string[], bankTerms: string[]): string[] {
  if (!prefix) return []
  const lower = prefix.toLowerCase()
  const seen: Record<string, boolean> = Object.create(null)
  const ranked: { term: string; rank: number; len: number; i: number }[] = []

  // Bank (rank 0) ranks above doc (rank 1)
  ;[bankTerms || [], docTerms || []].forEach((source, rank) => {
    (source || []).forEach((term, i) => {
      if (typeof term !== 'string') return
      if (term === prefix) return
      if (term.toLowerCase().indexOf(lower) !== 0) return
      if (seen[term]) return
      seen[term] = true
      ranked.push({ term, rank, len: term.length, i })
    })
  })

  ranked.sort((a, b) => (a.rank - b.rank) || (a.len - b.len) || (a.i - b.i))
  return ranked.map(r => r.term)
}

export function buildSeedStore(): PromptStoreData {
  const now = Date.now()
  const blocksPrompt: Prompt = {
    id: newId('p'),
    name: 'Best-practice blocks',
    kind: 'template',
    created: now,
    updated: now,
    sections: SEED_BLOCKS.map(b => newSection({ tag: b[0], body: b[1], include: false }))
  }

  const defaultStarter: Prompt = {
    id: newId('p'),
    name: 'Polkadot Rust Contract System Prompt',
    kind: 'filled',
    created: now + 1,
    updated: now + 1,
    sections: [
      newSection({ tag: 'role', body: 'You are an elite Polkadot & ink!/PolkaVM smart contract architect specializing in secure, zero-allocation Rust smart contracts.' }),
      newSection({ tag: 'context', body: 'The application is being built in the RevX Web IDE running on PolkaVM testnet with pallet-revive and ink! v5.' }),
      newSection({ tag: 'goal', body: 'Generate clean, idiomatic Rust code for the contract with strict storage access control, custom events, and unit test suites.' }),
      newSection({ tag: 'background', body: 'PolkaVM leverages RISC-V bytecode execution, enabling near-native contract performance and lower gas consumption.' }),
      newSection({ tag: 'state', body: 'Current contract state: draft schema and method signatures defined in RevX editor.' }),
      newSection({ tag: 'output', body: 'Return pure Rust source code ready to paste into src/lib.rs with no markdown preambles or unsolicited explanations.' })
    ]
  }

  return {
    version: VERSION,
    prompts: [defaultStarter, blocksPrompt],
    bank: ['Claude Code', 'Unreal Engine', 'Anthropic', 'TypeScript', 'Polkadot', 'PolkaVM', 'ink!', 'Substrate', 'Rust', 'pallet-revive']
  }
}

export function usePromptStore() {
  const store = useState<PromptStoreData>('promptool_store', () => buildSeedStore())
  const currentPromptId = useState<string | null>('promptool_current_id', () => null)
  const isInitialized = useState<boolean>('promptool_initialized', () => false)

  // Search & Filters
  const promptQuery = useState<string>('promptool_prompt_query', () => '')
  const promptKindFilter = useState<PromptKind | ''>('promptool_kind_filter', () => '')
  const sectionQuery = useState<string>('promptool_section_query', () => '')
  const sectionTagFilter = useState<string>('promptool_section_tag_filter', () => '')

  // Term bank modal
  const showBankModal = useState<boolean>('promptool_bank_modal', () => false)

  // Init store from localStorage on client
  const initStore = () => {
    if (process.server || isInitialized.value) return
    isInitialized.value = true

    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.version === VERSION && Array.isArray(parsed.prompts)) {
          store.value = {
            version: VERSION,
            prompts: parsed.prompts,
            bank: Array.isArray(parsed.bank) ? parsed.bank : []
          }
        } else {
          store.value = buildSeedStore()
          saveToStorage()
        }
      } else {
        store.value = buildSeedStore()
        saveToStorage()
      }
    } catch {
      store.value = buildSeedStore()
    }

    if (store.value.prompts.length > 0 && !currentPromptId.value) {
      currentPromptId.value = store.value.prompts[0].id
    }
  }

  const saveToStorage = () => {
    if (process.server) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store.value))
    } catch (e) {
      console.warn('Failed to save to localStorage', e)
    }
  }

  const currentPrompt = computed(() => {
    return store.value.prompts.find(p => p.id === currentPromptId.value) || null
  })

  const bankTermsList = computed<string[]>(() => {
    return store.value.bank.map(b => (typeof b === 'string' ? b : b.text)).filter(Boolean)
  })

  // All harvested document terms from all prompts
  const docTermsList = computed<string[]>(() => {
    const allText = store.value.prompts
      .flatMap(p => [p.name, ...p.sections.map(s => `${s.tag} ${s.body}`)])
      .join('\n')
    return harvest(allText)
  })

  // Prompts search filter
  const filteredPrompts = computed(() => {
    const q = promptQuery.value.trim().toLowerCase()
    const kind = promptKindFilter.value
    return [...store.value.prompts]
      .sort((a, b) => (b.updated || 0) - (a.updated || 0))
      .filter(p => {
        if (kind && p.kind !== kind) return false
        if (!q) return true
        if (p.name.toLowerCase().includes(q)) return true
        return p.sections.some(s => s.body.toLowerCase().includes(q) || s.tag.toLowerCase().includes(q))
      })
  })

  // Sections search filter
  const filteredSections = computed<SectionSearchResult[]>(() => {
    const q = sectionQuery.value.trim().toLowerCase()
    const tag = sectionTagFilter.value
    const results: SectionSearchResult[] = []

    const sortedPrompts = [...store.value.prompts].sort((a, b) => (b.updated || 0) - (a.updated || 0))
    for (const p of sortedPrompts) {
      for (const s of p.sections) {
        if (tag && s.tag !== tag) continue
        if (q && !s.body.toLowerCase().includes(q) && !s.tag.toLowerCase().includes(q)) continue
        results.push({
          promptId: p.id,
          promptName: p.name || 'untitled',
          section: s
        })
      }
    }
    return results
  })

  // Distinct tags
  const distinctTags = computed(() => {
    const counts: Record<string, number> = Object.create(null)
    const order: string[] = []
    store.value.prompts.forEach(p => {
      p.sections.forEach(s => {
        if (!s.tag) return
        if (counts[s.tag] === undefined) {
          counts[s.tag] = 0
          order.push(s.tag)
        }
        counts[s.tag] += 1
      })
    })
    return [...order].sort((a, b) => counts[b] - counts[a] || order.indexOf(a) - order.indexOf(b))
  })

  // Actions
  const createPrompt = (kind: PromptKind = 'filled') => {
    const prompt = newPrompt({ kind, name: kind === 'template' ? 'New Template' : 'Untitled Prompt' })
    store.value.prompts.unshift(prompt)
    currentPromptId.value = prompt.id
    saveToStorage()
    return prompt
  }

  const selectPrompt = (id: string) => {
    currentPromptId.value = id
  }

  const deletePrompt = (id: string) => {
    const index = store.value.prompts.findIndex(p => p.id === id)
    if (index >= 0) {
      store.value.prompts.splice(index, 1)
      if (currentPromptId.value === id) {
        currentPromptId.value = store.value.prompts[0]?.id || null
      }
      saveToStorage()
    }
  }

  const updatePromptName = (name: string) => {
    if (!currentPrompt.value) return
    currentPrompt.value.name = name
    currentPrompt.value.updated = Date.now()
    saveToStorage()
  }

  const addSectionToCurrent = (tag = 'section', body = '') => {
    if (!currentPrompt.value) return
    const sec = newSection({ tag, body })
    currentPrompt.value.sections.push(sec)
    currentPrompt.value.updated = Date.now()
    saveToStorage()
  }

  const removeSectionFromCurrent = (sectionId: string) => {
    if (!currentPrompt.value) return
    currentPrompt.value.sections = currentPrompt.value.sections.filter(s => s.id !== sectionId)
    currentPrompt.value.updated = Date.now()
    saveToStorage()
  }

  const updateSectionInCurrent = (sectionId: string, patch: Partial<Section>) => {
    if (!currentPrompt.value) return
    const sec = currentPrompt.value.sections.find(s => s.id === sectionId)
    if (sec) {
      if (patch.tag !== undefined) sec.tag = slugTag(patch.tag)
      if (patch.body !== undefined) sec.body = String(patch.body)
      if (patch.include !== undefined) sec.include = !!patch.include
      currentPrompt.value.updated = Date.now()
      saveToStorage()
    }
  }

  const moveSectionInCurrent = (fromIndex: number, toIndex: number) => {
    if (!currentPrompt.value) return
    const list = [...currentPrompt.value.sections]
    if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return
    const [moved] = list.splice(fromIndex, 1)
    list.splice(toIndex, 0, moved)
    currentPrompt.value.sections = list
    currentPrompt.value.updated = Date.now()
    saveToStorage()
  }

  const insertLibrarySection = (section: Section) => {
    if (!currentPrompt.value) {
      createPrompt('filled')
    }
    if (currentPrompt.value) {
      currentPrompt.value.sections.push(cloneSection(section))
      currentPrompt.value.updated = Date.now()
      saveToStorage()
    }
  }

  const saveBankTerms = (terms: string[]) => {
    store.value.bank = terms.map(t => ({ id: newId('t'), text: t.trim(), created: Date.now() })).filter(t => t.text)
    saveToStorage()
  }

  const exportStoreJson = () => {
    return JSON.stringify(store.value, null, 2)
  }

  const importStoreJson = (jsonString: string): { ok: boolean; error?: string } => {
    try {
      const parsed = JSON.parse(jsonString)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { ok: false, error: 'Not a valid JSON object' }
      }
      if (!Array.isArray(parsed.prompts)) {
        return { ok: false, error: 'Missing prompts array' }
      }
      if (!Array.isArray(parsed.bank)) {
        return { ok: false, error: 'Missing bank array' }
      }
      store.value = {
        version: VERSION,
        prompts: parsed.prompts,
        bank: parsed.bank
      }
      if (store.value.prompts.length > 0) {
        currentPromptId.value = store.value.prompts[0].id
      }
      saveToStorage()
      return { ok: true }
    } catch {
      return { ok: false, error: 'Malformed JSON payload' }
    }
  }

  return {
    store,
    currentPromptId,
    currentPrompt,
    isInitialized,
    initStore,
    saveToStorage,
    promptQuery,
    promptKindFilter,
    sectionQuery,
    sectionTagFilter,
    showBankModal,
    bankTermsList,
    docTermsList,
    filteredPrompts,
    filteredSections,
    distinctTags,
    createPrompt,
    selectPrompt,
    deletePrompt,
    updatePromptName,
    addSectionToCurrent,
    removeSectionFromCurrent,
    updateSectionInCurrent,
    moveSectionInCurrent,
    insertLibrarySection,
    saveBankTerms,
    exportStoreJson,
    importStoreJson
  }
}
