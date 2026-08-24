<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden bg-bg text-text font-mono">
    <!-- Top Global RevX Navbar -->
    <Navbar />

    <!-- Main Content Routed View (Page 1: RevX IDE vs Page 2: PrompTool) -->
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
// Ensure prompt store is ready on app mount
const promptStore = usePromptStore()

onMounted(() => {
  promptStore.initStore()
})
</script>
