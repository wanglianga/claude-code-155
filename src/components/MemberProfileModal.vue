<script setup lang="ts">
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import RiskBox from './RiskBox.vue'
import StatusBadge from './StatusBadge.vue'
import { useYogaStore } from '@/stores/yoga'
import { fmtDateTime, dayLabel } from '@/utils/date'
import type { Lesson } from '@/types'

const props = defineProps<{ modelValue: boolean; memberId: string }>()
defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()

const store = useYogaStore()

const member = computed(() => store.userById(props.memberId))
const trial = computed(() =>
  [...store.trials].filter(t => t.memberId === props.memberId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0])
const assessment = computed(() => store.assessmentOfMember(props.memberId))
const pkgs = computed(() => store.packages.filter(p => p.memberId === props.memberId)
  .sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
const history = computed(() =>
  store.lessons
    .filter(l => l.memberId === props.memberId && l.status === 'completed' && l.record)
    .sort((a, b) => a.startAt.localeCompare(b.startAt)))
const memberIncidents = computed(() =>
  store.incidents.filter(i => i.memberId === props.memberId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)))

// 疼痛趋势 sparkline
const trend = computed(() => {
  const pts = history.value
  const W = 460, H = 86, padL = 22, padR = 8, padT = 10, padB = 18
  const n = pts.length
  if (!n) return null
  const x = (i: number) => n === 1 ? W / 2 : padL + (i * (W - padL - padR)) / (n - 1)
  const y = (v: number) => padT + (1 - v / 10) * (H - padT - padB)
  const line = (sel: (l: Lesson) => number) =>
    pts.map((l, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(sel(l)).toFixed(1)}`).join(' ')
  return {
    width: W, height: H,
    beforePath: line(l => l.record!.painBefore),
    afterPath: line(l => l.record!.painAfter),
    points: pts.map((l, i) => ({
      cx: x(i), cyB: y(l.record!.painBefore), cyA: y(l.record!.painAfter),
      after: l.record!.painAfter, before: l.record!.painBefore,
      label: dayLabel(l.startAt),
    })),
    y,
  }
})

const avgPainDelta = computed(() => {
  const h = history.value
  if (!h.length) return 0
  const sum = h.reduce((s, l) => s + (l.record!.painBefore - l.record!.painAfter), 0)
  return (sum / h.length).toFixed(1)
})
</script>

<template>
  <BaseModal :model-value="modelValue" title="会员训练档案" size="lg" @update:model-value="v => $emit('update:modelValue', v)">
    <div v-if="member" class="profile">
      <div class="p-head">
        <div class="p-avatar">{{ member.name[0] }}</div>
        <div style="flex:1">
          <div class="row gap6 wrap">
            <span class="strong" style="font-size:16px">{{ member.name }}</span>
            <span class="badge">{{ member.gender }}</span>
            <span class="muted small">{{ member.phone }}</span>
          </div>
          <div class="muted small mt8">
            责任教练：<b class="brand-text">{{ store.nameOf(pkgs[0]?.coachId ?? assessment?.coachId) }}</b>
            ｜顾问：{{ store.nameOf(pkgs[0]?.consultantId ?? trial?.consultantId) }}
          </div>
        </div>
      </div>

      <!-- 课包 -->
      <div v-for="p in pkgs" :key="p.id" class="card sub-card">
        <div class="row-between wrap">
          <div class="row gap6">
            <span class="strong">{{ p.name }}</span>
            <StatusBadge kind="package" :value="p.status" />
          </div>
          <span class="small muted">{{ p.startDate }} ~ {{ p.endDate }}</span>
        </div>
        <div class="row mt8 gap6" style="font-size:12.5px">
          <div class="progress" style="flex:1"><span :style="{ width: store.packageProgress(p).pct + '%' }" /></div>
          <span>已上 {{ store.packageProgress(p).done }}/{{ p.totalSessions }} · 剩 {{ p.remainingSessions }} 节</span>
        </div>
        <div class="small mt8 muted">阶段目标：{{ p.plan.phaseGoals.join(' → ') }}</div>
      </div>

      <!-- 体验问卷 -->
      <div v-if="trial" class="card sub-card">
        <div class="card-title"><span class="dot"></span>体验课问卷（会员自述）</div>
        <div class="dl">
          <dt>运动基础</dt><dd>{{ trial.exerciseBase }}</dd>
          <dt>身体疼痛</dt><dd>
            <span v-if="!trial.painAreas.length" class="muted">无</span>
            <span v-for="x in trial.painAreas" :key="x" class="badge clay" style="margin-right:6px">{{ x }}</span>
            <span class="muted">{{ trial.painNote }}</span>
          </dd>
          <dt>柔韧性</dt><dd>{{ trial.flexibility }}</dd>
          <dt>目标</dt><dd>{{ trial.goals.join('、') }}<span v-if="trial.goalNote" class="muted">（{{ trial.goalNote }}）</span></dd>
          <dt>可上课时间</dt><dd>{{ trial.availableSlots.join('；') }}</dd>
          <dt>预算</dt><dd>￥{{ trial.budget }}</dd>
          <dt>教练性别</dt><dd>
            <span :class="trial.mindOppositeGenderCoach ? 'danger-text strong' : ''">
              {{ trial.mindOppositeGenderCoach ? `介意异性教练，期望${trial.preferredCoachGender}教练` : '不介意异性教练' }}
            </span>
          </dd>
        </div>
      </div>

      <!-- 体态评估（训练域只读） -->
      <div class="card sub-card" v-if="assessment">
        <div class="row-between">
          <div class="card-title"><span class="dot"></span>体态评估与课程建议</div>
          <span class="muted small">{{ store.nameOf(assessment.coachId) }} · {{ fmtDateTime(assessment.filledAt) }}</span>
        </div>
        <div class="dl mt8">
          <dt>体态发现</dt>
          <dd><span v-for="x in assessment.postureFindings" :key="x" class="badge brand" style="margin:0 6px 6px 0">{{ x }}</span></dd>
          <dt>动作限制</dt><dd>{{ assessment.movementLimits.join('、') || '—' }}</dd>
          <dt>禁忌动作</dt>
          <dd><span v-if="assessment.contraindicatedMoves.length" class="danger-text">{{ assessment.contraindicatedMoves.join('、') }}</span><span v-else>无</span></dd>
          <dt>课程建议</dt><dd>{{ assessment.courseSuggestion }}</dd>
        </div>
        <div class="mt12">
          <RiskBox :warnings="assessment.riskWarnings" locked />
        </div>
      </div>
      <div v-else class="card sub-card empty">暂无体态评估（体验课后由教练填写）</div>

      <!-- 疼痛趋势 -->
      <div class="card sub-card" v-if="trend">
        <div class="card-title"><span class="dot clay"></span>疼痛变化趋势（0-10，{{ history.length }} 节课）</div>
        <div class="row gap6 small muted mb8">
          <span class="legend before">▔ 课前疼痛</span>
          <span class="legend after">▔ 课后疼痛</span>
          <span>平均每节课疼痛下降 <b class="ok-text">{{ avgPainDelta }}</b> 分</span>
        </div>
        <svg :viewBox="`0 0 ${trend.width} ${trend.height}`" class="trend-svg" preserveAspectRatio="none">
          <line v-for="g in [2,5,8]" :key="g" :x1="22" :x2="trend.width-8" :y1="trend.y(g)" :y2="trend.y(g)" class="gridline" />
          <text v-for="g in [0,5,10]" :key="g" :x="2" :y="trend.y(g)+3.5" class="axis">{{ g }}</text>
          <path :d="trend.beforePath" class="p-before" />
          <path :d="trend.afterPath" class="p-after" />
          <circle v-for="(p,i) in trend.points" :key="'a'+i" :cx="p.cx" :cy="p.cyA" r="2.6" class="c-after" />
        </svg>
      </div>

      <!-- 最近训练记录 -->
      <div class="card sub-card">
        <div class="card-title"><span class="dot"></span>最近训练记录</div>
        <div v-if="!history.length" class="empty small">暂无已完成课程</div>
        <div v-for="l in history.slice(-3).reverse()" :key="l.id" class="rec-item">
          <div class="row-between wrap">
            <span class="strong small">{{ dayLabel(l.startAt) }} {{ l.startAt.slice(11,16) }}</span>
            <span class="small">
              疼痛
              <b :class="(l.record!.painAfter - l.record!.painBefore) > 0 ? 'danger-text' : 'ok-text'">
                {{ l.record!.painBefore }} → {{ l.record!.painAfter }}
              </b>
              · 完成度 {{ l.record!.completion }}%
            </span>
          </div>
          <div class="small muted mt8">动作：{{ l.record!.completedMoves.join('、') }}</div>
          <div class="small mt8">体感：{{ l.record!.bodyFeeling }}</div>
          <div class="small mt8">教练备注：{{ l.record!.coachNote }}</div>
          <div class="small mt8">家庭练习：{{ l.record!.homePractice }}</div>
        </div>
      </div>

      <!-- 关联工单 -->
      <div class="card sub-card" v-if="memberIncidents.length">
        <div class="card-title"><span class="dot clay"></span>关联协同工单</div>
        <div v-for="i in memberIncidents.slice(0, 5)" :key="i.id" class="row-between wrap gap6" style="padding:6px 0">
          <span class="small">{{ store.incidentMeta(i.type).icon }} {{ i.title }}</span>
          <StatusBadge kind="incident" :value="i.status" />
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.p-head { display: flex; gap: 14px; align-items: center; margin-bottom: 14px; }
.p-avatar {
  width: 48px; height: 48px; border-radius: 50%;
  background: var(--c-brand); color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 650; flex-shrink: 0;
}
.sub-card { padding: 14px 16px; box-shadow: none; }
.sub-card + .sub-card { margin-top: 12px; }
.rec-item { padding: 10px 0; border-top: 1px dashed var(--c-line); }
.rec-item:first-of-type { border-top: none; padding-top: 2px; }
.trend-svg { width: 100%; height: 96px; }
.gridline { stroke: var(--c-line); stroke-width: 1; }
.axis { font-size: 9px; fill: var(--c-ink-3); }
.p-before { fill: none; stroke: #9aa899; stroke-width: 1.6; stroke-dasharray: 4 3; }
.p-after { fill: none; stroke: var(--c-clay); stroke-width: 2; }
.c-after { fill: var(--c-clay); }
.legend.before { color: #9aa899; }
.legend.after { color: var(--c-clay); }
</style>
