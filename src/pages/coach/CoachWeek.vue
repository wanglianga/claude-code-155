<script setup lang="ts">
import { computed, ref } from 'vue'
import { useYogaStore } from '@/stores/yoga'
import StatusBadge from '@/components/StatusBadge.vue'
import BaseModal from '@/components/BaseModal.vue'
import RiskBox from '@/components/RiskBox.vue'
import MemberProfileModal from '@/components/MemberProfileModal.vue'
import type { Lesson, TrialBooking, CoachAssessment } from '@/types'
import { WEEK_LABELS, weekDateISO, weekRangeLabel, fmtTime, parseISO, dayLabel, toISO } from '@/utils/date'

const store = useYogaStore()
const coach = computed(() => store.currentUser)
const weekOffset = ref(0)

// ---------- 本周课节 + 体验课 ----------
const weekLessons = computed(() => store.coachWeekLessons(coach.value.id, weekOffset.value))

const weekTrials = computed(() => {
  const mon = weekDateISO(weekOffset.value, 0, 0, 0)
  const next = weekDateISO(weekOffset.value + 1, 0, 0, 0)
  return store.trials.filter(t =>
    t.coachId === coach.value.id && t.scheduledAt &&
    t.scheduledAt >= mon && t.scheduledAt < next &&
    (t.status === '已安排' || t.status === '已完成' || t.status === '已转化'))
})

interface Slot {
  key: string
  start: string
  end: string
  dow: number
  lesson?: Lesson
  trial?: TrialBooking
}
const slots = computed<Slot[]>(() => {
  const out: Slot[] = []
  for (const l of weekLessons.value) {
    out.push({
      key: l.id, start: l.startAt, end: l.endAt,
      dow: (parseISO(l.startAt).getDay() + 6) % 7, lesson: l,
    })
  }
  for (const t of weekTrials.value) {
    const start = t.scheduledAt!
    const d = parseISO(start)
    const endD = new Date(d); endD.setHours(endD.getHours() + 1)
    out.push({
      key: t.id, start, end: toISO(endD),
      dow: (d.getDay() + 6) % 7, trial: t,
    })
  }
  return out.sort((a, b) => a.start.localeCompare(b.start))
})
const slotsByDay = computed(() => WEEK_LABELS.map((_, dow) => slots.value.filter(s => s.dow === dow)))

// ---------- 我的会员 ----------
const memberIds = computed(() => store.coachMembers(coach.value.id))
interface MemberBrief {
  id: string
  goal: string
  pkgName: string
  progressPct: number
  lastFeedback: string
  lastPain: string
  nextFocus: string
  riskCount: number
  openCount: number
}
const briefs = computed<MemberBrief[]>(() =>
  memberIds.value.map(id => {
    const pkgs = store.activePackagesOfMember(id)
    const pkg = pkgs[0]
    const last = store.lastRecordOf(id)
    const next = store.nextLessonOf(id)
    const a = store.assessmentOfMember(id)
    return {
      id,
      goal: pkg?.plan.phaseGoals[Math.min(1, pkg.plan.phaseGoals.length - 1)] ?? '体验阶段',
      pkgName: pkg ? `${pkg.name}（剩 ${pkg.remainingSessions} 节）` : '体验课会员',
      progressPct: pkg ? store.packageProgress(pkg).pct : 0,
      lastFeedback: last ? `${dayLabel(last.lesson.startAt)}：${last.record.bodyFeeling}｜${last.record.coachNote}` : '暂无上课记录',
      lastPain: last ? `疼痛 ${last.record.painBefore} → ${last.record.painAfter}` : '',
      nextFocus: next?.focus ?? '近期无排课',
      riskCount: a?.riskWarnings.length ?? 0,
      openCount: store.incidents.filter(i => i.memberId === id && i.status !== 'resolved').length,
    }
  }))

const profileId = ref<string | null>(null)

