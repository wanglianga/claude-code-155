<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useYogaStore } from '@/stores/yoga'
import BaseModal from '@/components/BaseModal.vue'
import RiskBox from '@/components/RiskBox.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { dayLabel, fmtTime, fmtDateTime } from '@/utils/date'

const store = useYogaStore()
const me = computed(() => store.currentUser)

const history = computed(() =>
  store.lessons.filter(l => l.memberId === me.value.id && l.status === 'completed' && l.record)
    .sort((a, b) => b.startAt.localeCompare(a.startAt)))

const activePkg = computed(() => store.activePackagesOfMember(me.value.id)[0])
const assessment = computed(() => store.assessmentOfMember(me.value.id))
const myIncidents = computed(() =>
  store.incidents.filter(i => i.memberId === me.value.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
const changeIncident = computed(() =>
  store.incidents.find(i => i.memberId === me.value.id && i.type === 'coach_change' && i.status !== 'resolved'))

// ---------------- 疼痛上报 ----------------
const showPain = ref(false)
const painForm = reactive({ part: '右膝', level: 5, note: '' })
const painDone = ref(false)
function submitPain() {
  store.reportPain(me.value.id, painForm.part, painForm.level, painForm.note)
  showPain.value = false
  painDone.value = true
  setTimeout(() => (painDone.value = false), 4000)
}

// ---------------- 换教练 ----------------
const showChange = ref(false)
const changeForm = reactive({ reason: '', wantGender: '' })
function submitChange() {
  if (!changeForm.reason.trim()) return
  store.requestCoachChange(me.value.id, `${changeForm.reason}（期望：${changeForm.wantGender || '不限'}教练）`)
  showChange.value = false
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>我的训练记录</h1>
        <div class="sub">每节课的完成动作、体感、疼痛变化与家庭练习都沉淀在此；续费和换教练时，沟通从这些真实记录开始。</div>
      </div>
      <div class="row">
        <button class="btn danger" @click="showPain = true">🩺 上报身体不适</button>
        <button v-if="activePkg && !changeIncident" class="btn" @click="showChange = true">🔄 申请更换教练</button>
      </div>
    </div>

    <div v-if="painDone" class="card ok-toast fade-up">
      ✅ 已提交给教练与顾问，下节课开课前会先复核你的疼痛情况；如持续加重请及时线下就医。
    </div>

    <div v-if="changeIncident" class="card">
      <div class="row-between wrap">
        <div class="row gap6">
          <span class="badge brand">🔄 换教练申请进行中</span>
          <StatusBadge kind="incident" :value="changeIncident.status" />
          <span class="small muted">{{ changeIncident.title }}</span>
        </div>
        <span class="small muted">申请时间 {{ fmtDateTime(changeIncident.createdAt) }}</span>
      </div>
      <p class="small mt8 muted">你的完整体态评估、风险提示与全部训练记录将随交接同步给新教练，无需重新描述病史与目标。</p>
    </div>

    <div class="grid grid-3">
      <!-- 记录时间线 -->
      <div class="card" style="grid-column: span 2">
        <div class="card-title"><span class="dot"></span>课节记录（{{ history.length }} 节）</div>
        <div v-if="!history.length" class="empty">还没有已完成的课程。体验课结束后，教练会在这里填写每节课记录。</div>
        <div v-for="l in history" :key="l.id" class="rec">
          <div class="rec-head">
            <div>
              <span class="strong">{{ dayLabel(l.startAt) }} {{ fmtTime(l.startAt) }}</span>
              <span class="muted small"> · {{ store.nameOf(l.coachId) }}</span>
            </div>
            <div class="row gap6 wrap">
              <span v-for="t in l.record!.effectTags" :key="t" class="badge" :class="t === '需关注' ? 'warn' : 'ok'">{{ t }}</span>
            </div>
          </div>
          <div class="rec-grid">
            <div class="rec-cell">
              <span class="rc-label">完成动作</span>
              <span class="small">{{ l.record!.completedMoves.join('、') }}</span>
            </div>
            <div class="rec-cell">
              <span class="rc-label">完成度</span>
              <div class="row gap6"><div class="progress" style="width:120px"><span :style="{ width: l.record!.completion + '%' }" /></div><span class="small">{{ l.record!.completion }}%</span></div>
            </div>
            <div class="rec-cell">
              <span class="rc-label">体感</span>
              <span class="small">{{ l.record!.bodyFeeling }}</span>
            </div>
            <div class="rec-cell">
              <span class="rc-label">疼痛变化</span>
              <span class="small">
                课前 <b>{{ l.record!.painBefore }}</b> → 课后
                <b :class="l.record!.painAfter > l.record!.painBefore ? 'danger-text' : 'ok-text'">{{ l.record!.painAfter }}</b> /10
              </span>
            </div>
            <div v-if="l.record!.painNote" class="rec-cell full">
              <span class="rc-label">疼痛说明</span>
              <span class="small clay-text">{{ l.record!.painNote }}</span>
            </div>
            <div class="rec-cell full">
              <span class="rc-label">教练备注 / 下节衔接</span>
              <span class="small">{{ l.record!.coachNote }}</span>
            </div>
            <div class="rec-cell full">
              <span class="rc-label">🏠 家庭练习</span>
              <span class="small">{{ l.record!.homePractice }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：风险 + 事项 -->
      <div class="col">
        <div v-if="assessment" class="card">
          <div class="card-title"><span class="dot clay"></span>我的风险红线</div>
          <RiskBox :warnings="assessment.riskWarnings" locked />
          <div v-if="assessment.contraindicatedMoves.length" class="mt12">
            <span class="small muted">禁忌动作：</span>
            <span class="small danger-text strong">{{ assessment.contraindicatedMoves.join('、') }}</span>
          </div>
        </div>

        <div class="card">
          <div class="card-title"><span class="dot"></span>我的协同事项</div>
          <div v-if="!myIncidents.length" class="empty small">暂无</div>
          <div v-for="i in myIncidents.slice(0, 6)" :key="i.id" class="inc-mini">
            <div class="row-between">
              <span class="small strong">{{ store.incidentMeta(i.type).icon }} {{ store.incidentMeta(i.type).label }}</span>
              <StatusBadge kind="incident" :value="i.status" />
            </div>
            <div class="small muted mt8">{{ i.title }}</div>
          </div>
        </div>

        <div class="card boundary-note">
          <div class="strong small brand-text">销售与训练的边界</div>
          <p class="small mt8">
            顾问会在续费时参考这些真实训练记录与阶段目标完成情况；
            教练的体态评估和风险提示<b>不会被简化成销售话术</b>，你也可以随时在本页核对原始表述。
          </p>
        </div>
      </div>
    </div>

    <!-- 疼痛上报弹窗 -->
    <BaseModal v-model="showPain" title="上报身体不适">
      <div class="field">
        <label>不适部位</label>
        <div class="checkbox-grid">
          <span v-for="x in ['肩颈','腰部','右膝','左膝','髋部','手腕','踝部','其他']" :key="x"
                class="chk" :class="{ on: painForm.part === x }" @click="painForm.part = x">{{ x }}</span>
        </div>
      </div>
      <div class="field">
        <label>当前疼痛程度：{{ painForm.level }} / 10</label>
        <input v-model.number="painForm.level" type="range" min="1" max="10" style="width:100%" />
        <div class="row-between small muted"><span>轻微</span><span>剧烈</span></div>
      </div>
      <div class="field">
        <label>具体描述</label>
        <textarea v-model="painForm.note" class="textarea" placeholder="什么动作/场景下出现、持续多久、有无外伤"></textarea>
      </div>
      <div class="boundary-bar">
        🧘 提交后：① 教练收到通知并在下节课先复核；② 相关排课动作按风险提示自动降阶；③ 顾问同步知晓，但只做关怀跟进，不会据此推销。
      </div>
      <template #footer>
        <button class="btn" @click="showPain = false">取消</button>
        <button class="btn danger" @click="submitPain">提交上报</button>
      </template>
    </BaseModal>

    <!-- 换教练弹窗 -->
    <BaseModal v-model="showChange" title="申请更换教练">
      <p class="small muted mb12">当前责任教练：<b>{{ store.nameOf(activePkg?.coachId) }}</b>。换教练不会丢失任何训练档案。</p>
      <div class="field">
        <label>希望的教练性别 / 风格</label>
        <div class="checkbox-grid">
          <span v-for="x in ['不限','女教练，风格温和','女教练，节奏紧凑','男教练','先沟通再决定']" :key="x"
                class="chk" :class="{ on: changeForm.wantGender === x }" @click="changeForm.wantGender = x">{{ x }}</span>
        </div>
      </div>
      <div class="field">
        <label>更换原因（会同步给顾问，不影响你与现任教练的课程权益）</label>
        <textarea v-model="changeForm.reason" class="textarea" placeholder="如：上课节奏紧张、时间难配合、沟通风格不适配等"></textarea>
      </div>
      <div class="boundary-bar">
        📂 交接内容包括：体态评估、动作限制、禁忌动作、风险提示、{{ history.length }} 节课的动作/疼痛/家庭练习记录与阶段目标。
      </div>
      <template #footer>
        <button class="btn" @click="showChange = false">取消</button>
        <button class="btn primary" :disabled="!changeForm.reason.trim()" @click="submitChange">提交申请</button>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.ok-toast { border-color: #b8cfb6; background: var(--c-ok-soft); color: var(--c-ok); font-weight: 600; }
.rec { border-top: 1px solid var(--c-line); padding: 14px 0; }
.rec:first-of-type { border-top: none; padding-top: 4px; }
.rec-head { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.rec-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; background: var(--c-bg); border-radius: 10px; padding: 12px 14px; }
.rec-cell { display: flex; flex-direction: column; gap: 3px; }
.rec-cell.full { grid-column: 1 / -1; }
.rc-label { font-size: 11.5px; color: var(--c-ink-3); font-weight: 600; }
.inc-mini { padding: 9px 0; border-top: 1px dashed var(--c-line); }
.inc-mini:first-of-type { border-top: none; }
.boundary-note { background: var(--c-brand-soft); border-color: #cddccd; }
</style>
