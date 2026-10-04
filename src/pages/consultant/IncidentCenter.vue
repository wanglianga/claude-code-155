<script setup lang="ts">
import { computed, ref } from 'vue'
import { useYogaStore } from '@/stores/yoga'
import StatusBadge from '@/components/StatusBadge.vue'
import BaseModal from '@/components/BaseModal.vue'
import TimelineView from '@/components/TimelineView.vue'
import MemberProfileModal from '@/components/MemberProfileModal.vue'
import type { Incident } from '@/types'
import { fmtDateTime, toISO, addDays, dayLabel, fmtTime } from '@/utils/date'

const store = useYogaStore()

const typeFilter = ref<string>('all')
const statusFilter = ref<string>('open')
const activeId = ref<string | null>(null)
const profileId = ref<string | null>(null)

const filtered = computed(() =>
  [...store.incidents]
    .filter(i => typeFilter.value === 'all' || i.type === typeFilter.value)
    .filter(i => {
      if (statusFilter.value === 'all') return true
      if (statusFilter.value === 'open') return i.status !== 'resolved'
      return i.status === 'resolved'
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)))

const counts = computed(() => {
  const c: Record<string, number> = { all: store.incidents.length }
  for (const i of store.incidents) c[i.type] = (c[i.type] ?? 0) + 1
  return c
})

const active = computed(() => store.incidents.find(i => i.id === activeId.value) ?? null)

const noteDraft = ref('')
function addNote() {
  if (!active.value || !noteDraft.value.trim()) return
  store.addIncidentNote(active.value.id, store.currentUserId, 'consultant', noteDraft.value.trim())
  noteDraft.value = ''
}

// 教练请假处理
const leaveChoice = ref<'reschedule' | 'substitute'>('reschedule')
const rescheduleAt = ref('')
const subCoachId = ref('')
const lessonCandidates = computed(() =>
  active.value ? active.value.linkedLessonIds.map(id => store.lessons.find(l => l.id === id)!).filter(Boolean) : [])
const originalCoach = computed(() => active.value ? store.userById(active.value.coachId) : undefined)
const subCoaches = computed(() =>
  store.coaches.filter(c => c.id !== active.value?.coachId && c.gender === originalCoach.value?.gender))

function openIncident(i: Incident) {
  activeId.value = i.id
  noteDraft.value = ''
  leaveChoice.value = 'reschedule'
  const d = addDays(new Date(), 3); d.setHours(19, 0, 0, 0)
  rescheduleAt.value = toISO(d).slice(0, 16)
  subCoachId.value = subCoaches.value[0]?.id ?? store.coaches[0]?.id ?? ''
}

function submitCoachLeaveResolve() {
  if (!active.value) return
  const payload = leaveChoice.value === 'reschedule'
    ? (rescheduleAt.value.length === 16 ? rescheduleAt.value : rescheduleAt.value.slice(0, 16))
    : subCoachId.value
  store.resolveCoachLeave(active.value.id, leaveChoice.value, payload, store.currentUserId)
}

// 换教练处理
const changeCoachId = ref('c3')
const changeCandidates = computed(() => {
  if (!active.value) return []
  const t = store.trials.find(x => x.memberId === active.value!.memberId)
  return store.coaches.filter(c => c.id !== active.value!.coachId)
    .map(c => ({ ...c, conflict: !!t && t.preferredCoachGender !== '不限' && c.gender !== t.preferredCoachGender }))
})
function approveChange() {
  if (!active.value || !changeCoachId.value) return
  store.approveCoachChange(active.value.id, changeCoachId.value, store.currentUserId)
}

function resolveManual() {
  if (!active.value) return
  store.resolveIncident(active.value.id, '顾问确认事项已处理完毕', store.currentUserId)
}

const filterTabs = [
  { key: 'all', label: '全部' },
  { key: 'knee_discomfort', label: '🩺 身体不适' },
  { key: 'coach_leave', label: '🏖️ 教练请假' },
  { key: 'reschedule_request', label: '🕐 请假改期' },
  { key: 'progress_behind', label: '📉 进度落后' },
  { key: 'coach_change', label: '🔄 换教练' },
  { key: 'package_expiring', label: '⏳ 课包临期' },
  { key: 'complaint', label: '🚩 投诉' },
]

