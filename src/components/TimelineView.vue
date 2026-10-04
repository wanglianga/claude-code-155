<script setup lang="ts">
import type { IncidentTimelineEntry } from '@/types'
import { useYogaStore } from '@/stores/yoga'
import { fmtDateTime } from '@/utils/date'

defineProps<{ entries: IncidentTimelineEntry[] }>()
const store = useYogaStore()
const roleLabel: Record<string, string> = { member: '会员', coach: '教练', consultant: '顾问', system: '系统' }
</script>

<template>
  <div class="timeline">
    <div v-for="e in entries" :key="e.id" class="tl-item" :class="{ action: e.kind === 'action' }">
      <div class="tl-meta">
        <span class="strong">{{ e.actorRole === 'system' ? '系统' : store.nameOf(e.actorId) }}</span>
        <span>{{ roleLabel[e.actorRole] }}</span>
        <span>{{ fmtDateTime(e.at) }}</span>
      </div>
      <div class="tl-body" :class="{ muted: e.kind === 'action' }">{{ e.content }}</div>
    </div>
  </div>
</template>
