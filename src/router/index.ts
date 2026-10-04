import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/member' },
  { path: '/member', component: () => import('@/pages/member/MemberHome.vue'), meta: { role: 'member' } },
  { path: '/member/trial', component: () => import('@/pages/member/MemberTrial.vue'), meta: { role: 'member' } },
  { path: '/member/schedule', component: () => import('@/pages/member/MemberSchedule.vue'), meta: { role: 'member' } },
  { path: '/member/records', component: () => import('@/pages/member/MemberRecords.vue'), meta: { role: 'member' } },
  { path: '/coach', component: () => import('@/pages/coach/CoachWeek.vue'), meta: { role: 'coach' } },
  { path: '/consultant', component: () => import('@/pages/consultant/ConsultantDesk.vue'), meta: { role: 'consultant' } },
  { path: '/consultant/incidents', component: () => import('@/pages/consultant/IncidentCenter.vue'), meta: { role: 'consultant' } },
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})
