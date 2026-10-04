<script setup lang="ts">
import { computed } from 'vue'
import { useDataStore } from '../stores/data'

/**
 * 教练专业档案（体态评估 / 动作限制 / 课程建议 / 风险提示）。
 * 所有角色可见，但只有教练本人能在测评时填写；
 * 顾问端只读 —— 专业内容不能被改写成销售话术。
 */
const props = defineProps<{ memberId: string; viewerRole: string }>()
const data = useDataStore()

const assessment = computed(() => data.latestAssessment(props.memberId))
const coachName = computed(() => assessment.value ? data.coachById(assessment.value.coachId)?.name : '')
</script>

<template>
  <div v-if="assessment" class="locked">
    <div class="lock-head">
      🔒 教练专业档案 · {{ coachName }} 签署于 {{ assessment.coachSignedAt }}
      <span v-if="viewerRole === 'consultant'" class="tag clay">顾问只读，不可编辑</span>
    </div>
    <dl class="kv">
      <dt>体态评估</dt><dd>{{ assessment.posture }}</dd>
      <dt>动作限制</dt><dd>{{ assessment.movementLimits }}</dd>
      <dt>课程建议</dt><dd>{{ assessment.courseAdvice }}</dd>
      <dt>风险提示</dt><dd style="color: var(--danger)">{{ assessment.riskNotice }}</dd>
      <dt>推荐套餐</dt><dd>{{ assessment.recommendedPackage }}</dd>
    </dl>
  </div>
  <div v-else class="empty">暂无测评档案</div>
</template>
