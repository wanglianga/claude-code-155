<script setup lang="ts">
import { computed, ref } from 'vue'
import { useYogaStore } from '@/stores/yoga'
import StatusBadge from '@/components/StatusBadge.vue'
import BaseModal from '@/components/BaseModal.vue'
import TimelineView from '@/components/TimelineView.vue'
import type { Lesson } from '@/types'
import { WEEK_LABELS, weekDateISO, weekRangeLabel, fmtTime, parseISO, toISO } from '@/utils/date'

const store = useYogaStore()
const me = computed(() => store.currentUser)
const weekOffset = ref(0)

const myLessons = computed(() =>
  store.lessons.filter(l => l.memberId === me.value.id)
    .sort((a, b) => a.startAt.localeCompare(b.startAt)))

const weekLessons = computed(() => {
  const mon = weekDateISO(weekOffset.value, 0, 0, 0)
  const next = weekDateISO(weekOffset.value + 1, 0, 0, 0)
  return myLessons.value.filter(l => l.startAt >= mon && l.startAt < next)
})

const byDay = computed(() =>
  WEEK_LABELS.map((_, dow) => weekLessons.value.filter(l => (parseISO(l.startAt).getDay() + 6) % 7 === dow)))

const activePkg = computed(() => store.activePackagesOfMember(me.value.id)[0])

// 弹窗状态
const leaveTarget = ref<Lesson | null>(null)
const leaveReason = ref('')
const changeTarget = ref<Lesson | null>(null)
const newTime = ref('')
const incidentTarget = ref<Lesson | null>(null)

const hoursUntil = (l: Lesson) => ((parseISO(l.startAt).getTime() - Date.now()) / 3600000).toFixed(1)

function openLeave(l: Lesson) { leaveTarget.value = l; leaveReason.value = '' }
function openChange(l: Lesson) {
  changeTarget.value = l
  const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(19, 0, 0, 0)
  newTime.value = toISO(d).slice(0, 16)
}
function confirmLeave() {
  if (!leaveTarget.value || !leaveReason.value.trim()) return
  store.memberRequestLeave(leaveTarget.value.id, leaveReason.value.trim())
  leaveTarget.value = null
}
function confirmChange() {
  if (!changeTarget.value || !newTime.value) return
  store.memberReschedule(changeTarget.value.id, newTime.value.length === 16 ? newTime.value : newTime.value.slice(0, 16))
  changeTarget.value = null
}

const linkedIncident = (l: Lesson) =>
  store.incidents.find(i => i.lessonId === l.id && i.status !== 'resolved')

const makeupOf = (l: Lesson) =>
  l.rescheduledTo ? store.lessons.find(x => x.id === l.rescheduledTo) : undefined

function makeupLabel(l: Lesson) {
  const m = makeupOf(l)
  if (!m) return '—'
  const dow = (parseISO(m.startAt).getDay() + 6) % 7
  return `${WEEK_LABELS[dow]} ${fmtTime(m.startAt)}`
}

const currentIncident = computed(() =>
  incidentTarget.value ? linkedIncident(incidentTarget.value) : undefined)

