<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useDataStore } from '../../stores/data'
import type { CoachProfile, ExperienceBooking } from '../../types'

const auth = useAuthStore()
const data = useDataStore()
const myName = auth.current!.name

const pending = computed(() => data.bookings.filter(b => b.status === '待安排'))
const arranged = computed(() => data.bookings.filter(b => b.status === '已安排'))

const goalToSpecialty: Record<string, string[]> = {
  体态矫正: ['体态矫正'],
  康复舒缓: ['理疗瑜伽', '膝关节养护', '脊柱保养'],
  柔韧提升: ['阴瑜伽'],
  减压助眠: ['减压助眠', '阴瑜伽'],
  减脂塑形: ['减脂塑形', '力量流'],
  力量提升: ['力量流', '阿斯汤加'],
}

const forms = reactive<Record<string, { coachId: string; date: string; time: string }>>({})

function formOf(id: string) {
  if (!forms[id]) forms[id] = { coachId: '', date: '', time: '19:00-20:00' }
  return forms[id]
}

/** 介意异性教练 → 仅推荐女教练（门店会员以女性为主，按同性匹配） */
function coachOptions(b: ExperienceBooking): CoachProfile[] {
  let list = [...data.coaches]
  if (b.mindOppositeGenderCoach) list = list.filter(c => c.gender === '女')
  const wanted = b.goals.flatMap(g => goalToSpecialty[g] ?? [])
  return list.sort((a, z) => {
    const am = a.specialties.some(s => wanted.includes(s)) ? 0 : 1
    const zm = z.specialties.some(s => wanted.includes(s)) ? 0 : 1
    return am - zm
  })
}

function isRecommended(c: CoachProfile, b: ExperienceBooking) {
  const wanted = b.goals.flatMap(g => goalToSpecialty[g] ?? [])
  return c.specialties.some(s => wanted.includes(s))
}

function arrange(b: ExperienceBooking) {
  const f = formOf(b.id)
  if (!f.coachId || !f.date) { alert('请选择教练与日期'); return }
  data.arrangeExperience(b.id, f.coachId, f.date, f.time, myName)
}
</script>

<template>
  <div class="page">
    <h2 class="page-title">安排体验课</h2>
    <p class="page-sub">按会员的性别偏好、疼痛部位与训练目标匹配教练；预约信息原样呈现，不做销售化改写。</p>

    <div v-if="!pending.length" class="card"><div class="empty">暂无待安排的体验课预约</div></div>

    <div v-for="b in pending" :key="b.id" class="card">
      <div class="between">
        <h3 style="margin: 0">{{ data.nameOf(b.memberId) }} <span class="tag amber">待安排</span></h3>
        <span class="muted">提交于 {{ b.createdAt }}</span>
      </div>
      <dl class="kv mt8">
        <dt>运动基础</dt><dd>{{ b.fitnessBase }} · 柔韧性 {{ b.flexibility }}</dd>
        <dt>身体疼痛</dt><dd>{{ b.pains.map(p => `${p.part} ${p.level}分（${p.note}）`).join('；') || '无' }}</dd>
        <dt>训练目标</dt><dd>{{ b.goals.join('、') }}<span v-if="b.goalNote">（{{ b.goalNote }}）</span></dd>
        <dt>可上课时间</dt><dd>{{ b.availableSlots.join('、') }}</dd>
        <dt>预算</dt><dd>{{ b.budget }}</dd>
        <dt>教练性别</dt>
        <dd>
          <span v-if="b.mindOppositeGenderCoach" class="tag clay">介意异性教练 → 仅匹配女教练</span>
          <span v-else>不介意</span>
        </dd>
      </dl>
      <div class="row mt8">
        <select v-model="formOf(b.id).coachId" style="width: 280px">
          <option value="" disabled>选择教练</option>
          <option v-for="c in coachOptions(b)" :key="c.id" :value="c.id">
            {{ c.name }}（{{ c.gender }} · {{ c.specialties.join('/') }}）{{ isRecommended(c, b) ? '★ 推荐' : '' }}
          </option>
        </select>
        <input v-model="formOf(b.id).date" type="date" style="width: 170px" />
        <select v-model="formOf(b.id).time" style="width: 150px">
          <option>10:00-11:00</option><option>14:00-15:00</option>
          <option>19:00-20:00</option><option>20:00-21:00</option>
        </select>
        <button @click="arrange(b)">确认安排</button>
      </div>
    </div>

    <div v-if="arranged.length" class="card">
      <h3>已安排（等待上课与测评）</h3>
      <table class="plain">
        <thead><tr><th>会员</th><th>目标</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="b in arranged" :key="b.id">
            <td>{{ data.nameOf(b.memberId) }}</td>
            <td>{{ b.goals.join('、') }}</td>
            <td><span class="tag">{{ b.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
