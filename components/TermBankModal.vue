<template>
  <div v-if="promptStore.showBankModal.value" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
    <div class="bg-surface border border-border2 rounded-lg p-5 w-full max-w-lg shadow-2xl">
      <div class="font-rajdhani font-bold text-sm tracking-widest uppercase text-muted2 mb-2">
        Term Bank — One Per Line
      </div>
      <p class="text-xs text-muted mb-3 leading-relaxed">
        These complete on Tab in every prompt, and always rank above words harvested from the document.
      </p>

      <textarea
        v-model="bankContent"
        spellcheck="false"
        class="w-full h-64 bg-surface2 border border-border focus:border-border2 text-text font-mono text-xs p-3 rounded outline-none leading-relaxed resize-y"
        placeholder="Claude Code&#10;Unreal Engine&#10;Anthropic&#10;TypeScript"
      ></textarea>

      <div class="flex items-center justify-end gap-2.5 mt-4">
        <button
          @click="promptStore.showBankModal.value = false"
          class="px-3.5 py-1.5 rounded bg-surface2 hover:bg-surface3 border border-border text-text font-mono text-xs transition-colors"
        >
          Cancel
        </button>
        <button
          @click="saveBank"
          class="px-4 py-1.5 rounded bg-surface2 hover:bg-surface3 border border-acid text-acid font-mono text-xs font-bold transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const promptStore = usePromptStore()

const bankContent = ref('')

watch(() => promptStore.showBankModal.value, (isOpen) => {
  if (isOpen) {
    bankContent.value = promptStore.bankTermsList.value.join('\n')
  }
}, { immediate: true })

const saveBank = () => {
  const lines = bankContent.value
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
  promptStore.saveBankTerms(lines)
  promptStore.showBankModal.value = false
}
</script>
