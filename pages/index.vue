<template>
  <div class="flex-1 flex min-h-0 overflow-hidden bg-bg text-text font-mono text-xs select-none">
    <!-- ── Left Activity Bar (Icons) ── -->
    <div class="w-12 bg-surface flex-shrink-0 border-r border-border flex flex-col items-center py-3 gap-3 z-10">
      <button
        @click="activeSidebarTab = 'explorer'"
        :class="[
          'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
          activeSidebarTab === 'explorer' ? 'bg-surface3 text-acid border border-border2 shadow-sm' : 'text-muted hover:text-text hover:bg-surface2'
        ]"
        title="File Explorer (Ctrl+Shift+E)"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
      </button>

      <button
        @click="activeSidebarTab = 'templates'"
        :class="[
          'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
          activeSidebarTab === 'templates' ? 'bg-surface3 text-acid border border-border2 shadow-sm' : 'text-muted hover:text-text hover:bg-surface2'
        ]"
        title="Contract Templates & Scaffolding"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      </button>

      <button
        @click="activeSidebarTab = 'ai'"
        :class="[
          'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
          activeSidebarTab === 'ai' ? 'bg-surface3 text-miku border border-border2 shadow-sm' : 'text-muted hover:text-text hover:bg-surface2'
        ]"
        title="RevX App Builder AI & Prompt Generator"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
        </svg>
      </button>

      <button
        @click="activeSidebarTab = 'deploy'"
        :class="[
          'w-9 h-9 rounded-lg flex items-center justify-center transition-all',
          activeSidebarTab === 'deploy' ? 'bg-surface3 text-pink border border-border2 shadow-sm' : 'text-muted hover:text-text hover:bg-surface2'
        ]"
        title="Deploy & Contract Interaction"
      >
        <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
        </svg>
      </button>

      <div class="flex-1"></div>

      <!-- Quick Jump to PrompTool Tab -->
      <NuxtLink
        to="/promptool"
        class="w-9 h-9 rounded-lg flex items-center justify-center text-muted hover:text-miku hover:bg-surface2 transition-all group"
        title="Switch to PrompTool Studio (Page 2)"
      >
        <span class="text-xs font-bold font-mono">&lt;&gt;</span>
      </NuxtLink>
    </div>

    <!-- ── Left Sidebar Drawer (Files / Templates / AI) ── -->
    <aside class="w-64 flex-shrink-0 border-r border-border bg-surface/60 flex flex-col min-h-0">
      <!-- 1. Explorer Tab -->
      <template v-if="activeSidebarTab === 'explorer'">
        <div class="p-2.5 border-b border-border bg-surface flex items-center justify-between">
          <span class="font-rajdhani font-bold text-xs tracking-widest uppercase text-muted2">PolkaVM Workspace</span>
          <button
            @click="showNewFileInput = true"
            class="text-muted hover:text-acid p-1 rounded hover:bg-surface2"
            title="Create new file"
          >
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>

        <div v-if="showNewFileInput" class="p-2 border-b border-border bg-surface2/60">
          <input
            v-model="newFileName"
            @keydown.enter="handleCreateFile"
            @keydown.esc="showNewFileInput = false"
            placeholder="filename.rs..."
            class="w-full bg-surface3 border border-acid text-text text-xs rounded px-2 py-1 outline-none"
            autofocus
          />
        </div>

        <div class="flex-1 overflow-y-auto min-h-0 p-1 divide-y divide-border/20">
          <div
            v-for="f in revx.files.value"
            :key="f.id"
            @click="revx.selectFile(f.id)"
            :class="[
              'flex items-center gap-2 px-2.5 py-1.5 rounded cursor-pointer transition-colors group',
              revx.activeFileId.value === f.id ? 'bg-surface3 text-acid font-bold border-l-2 border-acid' : 'text-muted2 hover:text-text hover:bg-surface2/60'
            ]"
          >
            <span v-if="f.name.endsWith('.rs')" class="text-amber">🦀</span>
            <span v-else-if="f.name.endsWith('.toml')" class="text-miku">⚙</span>
            <span v-else-if="f.name.endsWith('.md')" class="text-blue-400">📝</span>
            <span v-else class="text-muted">📄</span>
            <span class="truncate flex-1 text-xs">{{ f.name }}</span>

            <button
              v-if="revx.files.value.length > 1"
              @click.stop="revx.deleteFile(f.id)"
              class="opacity-0 group-hover:opacity-100 text-muted hover:text-pink p-0.5 text-xs"
              title="Delete file"
            >
              ×
            </button>
          </div>
        </div>
      </template>

      <!-- 2. Templates Tab -->
      <template v-else-if="activeSidebarTab === 'templates'">
        <div class="p-2.5 border-b border-border bg-surface flex items-center justify-between">
          <span class="font-rajdhani font-bold text-xs tracking-widest uppercase text-muted2">Contract Templates</span>
        </div>
        <div class="flex-1 overflow-y-auto min-h-0 p-2 space-y-2">
          <div
            v-for="t in CONTRACT_TEMPLATES"
            :key="t.id"
            class="p-2.5 rounded-lg border border-border bg-surface2/40 hover:border-acid/60 hover:bg-surface2 transition-all cursor-pointer group"
            @click="revx.loadTemplate(t.id)"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-xs text-text group-hover:text-acid">{{ t.name }}</span>
              <span class="text-[9px] px-1.5 py-0.2 rounded bg-surface3 text-muted2">{{ t.category }}</span>
            </div>
            <p class="text-[11px] text-muted leading-relaxed">{{ t.description }}</p>
          </div>
        </div>
      </template>

      <!-- 3. AI App Builder Tab -->
      <template v-else-if="activeSidebarTab === 'ai'">
        <div class="p-2.5 border-b border-border bg-surface flex items-center justify-between">
          <span class="font-rajdhani font-bold text-xs tracking-widest uppercase text-miku">RevX App Builder</span>
          <NuxtLink
            to="/promptool"
            class="text-[10px] text-acid hover:underline font-mono"
            title="Open PrompTool to build structured XML prompts"
          >
            PrompTool →
          </NuxtLink>
        </div>
        <div class="flex-1 overflow-y-auto min-h-0 p-2 space-y-2">
          <div class="p-2.5 rounded bg-surface2/60 border border-border text-[11px] text-muted leading-relaxed">
            Generate Rust ink! v5 contracts by typing a prompt or importing from <NuxtLink to="/promptool" class="text-acid underline">PrompTool Studio</NuxtLink>.
          </div>
          <div
            v-for="m in revx.aiMessages.value"
            :key="m.id"
            :class="[
              'p-2.5 rounded-lg text-xs leading-relaxed',
              m.sender === 'user' ? 'bg-surface3 border border-border2 text-text' : 'bg-surface2 border border-border text-muted2'
            ]"
          >
            <div class="font-bold text-[10px] uppercase tracking-wider mb-1" :class="m.sender === 'user' ? 'text-acid' : 'text-miku'">
              {{ m.sender === 'user' ? 'You' : 'RevX AI' }}
            </div>
            <p class="text-text whitespace-pre-wrap">{{ m.text }}</p>
          </div>
        </div>
        <div class="p-2 border-t border-border bg-surface">
          <form @submit.prevent="revx.sendAiPrompt(aiInputText); aiInputText = ''" class="flex gap-1.5">
            <input
              v-model="aiInputText"
              placeholder="Describe contract features..."
              class="flex-1 bg-surface2 border border-border focus:border-miku text-text text-xs rounded px-2 py-1.5 outline-none"
            />
            <button
              type="submit"
              class="px-2.5 py-1.5 bg-miku/15 hover:bg-miku/25 border border-miku text-miku rounded font-bold transition-colors text-xs"
            >
              Send
            </button>
          </form>
        </div>
      </template>

      <!-- 4. Deployments Sidebar Tab -->
      <template v-else-if="activeSidebarTab === 'deploy'">
        <div class="p-2.5 border-b border-border bg-surface flex items-center justify-between">
          <span class="font-rajdhani font-bold text-xs tracking-widest uppercase text-pink">Deployed Contracts</span>
        </div>
        <div class="flex-1 overflow-y-auto min-h-0 p-2 space-y-2">
          <div
            v-for="dep in revx.deployedContracts.value"
            :key="dep.address"
            class="p-2.5 rounded-lg border border-border bg-surface2/40"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-bold text-xs text-text">{{ dep.name }}</span>
              <span class="text-[9px] px-1 py-0.2 rounded bg-pink/20 text-pink">PolkaVM</span>
            </div>
            <div class="text-[10px] text-muted font-mono truncate mb-2">{{ dep.address }}</div>

            <!-- Interactive Methods -->
            <div class="space-y-1.5">
              <div v-for="m in dep.methods" :key="m.name" class="flex items-center justify-between gap-1 text-[11px]">
                <span class="text-muted2 font-mono">{{ m.name }}()</span>
                <button
                  @click="callMethod(dep, m)"
                  :class="[
                    'px-2 py-0.5 rounded text-[10px] font-bold border transition-colors',
                    m.mutates ? 'bg-pink/15 border-pink/40 text-pink hover:bg-pink/25' : 'bg-surface3 border-border hover:border-acid text-acid'
                  ]"
                >
                  {{ m.mutates ? 'Transact' : 'Query' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </aside>

    <!-- ── Center Editor & Bottom Panel ── -->
    <div class="flex-1 flex flex-col min-w-0 min-h-0">
      <!-- File Tabs Bar -->
      <div class="h-9 flex items-center bg-surface border-b border-border px-2 gap-1 overflow-x-auto flex-shrink-0">
        <div
          v-for="f in revx.files.value"
          :key="f.id"
          @click="revx.selectFile(f.id)"
          :class="[
            'flex items-center gap-2 px-3 py-1.5 rounded-t text-xs font-mono border-t-2 cursor-pointer transition-all',
            revx.activeFileId.value === f.id
              ? 'bg-[#0d1017] border-revx-pink text-text font-bold shadow-sm'
              : 'border-transparent text-muted hover:text-text hover:bg-surface2/50'
          ]"
        >
          <span v-if="f.name.endsWith('.rs')" class="text-amber text-[11px]">🦀</span>
          <span v-else-if="f.name.endsWith('.toml')" class="text-miku text-[11px]">⚙</span>
          <span v-else class="text-blue-400 text-[11px]">📄</span>
          <span>{{ f.name }}</span>
        </div>

        <div class="flex-1"></div>

        <!-- Open in PrompTool Prompt Studio Action -->
        <NuxtLink
          to="/promptool"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface2 hover:bg-surface3 border border-border hover:border-miku text-muted2 hover:text-miku text-xs font-mono transition-colors"
          title="Open prompt engineering tools in PrompTool (2nd Page)"
        >
          <span class="text-acid">&lt;/&gt;</span>
          <span>Open in PrompTool</span>
        </NuxtLink>
      </div>

      <!-- Code Editor Component -->
      <div class="flex-1 min-h-0 flex flex-col relative">
        <CodeEditor
          :model-value="revx.activeFile.value.content"
          @update:model-value="revx.updateFileContent"
          :language="revx.activeFile.value.language"
        />
      </div>

      <!-- ── Bottom Panel (Terminal / Build / Output / Deploy) ── -->
      <div class="h-56 flex-shrink-0 border-t border-border bg-surface flex flex-col min-h-0">
        <!-- Panel Tabs -->
        <div class="h-8 flex items-center bg-surface2/60 border-b border-border px-3 gap-2 flex-shrink-0">
          <button
            @click="revx.activeBottomTab.value = 'terminal'"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-rajdhani font-bold uppercase tracking-wider transition-colors',
              revx.activeBottomTab.value === 'terminal' ? 'text-acid border-b-2 border-acid' : 'text-muted hover:text-text'
            ]"
          >
            Terminal / Build Logs
          </button>
          <button
            @click="revx.activeBottomTab.value = 'deploy'"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-rajdhani font-bold uppercase tracking-wider transition-colors',
              revx.activeBottomTab.value === 'deploy' ? 'text-pink border-b-2 border-pink' : 'text-muted hover:text-text'
            ]"
          >
            Deploy & Test
          </button>
          <button
            @click="revx.activeBottomTab.value = 'ai'"
            :class="[
              'flex items-center gap-1.5 px-2.5 py-1 text-xs font-rajdhani font-bold uppercase tracking-wider transition-colors',
              revx.activeBottomTab.value === 'ai' ? 'text-miku border-b-2 border-miku' : 'text-muted hover:text-text'
            ]"
          >
            PolkaVM Bytecode
          </button>

          <div class="flex-1"></div>

          <button
            @click="revx.buildLogs.value = []"
            class="text-[11px] text-muted hover:text-text px-1.5 py-0.5 rounded hover:bg-surface3"
            title="Clear terminal"
          >
            Clear
          </button>
        </div>

        <!-- Terminal Output -->
        <div
          v-if="revx.activeBottomTab.value === 'terminal'"
          class="flex-1 overflow-y-auto p-3 font-mono text-[12px] leading-relaxed select-text space-y-1"
        >
          <div
            v-for="log in revx.buildLogs.value"
            :key="log.id"
            class="flex items-start gap-2"
          >
            <span class="text-muted/60 text-[11px]">{{ log.timestamp }}</span>
            <span v-if="log.type === 'cmd'" class="text-acid font-bold">{{ log.text }}</span>
            <span v-else-if="log.type === 'success'" class="text-green font-bold">{{ log.text }}</span>
            <span v-else-if="log.type === 'error'" class="text-pink font-bold">{{ log.text }}</span>
            <span v-else-if="log.type === 'warning'" class="text-amber">{{ log.text }}</span>
            <span v-else class="text-text/80">{{ log.text }}</span>
          </div>
        </div>

        <!-- Deploy & Interact Panel -->
        <div
          v-else-if="revx.activeBottomTab.value === 'deploy'"
          class="flex-1 overflow-y-auto p-3.5 flex items-center justify-center text-center select-text"
        >
          <div class="max-w-md">
            <div class="text-sm font-bold text-text mb-1">Polkadot Paseo Testnet Deployer</div>
            <p class="text-xs text-muted mb-3">
              Deploy your ink! v5 smart contract directly to the PolkaVM execution runtime.
            </p>
            <div class="flex items-center justify-center gap-3">
              <button
                @click="revx.deployContract"
                :disabled="revx.isDeploying.value"
                class="px-4 py-2 rounded bg-revx-pink/20 hover:bg-revx-pink/30 border border-revx-pink text-pink font-bold text-xs transition-colors flex items-center gap-2"
              >
                <span v-if="revx.isDeploying.value" class="w-3 h-3 border-2 border-pink border-t-transparent rounded-full animate-spin"></span>
                <span>{{ revx.isDeploying.value ? 'Instantiating on Paseo...' : 'Deploy to PolkaVM' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- PolkaVM Bytecode View -->
        <div
          v-else
          class="flex-1 overflow-y-auto p-3 font-mono text-[11px] text-muted2 leading-relaxed select-text"
        >
          <div class="text-miku mb-1">// PolkaVM RISC-V Bytecode disassembly preview:</div>
          <pre class="text-text/70">
0x0000: 37 05 00 00       lui     a0, 0
0x0004: 13 05 05 00       addi    a0, a0, 0
0x0008: 73 00 00 00       ecall   # sys_pallet_revive_instantiate
0x000c: 13 01 01 ff       addi    sp, sp, -16
0x0010: 23 26 11 00       sw      ra, 12(sp)
0x0014: 6f 00 40 00       jal     flipper_flip
          </pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CONTRACT_TEMPLATES } from '~/composables/useRevxIde'

const revx = useRevxIde()
const activeSidebarTab = ref<'explorer' | 'templates' | 'ai' | 'deploy'>('explorer')
const showNewFileInput = ref(false)
const newFileName = ref('')
const aiInputText = ref('')

const handleCreateFile = () => {
  if (newFileName.value.trim()) {
    revx.createFile(newFileName.value.trim())
    newFileName.value = ''
    showNewFileInput.value = false
  }
}

const callMethod = (dep: any, method: any) => {
  if (method.mutates) {
    revx.addLog('cmd', `$ invoke ${dep.name}::${method.name}() by Alice [gas: 1,420,000 weight]`)
    revx.addLog('success', `✔ Executed ${method.name}() on-chain. Event: Flipped { by: Alice, new_value: true }`)
  } else {
    revx.addLog('cmd', `$ query ${dep.name}::${method.name}()`)
    revx.addLog('info', `↳ Result: Ok(true)`)
  }
  revx.activeBottomTab.value = 'terminal'
}
</script>
