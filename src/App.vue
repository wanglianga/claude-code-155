<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useYogaStore } from '@/stores/yoga'

const store = useYogaStore()
const route = useRoute()
const router = useRouter()

const roleLabel = { member: '会员端', coach: '教练端', consultant: '顾问端' } as const

const navs: Record<string, { to: string; label: string; icon: string }[]> = {
  member: [
    { to: '/member', label: '我的首页', icon: '🏠' },
    { to: '/member/trial', label: '体验课预约', icon: '🌿' },
    { to: '/member/schedule', label: '我的课表', icon: '📅' },
    { to: '/member/records', label: '训练记录', icon: '📖' },
  ],
  coach: [{ to: '/coach', label: '本周教学', icon: '🧘' }],
  consultant: [
    { to: '/consultant', label: '顾问工作台', icon: '📊' },
    { to: '/consultant/incidents', label: '协同中心', icon: '🤝' },
  ],
}

const currentNavs = computed(() => navs[store.currentUser.role] ?? [])
const openCount = computed(() => store.openIncidents.length)

watch(() => store.currentUser.role, (role) => {
  if (route.meta.role !== role) router.push(role === 'member' ? '/member' : `/${role}`)
}, { immediate: true })

function switchTo(id: string) {
  store.switchUser(id)
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <span class="brand-mark">🧘‍♀️</span>
          <div>
            <div class="brand-name">栖兰瑜伽</div>
            <div class="brand-sub">私教体验 · 测评 · 排课 · 续费协同工作台</div>
          </div>
        </div>
        <nav class="main-nav">
          <RouterLink v-for="n in currentNavs" :key="n.to" :to="n.to" class="nav-link">
            <span>{{ n.icon }}</span>{{ n.label }}
            <i v-if="n.to === '/consultant/incidents' && openCount" class="nav-badge">{{ openCount }}</i>
          </RouterLink>
        </nav>
        <div class="identity">
          <select :value="store.currentUserId" class="input switcher" @change="switchTo(($event.target as HTMLSelectElement).value)">
            <optgroup label="会员">
              <option v-for="u in store.members" :key="u.id" :value="u.id">{{ u.name }}（{{ u.gender }}）</option>
            </optgroup>
            <optgroup label="教练">
              <option v-for="u in store.coaches" :key="u.id" :value="u.id">{{ u.name }} · {{ u.title }}</option>
            </optgroup>
            <optgroup label="顾问">
              <option v-for="u in store.consultants" :key="u.id" :value="u.id">{{ u.name }} · 顾问</option>
            </optgroup>
          </select>
          <div class="id-chip">
            <span class="id-name">{{ store.currentUser.name }}</span>
            <span class="id-role">{{ roleLabel[store.currentUser.role] }}</span>
          </div>
        </div>
      </div>
    </header>
    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.app-shell { min-height: 100%; display: flex; flex-direction: column; }
.app-header {
  background: var(--c-brand-deep);
  color: #eef3ec;
  position: sticky; top: 0; z-index: 50;
}
.header-inner {
  max-width: 1280px; margin: 0 auto; padding: 10px 28px;
  display: flex; align-items: center; gap: 24px;
}
.brand { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.brand-mark { font-size: 26px; }
.brand-name { font-weight: 700; font-size: 16px; letter-spacing: 1px; }
.brand-sub { font-size: 11px; opacity: .72; }
.main-nav { display: flex; gap: 2px; margin-left: 8px; flex: 1; }
.nav-link {
  display: inline-flex; align-items: center; gap: 6px;
  color: rgba(238, 243, 236, .82);
  padding: 8px 14px; border-radius: 999px; font-size: 13.5px;
  position: relative;
}
.nav-link:hover { background: rgba(255,255,255,.08); color: #fff; }
.nav-link.router-link-active { background: rgba(255,255,255,.16); color: #fff; font-weight: 600; }
.nav-badge {
  font-style: normal; background: var(--c-clay); color: #fff;
  font-size: 11px; border-radius: 999px; padding: 0 6px; min-width: 18px; text-align: center;
}
.identity { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.switcher {
  width: auto; padding: 6px 10px; font-size: 12.5px;
  background: rgba(255,255,255,.1); color: #eef3ec; border-color: rgba(255,255,255,.25);
}
.switcher option { color: var(--c-ink); }
.id-chip { text-align: right; line-height: 1.25; }
.id-name { display: block; font-size: 13px; font-weight: 600; }
.id-role { font-size: 11px; opacity: .7; }
.app-main { flex: 1; }
.fade-enter-active, .fade-leave-active { transition: opacity .12s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 1080px) {
  .brand-sub, .id-chip { display: none; }
}
</style>