const linkedLessons = computed(() =>
  active.value ? active.value.linkedLessonIds
    .map(id => store.lessons.find(l => l.id === id)).filter(Boolean) : [])
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>异常协同中心</h1>
        <div class="sub">顾问、教练、会员围绕同一套训练记录处理：膝盖不适、教练请假、临时改期、进度落后、换教练、课包临期、投诉。</div>
      </div>
      <div class="row">
        <button class="btn sm" :class="{ primary: statusFilter === 'open' }" @click="statusFilter = 'open'">进行中</button>
        <button class="btn sm" :class="{ primary: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button>
        <button class="btn sm" :class="{ primary: statusFilter === 'resolved' }" @click="statusFilter = 'resolved'">已解决</button>
      </div>
    </div>

    <div class="type-tabs">
      <span v-for="f in filterTabs" :key="f.key" class="type-chip" :class="{ on: typeFilter === f.key }" @click="typeFilter = f.key">
        {{ f.label }}
        <i v-if="counts[f.key]">{{ counts[f.key] }}</i>
      </span>
    </div>

    <div class="grid list-grid">
      <!-- 工单列表 -->
      <div class="card list-card">
        <div v-if="!filtered.length" class="empty">没有匹配的工单</div>
        <div v-for="i in filtered" :key="i.id" class="inc-item" :class="{ active: activeId === i.id }" @click="openIncident(i)">
          <div class="row gap6 wrap">
            <span class="badge" :class="store.incidentMeta(i.type).tone">{{ store.incidentMeta(i.type).icon }} {{ store.incidentMeta(i.type).label }}</span>
            <StatusBadge kind="incident" :value="i.status" />
          </div>
          <div class="strong small mt8">{{ i.title }}</div>
          <div class="small muted mt8 inc-member">{{ store.nameOf(i.memberId) }} · 教练 {{ store.nameOf(i.coachId) }}</div>
          <div class="small muted" style="margin-top:2px">{{ fmtDateTime(i.createdAt) }}</div>
        </div>
      </div>

      <!-- 工单详情 -->
      <div class="card detail-card" v-if="active">
        <div class="row-between wrap">
          <div class="row gap6 wrap">
            <span class="badge" :class="store.incidentMeta(active.type).tone">{{ store.incidentMeta(active.type).icon }} {{ store.incidentMeta(active.type).label }}</span>
            <StatusBadge kind="incident" :value="active.status" />
          </div>
          <button class="btn sm" @click="profileId = active.memberId">📂 会员训练档案</button>
        </div>
        <h2 style="margin:12px 0 6px">{{ active.title }}</h2>
        <p class="small muted">{{ active.detail }}</p>

        <!-- 关联课节（同一套训练记录） -->
        <div v-if="linkedLessons.length" class="linked-box mt12">
          <div class="strong small mb8">关联课节与训练记录</div>
          <div v-for="l in linkedLessons" :key="l!.id" class="linked-lesson">
            <div class="row-between small wrap">
              <span class="strong">{{ dayLabel(l!.startAt) }} {{ fmtTime(l!.startAt) }} · {{ store.nameOf(l!.coachId) }}</span>
              <StatusBadge kind="lesson" :value="l!.status" />
            </div>
            <div class="small mt8">{{ l!.focus }}</div>
            <template v-if="l!.record">
              <div class="small muted mt8">
                动作 {{ l!.record.completedMoves.join('、') }} ｜疼痛 {{ l!.record.painBefore }} → {{ l!.record.painAfter }}
              </div>
              <div class="small muted mt8">{{ l!.record.coachNote }}</div>
            </template>
          </div>
        </div>

        <!-- 类型化处理动作 -->
        <div class="action-box mt12" v-if="active.status !== 'resolved'">
          <!-- 教练请假 -->
          <template v-if="active.type === 'coach_leave'">
            <div class="strong small mb8">处理方案（不扣会员课时）</div>
            <label class="chk" :class="{ on: leaveChoice === 'reschedule' }" style="width:100%">
              <input type="radio" v-model="leaveChoice" value="reschedule" /> 改期
            </label>
            <input v-if="leaveChoice === 'reschedule'" v-model="rescheduleAt" type="datetime-local" class="input mt8" />
            <label class="chk mt8" :class="{ on: leaveChoice === 'substitute' }" style="width:100%">
              <input type="radio" v-model="leaveChoice" value="substitute" /> 安排同性别备选教练代课
            </label>
            <select v-if="leaveChoice === 'substitute'" v-model="subCoachId" class="input mt8">
              <option v-for="c in subCoaches" :key="c.id" :value="c.id">{{ c.name }}（{{ c.gender }} · {{ c.title }}）</option>
            </select>
            <p v-if="leaveChoice === 'substitute' && !subCoaches.length" class="small danger-text mt8">暂无同性别备选教练，建议改期</p>
            <button class="btn primary mt12"
                    :disabled="leaveChoice === 'substitute' && !subCoaches.length"
                    @click="submitCoachLeaveResolve">
              {{ leaveChoice === 'substitute' && !subCoaches.length ? '无同性别备选教练，请改期' : '确认并通知会员' }}
            </button>
          </template>

          <!-- 换教练 -->
          <template v-else-if="active.type === 'coach_change'">
            <div class="strong small mb8">交接给新教练（训练档案完整同步）</div>
            <select v-model="changeCoachId" class="input">
              <option v-for="c in changeCandidates" :key="c.id" :value="c.id" :disabled="c.conflict">
                {{ c.name }}（{{ c.gender }} · {{ c.title }}）{{ c.conflict ? ' — 不符合会员性别要求' : '' }}
              </option>
            </select>
            <div class="row mt12 gap6 wrap">
              <button class="btn primary" @click="approveChange">确认交接并解冻排课</button>
            </div>
          </template>

          <!-- 课包临期：跳转续费 -->
          <template v-else-if="active.type === 'package_expiring'">
            <div class="boundary-bar">续费工单已在「顾问工作台 → 续费跟进」中，沟通时须先查看训练进展与疼痛情况。</div>
            <button class="btn mt12" @click="resolveManual">会员暂不续费 / 已知悉，关闭提醒</button>
          </template>

          <!-- 通用：疼痛 / 改期 / 进度 / 投诉 -->
          <template v-else>
            <div class="boundary-bar">
              <template v-if="active.type === 'knee_discomfort'">🩺 排课已按风险提示自动调整；请与教练确认恢复情况后再决定是否关闭，续费沟通暂缓。</template>
              <template v-else-if="active.type === 'reschedule_request'">🕐 补排课节已生成，确认会员知晓后可关闭。</template>
              <template v-else-if="active.type === 'progress_behind'">📉 与教练确认补课/调频次方案；若会员提出换教练，两个工单合并跟进。</template>
              <template v-else-if="active.type === 'complaint'">🚩 外呼已冻结；处理结果与回访须留痕，避免再次打扰会员。</template>
            </div>
            <button class="btn mt12" @click="resolveManual">处理完成，关闭工单</button>
          </template>
        </div>

        <div v-else class="resolved-box mt12">
          ✅ 已解决：{{ active.resolution }}（{{ active.resolvedAt ? fmtDateTime(active.resolvedAt) : '' }}）
        </div>

        <!-- 时间线 -->
        <div class="hr" />
        <div class="strong small mb8">协同时间线（{{ active.timeline.length }}）</div>
        <TimelineView :entries="active.timeline" />

        <!-- 留言 -->
        <div v-if="active.status !== 'resolved'" class="mt12">
          <div class="row gap6">
            <input v-model="noteDraft" class="input" placeholder="以顾问身份补充跟进信息，会员与教练可见" @keyup.enter="addNote" />
            <button class="btn primary" :disabled="!noteDraft.trim()" @click="addNote">发送</button>
          </div>
        </div>
      </div>

      <div v-else class="card detail-card empty-detail">
        <div class="empty">← 从左侧选择一个工单查看与处理</div>
      </div>
    </div>

    <MemberProfileModal :model-value="!!profileId" :member-id="profileId ?? 'm1'" @update:model-value="v => !v && (profileId = null)" />
  </div>
