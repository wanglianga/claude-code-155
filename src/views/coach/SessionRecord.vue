<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useDataStore } from '../../stores/data'
import type { PainChange } from '../../types'
import { weekdayCn } from '../../utils/date'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const data = useDataStore()

const session = computed(() => data.sessions.find(s => s.id === (route.params.id as string)))
const member = computed(() => session.value ? data.accountById(session.value.memberId) : undefined)
const booking = computed(() => session.value ? data.bookingOf(session.value.memberId) : undefined)
const lastRecord = computed(() => {
  if (!session.value) return undefined
  return data.recordsOf(session.value.memberId).find(r => r.sessionId !== session.value!.id)
})
const existingRecord = computed(() => session.value ? data.recordOf(session.value.id) : undefined)

const form = reactive({
  movesText: '',
  memberFeel: 6,
  feelNote: '',
  painChanges: [] as PainChange[],
  homePractice: '',
  coachNote: '',
  nextFocus: '',
})
const newPain = reactive({ part: '右膝', before: 3, after: 3 })
const partOptions = ['肩颈', '腰椎', '左膝', '右膝', '手腕', '髋部', '踝部', '其他']

function addPain() {
  form.painChanges.push({ ...newPain })
}

function submit() {
  const s = session.value
  if (!s) return
  const moves = form.movesText.split(/[、,，\n]/).map(x => x.trim()).filter(Boolean)
  if (!moves.length) { alert('请填写完成动作'); return }
  if (!form.homePractice.trim()) { alert('请布置家庭练习'); return }
  data.completeSession(s.id, {
    completedMoves: moves,
    memberFeel: form.memberFeel,
    feelNote: form.feelNote,
    painChanges: [...form.painChanges],
    homePractice: form.homePractice,
    coachNote: form.coachNote,
    nextFocus: form.nextFocus || undefined,
  }, auth.current!.name)
  if (s.isExperience && s.bookingId) {
    router.push(`/coach/assess/${s.bookingId}`)
  } else {
    router.push('/coach')
  }
}
</script>

<template>
  <div class="page" v-if="session">
    <h2 class="page-title">
      {{ session.isExperience ? '体验课' : '私教课' }} · {{ member?.name }}
      <span class="tag" :class="session.isExperience ? 'clay' : ''">{{ session.kind }}</span>
    </h2>
    <p class="page-sub">{{ session.date }}（{{ weekdayCn(session.date) }}）{{ session.time }} · 本节课重点：{{ session.focus }}</p>

    <div class="grid cols-2">
      <div class="card">
        <h3>会员背景</h3>
        <dl v-if="booking" class="kv">
          <dt>训练目标</dt><dd>{{ booking.goals.join('、') }}</dd>
          <dt>身体疼痛</dt><dd>{{ booking.pains.map(p => `${p.part} ${p.level}分`).join('、') || '无' }}</dd>
          <dt>运动基础</dt><dd>{{ booking.fitnessBase }} · 柔韧性 {{ booking.flexibility }}</dd>
        </dl>
        <h3 class="mt16">上节课反馈</h3>
        <template v-if="lastRecord">
          <div style="font-size: 14px">
            体感 {{ lastRecord.memberFeel }}/10 · {{ lastRecord.feelNote }}<br />
            <span v-if="lastRecord.painChanges.length">疼痛：{{ lastRecord.painChanges.map(p => `${p.part} ${p.before}→${p.after}`).join('，') }}<br /></span>
            教练备注：{{ lastRecord.coachNote }}
          </div>
        </template>
        <div v-else class="empty">第一节课，无历史反馈</div>
      </div>

      <!-- 已完成：只读展示 -->
      <div v-if="existingRecord" class="card">
        <h3>课后记录（已提交）</h3>
        <dl class="kv">
          <dt>完成动作</dt><dd>{{ existingRecord.completedMoves.join('、') }}</dd>
          <dt>会员体感</dt><dd>{{ existingRecord.memberFeel }}/10 {{ existingRecord.feelNote }}</dd>
          <dt>疼痛变化</dt><dd>{{ existingRecord.painChanges.map(p => `${p.part} ${p.before}→${p.after}`).join('，') || '无' }}</dd>
          <dt>家庭练习</dt><dd>{{ existingRecord.homePractice }}</dd>
          <dt>教练备注</dt><dd>{{ existingRecord.coachNote }}</dd>
        </dl>
      </div>

      <!-- 待上课：填写记录 -->
      <div v-else-if="session.status === '待上课'" class="card">
        <h3>课后记录</h3>
        <div class="form-row">
          <label>完成动作（用顿号或换行分隔）</label>
          <textarea v-model="form.movesText" placeholder="如：泡沫轴髂胫束松解、蚌式开合 3×15、臀桥 3×12"></textarea>
        </div>
        <div class="grid cols-2">
          <div class="form-row">
            <label>会员体感（1 很轻松 - 10 非常吃力）：{{ form.memberFeel }}</label>
            <input v-model.number="form.memberFeel" type="range" min="1" max="10" />
          </div>
          <div class="form-row"><label>体感说明</label><input v-model="form.feelNote" placeholder="如：松解时酸胀明显" /></div>
        </div>
        <div class="form-row">
          <label>疼痛变化（课前 → 课后）</label>
          <div v-for="(p, i) in form.painChanges" :key="i" class="row mb8">
            <span class="tag clay">{{ p.part }}：{{ p.before }} → {{ p.after }} 分</span>
            <span v-if="p.after > p.before" class="tag danger">加重，请在下节课降强度</span>
            <button class="small ghost" @click="form.painChanges.splice(i, 1)">删除</button>
          </div>
          <div class="row">
            <select v-model="newPain.part" style="width: 100px"><option v-for="o in partOptions" :key="o">{{ o }}</option></select>
            <input v-model.number="newPain.before" type="number" min="0" max="10" style="width: 80px" title="课前" />
            <span>→</span>
            <input v-model.number="newPain.after" type="number" min="0" max="10" style="width: 80px" title="课后" />
            <button class="small" type="button" @click="addPain">添加</button>
          </div>
        </div>
        <div class="form-row"><label>家庭练习布置</label><input v-model="form.homePractice" placeholder="如：每天蚌式开合 2 组" /></div>
        <div class="form-row"><label>教练备注（下节课依据）</label><textarea v-model="form.coachNote" placeholder="如：臀中肌力量偏弱，先不上负重"></textarea></div>
        <div class="form-row"><label>下节课重点（可选，自动同步到排课）</label><input v-model="form.nextFocus" /></div>
        <button @click="submit">
          {{ session.isExperience ? '完成上课并填写体验测评 →' : '提交课后记录' }}
        </button>
      </div>

      <div v-else class="card">
        <h3>课程状态：{{ session.status }}</h3>
        <p class="muted">该课程未正常进行，无需填写课后记录。</p>
      </div>
    </div>
  </div>
  <div v-else class="page"><div class="empty">课程不存在</div></div>
</template>
