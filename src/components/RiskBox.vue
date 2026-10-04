<script setup lang="ts">
defineProps<{
  warnings: string[]
  /** 是否展示「训练域只读」锁标 */
  locked?: boolean
  note?: string
}>()
</script>

<template>
  <div class="risk-box">
    <div class="risk-title">⚠️ 风险提示 · 教练专业判断</div>
    <ul>
      <li v-for="(w, i) in warnings" :key="i">{{ w }}</li>
      <li v-if="!warnings.length">暂无风险提示</li>
    </ul>
    <p v-if="note" class="small mt8" style="color:#7a3b32">{{ note }}</p>
    <div v-if="locked" class="lock">🔒 训练域记录：仅责任教练可填写/更新，顾问与会员均不可编辑，续费沟通不得删改或弱化其表述</div>
  </div>
</template>