// ---------- 课后记录 ----------
const recordTarget = ref<Lesson | null>(null)
const MOVE_LIB = ['猫牛式', '桥式', '蚌式开合', '死虫式', '下犬式', '弓步伸展', '骨盆倾斜练习', '婴儿式', '侧平板（跪姿）', '墙天使', '跪姿平板', '弹力带外旋', '胸椎泡沫轴放松', '穿针式', '腹式呼吸', '倒箭式']
const recForm = ref({
  moves: [] as string[],
  customMove: '',
  completion: 80,
  feeling: '',
  painBefore: 3,
  painAfter: 2,
  painNote: '',
  home: '',
  coachNote: '',
  tags: [] as string[],
  behind: false,
})
const TAG_OPTIONS = ['核心激活', '腰痛缓解', '活动度改善', '姿态改善', '减压放松', '需关注']

function openRecord(l: Lesson) {
  recordTarget.value = l
  const last = store.lastRecordOf(l.memberId)
  recForm.value = {
    moves: last?.record.completedMoves.slice(0, 4) ?? ['猫牛式', '腹式呼吸'],
    customMove: '', completion: 80, feeling: '',
    painBefore: last?.record.painAfter ?? 3, painAfter: 2, painNote: '',
    home: last?.record.homePractice ?? '', coachNote: '', tags: [], behind: false,
  }
}
function toggleMove(m: string) {
  const arr = recForm.value.moves
  const i = arr.indexOf(m)
  if (i >= 0) arr.splice(i, 1); else arr.push(m)
}
function submitRecord() {
  if (!recordTarget.value) return
  const f = recForm.value
  store.saveLessonRecord(recordTarget.value.id, {
    filledAt: '',
    completedMoves: [...f.moves, ...(f.customMove ? [f.customMove] : [])],
    completion: f.completion,
    bodyFeeling: f.feeling,
    painBefore: f.painBefore,
    painAfter: f.painAfter,
    painNote: f.painNote,
    homePractice: f.home,
    coachNote: f.coachNote,
    effectTags: f.tags.length ? f.tags : ['常规训练'],
  }, f.behind)
  recordTarget.value = null
}

// ---------- 体态评估（体验课后） ----------
const assessTarget = ref<TrialBooking | null>(null)
const POSTURE_OPTIONS = ['头前伸', '圆肩（上交叉）', '骨盆前倾', '骨盆后倾', '高低肩', '膝超伸', '足弓塌陷', '脊柱侧弯', '头前伸+圆肩']
const LIMIT_OPTIONS = ['踝背屈受限', '髋屈肌紧张', '肩屈曲受限', '肩外展受限', '胸椎旋转受限', '核心耐受力弱']
const assessForm = ref({
  posture: [] as string[],
  postureNote: '',
  limits: [] as string[],
  contra: '',
  suggestion: '',
  frequency: 2,
  risks: '',
  packageIds: ['p-12'] as string[],
})
const existingAssessment = (t: TrialBooking) => store.assessmentOfTrial(t.id)

function openAssess(t: TrialBooking) {
  assessTarget.value = t
  const ex = existingAssessment(t)
  assessForm.value = ex ? {
    posture: [...ex.postureFindings], postureNote: ex.postureNote,
    limits: [...ex.movementLimits], contra: ex.contraindicatedMoves.join('、'),
    suggestion: ex.courseSuggestion, frequency: ex.suggestedFrequency,
    risks: ex.riskWarnings.join('\n'), packageIds: [...ex.recommendedPackageIds],
  } : {
    posture: [], postureNote: '', limits: [], contra: '',
    suggestion: '', frequency: 2, risks: '', packageIds: ['p-12'],
  }
}
function toggleArr(key: 'posture' | 'limits' | 'packageIds', v: string) {
  const arr = assessForm.value[key]
  const i = arr.indexOf(v)
  if (i >= 0) arr.splice(i, 1); else arr.push(v)
}
function submitAssess() {
  const t = assessTarget.value!
  const f = assessForm.value
  const data: Omit<CoachAssessment, 'id' | 'filledAt'> & { id?: string } = {
    id: existingAssessment(t)?.id,
    trialId: t.id, memberId: t.memberId, coachId: coach.value.id,
    postureFindings: f.posture, postureNote: f.postureNote,
    movementLimits: f.limits,
    contraindicatedMoves: f.contra.split(/[、,，\n]/).map(s => s.trim()).filter(Boolean),
    courseSuggestion: f.suggestion, suggestedFrequency: f.frequency,
    riskWarnings: f.risks.split('\n').map(s => s.trim()).filter(Boolean),
    recommendedPackageIds: f.packageIds,
  }
  store.saveAssessment(data)
  assessTarget.value = null
}

