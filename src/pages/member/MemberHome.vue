<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useYogaStore } from '@/stores/yoga'
import StatusBadge from '@/components/StatusBadge.vue'
import RiskBox from '@/components/RiskBox.vue'
import MemberProfileModal from '@/components/MemberProfileModal.vue'
import { dayLabel, fmtTime, daysUntil } from '@/utils/date'

const store = useYogaStore()
const router = useRouter()
const me = computed(() => store.currentUser)
const showProfile = ref(false)

const activePkg = computed(() => store.activePackagesOfMember(me.value.id)[0])
const nextLesson = computed(() => store.nextLessonOf(me.value.id))
const last = computed(() => store.lastRecordOf(me.value.id))
const myOpenIncidents = computed(() =>
  store.incidents.filter(i => i.memberId === me.value.id && i.status !== 'resolved')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
const renewal = computed(() =>
  store.renewals.find(r => r.memberId === me.value.id && r.status !== '已续费'))
const trial = computed(() =>
  [...store.trials].filter(t => t.memberId === me.value.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0])
const assessment = computed(() => store.assessmentOfMember(me.value.id))

const daysLeft = computed(() => activePkg.value ? daysUntil(activePkg.value.endDate) : null)
const avgPainDrop = computed(() => {
  const hs = store.lessons.filter(l => l.memberId === me.value.id && l.record)
  if (!hs.length) return null
  return (hs.reduce((s, l) => s + (l.record!.painBefore - l.record!.painAfter), 0) / hs.length).toFixed(1)
})

const quickLinks = [
  { icon: '🌿', title: '预约体验课', desc: '填写身体情况与上课偏好', to: '/member/trial' },
  { icon: '📅', title: '请假 / 临时换时间', desc: '按请假规则自助处理', to: '/member/schedule' },
  { icon: '🩺', title: '身体不适上报', desc: '膝盖等疼痛即时同步教练', to: '/member/records' },
  { icon: '📖', title: '完整训练记录', desc: '每节课的动作与疼痛变化', to: '/member/records' },
]
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>你好，{{ me.name }} <span class="badge brand">{{ me.gender }}会员</span></h1>
        <div class="sub">每一次疼痛、缺勤与训练效果，都会成为后续排课和换教练时的共同依据。</div>
      </div>
      <button class="btn" @click="showProfile = true">📂 我的训练档案</button>
    </div>

    <!-- 尚未购课：体验课引导 -->
    <div v-if="!activePkg" class="card fade-up">
      <div class="row-between wrap">
        <div>
          <div class="strong" style="font-size:15px">
            {{ trial ? '你的体验课：' + trial.status : '从一节私教体验课开始' }}
          </div>
          <div class="muted small mt8">
            <template v-if="!trial">告诉我们你的身体情况、目标、可上课时间与预算，顾问会为你安排合适的教练。</template>
            <template v-else-if="trial.status === '待安排'">问卷已提交，顾问正在安排，可在「体验课预约」中查看。</template>
            <template v-else-if="trial.status === '已安排'">已安排 {{ dayLabel(trial.scheduledAt!) }} {{ fmtTime(trial.scheduledAt!) }}，教练：{{ store.nameOf(trial.coachId) }}</template>
            <template v-else-if="trial.status === '已完成'">教练已完成体态评估，请查看评估与推荐套餐。</template>
            <template v-else-if="trial.status === '已流失'">本期体验暂未转化，可随时重新预约。</template>
          </div>
        </div>
        <button class="btn primary" @click="router.push('/member/trial')">
          {{ trial ? '查看体验课详情' : '填写预约问卷' }}
        </button>
      </div>
    </div>

    <div v-else class="grid grid-3 fade-up">
      <!-- 课包卡 -->
      <div class="card stat-card">
        <div class="stat-label">我的课包</div>
        <div class="row gap6 wrap mt8">
          <span class="strong" style="font-size:16px">{{ activePkg.name }}</span>
          <StatusBadge kind="package" :value="activePkg.status" />
        </div>
        <div class="big-num mt12">{{ activePkg.remainingSessions }}<span class="unit"> 节剩余</span></div>
        <div class="progress mt12"><span :style="{ width: store.packageProgress(activePkg).pct + '%' }" /></div>
        <div class="small muted mt8">
          已上 {{ store.packageProgress(activePkg).done }}/{{ activePkg.totalSessions }} 节
          · 有效期至 {{ activePkg.endDate }}
        </div>
        <div v-if="daysLeft !== null && daysLeft <= 14" class="badge danger mt8">⏳ 距到期 {{ daysLeft }} 天</div>
      </div>

      <!-- 下节课卡 -->
      <div class="card stat-card">
        <div class="stat-label">下一节课</div>
        <template v-if="nextLesson">
          <div class="big-num mt12" style="font-size:24px">{{ dayLabel(nextLesson.startAt) }}</div>
          <div class="mt8"><span class="strong">{{ fmtTime(nextLesson.startAt) }} - {{ fmtTime(nextLesson.endAt) }}</span> · {{ store.nameOf(nextLesson.coachId) }}</div>
          <div class="next-focus mt12">
            <span class="badge clay">本节重点</span>
            <span class="small">{{ nextLesson.focus }}</span>
          </div>
        </template>
        <div v-else class="empty">近期暂无排课</div>
      </div>

      <!-- 训练效果卡 -->
      <div class="card stat-card">
        <div class="stat-label">训练进展（来自真实课节记录）</div>
        <div class="big-num mt12">{{ store.packageProgress(activePkg).done }}<span class="unit"> 节已完成</span></div>
        <div class="mt12 small" v-if="avgPainDrop !== null">
          疼痛评分平均每节课 <b :class="+avgPainDrop >= 0 ? 'ok-text' : 'danger-text'">
            下降 {{ avgPainDrop }} 分
          </b>
        </div>
        <div class="small muted mt8" v-if="last">
          最近一节（{{ dayLabel(last.lesson.startAt) }}）：{{ last.record.bodyFeeling }}
        </div>
        <button class="btn sm mt12" @click="router.push('/member/records')">查看疼痛与动作记录 →</button>
      </div>
    </div>

    <!-- 风险提示（只读，会员可见） -->
    <div v-if="assessment && activePkg" class="card">
      <div class="card-title"><span class="dot"></span>我的风险提示与禁忌动作</div>
      <RiskBox :warnings="assessment.riskWarnings" :note="`禁忌动作：${assessment.contraindicatedMoves.join('、') || '无'}`" />
    </div>

    <!-- 续费提醒：明确告知"基于真实进度" -->
    <div v-if="renewal && activePkg" class="card renew-card">
      <div class="row-between wrap">
        <div>
          <div class="card-title clay"><span class="dot"></span>续费提醒</div>
          <div class="small mt8">
            课包剩余 <b>{{ activePkg.remainingSessions }}</b> 节、{{ daysLeft }} 天后到期。
            顾问将<b>基于你的训练记录（疼痛变化、阶段目标完成度、家庭练习）</b>与你沟通，
            而不是只看剩余课时；教练的风险提示不会作为销售话术。
          </div>
          <div class="small muted mt8">跟进状态：<StatusBadge kind="renewal" :value="renewal.status" /></div>
        </div>
        <button class="btn clay" @click="router.push('/member/records')">查看我的训练依据</button>
      </div>
    </div>

    <!-- 待处理协同（会员视角） -->
    <div class="card">
      <div class="card-title"><span class="dot clay"></span>与我相关的进行中事项（{{ myOpenIncidents.length }}）</div>
      <div v-if="!myOpenIncidents.length" class="empty">没有进行中的事项，一切顺利 🌿</div>
      <div v-for="i in myOpenIncidents" :key="i.id" class="inc-row">
        <div class="row gap6 wrap" style="flex:1">
          <span class="badge" :class="store.incidentMeta(i.type).tone">{{ store.incidentMeta(i.type).icon }} {{ store.incidentMeta(i.type).label }}</span>
          <span class="strong small">{{ i.title }}</span>
          <StatusBadge kind="incident" :value="i.status" />
        </div>
        <div class="small muted inc-detail">{{ i.detail }}</div>
      </div>
    </div>

    <!-- 快捷入口 -->
    <h2 style="margin:22px 0 12px">自助服务</h2>
    <div class="grid grid-4">
      <div v-for="q in quickLinks" :key="q.to + q.title" class="card quick-card" @click="router.push(q.to)">
        <div style="font-size:24px">{{ q.icon }}</div>
        <div class="strong mt8">{{ q.title }}</div>
        <div class="small muted mt8">{{ q.desc }}</div>
      </div>
    </div>

    <MemberProfileModal v-model="showProfile" :member-id="me.id" />
  </div>
</template>

<style scoped>
.stat-card { display: flex; flex-direction: column; }
.stat-label { font-size: 12.5px; color: var(--c-ink-3); font-weight: 600; }
.big-num { font-size: 32px; font-weight: 700; color: var(--c-brand-deep); line-height: 1.1; }
.big-num .unit { font-size: 13px; font-weight: 500; color: var(--c-ink-2); }
.next-focus { background: var(--c-clay-soft); border-radius: 8px; padding: 9px 11px; display: flex; flex-direction: column; gap: 5px; }
.renew-card { border-color: #e3c9b8; background: linear-gradient(180deg, #fffdfb, #fcf4ee); }
.inc-row { padding: 11px 0; border-top: 1px dashed var(--c-line); }
.inc-row:first-of-type { border-top: none; }
.inc-detail { margin-top: 5px; }
.quick-card { cursor: pointer; transition: transform .15s, box-shadow .15s; }
.quick-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-pop); }
</style>
