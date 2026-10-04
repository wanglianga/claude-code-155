<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  kind: 'trial' | 'lesson' | 'incident' | 'renewal' | 'package'
  value: string
}>()

const MAPS: Record<string, Record<string, { cls: string; label: string }>> = {
  trial: {
    待安排: { cls: 'warn', label: '待安排' },
    已安排: { cls: 'info', label: '已安排' },
    已完成: { cls: 'brand', label: '评估已完成' },
    已转化: { cls: 'ok', label: '已购课' },
    已流失: { cls: 'danger', label: '已流失' },
  },
  lesson: {
    scheduled: { cls: 'brand', label: '已排课' },
    completed: { cls: 'ok', label: '已完成' },
    member_leave: { cls: 'warn', label: '会员请假' },
    coach_leave: { cls: 'danger', label: '教练请假' },
    rescheduled: { cls: 'info', label: '已改期' },
    cancelled: { cls: '', label: '已取消' },
  },
  incident: {
    open: { cls: 'danger', label: '待处理' },
    processing: { cls: 'warn', label: '处理中' },
    resolved: { cls: 'ok', label: '已解决' },
  },
  renewal: {
    待沟通: { cls: 'warn', label: '待沟通' },
    沟通中: { cls: 'info', label: '沟通中' },
    已续费: { cls: 'ok', label: '已续费' },
    暂不续费: { cls: '', label: '暂不续费' },
  },
  package: {
    active: { cls: 'ok', label: '生效中' },
    expired: { cls: 'danger', label: '已过期' },
    used_up: { cls: '', label: '已用完' },
    frozen: { cls: 'info', label: '已冻结' },
  },
}

const item = computed(() => MAPS[props.kind][props.value] ?? { cls: '', label: props.value })
</script>

<template>
  <span class="badge" :class="item.cls">{{ item.label }}</span>
</template>