</template>

<style scoped>
.type-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.type-chip {
  padding: 6px 14px; border: 1px solid var(--c-line-strong); border-radius: 999px;
  font-size: 13px; cursor: pointer; background: var(--c-surface); user-select: none;
}
.type-chip.on { background: var(--c-brand); border-color: var(--c-brand); color: #fff; font-weight: 600; }
.type-chip i {
  font-style: normal; background: var(--c-clay-soft); color: var(--c-clay);
  border-radius: 999px; padding: 0 7px; font-size: 11px; margin-left: 4px;
}
.type-chip.on i { background: rgba(255,255,255,.22); color: #fff; }
.list-grid { grid-template-columns: 320px 1fr; align-items: start; }
@media (max-width: 960px) { .list-grid { grid-template-columns: 1fr; } }
.list-card { padding: 8px; max-height: 72vh; overflow-y: auto; }
.inc-item { padding: 11px 12px; border-radius: 10px; cursor: pointer; border: 1px solid transparent; }
.inc-item:hover { background: var(--c-bg-soft); }
.inc-item.active { background: var(--c-brand-soft); border-color: var(--c-brand); }
.inc-member { margin-top: 3px; }
.detail-card { min-height: 400px; }
.linked-box { background: var(--c-bg); border-radius: 10px; padding: 12px 14px; }
.linked-lesson { padding: 8px 0; border-top: 1px dashed var(--c-line); }
.linked-lesson:first-of-type { border-top: none; }
.action-box { background: var(--c-clay-soft); border-radius: 10px; padding: 14px 16px; }
.resolved-box { background: var(--c-ok-soft); color: var(--c-ok); border-radius: 10px; padding: 12px 14px; font-size: 13px; font-weight: 550; }
.empty-detail { display: flex; align-items: center; justify-content: center; }
</style>
