<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useDataStore } from '../../stores/data'
import type { FitnessBase, Flexibility, PainInfo } from '../../types'

const auth = useAuthStore()
const data = useDataStore()
const router = useRouter()
const mid = auth.current!.id

const existing = computed(() => data.bookingOf(mid))
const locked = computed(() => existing.value && existing.value.status !== '已取消')

const baseOptions: FitnessBase[] = ['零基础', '偶尔运动', '规律运动', '长期训练']
const flexOptions: Flexibility[] = ['很僵硬', '偏僵硬', '一般', '较好']
const goalOptions = ['减脂塑形', '体态矫正', '柔韧提升', '康复舒缓', '减压助眠', '力量提升']
const partOptions = ['肩颈', '腰椎', '左膝', '右膝', '手腕', '髋部', '踝部', '其他']
const budgetOptions = ['300 元/节以内', '300-500 元/节', '400-600 元/节', '500-700 元/节', '700 元/节以上']
const slotOptions: string[] = []
const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const times = ['10:00-11:00', '14:00-15:00', '19:00-20:00', '20:00-21:00']
weekdays.forEach(w => times.forEach(t => slotOptions.push(`${w} ${t}`)))

const form = reactive({
  fitnessBase: '偶尔运动' as FitnessBase,
  pains: [] as PainInfo[],
  flexibility: '一般' as Flexibility,
  goals: [] as string[],
  goalNote: '',
  availableSlots: [] as string[],
  budget: '300-500 元/节',
  mindOppositeGenderCoach: false,
  note: '',
})

const newPain = reactive({ part: '肩颈', level: 3, note: '' })
const submitted = ref(false)

function addPain() {
  form.pains.push({ ...newPain })
  newPain.note = ''
}

function toggle(arr: string[], v: string) {
  const i = arr.indexOf(v)
  if (i >= 0) arr.splice(i, 1)
  else arr.push(v)
}

function submit() {
  if (!form.goals.length) { alert('请至少选择一个训练目标'); return }
  if (!form.availableSlots.length) { alert('请选择可上课时间'); return }
  data.bookExperience(mid, { ...form, pains: [...form.pains], goals: [...form.goals], availableSlots: [...form.availableSlots] })
  submitted.value = true
  setTimeout(() => router.push('/member'), 600)
}
</script>

<template>
  <div class="page">
    <h2 class="page-title">预约体验课</h2>
    <p class="page-sub">这些信息会原样交给顾问与教练，用于匹配教练和制定测评方案，不会被简化或改写。</p>

    <div v-if="locked" class="card">
      <h3>你已提交过预约（状态：{{ existing!.status }}）</h3>
      <dl class="kv">
        <dt>运动基础</dt><dd>{{ existing!.fitnessBase }}</dd>
        <dt>身体疼痛</dt><dd>{{ existing!.pains.map(p => `${p.part} ${p.level}分（${p.note}）`).join('；') || '无' }}</dd>
        <dt>柔韧性</dt><dd>{{ existing!.flexibility }}</dd>
        <dt>训练目标</dt><dd>{{ existing!.goals.join('、') }}<span v-if="existing!.goalNote">（{{ existing!.goalNote }}）</span></dd>
        <dt>可上课时间</dt><dd>{{ existing!.availableSlots.join('、') }}</dd>
        <dt>预算</dt><dd>{{ existing!.budget }}</dd>
        <dt>教练性别</dt><dd>{{ existing!.mindOppositeGenderCoach ? '介意异性教练' : '不介意' }}</dd>
      </dl>
      <p class="muted mt8">如需修改，请联系顾问或在「请假与申请」中留言。</p>
    </div>

    <div v-else class="card">
      <div class="grid cols-2">
        <div class="form-row">
          <label>运动基础</label>
          <div class="checks">
            <label v-for="o in baseOptions" :key="o" :class="{ on: form.fitnessBase === o }">
              <input type="radio" :value="o" v-model="form.fitnessBase" />{{ o }}
            </label>
          </div>
        </div>
        <div class="form-row">
          <label>柔韧性</label>
          <div class="checks">
            <label v-for="o in flexOptions" :key="o" :class="{ on: form.flexibility === o }">
              <input type="radio" :value="o" v-model="form.flexibility" />{{ o }}
            </label>
          </div>
        </div>
      </div>

      <div class="form-row">
        <label>身体疼痛（可添加多处）</label>
        <div v-for="(p, i) in form.pains" :key="i" class="row mb8">
          <span class="tag clay">{{ p.part }} · {{ p.level }}/10 分</span>
          <span class="muted">{{ p.note }}</span>
          <button class="small ghost" @click="form.pains.splice(i, 1)">删除</button>
        </div>
        <div class="row">
          <select v-model="newPain.part" style="width: 110px">
            <option v-for="o in partOptions" :key="o">{{ o }}</option>
          </select>
          <input v-model.number="newPain.level" type="number" min="0" max="10" style="width: 90px" title="疼痛等级 0-10" />
          <input v-model="newPain.note" placeholder="疼痛描述，如：跑步后加重" style="flex: 1" />
          <button class="small" type="button" @click="addPain">添加</button>
        </div>
      </div>

      <div class="form-row">
        <label>训练目标（可多选）</label>
        <div class="checks">
          <label v-for="o in goalOptions" :key="o" :class="{ on: form.goals.includes(o) }">
            <input type="checkbox" :checked="form.goals.includes(o)" @change="toggle(form.goals, o)" />{{ o }}
          </label>
        </div>
        <input v-model="form.goalNote" class="mt8" placeholder="补充说明你的目标（可选）" />
      </div>

      <div class="form-row">
        <label>可上课时间（可多选）</label>
        <div class="checks">
          <label v-for="o in slotOptions" :key="o" :class="{ on: form.availableSlots.includes(o) }">
            <input type="checkbox" :checked="form.availableSlots.includes(o)" @change="toggle(form.availableSlots, o)" />{{ o }}
          </label>
        </div>
      </div>

      <div class="grid cols-2">
        <div class="form-row">
          <label>预算</label>
          <select v-model="form.budget">
            <option v-for="o in budgetOptions" :key="o">{{ o }}</option>
          </select>
        </div>
        <div class="form-row">
          <label>是否介意异性教练</label>
          <div class="checks">
            <label :class="{ on: !form.mindOppositeGenderCoach }">
              <input type="radio" :checked="!form.mindOppositeGenderCoach" @change="form.mindOppositeGenderCoach = false" />不介意
            </label>
            <label :class="{ on: form.mindOppositeGenderCoach }">
              <input type="radio" :checked="form.mindOppositeGenderCoach" @change="form.mindOppositeGenderCoach = true" />介意，请安排同性教练
            </label>
          </div>
        </div>
      </div>

      <div class="form-row">
        <label>其他补充（可选）</label>
        <textarea v-model="form.note" placeholder="其他想告诉顾问或教练的事"></textarea>
      </div>

      <button @click="submit">提交预约</button>
      <span v-if="submitted" class="tag mt8" style="margin-left: 10px">已提交，顾问将尽快为你安排</span>
    </div>
  </div>
</template>
