<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useDataStore } from '../../stores/data'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const data = useDataStore()

const booking = computed(() => data.bookings.find(b => b.id === (route.params.bookingId as string)))
const member = computed(() => booking.value ? data.accountById(booking.value.memberId) : undefined)
const existing = computed(() => booking.value ? data.assessments.find(a => a.bookingId === booking.value!.id) : undefined)

const form = reactive({
  posture: '',
  movementLimits: '',
  courseAdvice: '',
  riskNotice: '',
  recommendedPackage: '私教 16 节 · 综合提升（有效期 90 天）',
})

function submit() {
  const b = booking.value
  if (!b) return
  for (const k of ['posture', 'movementLimits', 'courseAdvice', 'riskNotice'] as const) {
    if (!form[k].trim()) { alert('体态评估、动作限制、课程建议、风险提示均为必填'); return }
  }
  if (!confirm('提交后测评将签名锁定，顾问端只读不可修改。确认提交？')) return
  data.submitAssessment(b.id, auth.current!.id, { ...form })
  router.push('/coach')
}
</script>

<template>
  <div class="page" v-if="booking">
    <h2 class="page-title">体验课测评 · {{ member?.name }}</h2>
    <p class="page-sub">测评提交后即签名锁定：顾问可据此跟进，但专业内容不会被简化成销售话术。</p>

    <div class="grid cols-2">
      <div class="card">
        <h3>会员预约信息</h3>
        <dl class="kv">
          <dt>运动基础</dt><dd>{{ booking.fitnessBase }}</dd>
          <dt>身体疼痛</dt><dd>{{ booking.pains.map(p => `${p.part} ${p.level}分（${p.note}）`).join('；') || '无' }}</dd>
          <dt>柔韧性</dt><dd>{{ booking.flexibility }}</dd>
          <dt>训练目标</dt><dd>{{ booking.goals.join('、') }}<span v-if="booking.goalNote">（{{ booking.goalNote }}）</span></dd>
          <dt>预算</dt><dd>{{ booking.budget }}</dd>
        </dl>
      </div>

      <div v-if="existing" class="card">
        <h3>测评已提交（锁定）</h3>
        <dl class="kv">
          <dt>体态评估</dt><dd>{{ existing.posture }}</dd>
          <dt>动作限制</dt><dd>{{ existing.movementLimits }}</dd>
          <dt>课程建议</dt><dd>{{ existing.courseAdvice }}</dd>
          <dt>风险提示</dt><dd style="color: var(--danger)">{{ existing.riskNotice }}</dd>
          <dt>推荐套餐</dt><dd>{{ existing.recommendedPackage }}</dd>
          <dt>签署时间</dt><dd>{{ existing.coachSignedAt }}</dd>
        </dl>
      </div>

      <div v-else class="card">
        <h3>填写测评（教练专业档案）</h3>
        <div class="form-row">
          <label>体态评估 *</label>
          <textarea v-model="form.posture" placeholder="如：骨盆轻度前倾，胸椎活动度不足，前屈手尖离地 18cm"></textarea>
        </div>
        <div class="form-row">
          <label>动作限制 *</label>
          <textarea v-model="form.movementLimits" placeholder="如：避免深度后弯；犁式、轮式暂不建议"></textarea>
        </div>
        <div class="form-row">
          <label>课程建议 *</label>
          <textarea v-model="form.courseAdvice" placeholder="如：以阴瑜伽为主，每周 1-2 节，8 周后复测"></textarea>
        </div>
        <div class="form-row">
          <label>风险提示 *（医疗边界声明）</label>
          <textarea v-model="form.riskNotice" placeholder="如：若出现下肢放射痛或麻木，请立即停止练习并就医；课程不能替代医疗诊断"></textarea>
        </div>
        <div class="form-row">
          <label>推荐套餐</label>
          <input v-model="form.recommendedPackage" />
        </div>
        <button @click="submit">签名并提交测评</button>
      </div>
    </div>
  </div>
  <div v-else class="page"><div class="empty">预约不存在</div></div>
</template>