const todayDow = (new Date().getDay() + 6) % 7
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>我的课表</h1>
        <div class="sub">请假、临时换时间都会进入同一套训练协同记录，教练与顾问同步可见。</div>
      </div>
      <div class="row">
        <button class="btn" @click="weekOffset--">← 上一周</button>
        <span class="week-label">{{ weekRangeLabel(weekOffset) }}</span>
        <button class="btn" @click="weekOffset++">下一周 →</button>
      </div>
    </div>

    <!-- 周历 -->
    <div class="week-grid card">
      <div v-for="(d, dow) in WEEK_LABELS" :key="d" class="day-col" :class="{ today: weekOffset === 0 && dow === todayDow }">
        <div class="day-head">
          <span>{{ d }}</span>
          <span v-if="weekOffset === 0 && dow === todayDow" class="badge brand">今天</span>
        </div>
        <div class="day-body">
          <div v-for="l in byDay[dow]" :key="l.id" class="lesson-card" :class="l.status">
            <div class="ls-time">{{ fmtTime(l.startAt) }} - {{ fmtTime(l.endAt) }}</div>
            <div class="ls-coach">{{ store.nameOf(l.coachId) }}</div>
            <div v-if="l.status === 'scheduled'" class="ls-focus">{{ l.focus }}</div>
            <div v-else-if="l.status === 'member_leave'" class="small clay-text">我已请假：{{ l.reason }}</div>
            <div v-else-if="l.status === 'coach_leave'" class="small danger-text">教练请假：{{ l.reason }}</div>
            <div v-else-if="l.status === 'rescheduled'" class="small muted">
              已改期至 {{ makeupLabel(l) }}
            </div>
            <div v-else-if="l.status === 'completed'" class="small ok-text">已完成 · 有训练记录</div>

            <div class="ls-actions">
              <template v-if="l.status === 'scheduled' && parseISO(l.startAt).getTime() > Date.now()">
                <button class="btn sm" @click="openLeave(l)">请假</button>
                <button class="btn sm" @click="openChange(l)">换时间</button>
              </template>
              <button v-if="linkedIncident(l)" class="btn sm clay" @click="incidentTarget = l">协同进展</button>
            </div>
          </div>
          <div v-if="!byDay[dow].length" class="day-empty">—</div>
        </div>
      </div>
    </div>

    <!-- 请假规则 -->
    <div class="card">
      <div class="card-title"><span class="dot clay"></span>请假规则</div>
      <div class="grid grid-2 mt8">
        <div v-for="r in store.leaveRules" :key="r.id" class="rule-box">
          <div class="strong small">{{ r.title }}</div>
          <div class="small muted mt8">{{ r.content }}</div>
        </div>
      </div>
    </div>

    <!-- 近期安排一览 -->
    <div class="card">
      <div class="card-title"><span class="dot"></span>近期课程（含历史）</div>
      <table class="tbl">
        <thead><tr><th>时间</th><th>教练</th><th>状态</th><th>重点 / 原因</th><th></th></tr></thead>
        <tbody>
          <tr v-for="l in myLessons.slice(-14).reverse()" :key="l.id">
            <td class="small">{{ WEEK_LABELS[(parseISO(l.startAt).getDay()+6)%7] }} {{ l.startAt.slice(5,16).replace('T',' ') }}</td>
            <td class="small">{{ store.nameOf(l.coachId) }}</td>
            <td><StatusBadge kind="lesson" :value="l.status" /></td>
            <td class="small muted" style="max-width:340px">{{ l.status === 'scheduled' ? l.focus : l.reason || '已完成' }}</td>
            <td>
              <button v-if="l.status === 'scheduled' && parseISO(l.startAt).getTime() > Date.now()" class="btn sm" @click="openLeave(l)">请假</button>
              <button v-if="linkedIncident(l)" class="btn sm clay" @click="incidentTarget = l">工单</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 请假弹窗 -->
    <BaseModal :model-value="!!leaveTarget" title="课程请假" @update:model-value="v => !v && (leaveTarget = null)">
      <template v-if="leaveTarget">
        <p class="small mb12">
          课程时间：<b>{{ WEEK_LABELS[(parseISO(leaveTarget.startAt).getDay()+6)%7] }} {{ fmtTime(leaveTarget.startAt) }}</b>
          （距开课 {{ hoursUntil(leaveTarget) }} 小时）
        </p>
        <div class="boundary-bar mb12">
          {{ +hoursUntil(leaveTarget) >= 24
            ? '✅ 距开课超过 24 小时：不扣课时，提交后顾问/教练会为你补排。'
            : '⚠️ 不足 24 小时：记为「临时改期」，48 小时内可补排一次，每月不超过 2 次。' }}
        </div>
        <div class="field">
          <label>请假原因</label>
          <textarea v-model="leaveReason" class="textarea" placeholder="如：临时加班 / 身体不适（可在训练记录页详细上报疼痛）"></textarea>
        </div>
      </template>
      <template #footer>
        <button class="btn" @click="leaveTarget = null">取消</button>
        <button class="btn primary" :disabled="!leaveTarget || !leaveReason.trim()" @click="confirmLeave">提交请假</button>
      </template>
    </BaseModal>

    <!-- 换时间弹窗 -->
    <BaseModal :model-value="!!changeTarget" title="临时换时间" @update:model-value="v => !v && (changeTarget = null)">
      <template v-if="changeTarget">
        <p class="small mb12">
          原时间：<b>{{ WEEK_LABELS[(parseISO(changeTarget.startAt).getDay()+6)%7] }} {{ fmtTime(changeTarget.startAt) }}</b>
          （距开课 {{ hoursUntil(changeTarget) }} 小时）
        </p>
        <div class="field">
          <label>希望改到</label>
          <input v-model="newTime" type="datetime-local" class="input" />
        </div>
        <div class="boundary-bar">
          {{ +hoursUntil(changeTarget) >= 24
            ? '✅ 超过 24 小时改期不占用临时改期次数。'
            : '⚠️ 不足 24 小时记为临时改期（限 2 次/月）；系统将通知顾问确认补排。' }}
        </div>
      </template>
      <template #footer>
        <button class="btn" @click="changeTarget = null">取消</button>
        <button class="btn primary" :disabled="!changeTarget || !newTime" @click="confirmChange">申请改期</button>
      </template>
    </BaseModal>

    <!-- 协同工单进展 -->
    <BaseModal :model-value="!!incidentTarget" title="协同处理进展" @update:model-value="v => !v && (incidentTarget = null)">
      <template v-if="incidentTarget && currentIncident">
        <div class="row gap6 mb12 wrap">
          <span class="badge danger">{{ store.incidentMeta(currentIncident.type).icon }} {{ store.incidentMeta(currentIncident.type).label }}</span>
          <StatusBadge kind="incident" :value="currentIncident.status" />
        </div>
        <p class="small mb12">{{ currentIncident.detail }}</p>
        <TimelineView :entries="currentIncident.timeline" />
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.week-label { font-weight: 600; min-width: 150px; text-align: center; }
.week-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; padding: 12px; overflow-x: auto; }
.day-col { min-width: 132px; border: 1px solid var(--c-line); border-radius: 10px; background: var(--c-bg); }
.day-col.today { border-color: var(--c-brand); box-shadow: 0 0 0 1px var(--c-brand); }
.day-head { padding: 8px 10px; font-weight: 650; font-size: 13px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--c-line); }
.day-body { padding: 8px; display: flex; flex-direction: column; gap: 8px; min-height: 90px; }
.day-empty { color: var(--c-ink-3); font-size: 12px; text-align: center; padding: 10px 0; }
.lesson-card { background: var(--c-surface); border: 1px solid var(--c-line-strong); border-left-width: 3px; border-radius: 8px; padding: 8px 9px; }
.lesson-card.scheduled { border-left-color: var(--c-brand); }
.lesson-card.completed { border-left-color: var(--c-ok); }
.lesson-card.member_leave { border-left-color: var(--c-warn); background: #fdf9f0; }
.lesson-card.coach_leave { border-left-color: var(--c-danger); background: #fdf3f1; }
.lesson-card.rescheduled { border-left-color: var(--c-info); background: #f5fafc; }
.ls-time { font-weight: 650; font-size: 12.5px; }
.ls-coach { font-size: 12px; color: var(--c-ink-2); }
.ls-focus { font-size: 11.5px; color: var(--c-ink-2); margin-top: 4px; line-height: 1.45; }
.ls-actions { display: flex; gap: 5px; margin-top: 7px; flex-wrap: wrap; }
.rule-box { border: 1px solid var(--c-line); border-radius: 8px; padding: 11px 14px; background: var(--c-bg); }
</style>
