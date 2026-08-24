<template>
  <div class="flex-1 flex min-h-0 overflow-hidden bg-bg text-text font-mono text-xs select-none">
    <!-- ── Left Sidebar (Prompts & Section Library) ── -->
    <aside id="sidebar" class="w-72 flex-shrink-0 border-r border-border flex flex-col min-h-0 bg-surface/55">
      <!-- Prompts Pane -->
      <div class="pane-head flex items-center gap-2 p-2 border-b border-border bg-surface flex-shrink-0">
        <span class="font-rajdhani font-bold text-xs tracking-widest uppercase text-muted2">Prompts</span>
        <div class="flex-1"></div>
        <select
          v-model="promptStore.promptKindFilter.value"
          class="bg-surface2 border border-border text-[11px] text-text rounded px-2 py-0.5 focus:border-border2 outline-none cursor-pointer"
        >
          <option value="">all</option>
          <option value="filled">filled</option>
          <option value="template">templates</option>
        </select>
      </div>

      <div class="p-2 border-b border-border bg-surface/30">
        <input
          v-model="promptStore.promptQuery.value"
          class="w-full bg-surface2 border border-border focus:border-border2 text-text text-xs rounded px-2 py-1 outline-none placeholder:text-muted"
          placeholder="search prompts…"
          spellcheck="false"
        />
      </div>

      <!-- Prompts List -->
      <div class="flex-1 overflow-y-auto min-h-0 divide-y divide-border/60">
        <div
          v-for="p in promptStore.filteredPrompts.value"
          :key="p.id"
          @click="promptStore.selectPrompt(p.id)"
          :class="[
            'p-2.5 cursor-pointer transition-colors duration-100 relative group',
            promptStore.currentPromptId.value === p.id
              ? 'bg-surface3 border-l-2 border-acid text-text'
              : 'hover:bg-surface2/60 text-muted2 hover:text-text'
          ]"
        >
          <div class="flex items-center gap-1.5 mb-1">
            <span class="font-bold truncate flex-1 text-xs text-text">
              {{ p.name || 'untitled' }}
            </span>
            <span
              v-if="p.kind === 'template'"
              class="text-[9px] font-bold tracking-wider px-1.5 py-0.2 rounded bg-miku text-bg"
            >
              TMPL
            </span>
            <span
              v-else
              class="text-[9px] font-bold tracking-wider px-1.5 py-0.2 rounded bg-surface4 text-muted2"
            >
              {{ p.sections.filter(s => s.include && s.body.trim()).length }} sec
            </span>
          </div>
          <div class="text-[11px] text-muted truncate">
            {{ p.sections.map(s => s.tag).join(' · ') || 'empty' }}
          </div>
        </div>

        <div
          v-if="promptStore.filteredPrompts.value.length === 0"
          class="p-4 text-center text-muted text-xs italic"
        >
          no prompts match filter
        </div>
      </div>

      <!-- Section Library Pane -->
      <div class="pane-head flex items-center gap-2 p-2 border-t border-b border-border bg-surface flex-shrink-0">
        <span class="font-rajdhani font-bold text-xs tracking-widest uppercase text-muted2">Section library</span>
        <div class="flex-1"></div>
        <select
          v-model="promptStore.sectionTagFilter.value"
          class="bg-surface2 border border-border text-[11px] text-text rounded px-2 py-0.5 focus:border-border2 outline-none cursor-pointer max-w-[110px] truncate"
        >
          <option value="">all tags</option>
          <option v-for="t in promptStore.distinctTags.value" :key="t" :value="t">{{ t }}</option>
        </select>
      </div>

      <div class="p-2 border-b border-border bg-surface/30">
        <input
          v-model="promptStore.sectionQuery.value"
          class="w-full bg-surface2 border border-border focus:border-border2 text-text text-xs rounded px-2 py-1 outline-none placeholder:text-muted"
          placeholder="search sections…"
          spellcheck="false"
        />
      </div>

      <!-- Section Library List -->
      <div class="h-44 overflow-y-auto min-h-0 divide-y divide-border/60">
        <div
          v-for="(hit, idx) in promptStore.filteredSections.value"
          :key="hit.section.id + idx"
          @click="promptStore.insertLibrarySection(hit.section)"
          class="p-2 cursor-pointer hover:bg-surface2/80 transition-colors group"
          title="Click to insert section into active prompt"
        >
          <div class="flex items-center gap-1.5">
            <span class="text-miku font-bold text-xs">&lt;{{ hit.section.tag }}&gt;</span>
            <span class="text-[10px] text-muted truncate">from {{ hit.promptName }}</span>
            <div class="flex-1"></div>
            <span class="text-[10px] text-acid opacity-0 group-hover:opacity-100 transition-opacity font-bold">+ insert</span>
          </div>
          <div class="text-[11px] text-muted2 line-clamp-1 mt-0.5">
            {{ hit.section.body || '(empty)' }}
          </div>
        </div>

        <div
          v-if="promptStore.filteredSections.value.length === 0"
          class="p-3 text-center text-muted text-xs italic"
        >
          no matching sections
        </div>
      </div>
    </aside>

    <!-- ── Center Editor (Interactive Sections) ── -->
    <main id="editor" class="flex-1 min-w-0 overflow-y-auto p-4 pb-20 select-text relative">
      <template v-if="promptStore.currentPrompt.value">
        <!-- Prompt Title Bar -->
        <div id="prompt-bar" class="flex items-center gap-2 mb-3.5 pb-1 border-b border-border">
          <input
            :value="promptStore.currentPrompt.value.name"
            @input="promptStore.updatePromptName(($event.target as HTMLInputElement).value)"
            placeholder="untitled"
            spellcheck="false"
            class="flex-1 text-base font-bold bg-transparent border-none text-text outline-none focus:text-acid transition-colors py-1 px-1 placeholder:text-muted"
          />
          <div class="flex items-center gap-2">
            <span class="text-[11px] text-muted">
              Updated {{ new Date(promptStore.currentPrompt.value.updated).toLocaleTimeString() }}
            </span>
          </div>
        </div>

        <!-- Interactive Sections Container -->
        <div id="sections" class="space-y-3">
          <div
            v-for="(s, index) in promptStore.currentPrompt.value.sections"
            :key="s.id"
            :class="[
              'section border rounded-lg transition-all duration-150 bg-surface',
              s.include ? 'border-border focus-within:border-border2' : 'border-border/40 opacity-50 bg-surface/50'
            ]"
            :data-id="s.id"
          >
            <!-- Section Header -->
            <div class="section-head flex items-center gap-2.5 px-3 py-1.5 border-b border-border/80 bg-surface2/40 select-none">
              <!-- Reorder Handle -->
              <span
                class="section-num bg-acid text-bg font-bold text-[11px] rounded px-1.5 py-0.5 cursor-grab active:cursor-grabbing hover:shadow-glow-acid"
                title="Drag or click arrows to reorder"
              >
                {{ index + 1 }}
              </span>

              <!-- Move Up/Down Quick Controls -->
              <div class="flex items-center text-muted hover:text-text gap-0.5">
                <button
                  v-if="index > 0"
                  @click="promptStore.moveSectionInCurrent(index, index - 1)"
                  class="hover:text-acid px-0.5 text-[10px]"
                  title="Move section up"
                >▲</button>
                <button
                  v-if="index < promptStore.currentPrompt.value.sections.length - 1"
                  @click="promptStore.moveSectionInCurrent(index, index + 1)"
                  class="hover:text-acid px-0.5 text-[10px]"
                  title="Move section down"
                >▼</button>
              </div>

              <!-- Tag Slug Input -->
              <div class="flex items-center gap-1">
                <span class="text-miku font-bold">&lt;</span>
                <input
                  :value="s.tag"
                  @blur="promptStore.updateSectionInCurrent(s.id, { tag: ($event.target as HTMLInputElement).value })"
                  @keydown.enter="($event.target as HTMLInputElement).blur()"
                  class="bg-transparent border-none text-miku focus:text-acid font-bold outline-none py-0.5 w-44 tracking-wide"
                  spellcheck="false"
                  placeholder="tag_name"
                />
                <span class="text-miku font-bold">&gt;</span>
              </div>

              <!-- Include Checkbox -->
              <label class="flex items-center gap-1.5 text-muted text-[11px] cursor-pointer hover:text-text ml-2">
                <input
                  type="checkbox"
                  :checked="s.include"
                  @change="promptStore.updateSectionInCurrent(s.id, { include: ($event.target as HTMLInputElement).checked })"
                  class="rounded bg-surface2 border-border accent-acid cursor-pointer"
                />
                <span>include</span>
              </label>

              <div class="flex-1"></div>

              <!-- Delete Section Button -->
              <button
                @click="promptStore.removeSectionFromCurrent(s.id)"
                class="text-muted hover:text-pink px-2 py-0.5 rounded transition-colors text-sm font-bold"
                title="Delete section"
              >
                ×
              </button>
            </div>

            <!-- Section Body Textarea with Autocomplete -->
            <div class="relative p-2">
              <textarea
                :value="s.body"
                @input="handleBodyInput(s.id, $event)"
                @keydown="handleTextareaKeydown(s.id, $event)"
                class="w-full min-h-[80px] bg-transparent border-none text-text font-mono text-xs p-1 outline-none leading-relaxed resize-y placeholder:text-muted/60"
                placeholder="Write prompt instructions, XML schemas, or context here... (Press Tab for autocomplete)"
                spellcheck="false"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Add Section Prompt Button -->
        <div class="mt-4 flex justify-center">
          <button
            @click="promptStore.addSectionToCurrent('custom_section', '')"
            class="flex items-center gap-1.5 px-4 py-2 rounded-md bg-surface2 hover:bg-surface3 border border-border hover:border-acid text-muted2 hover:text-acid transition-colors text-xs font-bold"
          >
            + Add Section
          </button>
        </div>
      </template>

      <!-- Empty State -->
      <div v-else id="empty" class="text-center py-20 text-muted">
        <div class="text-3xl mb-3">📄</div>
        <p class="text-sm mb-4">No prompt selected</p>
        <button
          @click="promptStore.createPrompt('filled')"
          class="px-4 py-2 bg-surface2 hover:bg-surface3 border border-acid text-acid rounded font-bold transition-colors"
        >
          + New Prompt
        </button>
      </div>

      <!-- Autocomplete Dropdown Popup -->
      <div
        v-if="acVisible && acCandidates.length > 0"
        :style="{ top: acPos.top + 'px', left: acPos.left + 'px' }"
        class="fixed z-50 bg-surface2 border border-border2 rounded-md p-1 max-w-xs shadow-2xl overflow-hidden font-mono text-xs divide-y divide-border/40"
      >
        <div
          v-for="(cand, idx) in acCandidates.slice(0, 7)"
          :key="cand"
          @mousedown.prevent="selectCandidate(cand)"
          :class="[
            'px-2.5 py-1.5 rounded cursor-pointer truncate flex items-center justify-between gap-2',
            idx === acActiveIndex ? 'bg-surface3 text-acid font-bold' : 'text-text hover:bg-surface3/80'
          ]"
        >
          <span>{{ cand }}</span>
          <span v-if="promptStore.bankTermsList.value.includes(cand)" class="text-[9px] px-1 py-0.2 rounded bg-miku/20 text-miku">bank</span>
        </div>
      </div>
    </main>

    <!-- ── Right Preview Pane (Serialized Output) ── -->
    <aside id="preview-pane" class="w-[37%] min-w-[320px] flex-shrink-0 border-l border-border flex flex-col min-h-0 bg-surface/55 select-text">
      <div class="pane-head flex items-center gap-2 p-2 border-b border-border bg-surface flex-shrink-0 select-none">
        <span class="font-rajdhani font-bold text-xs tracking-widest uppercase text-muted2">XML Output</span>
        <div class="flex-1"></div>
        <span class="text-[11px] text-muted mr-1 font-mono">{{ xmlOutput.length }} chars</span>
        <button
          @click="copyXml"
          class="px-2.5 py-1 bg-surface2 hover:bg-surface3 border border-border hover:border-acid text-text hover:text-acid rounded transition-colors text-xs font-mono"
        >
          {{ copied ? 'Copied!' : 'Copy' }}
        </button>
        <button
          @click="saveXmlFile"
          class="px-2.5 py-1 bg-surface2 hover:bg-surface3 border border-border hover:border-acid text-text hover:text-acid rounded transition-colors text-xs font-mono"
        >
          Save .xml
        </button>
      </div>

      <!-- Formatted XML Output -->
      <pre
        id="preview"
        class="flex-1 overflow-auto p-3.5 whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-muted2 selection:bg-acid/20"
        v-html="formattedXml"
      ></pre>
    </aside>

    <!-- Term Bank Dialog -->
    <TermBankModal />
  </div>
