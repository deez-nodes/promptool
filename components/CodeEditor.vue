<template>
  <div class="relative flex-1 flex min-h-0 bg-[#0d1017] text-text font-mono text-[13px] leading-relaxed overflow-hidden">
    <!-- Line Numbers -->
    <div class="w-12 py-3 px-2 flex flex-col items-end text-muted/50 select-none bg-surface/40 border-r border-border text-xs">
      <span v-for="n in lineCount" :key="n" class="leading-[21px]">{{ n }}</span>
    </div>

    <!-- Code Textarea with Real-Time Editing -->
    <div class="relative flex-1 h-full overflow-hidden">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        @input="handleInput"
        @keydown="handleKeydown"
        spellcheck="false"
        class="w-full h-full p-3 bg-transparent border-none outline-none font-mono text-[13px] leading-[21px] text-text resize-none whitespace-pre overflow-auto tab-size-4 selection:bg-revx-pink/30 selection:text-white"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
  language?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
}>()

const textareaRef = ref<HTMLTextAreaElement | null>(null)

const lineCount = computed(() => {
  return Math.max(1, (props.modelValue || '').split('\n').length)
})

const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Tab') {
    e.preventDefault()
    const target = e.target as HTMLTextAreaElement
    const start = target.selectionStart
    const end = target.selectionEnd
    const value = target.value

    target.value = value.substring(0, start) + '    ' + value.substring(end)
    target.selectionStart = target.selectionEnd = start + 4
    emit('update:modelValue', target.value)
  }
}
</script>

<style scoped>
.tab-size-4 {
  tab-size: 4;
}
</style>
