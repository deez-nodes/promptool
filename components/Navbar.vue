<template>
  <header id="header" class="h-12 flex-shrink-0 flex items-center gap-3 px-3.5 bg-gradient-to-b from-surface to-bg border-b border-border text-xs z-30 select-none">
    <!-- Logo & Branding -->
    <div class="flex items-center gap-3 mr-2">
      <NuxtLink to="/" class="flex items-center gap-2 group">
        <div class="w-6 h-6 rounded bg-revx-pink flex items-center justify-center font-orbitron font-black text-white text-[11px] shadow-glow-pink">
          R
        </div>
        <div class="font-orbitron font-black text-sm tracking-wider text-acid drop-shadow-sm flex items-center">
          <span>REV<i class="not-italic text-revx-pink">X</i></span>
          <span class="ml-1 text-[10px] font-mono tracking-normal px-1.5 py-0.5 rounded bg-surface3 text-muted2 border border-border">IDE</span>
        </div>
      </NuxtLink>
    </div>

    <!-- Main Navigation Tabs (Page 1: RevX IDE vs Page 2: PrompTool) -->
    <div class="flex items-center gap-1 bg-surface2 p-0.5 rounded border border-border">
      <NuxtLink
        to="/"
        :class="[
          'flex items-center gap-1.5 px-3 py-1 rounded font-rajdhani font-bold text-xs tracking-wider uppercase transition-all duration-150',
          route.path === '/' || route.path === '/editor'
            ? 'bg-surface3 text-acid shadow-sm border border-border2'
            : 'text-muted hover:text-text hover:bg-surface3/50'
        ]"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="16 18 22 12 16 6"></polyline>
          <polyline points="8 6 2 12 8 18"></polyline>
        </svg>
        <span>RevX Editor</span>
      </NuxtLink>

      <NuxtLink
        to="/promptool"
        :class="[
          'flex items-center gap-1.5 px-3 py-1 rounded font-rajdhani font-bold text-xs tracking-wider uppercase transition-all duration-150',
          route.path === '/promptool'
            ? 'bg-surface3 text-miku shadow-sm border border-border2'
            : 'text-muted hover:text-text hover:bg-surface3/50'
        ]"
      >
        <span class="text-acid font-bold">&lt;/&gt;</span>
        <span>PrompTool</span>
        <span class="text-[9px] px-1 py-0.2 rounded bg-miku/20 text-miku font-mono">2nd Page</span>
      </NuxtLink>
    </div>

    <!-- Dynamic Actions Based on Current Page -->
    <div class="flex items-center gap-2 ml-2">
      <!-- Editor Page Actions -->
      <template v-if="route.path === '/' || route.path === '/editor'">
        <button
          @click="revx.compileContract"
          :disabled="revx.isCompiling.value"
          class="flex items-center gap-1.5 px-2.5 py-1 bg-surface2 hover:bg-surface3 border border-border hover:border-acid text-text hover:text-acid rounded font-mono transition-colors"
          title="Build Rust smart contract to PolkaVM RISC-V"
        >
          <span v-if="revx.isCompiling.value" class="w-2.5 h-2.5 border-2 border-acid border-t-transparent rounded-full animate-spin"></span>
          <svg v-else class="w-3.5 h-3.5 text-acid" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <span>{{ revx.isCompiling.value ? 'Building...' : 'Build Contract' }}</span>
        </button>

        <button
          @click="revx.deployContract"
          :disabled="revx.isDeploying.value"
          class="flex items-center gap-1.5 px-2.5 py-1 bg-revx-pink/15 hover:bg-revx-pink/25 border border-revx-pink/50 hover:border-revx-pink text-pink rounded font-mono transition-colors"
          title="Deploy to Polkadot Paseo Testnet"
        >
          <span v-if="revx.isDeploying.value" class="w-2.5 h-2.5 border-2 border-pink border-t-transparent rounded-full animate-spin"></span>
          <svg v-else class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path>
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path>
          </svg>
          <span>{{ revx.isDeploying.value ? 'Deploying...' : 'Deploy' }}</span>
        </button>
      </template>

      <!-- PrompTool Page Actions -->
      <template v-else-if="route.path === '/promptool'">
        <button
          @click="promptStore.createPrompt('filled')"
          class="flex items-center gap-1 px-2.5 py-1 bg-surface2 hover:bg-surface3 border border-acid text-acid rounded transition-colors font-bold"
        >
          + New
        </button>
        <button
          @click="promptStore.addSectionToCurrent()"
          class="flex items-center gap-1 px-2.5 py-1 bg-surface2 hover:bg-surface3 border border-border hover:border-text text-text rounded transition-colors"
        >
          + Section
        </button>
        <button
          @click="promptStore.createPrompt('template')"
          class="flex items-center gap-1 px-2.5 py-1 bg-surface2 hover:bg-surface3 border border-border hover:border-text text-text rounded transition-colors"
        >
          Template
        </button>
        <button
          v-if="promptStore.currentPrompt.value"
          @click="promptStore.deletePrompt(promptStore.currentPrompt.value.id)"
          class="flex items-center gap-1 px-2.5 py-1 bg-surface2 hover:bg-surface3 border border-border hover:border-pink hover:text-pink text-muted rounded transition-colors"
          title="Delete current prompt"
        >
          Delete
        </button>
      </template>
    </div>

    <div class="flex-1"></div>

    <!-- Right Controls -->
    <div class="flex items-center gap-2.5">
      <span class="hidden md:inline-block text-[11px] text-muted">
        Tab completes &nbsp;·&nbsp; PolkaVM ink! v5
      </span>

      <!-- Network Switcher -->
      <div class="flex items-center gap-1 bg-surface2 border border-border px-2 py-0.5 rounded">
        <span class="w-2 h-2 rounded-full bg-green animate-pulse"></span>
        <select
          v-model="revx.selectedNetwork.value"
          class="bg-transparent border-none text-[11px] text-text font-mono focus:outline-none cursor-pointer py-0.5"
        >
          <option value="Paseo Testnet (PolkaVM)" class="bg-surface2 text-text">Paseo Testnet (PolkaVM)</option>
          <option value="Asset Hub (Westend)" class="bg-surface2 text-text">Asset Hub (Westend)</option>
          <option value="Local PolkaVM Node" class="bg-surface2 text-text">Local Devnet (127.0.0.1:9944)</option>
        </select>
      </div>

      <!-- PrompTool Bank & Export Buttons -->
      <template v-if="route.path === '/promptool'">
        <button
          @click="promptStore.showBankModal.value = true"
          class="px-2 py-1 bg-surface2 hover:bg-surface3 border border-border hover:border-acid text-text hover:text-acid rounded transition-colors"
        >
          Bank
        </button>
        <button
          @click="handleExport"
          class="px-2 py-1 bg-surface2 hover:bg-surface3 border border-border hover:border-acid text-text hover:text-acid rounded transition-colors"
        >
          Export
        </button>
        <button
          @click="triggerImport"
          class="px-2 py-1 bg-surface2 hover:bg-surface3 border border-border hover:border-acid text-text hover:text-acid rounded transition-colors"
        >
          Import
        </button>
        <input ref="fileInput" type="file" accept="application/json" class="hidden" @change="handleFileSelected" />
      </template>

      <!-- Wallet Indicator -->
      <div
        class="flex items-center gap-1.5 px-2.5 py-1 bg-surface3 border border-border2 rounded text-text font-mono text-[11px]"
        :title="revx.walletAddress.value"
      >
        <span class="w-1.5 h-1.5 rounded-full bg-revx-pink"></span>
        <span class="hidden sm:inline">Alice</span>
        <span class="text-muted text-[10px]">5Grw...KutQ</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const route = useRoute()
const promptStore = usePromptStore()
const revx = useRevxIde()
const fileInput = ref<HTMLInputElement | null>(null)

const handleExport = () => {
  const json = promptStore.exportStoreJson()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `promptool_export_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const triggerImport = () => {
  fileInput.value?.click()
}

const handleFileSelected = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    const content = reader.result as string
    const res = promptStore.importStoreJson(content)
    if (res.ok) {
      alert('Prompts and term bank imported successfully!')
    } else {
      alert('Import failed: ' + res.error)
    }
  }
  reader.readAsText(file)
  target.value = ''
}
</script>