</template>

<script setup lang="ts">
import { toXml, harvest, getCandidates } from '~/composables/usePromptStore'

const promptStore = usePromptStore()

onMounted(() => {
  promptStore.initStore()
})

const copied = ref(false)

const xmlOutput = computed(() => {
  return toXml(promptStore.currentPrompt.value)
})

const escapeHtml = (str: string) => {
  return str.replace(/[&<>]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[tag] || tag))
}

const formattedXml = computed(() => {
  if (!xmlOutput.value) {
    return `<span class="text-surface3">// nothing included yet</span>`
  }
  const escaped = escapeHtml(xmlOutput.value)
  // Highlight XML open/close tags in acid neon color
  return escaped.replace(/^(&lt;\/?[a-z0-9_]+&gt;)$/gm, '<span class="text-acid font-bold drop-shadow-sm">$1</span>')
})

const copyXml = async () => {
  if (!xmlOutput.value) return
  await navigator.clipboard.writeText(xmlOutput.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1500)
}

const saveXmlFile = () => {
  if (!xmlOutput.value) return
  const blob = new Blob([xmlOutput.value], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const name = (promptStore.currentPrompt.value?.name || 'prompt').toLowerCase().replace(/[^a-z0-9]+/g, '_')
  a.download = `${name}.xml`
  a.click()
  URL.revokeObjectURL(url)
}

const handleBodyInput = (sectionId: string, event: Event) => {
  const target = event.target as HTMLTextAreaElement
  promptStore.updateSectionInCurrent(sectionId, { body: target.value })
}

// ── Tab Autocomplete Engine ──────────────────────────────────────────────────
const acVisible = ref(false)
const acCandidates = ref<string[]>([])
const acActiveIndex = ref(0)
const acPos = ref({ top: 0, left: 0 })
const activeTextarea = ref<HTMLTextAreaElement | null>(null)
const activeSectionId = ref<string | null>(null)

const getWordPrefix = (textarea: HTMLTextAreaElement) => {
  const text = textarea.value
  const pos = textarea.selectionStart
  const before = text.slice(0, pos)
  const match = before.match(/[A-Za-z0-9_-]+$/)
  return match ? match[0] : ''
}

const handleTextareaKeydown = (sectionId: string, e: KeyboardEvent) => {
  const target = e.target as HTMLTextAreaElement
  activeTextarea.value = target
  activeSectionId.value = sectionId

  if (e.key === 'Tab') {
    const prefix = getWordPrefix(target)
    if (prefix) {
      e.preventDefault()
      const docTerms = promptStore.docTermsList.value
      const bankTerms = promptStore.bankTermsList.value
      const cands = getCandidates(prefix, docTerms, bankTerms)

      if (cands.length > 0) {
        if (acVisible.value && acCandidates.value.length > 0) {
          // Cycle through candidates on repeated Tab
          acActiveIndex.value = (acActiveIndex.value + 1) % acCandidates.value.length
          applyCandidate(acCandidates.value[acActiveIndex.value], prefix, target, sectionId)
        } else {
          // Open autocomplete popup & apply first candidate
          acCandidates.value = cands
          acActiveIndex.value = 0
          acVisible.value = true

          const rect = target.getBoundingClientRect()
          acPos.value = {
            top: Math.min(window.innerHeight - 200, rect.top + 30),
            left: Math.min(window.innerWidth - 300, rect.left + 20)
          }
          applyCandidate(cands[0], prefix, target, sectionId)
        }
      }
    }
  } else if (acVisible.value) {
    if (e.key === 'Escape') {
      acVisible.value = false
    } else if (e.key === 'Enter') {
      if (acCandidates.value[acActiveIndex.value]) {
        e.preventDefault()
        acVisible.value = false
      }
    } else {
      acVisible.value = false
    }
  }
}

const applyCandidate = (cand: string, prefix: string, target: HTMLTextAreaElement, sectionId: string) => {
  const pos = target.selectionStart
  const text = target.value
  const start = pos - prefix.length
  const newText = text.slice(0, start) + cand + text.slice(pos)
  target.value = newText
  target.setSelectionRange(start + cand.length, start + cand.length)
  promptStore.updateSectionInCurrent(sectionId, { body: newText })
}

const selectCandidate = (cand: string) => {
  if (!activeTextarea.value || !activeSectionId.value) return
  const prefix = getWordPrefix(activeTextarea.value)
  applyCandidate(cand, prefix, activeTextarea.value, activeSectionId.value)
  acVisible.value = false
}
</script>
