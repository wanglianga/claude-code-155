<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useYogaStore } from '@/stores/yoga'
import StatusBadge from '@/components/StatusBadge.vue'
import BaseModal from '@/components/BaseModal.vue'
import RiskBox from '@/components/RiskBox.vue'
import MemberProfileModal from '@/components/MemberProfileModal.vue'
import type { TrialBooking, Renewal } from '@/types'
import { dayLabel, fmtDateTime, fmtTime, daysUntil } from '@/utils/date'

const store = useYogaStore()
const router = useRouter()
const tab = ref<'trial' | 'renew' | 'members'>('trial')

const stats = computed(() => store.conversionStats)

// ============ 安排体验课 ============
const scheduleTarget = ref<TrialBooking | null>(null)
const schForm = ref({ coachId: 'c1', at: '' })
const schError = ref('')
const eligibleCoaches = computed(() => {
  const t = scheduleTarget.value
  return store.coaches.map(c => ({
    ...c,
    conflict: !!t && t.preferredCoachGender !== '不限' && c.gender !== t.preferredCoachGender,
  }))
})
function openSchedule(t: TrialBooking) {
  scheduleTarget.value = t
  schError.value = ''
  const d = new Date(); d.setDate(d.getDate() + 2); d.setHours(19, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  schForm.value = {
    coachId: store.coaches.find(c => t.preferredCoachGender === '不限' || c.gender === t.preferredCoachGender)?.id ?? store.coaches[0].id,
    at: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`,
  }
}
function confirmSchedule() {
  if (!scheduleTarget.value) return
  try {
    store.scheduleTrial(scheduleTarget.value.id, schForm.value.coachId, schForm.value.at.length === 16 ? schForm.value.at : schForm.value.at + ':00')
    scheduleTarget.value = null
  } catch (e) {
    schError.value = (e as Error).message
  }
}

const lostTarget = ref<TrialBooking | null>(null)
const lostReason = ref('')
function confirmLost() {
  if (!lostTarget.value || !lostReason.value.trim()) return
  store.markTrialLost(lostTarget.value.id, lostReason.value.trim())
  lostTarget.value = null
}

// ============ 续费跟进 ============
const renewRows = computed(() =>
  store.renewals
    .map(r => {
      const pkg = store.packageById(r.packageId)!
      const prog = store.packageProgress(pkg)
      const records = store.completedLessons(pkg.id).filter(l => l.record)
      const last = records.sort((a, b) => b.startAt.localeCompare(a.startAt))[0]
      const hasNew = last && (!r.lastViewedRecordAt || last.record!.filledAt > r.lastViewedRecordAt)
      const behind = store.incidents.some(i => i.type === 'progress_behind' && i.packageId === pkg.id && i.status !== 'resolved')
      const painInc = store.incidents.some(i => i.type === 'knee_discomfort' && i.packageId === pkg.id && i.status !== 'resolved')
      return { r, pkg, prog, last, hasNew, behind, painInc, days: daysUntil(pkg.endDate) }
    })
    .sort((a, b) => (a.r.status === '已续费' ? 1 : 0) - (b.r.status === '已续费' ? 1 : 0)))

const detailTarget = ref<Renewal | null>(null)
const detailRecords = computed(() =>
  detailTarget.value
    ? store.lessons.filter(l => l.packageId === detailTarget.value!.packageId && l.record)
        .sort((a, b) => b.startAt.localeCompare(a.startAt))
    : [])
const noteDraft = ref('')
function openRenewal(r: Renewal) {
  detailTarget.value = r
  noteDraft.value = ''
  store.markRenewalViewed(r.id)
}
function saveNote(status?: '沟通中' | '暂不续费') {
  if (!detailTarget.value) return
  const patch: Partial<Renewal> = {}
  if (noteDraft.value.trim()) patch.consultantNote = detailTarget.value.consultantNote
    ? `${detailTarget.value.consultantNote}\n[${fmtDateTime(new Date().toISOString().slice(0,16))}] ${noteDraft.value.trim()}`
    : `[${fmtDateTime(new Date().toISOString().slice(0,16))}] ${noteDraft.value.trim()}`
  if (status) patch.status = status
  else if (detailTarget.value.status === '待沟通') patch.status = '沟通中'
  store.updateRenewal(detailTarget.value.id, patch)
  noteDraft.value = ''
}
const showRenewBuy = ref(false)
const renewCatalogId = ref('p-24')
function confirmRenew() {
  if (!detailTarget.value) return
  store.renewPackage(detailTarget.value.id, renewCatalogId.value, store.currentUserId)
  showRenewBuy.value = false
  detailTarget.value = store.renewals.find(x => x.id === detailTarget.value!.id) ?? null
}

// ============ 会员总览 ============
const profileId = ref<string | null>(null)
const memberRows = computed(() =>
  store.members.map(m => {
    const pkgs = store.packages.filter(p => p.memberId === m.id)
    const active = pkgs.find(p => p.status === 'active')
    const last = store.lastRecordOf(m.id)
    const open = store.incidents.filter(i => i.memberId === m.id && i.status !== 'resolved')
    return { m, active, last, open, trial: store.trials.find(t => t.memberId === m.id) }
  }))

function incidentSummary(memberId: string) {
  const counts: Record<string, number> = {}
  store.incidents.filter(i => i.memberId === memberId && i.status !== 'resolved')
    .forEach(i => { counts[i.type] = (counts[i.type] ?? 0) + 1 })
  return Object.entries(counts).map(([t, n]) => `${store.incidentMeta(t as any).label}×${n}`).join('、')
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>顾问工作台 · {{ store.currentUser.name }}</h1>
        <div class="sub">销售跟进基于真实训练进度；身体评估与风险提示只读，不能被改写为销售口径。</div>
      </div>
      <button class="btn clay" @click="router.push('/consultant/incidents')">
        🤝 协同中心（{{ store.openIncidents.length }} 个待处理）
      </button>
    </div>

    <!-- KPI -->
    <div class="grid grid-4 mb12">
      <div class="card kpi"><div class="kpi-label">体验预约总数</div><div class="kpi-num">{{ stats.total }}</div><div class="small muted">待安排/已安排 {{ stats.scheduled }}</div></div>
      <div class="card kpi"><div class="kpi-label">已购课转化</div><div class="kpi-num ok-text">{{ stats.converted }}</div><div class="small muted">体验已完成待跟进 {{ stats.done }}</div></div>
      <div class="card kpi"><div class="kpi-label">流失</div><div class="kpi-num danger-text">{{ stats.lost }}</div><div class="small muted">含投诉 1 例（见协同中心）</div></div>
      <div class="card kpi"><div class="kpi-label">体验转化率</div><div class="kpi-num brand-text">{{ stats.rate }}%</div><div class="small muted">转化 / (转化+流失)</div></div>
    </div>

    <div class="tabs">
      <div class="tab" :class="{ on: tab === 'trial' }" @click="tab = 'trial'">🌿 体验转化</div>
      <div class="tab" :class="{ on: tab === 'renew' }" @click="tab = 'renew'">🔁 续费跟进（{{ renewRows.filter(x => x.r.status !== '已续费').length }}）</div>
      <div class="tab" :class="{ on: tab === 'members' }" @click="tab = 'members'">👥 会员总览</div>
    </div>

    <!-- ============ 体验转化 ============ -->
    <div v-if="tab === 'trial'" class="card">
      <table class="tbl">
        <thead>
          <tr><th>会员</th><th>预约信息</th><th>教练偏好</th><th>预算</th><th>状态</th><th>安排</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="t in store.trials" :key="t.id" class="clickable" @click="t.status === '待安排' ? openSchedule(t) : null">
            <td>
              <div class="strong">{{ store.nameOf(t.memberId) }}</div>
              <div class="small muted">{{ fmtDateTime(t.createdAt) }}</div>
            </td>
            <td style="max-width:260px">
              <div class="small">{{ t.exerciseBase }} · 柔韧{{ t.flexibility }}</div>
              <div class="small muted">疼痛：{{ t.painAreas.join('、') || '无' }} ｜目标：{{ t.goals.join('、') }}</div>
              <div class="small muted">时间：{{ t.availableSlots.join('；') }}</div>
            </td>
            <td>
              <span :class="t.mindOppositeGenderCoach ? 'danger-text strong small' : 'small'">
                {{ t.mindOppositeGenderCoach ? `仅${t.preferredCoachGender}教练` : '不限' }}
              </span>
            </td>
            <td class="small">￥{{ t.budget }}</td>
            <td><StatusBadge kind="trial" :value="t.status" /></td>
            <td class="small">
              <template v-if="t.scheduledAt">
                {{ dayLabel(t.scheduledAt) }} {{ fmtTime(t.scheduledAt) }}<br />
                <span class="muted">{{ store.nameOf(t.coachId) }}</span>
              </template>
              <span v-else class="muted">—</span>
            </td>
            <td @click.stop>
              <div class="col gap6">
                <button v-if="t.status === '待安排'" class="btn sm primary" @click="openSchedule(t)">安排体验课</button>
                <template v-if="t.status === '已安排'">
                  <span class="small muted">等待教练评估</span>
                  <button class="btn sm" @click="openSchedule(t)">调整安排</button>
                </template>
                <template v-if="t.status === '已完成'">
                  <span class="small ok-text">评估已完成，待会员确认购课</span>
                </template>
                <template v-if="t.status === '已转化'">
                  <span class="small brand-text strong">已转化 → {{ store.packageById(t.convertedPackageId)?.name }}</span>
                </template>
                <button v-if="['待安排','已安排','已完成'].includes(t.status)" class="btn sm danger" @click="lostTarget = t; lostReason = ''">标记流失</button>
                <span v-if="t.status === '已流失'" class="small danger-text" :title="t.lostReason">有流失原因</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ============ 续费跟进 ============ -->
    <div v-if="tab === 'renew'" class="col">
      <div class="boundary-bar">
        📌 <span>续费沟通顺序：<b>先看训练进展（疼痛变化 / 阶段目标 / 缺勤与家庭练习）→ 再谈课包</b>。剩余课时只是计价单位，不是沟通依据。</span>
      </div>
      <div v-for="row in renewRows" :key="row.r.id" class="card renew-row" :class="{ done: row.r.status === '已续费' }">
        <div class="row-between wrap">
          <div class="row gap6 wrap">
            <span class="strong" style="font-size:15px">{{ store.nameOf(row.r.memberId) }}</span>
            <StatusBadge kind="renewal" :value="row.r.status" />
            <span v-if="row.hasNew" class="badge clay">● 有新的训练进展</span>
            <span v-if="row.behind" class="badge warn">📉 进度落后</span>
            <span v-if="row.painInc" class="badge danger">🩺 疼痛跟进中</span>
          </div>
          <div class="small muted">{{ row.pkg.name }} · 剩 {{ row.pkg.remainingSessions }} 节 · {{ row.days <= 14 ? `${row.days} 天后到期` : `有效期至 ${row.pkg.endDate}` }}</div>
        </div>
        <div class="grid grid-3 mt12">
          <div class="mini-stat">
            <span class="ms-label">课节完成</span>
            <span>{{ row.prog.done }}/{{ row.prog.total }}（{{ row.prog.pct }}%）</span>
          </div>
          <div class="mini-stat">
            <span class="ms-label">最近一节反馈</span>
            <span class="small">{{ row.last ? `${dayLabel(row.last.startAt)}：${row.last.record!.bodyFeeling}` : '—' }}</span>
          </div>
          <div class="mini-stat">
            <span class="ms-label">最近疼痛</span>
            <span class="small" v-if="row.last">
              {{ row.last.record!.painBefore }} → <b :class="row.last.record!.painAfter > row.last.record!.painBefore ? 'danger-text' : 'ok-text'">{{ row.last.record!.painAfter }}</b>/10
            </span>
            <span v-else>—</span>
          </div>
        </div>
        <div v-if="row.last" class="small muted mt8">教练最近备注：{{ row.last.record!.coachNote }}</div>
        <div class="row mt12 gap6 wrap">
          <button class="btn sm primary" @click="openRenewal(row.r)">📖 查看训练进展并跟进</button>
          <span class="small muted">顾问备注：{{ row.r.consultantNote ? '已记录 ' + row.r.consultantNote.split('\n').length + ' 条' : '暂无' }}</span>
        </div>
      </div>
      <div v-if="!renewRows.length" class="card empty">暂无续费工单（课包到期前 14 天自动生成）</div>
    </div>

    <!-- ============ 会员总览 ============ -->
    <div v-if="tab === 'members'" class="card">
      <table class="tbl">
        <thead><tr><th>会员</th><th>课包</th><th>最近训练</th><th>未结协同</th><th></th></tr></thead>
        <tbody>
          <tr v-for="row in memberRows" :key="row.m.id">
            <td><span class="strong">{{ row.m.name }}</span> <span class="muted small">{{ row.m.gender }}</span></td>
            <td class="small">
              <template v-if="row.active">{{ row.active.name }} · 剩 {{ row.active.remainingSessions }} 节</template>
              <template v-else-if="row.trial">{{ row.trial.status }}</template>
              <span v-else class="muted">无</span>
            </td>
            <td class="small muted">{{ row.last ? `${dayLabel(row.last.lesson.startAt)}：${row.last.record.bodyFeeling}` : '暂无记录' }}</td>
            <td>
              <span v-if="row.open.length" class="badge danger">{{ row.open.length }} 个</span>
              <span v-else class="badge ok">0</span>
              <div v-if="row.open.length" class="small muted mt8">{{ incidentSummary(row.m.id) }}</div>
            </td>
            <td><button class="btn sm" @click="profileId = row.m.id">训练档案</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ===== 安排体验课弹窗 ===== -->
    <BaseModal :model-value="!!scheduleTarget" title="安排体验课" @update:model-value="v => !v && (scheduleTarget = null)">
      <template v-if="scheduleTarget">
        <div class="boundary-bar mb12">
          会员偏好：<b :class="scheduleTarget.mindOppositeGenderCoach ? 'danger-text' : ''">
            {{ scheduleTarget.mindOppositeGenderCoach ? `介意异性教练，仅可安排${scheduleTarget.preferredCoachGender}教练（系统强制校验）` : '不介意异性教练' }}
          </b>
        </div>
        <div class="field">
          <label>可上课时间（会员填写）</label>
          <div class="small muted">{{ scheduleTarget.availableSlots.join('；') }}</div>
        </div>
        <div class="field">
          <label>体验课时间</label>
          <input v-model="schForm.at" type="datetime-local" class="input" />
        </div>
        <div class="field">
          <label>安排教练</label>
          <div class="col gap6">
            <label v-for="c in eligibleCoaches" :key="c.id" class="coach-opt" :class="{ on: schForm.coachId === c.id, ban: c.conflict }">
              <input type="radio" :value="c.id" v-model="schForm.coachId" :disabled="c.conflict" />
              <span class="strong">{{ c.name }}（{{ c.gender }}）</span>
              <span class="small muted">{{ c.title }} · {{ c.specialties?.join('、') }}</span>
              <span v-if="c.conflict" class="badge danger" style="margin-left:auto">不符合性别要求</span>
            </label>
          </div>
        </div>
        <div v-if="schError" class="risk-box mb12"><p class="small" style="color:#7a3b32">{{ schError }}</p></div>
      </template>
      <template #footer>
        <button class="btn" @click="scheduleTarget = null">取消</button>
        <button class="btn primary" :disabled="!scheduleTarget" @click="confirmSchedule">确认安排</button>
      </template>
    </BaseModal>

    <!-- ===== 流失弹窗 ===== -->
    <BaseModal :model-value="!!lostTarget" title="标记体验流失" @update:model-value="v => !v && (lostTarget = null)">
      <div class="field">
        <label>流失原因（会保留在线索档案中）</label>
        <textarea v-model="lostReason" class="textarea" placeholder="如：时间不匹配 / 预算原因 / 选择了其他场馆"></textarea>
      </div>
      <template #footer>
        <button class="btn" @click="lostTarget = null">取消</button>
        <button class="btn danger" :disabled="!lostReason.trim()" @click="confirmLost">确认流失</button>
      </template>
    </BaseModal>

    <!-- ===== 续费跟进详情 ===== -->
    <BaseModal :model-value="!!detailTarget" title="续费跟进 · 训练进展依据" size="lg" @update:model-value="v => !v && (detailTarget = null)">
      <template v-if="detailTarget">
        <div class="row-between wrap mb12">
          <div class="row gap6">
            <span class="strong" style="font-size:16px">{{ store.nameOf(detailTarget.memberId) }}</span>
            <StatusBadge kind="renewal" :value="detailTarget.status" />
          </div>
          <button class="btn sm" @click="profileId = detailTarget.memberId">打开完整训练档案</button>
        </div>

        <!-- 风险只读 -->
        <RiskBox :warnings="store.assessmentOfMember(detailTarget.memberId)?.riskWarnings ?? []" locked
          note="顾问只能据此把握沟通分寸（如先谈恢复再谈续费），不得弱化或承诺绕过风险。" />

        <!-- 阶段目标与进度 -->
        <div class="card sub mt12" v-if="store.packageById(detailTarget.packageId)">
          <div class="strong small mb8">阶段目标与进度</div>
          <div v-for="(g, i) in store.packageById(detailTarget.packageId)!.plan.phaseGoals" :key="i" class="small goal-line">
            <span class="badge brand">阶段{{ i + 1 }}</span> {{ g }}
          </div>
          <div class="progress mt12"><span :style="{ width: store.packageProgress(store.packageById(detailTarget.packageId)!).pct + '%' }" /></div>
          <div class="small muted mt8">{{ store.packageProgress(store.packageById(detailTarget.packageId)!).done }}/{{ store.packageById(detailTarget.packageId)!.totalSessions }} 节 · 剩余 {{ store.packageById(detailTarget.packageId)!.remainingSessions }} 节</div>
        </div>

        <!-- 最近训练记录 -->
        <div class="card sub mt12">
          <div class="strong small mb8">最近 4 节课训练记录（续费沟通的真实依据）</div>
          <div v-for="l in detailRecords.slice(0, 4)" :key="l.id" class="renew-rec">
            <div class="row-between small">
              <span class="strong">{{ dayLabel(l.startAt) }}</span>
              <span>疼痛 {{ l.record!.painBefore }} → <b :class="l.record!.painAfter > l.record!.painBefore ? 'danger-text' : 'ok-text'">{{ l.record!.painAfter }}</b> · 完成度 {{ l.record!.completion }}%</span>
            </div>
            <div class="small muted mt8">{{ l.record!.completedMoves.join('、') }}</div>
            <div class="small mt8">{{ l.record!.bodyFeeling }} ｜教练备注：{{ l.record!.coachNote }}</div>
            <div class="small muted mt8">🏠 {{ l.record!.homePractice }}</div>
          </div>
        </div>

        <!-- 顾问销售域备注 -->
        <div class="field mt12">
          <label>沟通备注（仅销售域，独立于训练记录保存）</label>
          <textarea v-model="noteDraft" class="textarea" placeholder="记录会员意向、预算顾虑、下次跟进时间；不要在此改写或弱化教练的风险提示"></textarea>
        </div>
        <div v-if="detailTarget.consultantNote" class="note-history">
          <div v-for="(line, i) in detailTarget.consultantNote.split('\n')" :key="i" class="small">{{ line }}</div>
        </div>
      </template>

      <template #footer>
        <button class="btn" :disabled="!detailTarget" @click="saveNote('暂不续费')">暂不续费</button>
        <button class="btn" :disabled="!detailTarget" @click="saveNote()">保存备注</button>
        <button class="btn clay" :disabled="!detailTarget" @click="showRenewBuy = true; renewCatalogId = 'p-24'">办理续费</button>
      </template>
    </BaseModal>

    <!-- 续费课包选择 -->
    <BaseModal v-model="showRenewBuy" title="办理续费">
      <div class="field">
        <label>选择续费课包（剩余课时自动并入）</label>
        <select v-model="renewCatalogId" class="input">
          <option v-for="c in store.catalog.filter(x => x.id !== 'p-trial')" :key="c.id" :value="c.id">
            {{ c.name }}（{{ c.sessions }} 节 / ￥{{ c.price }}）
          </option>
        </select>
      </div>
      <div class="boundary-bar">
        续费后：① 旧课包剩余课时并入新课包；② 排课计划与全部训练记录延续，新周期目标由教练基于当前进度制定；③ 课包临期工单自动关闭。
      </div>
      <template #footer>
        <button class="btn" @click="showRenewBuy = false">取消</button>
        <button class="btn clay" @click="confirmRenew">确认续费</button>
      </template>
    </BaseModal>

    <MemberProfileModal :model-value="!!profileId" :member-id="profileId ?? 'm1'" @update:model-value="v => !v && (profileId = null)" />
  </div>
</template>

<style scoped>
.kpi { text-align: left; }
.kpi-label { font-size: 12.5px; color: var(--c-ink-3); font-weight: 600; }
.kpi-num { font-size: 30px; font-weight: 700; margin-top: 4px; }
.renew-row.done { opacity: .65; }
.mini-stat { display: flex; flex-direction: column; gap: 3px; background: var(--c-bg); border-radius: 8px; padding: 9px 12px; }
.ms-label { font-size: 11.5px; color: var(--c-ink-3); font-weight: 600; }
.coach-opt { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border: 1px solid var(--c-line-strong); border-radius: 8px; cursor: pointer; flex-wrap: wrap; }
.coach-opt.on { border-color: var(--c-brand); background: var(--c-brand-soft); }
.coach-opt.ban { opacity: .5; cursor: not-allowed; background: var(--c-bg-soft); }
.sub { padding: 13px 15px; box-shadow: none; }
.goal-line { display: flex; align-items: center; gap: 8px; margin: 5px 0; }
.renew-rec { padding: 9px 0; border-top: 1px dashed var(--c-line); }
.renew-rec:first-of-type { border-top: none; }
.note-history { background: var(--c-bg); border-radius: 8px; padding: 10px 12px; max-height: 110px; overflow-y: auto; }
</style>