// ---------- 教练请假 ----------
const showLeave = ref(false)
const leaveForm = ref({ from: '', to: '', reason: '' })
function submitCoachLeave() {
  const f = leaveForm.value
  if (!f.from || !f.reason) return
  store.coachRequestLeave(coach.value.id, f.from.length === 16 ? f.from : f.from + ':00', (f.to || f.from).length === 16 ? (f.to || f.from) + ':59' : (f.to || f.from), f.reason)
  showLeave.value = false
  leaveForm.value = { from: '', to: '', reason: '' }
}

const todayDow = (new Date().getDay() + 6) % 7
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>{{ coach.name }} · 本周教学</h1>
        <div class="sub">{{ coach.title }} ｜擅长：{{ coach.specialties?.join('、') }}</div>
      </div>
      <div class="row">
        <button class="btn danger" @click="showLeave = true">🏖️ 我要请假</button>
        <button class="btn" @click="weekOffset--">← 上周</button>
        <span class="week-label">{{ weekRangeLabel(weekOffset) }}</span>
        <button class="btn" @click="weekOffset++">下周 →</button>
      </div>
    </div>

    <!-- 我的会员：目标 / 上节反馈 / 本节重点 -->
    <h2 style="margin-bottom:12px">我的会员（{{ briefs.length }}）</h2>
    <div v-if="!briefs.length" class="card empty">本周暂无名下会员。顾问安排体验课后会出现在这里。</div>
    <div class="grid grid-3 mb12">
      <div v-for="b in briefs" :key="b.id" class="card member-card" @click="profileId = b.id">
        <div class="row-between">
          <div class="row gap6">
            <span class="strong" style="font-size:15px">{{ store.nameOf(b.id) }}</span>
            <span v-if="b.riskCount" class="badge danger">⚠ {{ b.riskCount }} 条风险</span>
            <span v-if="b.openCount" class="badge clay">● {{ b.openCount }} 个待协同</span>
          </div>
          <span class="muted">📂</span>
        </div>
        <div class="small muted mt8">{{ b.pkgName }}</div>
        <div class="progress mt8"><span :style="{ width: b.progressPct + '%' }" /></div>
        <div class="mt8">
          <span class="rc-tag">课程目标</span>
          <span class="small">{{ b.goal }}</span>
        </div>
        <div class="mt8">
          <span class="rc-tag clay">上节反馈</span>
          <span class="small">{{ b.lastFeedback }}</span>
          <span v-if="b.lastPain" class="badge" style="margin-left:6px" :class="b.lastPain.includes('→') ? '' : ''">{{ b.lastPain }}</span>
        </div>
        <div class="mt8">
          <span class="rc-tag brand">本节重点</span>
          <span class="small strong">{{ b.nextFocus }}</span>
        </div>
      </div>
    </div>

    <!-- 周日历 -->
    <div class="card">
      <div class="card-title"><span class="dot"></span>本周课表</div>
      <div class="cweek">
        <div v-for="(d, dow) in WEEK_LABELS" :key="d" class="cday" :class="{ today: weekOffset === 0 && dow === todayDow }">
          <div class="cday-head">{{ d }}</div>
          <div class="cday-body">
            <div v-for="s in slotsByDay[dow]" :key="s.key" class="cles" :class="s.lesson?.status ?? 'trial'">
              <div class="cles-time">{{ fmtTime(s.start) }}</div>
              <div class="cles-name">{{ store.nameOf(s.lesson ? s.lesson.memberId : s.trial!.memberId) }}</div>

              <!-- 体验课卡 -->
              <template v-if="s.trial">
                <div class="badge info">体验课</div>
                <div v-if="s.trial.status === '已安排'" class="small mt8">
                  待上课 · 课后填写体态评估
                </div>
                <div v-else class="small ok-text mt8">评估已填写</div>
                <button class="btn sm primary mt8" @click="openAssess(s.trial)">
                  {{ existingAssessment(s.trial) ? '查看/更新评估' : '填写体态评估' }}
                </button>
              </template>

              <!-- 常规课卡 -->
              <template v-else-if="s.lesson">
                <div class="small cles-focus">{{ s.lesson.focus }}</div>
                <div class="mt8 row gap6 wrap">
                  <StatusBadge kind="lesson" :value="s.lesson.status" />
                  <span v-if="s.lesson.record" class="badge ok">记录已填</span>
                </div>
                <div class="mt8 row gap6 wrap">
                  <button v-if="s.lesson.status === 'scheduled'" class="btn sm primary" @click="openRecord(s.lesson)">填写课后记录</button>
                  <button v-if="s.lesson.status === 'completed' && s.lesson.record" class="btn sm" @click="profileId = s.lesson.memberId">查训练档案</button>
                </div>
              </template>
            </div>
            <div v-if="!slotsByDay[dow].length" class="cday-empty">—</div>
          </div>
        </div>
      </div>
    </div>

    <div class="boundary-bar mt16">
      🔒 <span><b>训练域边界：</b>体态评估、动作限制、禁忌动作与风险提示仅你（责任教练）可填写；系统不会向顾问开放编辑入口。风险提示触发时，排课与续费沟通自动让位于训练安全。</span>
    </div>

    <!-- ===== 课后记录弹窗 ===== -->
    <BaseModal :model-value="!!recordTarget" title="课后训练记录" size="lg" @update:model-value="v => !v && (recordTarget = null)">
      <template v-if="recordTarget">
        <div class="row-between mb12 small">
          <span>会员：<b>{{ store.nameOf(recordTarget.memberId) }}</b> · {{ dayLabel(recordTarget.startAt) }} {{ fmtTime(recordTarget.startAt) }}</span>
          <span class="muted">本节重点：{{ recordTarget.focus }}</span>
        </div>

        <div class="grid grid-2">
          <div class="field">
            <label>完成动作（动作库点选）</label>
            <div class="checkbox-grid">
              <span v-for="m in MOVE_LIB" :key="m" class="chk" :class="{ on: recForm.moves.includes(m) }" @click="toggleMove(m)">{{ m }}</span>
            </div>
            <input v-model="recForm.customMove" class="input mt8" placeholder="其他动作（手动输入）" />
          </div>
          <div class="col">
            <div class="field">
              <label>完成度：{{ recForm.completion }}%</label>
              <input v-model.number="recForm.completion" type="range" min="20" max="100" step="5" style="width:100%" />
            </div>
            <div class="field">
              <label>会员体感</label>
              <textarea v-model="recForm.feeling" class="textarea" placeholder="如：核心能主动发力；中段右膝酸软"></textarea>
            </div>
          </div>
        </div>

        <div class="grid grid-2">
          <div class="field pain-field">
            <label>课前疼痛：{{ recForm.painBefore }} /10</label>
            <input v-model.number="recForm.painBefore" type="range" min="0" max="10" style="width:100%" />
            <label class="mt8">课后疼痛：<b :class="recForm.painAfter >= 5 && recForm.painAfter > recForm.painBefore ? 'danger-text' : 'ok-text'">{{ recForm.painAfter }} /10</b></label>
            <input v-model.number="recForm.painAfter" type="range" min="0" max="10" style="width:100%" />
            <textarea v-model="recForm.painNote" class="textarea mt8" placeholder="疼痛部位、诱因、与动作的关系"></textarea>
            <div v-if="recForm.painAfter >= 5 && recForm.painAfter > recForm.painBefore" class="risk-box mt8">
              <div class="risk-title">⚠️ 将触发自动协同</div>
              <p class="small" style="color:#7a3b32">课后疼痛升高且 ≥5 分：提交后系统自动创建「身体不适」工单通知顾问，并把下节课调整为无痛动作库。</p>
            </div>
          </div>
          <div class="col">
            <div class="field">
              <label>家庭练习</label>
              <textarea v-model="recForm.home" class="textarea" placeholder="如：每天 2 组猫牛式 + 5 分钟腹式呼吸"></textarea>
            </div>
            <div class="field">
              <label>教练备注（自动带入下节课重点 / 供续费参考）</label>
              <textarea v-model="recForm.coachNote" class="textarea" placeholder="如：腰痛持续改善，膝盖出现早期信号，下节课观察"></textarea>
            </div>
            <div class="field">
              <label>训练效果标签</label>
              <div class="checkbox-grid">
                <span v-for="t in TAG_OPTIONS" :key="t" class="chk" :class="{ on: recForm.tags.includes(t) }"
                      @click="recForm.tags.includes(t) ? recForm.tags.splice(recForm.tags.indexOf(t),1) : recForm.tags.push(t)">{{ t }}</span>
              </div>
            </div>
            <label class="chk danger-chk" :class="{ on: recForm.behind }" style="width:100%">
              <input type="checkbox" v-model="recForm.behind" />
              ⚠️ 课程进度落后（实际进展明显滞后于阶段目标，需要顾问协同补课/调频次）
            </label>
          </div>
        </div>
      </template>
      <template #footer>
        <button class="btn" @click="recordTarget = null">取消</button>
        <button class="btn primary" :disabled="!recordTarget || !recForm.moves.length || !recForm.feeling" @click="submitRecord">提交课后记录</button>
      </template>
    </BaseModal>

    <!-- ===== 体态评估弹窗 ===== -->
    <BaseModal :model-value="!!assessTarget" title="体验课 · 体态评估" size="lg" @update:model-value="v => !v && (assessTarget = null)">
      <template v-if="assessTarget">
        <div class="row-between mb12 small wrap">
          <span>会员：<b>{{ store.nameOf(assessTarget.memberId) }}</b>（{{ assessTarget.exerciseBase }} · 柔韧{{ assessTarget.flexibility }}）</span>
          <span class="muted">自述疼痛：{{ assessTarget.painAreas.join('、') || '无' }} ｜{{ assessTarget.painNote }}</span>
        </div>
        <div class="small muted mb12">目标：{{ assessTarget.goals.join('、') }} ｜预算：￥{{ assessTarget.budget }} ｜教练性别要求：{{ assessTarget.mindOppositeGenderCoach ? assessTarget.preferredCoachGender : '不限' }}</div>

        <div class="field">
          <label>体态评估发现</label>
          <div class="checkbox-grid">
            <span v-for="p in POSTURE_OPTIONS" :key="p" class="chk" :class="{ on: assessForm.posture.includes(p) }" @click="toggleArr('posture', p)">{{ p }}</span>
          </div>
          <textarea v-model="assessForm.postureNote" class="textarea mt8" placeholder="补充观察：承重习惯、代偿模式等"></textarea>
        </div>
        <div class="field">
          <label>动作限制</label>
          <div class="checkbox-grid">
            <span v-for="x in LIMIT_OPTIONS" :key="x" class="chk" :class="{ on: assessForm.limits.includes(x) }" @click="toggleArr('limits', x)">{{ x }}</span>
          </div>
        </div>
        <div class="field">
          <label>禁忌动作（顿号或换行分隔）</label>
          <input v-model="assessForm.contra" class="input" placeholder="如：深度跳跃、负重深蹲" />
        </div>
        <div class="grid grid-2">
          <div class="field">
            <label>课程建议</label>
            <textarea v-model="assessForm.suggestion" class="textarea" placeholder="阶段安排、节奏与理由"></textarea>
          </div>
          <div class="field">
            <label>建议频次</label>
            <div class="checkbox-grid">
              <span v-for="n in [1,2,3]" :key="n" class="chk" :class="{ on: assessForm.frequency === n }" @click="assessForm.frequency = n">每周 {{ n }} 节</span>
            </div>
            <label class="mt8" style="display:block">推荐套餐（可多选，仅基于训练判断）</label>
            <div class="checkbox-grid mt8">
              <span v-for="c in store.catalog.filter(x => x.id !== 'p-trial')" :key="c.id" class="chk" :class="{ on: assessForm.packageIds.includes(c.id) }" @click="toggleArr('packageIds', c.id)">{{ c.name }}</span>
            </div>
          </div>
        </div>
        <div class="field">
          <label>⚠️ 风险提示（每行一条，提交后锁定，顾问与会员均不可编辑）</label>
          <textarea v-model="assessForm.risks" class="textarea" style="min-height:90px" placeholder="如：右膝髌腱区域按压不适，所有屈膝动作以无痛范围为界，出现刺痛立即停止"></textarea>
        </div>
      </template>
      <template #footer>
        <button class="btn" @click="assessTarget = null">取消</button>
        <button class="btn primary" :disabled="!assessTarget || !assessForm.posture.length || !assessForm.suggestion || !assessForm.risks.trim()" @click="submitAssess">提交评估</button>
      </template>
    </BaseModal>

    <!-- ===== 教练请假弹窗 ===== -->
    <BaseModal v-model="showLeave" title="教练请假">
      <div class="field">
        <label>请假开始</label>
        <input v-model="leaveForm.from" type="datetime-local" class="input" />
      </div>
      <div class="field">
        <label>请假结束</label>
        <input v-model="leaveForm.to" type="datetime-local" class="input" />
      </div>
      <div class="field">
        <label>原因</label>
        <textarea v-model="leaveForm.reason" class="textarea" placeholder="如：家中急事 / 外出培训"></textarea>
      </div>
      <div class="boundary-bar">
        提交后，时段内已排课程将自动挂起并通知会员与顾问：48 小时内协调改期或同性别备选教练代课，<b>不扣会员课时</b>；代课教练可查看全部训练记录与风险提示。
      </div>
      <template #footer>
        <button class="btn" @click="showLeave = false">取消</button>
        <button class="btn danger" :disabled="!leaveForm.from || !leaveForm.reason" @click="submitCoachLeave">提交请假</button>
      </template>
    </BaseModal>

    <MemberProfileModal :model-value="!!profileId" :member-id="profileId ?? 'm1'" @update:model-value="v => !v && (profileId = null)" />
  </div>
