<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useYogaStore } from '@/stores/yoga'
import StatusBadge from '@/components/StatusBadge.vue'
import RiskBox from '@/components/RiskBox.vue'
import BaseModal from '@/components/BaseModal.vue'
import type { ExerciseBase, Flexibility, YogaPackage } from '@/types'
import { dayLabel, fmtTime, fmtDateTime } from '@/utils/date'

const store = useYogaStore()
const me = computed(() => store.currentUser)

const myTrials = computed(() =>
  store.trials.filter(t => t.memberId === me.value.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
const trial = computed(() => myTrials.value[0])
const assessment = computed(() => trial.value ? store.assessmentOfTrial(trial.value.id) : undefined)
const convertedPkg = computed(() => trial.value?.convertedPackageId ? store.packageById(trial.value.convertedPackageId) : undefined)

// ---------------- 预约表单 ----------------
const PAIN_OPTIONS = ['无', '肩颈', '腰部', '膝部', '髋部', '手腕', '踝部', '其他']
const GOAL_OPTIONS = ['缓解疼痛', '改善体态', '减压放松', '塑形', '提升柔韧', '提升运动表现', '产后恢复']
const SLOT_OPTIONS = ['周一 19:00 后', '周二 18:00 后', '周二 19:00 后', '周三 18:00 后', '周四 19:00 后', '周五 18:00 后', '周五 19:00 后', '周六上午', '周六下午', '工作日白天']

const form = reactive({
  exerciseBase: '零基础' as ExerciseBase,
  painAreas: [] as string[],
  painNote: '',
  flexibility: '一般' as Flexibility,
  goals: [] as string[],
  goalNote: '',
  availableSlots: [] as string[],
  budget: 3000,
  mind: true,
  preferredCoachGender: '女' as '女' | '男' | '不限',
})
const submitted = ref(false)

function toggle(list: 'painAreas' | 'goals' | 'availableSlots', v: string) {
  const arr = form[list]
  if (list === 'painAreas' && v === '无') { form.painAreas = arr.includes('无') ? [] : ['无']; return }
  const i = arr.indexOf(v)
  if (i >= 0) arr.splice(i, 1); else arr.push(v)
  if (list === 'painAreas') form.painAreas = form.painAreas.filter(x => x !== '无')
}

function submitTrial() {
  if (!form.goals.length || !form.availableSlots.length) { return }
  store.createTrial(me.value.id, 'a1', {
    exerciseBase: form.exerciseBase,
    painAreas: form.painAreas.filter(x => x !== '无'),
    painNote: form.painNote,
    flexibility: form.flexibility,
    goals: form.goals,
    goalNote: form.goalNote,
    availableSlots: form.availableSlots,
    budget: form.budget,
    mindOppositeGenderCoach: form.mind,
    preferredCoachGender: form.mind ? form.preferredCoachGender : '不限',
  })
  submitted.value = true
}

// ---------------- 确认购买 ----------------
const showBuy = ref(false)
const buyForm = reactive({
  catalogId: 'p-24',
  frequency: 2,
  preferredTimes: [] as string[],
  phaseGoals: [''] as string[],
  note: '',
})

function openBuy() {
  const a = assessment.value!
  buyForm.catalogId = a.recommendedPackageIds[0] ?? 'p-12'
  buyForm.frequency = a.suggestedFrequency
  buyForm.preferredTimes = trial.value?.availableSlots.slice(0, a.suggestedFrequency) ?? []
  buyForm.phaseGoals = [
    `前 4 节：${a.postureFindings[0] ? '针对' + a.postureFindings[0] + '建立动作模式' : '建立动作模式'}`,
    `中期：${a.courseSuggestion.split('。')[0]}`,
    '后期：稳定与成果巩固',
  ]
  buyForm.note = `依据 ${store.nameOf(a.coachId)} 的评估制定；风险提示优先：${a.riskWarnings[0] ?? ''}`
  showBuy.value = true
}

function confirmBuy() {
  if (!trial.value) return
  const plan: YogaPackage['plan'] = {
    frequencyPerWeek: buyForm.frequency,
    preferredTimes: buyForm.preferredTimes,
    phaseGoals: buyForm.phaseGoals.filter(Boolean),
    note: buyForm.note,
  }
  const pkg = store.convertTrial(trial.value.id, buyForm.catalogId, plan)
  showBuy.value = false
  void pkg
}

const showRules = ref(false)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>私教体验课</h1>
        <div class="sub">问卷信息将用于安排教练；教练的身体评估与风险提示独立于销售，任何人不能删改。</div>
      </div>
    </div>

    <!-- ========== 无预约：填写问卷 ========== -->
    <template v-if="!trial">
      <div class="card" style="max-width:760px">
        <div class="card-title"><span class="dot"></span>预约问卷</div>

        <div class="field">
          <label>运动基础</label>
          <div class="checkbox-grid">
            <span v-for="x in ['零基础','偶尔运动','规律运动','资深练习者']" :key="x" class="chk" :class="{ on: form.exerciseBase === x }" @click="form.exerciseBase = x as ExerciseBase">{{ x }}</span>
          </div>
        </div>

        <div class="field">
          <label>身体疼痛 / 不适部位 <span class="hint">可多选，没有请选「无」</span></label>
          <div class="checkbox-grid">
            <span v-for="x in PAIN_OPTIONS" :key="x" class="chk" :class="{ on: form.painAreas.includes(x) }" @click="toggle('painAreas', x)">{{ x }}</span>
          </div>
          <textarea v-model="form.painNote" class="textarea mt8" placeholder="补充描述：什么情况下疼、持续多久、疼痛程度（0-10）"></textarea>
        </div>

        <div class="field">
          <label>柔韧性自评</label>
          <div class="checkbox-grid">
            <span v-for="x in ['僵硬','一般','良好','优秀']" :key="x" class="chk" :class="{ on: form.flexibility === x }" @click="form.flexibility = x as Flexibility">{{ x }}</span>
          </div>
        </div>

        <div class="field">
          <label>练习目标 <span class="hint">可多选</span></label>
          <div class="checkbox-grid">
            <span v-for="x in GOAL_OPTIONS" :key="x" class="chk" :class="{ on: form.goals.includes(x) }" @click="toggle('goals', x)">{{ x }}</span>
          </div>
          <textarea v-model="form.goalNote" class="textarea mt8" placeholder="想补充的目标或期待"></textarea>
        </div>

        <div class="field">
          <label>可上课时间 <span class="hint">可多选，用于排课计划</span></label>
          <div class="checkbox-grid">
            <span v-for="x in SLOT_OPTIONS" :key="x" class="chk" :class="{ on: form.availableSlots.includes(x) }" @click="toggle('availableSlots', x)">{{ x }}</span>
          </div>
        </div>

        <div class="field">
          <label>课包预算（元）</label>
          <input v-model.number="form.budget" type="number" min="0" step="100" class="input" style="max-width:200px" />
        </div>

        <div class="field">
          <label>是否介意异性教练</label>
          <div class="checkbox-grid">
            <span class="chk" :class="{ on: form.mind }" @click="form.mind = true">介意，请安排同性教练</span>
            <span class="chk" :class="{ on: !form.mind }" @click="form.mind = false">不介意，看专业匹配</span>
          </div>
          <div v-if="form.mind" class="checkbox-grid mt8">
            <span v-for="x in (['女','男'] as const)" :key="x" class="chk" :class="{ on: form.preferredCoachGender === x }" @click="form.preferredCoachGender = x">希望为{{ x }}教练</span>
          </div>
        </div>

        <div class="boundary-bar">
          🔒 <span>本问卷仅用于<b>课程安排与训练安全</b>；顾问不得据此进行与你意愿不符的推销。</span>
        </div>

        <div class="mt16 row">
          <button class="btn primary" :disabled="!form.goals.length || !form.availableSlots.length" @click="submitTrial">提交预约</button>
          <span v-if="!form.goals.length || !form.availableSlots.length" class="muted small">请至少选择练习目标和可上课时间</span>
        </div>
      </div>
    </template>

    <!-- ========== 已有预约：全流程详情 ========== -->
    <template v-else>
      <div class="grid grid-2">
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>我的预约问卷</div>
            <StatusBadge kind="trial" :value="trial.status" />
          </div>
          <div class="dl">
            <dt>运动基础</dt><dd>{{ trial.exerciseBase }}</dd>
            <dt>身体疼痛</dt>
            <dd>
              <span v-if="!trial.painAreas.length" class="muted">无</span>
              <span v-for="x in trial.painAreas" :key="x" class="badge clay" style="margin:0 6px 4px 0">{{ x }}</span>
              <div v-if="trial.painNote" class="muted small">{{ trial.painNote }}</div>
            </dd>
            <dt>柔韧性</dt><dd>{{ trial.flexibility }}</dd>
            <dt>目标</dt><dd>{{ trial.goals.join('、') }}<div v-if="trial.goalNote" class="muted small">{{ trial.goalNote }}</div></dd>
            <dt>可上课时间</dt><dd>{{ trial.availableSlots.join('；') }}</dd>
            <dt>预算</dt><dd>￥{{ trial.budget }}</dd>
            <dt>教练偏好</dt>
            <dd :class="trial.mindOppositeGenderCoach ? 'danger-text' : ''">
              {{ trial.mindOppositeGenderCoach ? `介意异性 · 期望${trial.preferredCoachGender}教练` : '不介意异性教练' }}
            </dd>
            <dt>跟进顾问</dt><dd>{{ store.nameOf(trial.consultantId) }}</dd>
          </div>
          <div v-if="trial.scheduledAt" class="hr" />
          <div v-if="trial.scheduledAt" class="row-between wrap">
            <div>
              <div class="small muted">体验课时间</div>
              <div class="strong">{{ dayLabel(trial.scheduledAt) }} {{ fmtTime(trial.scheduledAt) }}</div>
            </div>
            <div>
              <div class="small muted">安排教练</div>
              <div class="strong">{{ store.nameOf(trial.coachId) }}（{{ store.userById(trial.coachId!)?.gender }} · {{ store.userById(trial.coachId!)?.title }}）</div>
            </div>
          </div>
          <div v-if="trial.status === '已流失'" class="risk-box mt12">
            <div class="risk-title">未转化原因（顾问记录）</div>
            <p class="small" style="color:#7a3b32">{{ trial.lostReason }}</p>
          </div>
        </div>

        <!-- 教练评估（只读） -->
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>教练体态评估</div>
            <span v-if="assessment" class="muted small">{{ fmtDateTime(assessment.filledAt) }}</span>
          </div>
          <div v-if="!assessment" class="empty">
            体验课结束后，教练会在此填写体态评估、动作限制、课程建议与风险提示
          </div>
          <template v-else>
            <div class="dl">
              <dt>体态发现</dt>
              <dd><span v-for="x in assessment.postureFindings" :key="x" class="badge brand" style="margin:0 6px 6px 0">{{ x }}</span></dd>
              <dt>动作限制</dt><dd>{{ assessment.movementLimits.join('、') || '—' }}</dd>
              <dt>禁忌动作</dt>
              <dd><span v-if="assessment.contraindicatedMoves.length" class="danger-text">{{ assessment.contraindicatedMoves.join('、') }}</span><span v-else>无</span></dd>
              <dt>课程建议</dt><dd>{{ assessment.courseSuggestion }}</dd>
              <dt>建议频次</dt><dd>每周 {{ assessment.suggestedFrequency }} 节</dd>
            </div>
            <div class="mt12"><RiskBox :warnings="assessment.riskWarnings" locked /></div>
          </template>
        </div>
      </div>

      <!-- 推荐套餐与购买 -->
      <div v-if="assessment && trial.status !== '已转化'" class="card mt16">
        <div class="card-head">
          <div class="card-title clay"><span class="dot"></span>教练推荐套餐</div>
          <span class="muted small">推荐基于身体评估，非顾问销售口径</span>
        </div>
        <div class="grid grid-3">
          <div v-for="c in store.catalog.filter(x => x.id !== 'p-trial')" :key="c.id"
               class="pkg-card" :class="{ on: assessment.recommendedPackageIds.includes(c.id) }">
            <div class="row-between">
              <span class="strong">{{ c.name }}</span>
              <span v-if="assessment.recommendedPackageIds.includes(c.id)" class="badge brand">教练推荐</span>
            </div>
            <div class="price">￥{{ c.price }}<span class="unit"> / {{ c.sessions }} 节</span></div>
            <div class="small muted">{{ c.tagline }} · 有效期 {{ c.validMonths }} 个月</div>
          </div>
        </div>
        <div class="row mt16 gap6 wrap">
          <button class="btn clay" @click="openBuy">我已了解，确认购买私教课</button>
          <button class="btn" @click="showRules = true">查看请假与有效期规则</button>
          <span class="muted small">确认后系统将生成课包、按计划排课，并在临期时提醒续费</span>
        </div>
      </div>

      <!-- 已转化：课包与排课计划 -->
      <div v-if="convertedPkg" class="card mt16 ok-card">
        <div class="card-head">
          <div class="card-title"><span class="dot"></span>课包已生成</div>
          <StatusBadge kind="package" :value="convertedPkg.status" />
        </div>
        <div class="grid grid-3">
          <div>
            <div class="small muted">{{ convertedPkg.name }}</div>
            <div class="strong" style="font-size:18px">{{ convertedPkg.totalSessions }} 节 · ￥{{ convertedPkg.price }}</div>
            <div class="small muted">{{ convertedPkg.startDate }} ~ {{ convertedPkg.endDate }}</div>
          </div>
          <div>
            <div class="small muted">排课计划</div>
            <div class="strong">每周 {{ convertedPkg.plan.frequencyPerWeek }} 节</div>
            <div class="small muted">{{ convertedPkg.plan.preferredTimes.join('；') }}</div>
          </div>
          <div>
            <div class="small muted">阶段目标</div>
            <div v-for="(g, i) in convertedPkg.plan.phaseGoals" :key="i" class="small">· {{ g }}</div>
          </div>
        </div>
        <div class="hr" />
        <div class="row-between wrap">
          <div class="small muted">系统已按计划预排 {{ store.lessonsOfPackage(convertedPkg.id).length }} 节课，到期前 14 天自动续费提醒；可前往「我的课表」请假/改期。</div>
          <RouterLink class="btn primary sm" to="/member/schedule">查看我的课表 →</RouterLink>
        </div>
      </div>
    </template>

    <!-- 购买弹窗：确认排课计划 -->
    <BaseModal v-model="showBuy" title="确认购买与排课计划">
      <div class="field">
        <label>选择课包</label>
        <select v-model="buyForm.catalogId" class="input">
          <option v-for="c in store.catalog.filter(x => x.id !== 'p-trial')" :key="c.id" :value="c.id">
            {{ c.name }}（{{ c.sessions }} 节 / ￥{{ c.price }} / {{ c.validMonths }} 个月）
          </option>
        </select>
      </div>
      <div class="field">
        <label>每周频次</label>
        <div class="checkbox-grid">
          <span v-for="n in [1,2,3]" :key="n" class="chk" :class="{ on: buyForm.frequency === n }" @click="buyForm.frequency = n">每周 {{ n }} 节</span>
        </div>
      </div>
      <div class="field">
        <label>固定上课时间</label>
        <div class="checkbox-grid">
          <span v-for="s in trial?.availableSlots" :key="s" class="chk" :class="{ on: buyForm.preferredTimes.includes(s) }"
                @click="buyForm.preferredTimes.includes(s) ? buyForm.preferredTimes.splice(buyForm.preferredTimes.indexOf(s),1) : buyForm.preferredTimes.push(s)">{{ s }}</span>
        </div>
      </div>
      <div class="field">
        <label>阶段目标（可编辑，来自教练建议）</label>
        <textarea v-for="(_, i) in buyForm.phaseGoals" :key="i" v-model="buyForm.phaseGoals[i]" class="textarea mb8" :placeholder="`阶段 ${i+1}`"></textarea>
      </div>
      <div class="field">
        <label>排课备注</label>
        <textarea v-model="buyForm.note" class="textarea"></textarea>
      </div>
      <div class="boundary-bar">📌 购买后如训练中出现疼痛，排课会自动让位于教练的风险提示，不因剩余课时而赶进度。</div>
      <template #footer>
        <button class="btn" @click="showBuy = false">再想想</button>
        <button class="btn clay" :disabled="!buyForm.preferredTimes.length || !buyForm.phaseGoals.filter(Boolean).length" @click="confirmBuy">确认支付并生成课包</button>
      </template>
    </BaseModal>

    <!-- 请假规则弹窗 -->
    <BaseModal v-model="showRules" title="请假规则与有效期">
      <div v-for="r in store.leaveRules" :key="r.id" class="rule-item">
        <div class="strong small brand-text">{{ r.title }}</div>
        <div class="small mt8">{{ r.content }}</div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.pkg-card { border: 1px solid var(--c-line); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
.pkg-card.on { border-color: var(--c-brand); background: var(--c-brand-soft); }
.price { font-size: 22px; font-weight: 700; color: var(--c-brand-deep); }
.price .unit { font-size: 12px; color: var(--c-ink-3); font-weight: 400; }
.ok-card { border-color: #b8cfb6; background: linear-gradient(180deg, #fbfefa, #f3f8f2); }
.rule-item { padding: 12px 0; border-top: 1px dashed var(--c-line); }
.rule-item:first-of-type { border-top: none; }
</style>
