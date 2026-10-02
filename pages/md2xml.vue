<template>
  <div class="flex-1 flex min-h-0 overflow-hidden bg-bg text-text font-mono text-xs">
    <!-- ── Markdown Input ── -->
    <main class="flex-1 flex flex-col min-h-0 bg-surface/30">
      <div class="pane-head flex items-center gap-2 p-2 border-b border-border bg-surface flex-shrink-0 select-none">
        <span class="font-rajdhani font-bold text-xs tracking-widest uppercase text-muted2">Markdown</span>
        <div class="flex-1"></div>
        <span class="text-[11px] text-muted font-mono">headings become tags · text before the first heading is &lt;instructions&gt;</span>
      </div>
      <textarea
        v-model="markdown"
        class="flex-1 min-h-0 w-full resize-none bg-transparent p-3.5 text-[12.5px] leading-relaxed text-text outline-none placeholder:text-muted"
        spellcheck="false"
        placeholder="# role
You are a senior engineer.

# task
Refactor the parser.

# constraints
No new dependencies."
      ></textarea>
    </main>

    <!-- ── XML Output ── -->
    <aside class="w-[45%] min-w-[320px] flex-shrink-0 border-l border-border flex flex-col min-h-0 bg-surface/55 select-text">
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
      </div>
      <pre
        class="flex-1 overflow-auto p-3.5 whitespace-pre-wrap break-words font-mono text-[12.5px] leading-relaxed text-muted2 selection:bg-acid/20"
        v-html="formattedXml"
      ></pre>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { mdToXml } from '~/composables/mdToXml'

const markdown = ref('')
const copied = ref(false)

const xmlOutput = computed(() => mdToXml(markdown.value))

const escapeHtml = (str: string) =>
  str.replace(/[&<>]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[tag] || tag))

const formattedXml = computed(() => {
  if (!xmlOutput.value) {
    return `<span class="text-surface3">// nothing yet</span>`
  }
  return escapeHtml(xmlOutput.value)
    .replace(/^(&lt;\/?[a-z0-9_]+&gt;)$/gm, '<span class="text-acid font-bold drop-shadow-sm">$1</span>')
})

const copyXml = async () => {
  if (!xmlOutput.value) return
  await navigator.clipboard.writeText(xmlOutput.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 1500)
}
</script>