</template>

<style scoped>
.week-label { font-weight: 600; min-width: 150px; text-align: center; }
.member-card { cursor: pointer; transition: all .15s; }
.member-card:hover { border-color: var(--c-brand); transform: translateY(-1px); }
.rc-tag { font-size: 11px; font-weight: 650; color: var(--c-brand-deep); background: var(--c-brand-soft); border-radius: 4px; padding: 1px 7px; margin-right: 6px; }
.rc-tag.clay { color: var(--c-clay); background: var(--c-clay-soft); }
.rc-tag.brand { color: var(--c-brand-deep); }
.cweek { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; overflow-x: auto; }
.cday { min-width: 150px; border: 1px solid var(--c-line); border-radius: 10px; background: var(--c-bg); }
.cday.today { border-color: var(--c-brand); box-shadow: 0 0 0 1px var(--c-brand); }
.cday-head { padding: 8px 10px; font-weight: 650; font-size: 13px; border-bottom: 1px solid var(--c-line); }
.cday-body { padding: 8px; display: flex; flex-direction: column; gap: 8px; min-height: 120px; }
.cday-empty { color: var(--c-ink-3); font-size: 12px; text-align: center; padding: 10px 0; }
.cles { background: var(--c-surface); border: 1px solid var(--c-line-strong); border-left-width: 3px; border-radius: 8px; padding: 8px 9px; }
.cles.scheduled { border-left-color: var(--c-brand); }
.cles.completed { border-left-color: var(--c-ok); }
.cles.coach_leave { border-left-color: var(--c-danger); background: #fdf3f1; }
.cles.rescheduled { border-left-color: var(--c-info); }
.cles.trial { border-left-color: var(--c-clay); background: #fdfaf7; }
.cles-time { font-weight: 650; font-size: 12.5px; }
.cles-name { font-size: 12px; color: var(--c-ink-2); }
.cles-focus { font-size: 11.5px; color: var(--c-ink-2); margin-top: 3px; line-height: 1.45; }
.danger-chk.on { background: var(--c-danger-soft); border-color: var(--c-danger); color: var(--c-danger); }
.pain-field { background: var(--c-bg); border-radius: 10px; padding: 10px 12px; }
</style>
