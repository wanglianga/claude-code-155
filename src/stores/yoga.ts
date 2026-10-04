import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type {
  User, Role, TrialBooking, CoachAssessment, YogaPackage, Lesson, LessonRecord,
  LeaveRule, Renewal, Incident, IncidentTimelineEntry, PackageCatalogItem,
  ExerciseBase, Flexibility,
} from '@/types'
import {
  users as seedUsers, trials as seedTrials, assessments as seedAssessments,
  packages as seedPackages, lessons as seedLessons, leaveRules as seedRules,
  renewals as seedRenewals, incidents as seedIncidents, catalog as seedCatalog,
} from '@/data/seed'
import {
  parseISO, toISO, weekDateISO, addDays, toISODate, daysUntil, weekdayCN,
} from '@/utils/date'

let seq = 1000
const nid = (p: string) => `${p}${++seq}`

function entry(actorId: string, actorRole: Role | 'system', content: string, kind: 'note' | 'action' = 'note'): IncidentTimelineEntry {
  return { id: nid('te'), at: toISO(new Date()), actorId, actorRole, kind, content }
}

const CN_DOW: Record<string, number> = { 一: 0, 二: 1, 三: 2, 四: 3, 五: 4, 六: 5, 日: 6, 天: 6 }

/** 解析「周二 19:00」→ { dow:1, h:19, m:0 } */
export function parseSlot(slot: string): { dow: number; h: number; m: number } | null {
  const d = slot.match(/周([一二三四五六日天])/)
  const t = slot.match(/(\d{1,2}):(\d{2})/)
  if (!d) return null
  return { dow: CN_DOW[d[1]], h: t ? +t[1] : 10, m: t ? +t[2] : 0 }
}

export interface NewTrialPayload {
  exerciseBase: ExerciseBase
  painAreas: string[]
  painNote: string
  flexibility: Flexibility
  goals: string[]
  goalNote: string
  availableSlots: string[]
  budget: number
  mindOppositeGenderCoach: boolean
  preferredCoachGender: '不限' | '女' | '男'
}

export const useYogaStore = defineStore('yoga', () => {
  // ---------- state ----------
  const users = ref<User[]>(structuredClone(seedUsers))
  const trials = ref<TrialBooking[]>(structuredClone(seedTrials))
  const assessments = ref<CoachAssessment[]>(structuredClone(seedAssessments))
  const packages = ref<YogaPackage[]>(structuredClone(seedPackages))
  const lessons = ref<Lesson[]>(structuredClone(seedLessons))
  const leaveRules = ref<LeaveRule[]>(structuredClone(seedRules))
  const renewals = ref<Renewal[]>(structuredClone(seedRenewals))
  const incidents = ref<Incident[]>(structuredClone(seedIncidents))
  const catalog = ref<PackageCatalogItem[]>(structuredClone(seedCatalog))
  const currentUserId = ref<string>('m1')

  // ---------- 用户 ----------
  const currentUser = computed(() => users.value.find(u => u.id === currentUserId.value)!)
  const coaches = computed(() => users.value.filter(u => u.role === 'coach'))
  const members = computed(() => users.value.filter(u => u.role === 'member'))
  const consultants = computed(() => users.value.filter(u => u.role === 'consultant'))
  const userById = (id?: string) => users.value.find(u => u.id === id)
  const nameOf = (id?: string) => userById(id)?.name ?? '—'

  function switchUser(id: string) {
    currentUserId.value = id
  }

  // ---------- 查询辅助 ----------
  const assessmentOfMember = (memberId: string) =>
    assessments.value.find(a => a.memberId === memberId)
  const assessmentOfTrial = (trialId: string) =>
    assessments.value.find(a => a.trialId === trialId)
  const packageById = (id?: string) => packages.value.find(p => p.id === id)
  const trialById = (id?: string) => trials.value.find(t => t.id === id)
  const lessonsOfPackage = (pkgId: string) =>
    lessons.value.filter(l => l.packageId === pkgId)
  const completedLessons = (pkgId: string) =>
    lessonsOfPackage(pkgId).filter(l => l.status === 'completed')

  function packageProgress(pkg: YogaPackage) {
    const done = completedLessons(pkg.id).length
    const pct = pkg.totalSessions ? Math.round((done / pkg.totalSessions) * 100) : 0
    return { done, total: pkg.totalSessions, remaining: pkg.remainingSessions, pct }
  }

  /** 某会员最近一节训练记录 */
  function lastRecordOf(memberId: string): { lesson: Lesson; record: LessonRecord } | undefined {
    const done = lessons.value
      .filter(l => l.memberId === memberId && l.status === 'completed' && l.record)
      .sort((a, b) => b.startAt.localeCompare(a.startAt))
    return done[0] ? { lesson: done[0], record: done[0].record! } : undefined
  }

  /** 某课包下一节课 */
  function nextLessonOf(memberId: string): Lesson | undefined {
    const now = toISO(new Date())
    return lessons.value
      .filter(l => l.memberId === memberId && l.status === 'scheduled' && l.startAt >= now)
      .sort((a, b) => a.startAt.localeCompare(b.startAt))[0]
  }

  function incidentsOf(memberId: string) {
    return incidents.value.filter(i => i.memberId === memberId)
  }

  const openIncidents = computed(() =>
    incidents.value.filter(i => i.status !== 'resolved'))

  function incidentMeta(t: Incident['type']) {
    return INCIDENT_META[t]
  }

  // ---------- 会员：预约体验课 ----------
  function createTrial(memberId: string, consultantId: string, payload: NewTrialPayload): string {
    const t: TrialBooking = {
      id: nid('t'), memberId, consultantId, createdAt: toISO(new Date()),
      status: '待安排', ...payload,
    }
    trials.value.unshift(t)
    return t.id
  }

  // ---------- 顾问：安排体验课（尊重性别偏好） ----------
  function scheduleTrial(trialId: string, coachId: string, at: string) {
    const t = trialById(trialId)
    if (!t) return
    const coach = userById(coachId)
    if (t.preferredCoachGender !== '不限' && coach?.gender !== t.preferredCoachGender) {
      throw new Error(`该会员预约时明确要求${t.preferredCoachGender}教练，安排被规则拦截，请重新选择。`)
    }
    t.coachId = coachId
    t.scheduledAt = at
    t.status = '已安排'
  }

  // ---------- 教练：填写体态评估（训练域） ----------
  function saveAssessment(input: Omit<CoachAssessment, 'id' | 'filledAt'> & { id?: string }) {
    const existing = input.id ? assessments.value.find(a => a.id === input.id) : undefined
    if (existing) {
      Object.assign(existing, input)
      return existing.id
    }
    const a: CoachAssessment = { ...input, id: nid('as'), filledAt: toISO(new Date()) }
    assessments.value.push(a)
    const t = trialById(a.trialId)
    if (t && t.status === '已安排') t.status = '已完成'
    return a.id
  }

  // ---------- 按排课计划生成课节 ----------
  function generateLessons(pkg: YogaPackage) {
    const slots = pkg.plan.preferredTimes.map(parseSlot).filter(Boolean) as { dow: number; h: number; m: number }[]
    if (!slots.length) return
    const created: Lesson[] = []
    let need = pkg.totalSessions
    // 从购买当周开始排，直到课节排满或到有效期
    for (let w = 0; need > 0 && w <= 60; w++) {
      for (const s of slots) {
        if (need <= 0) break
        const start = weekDateISO(w, s.dow, s.h, s.m)
        if (start.slice(0, 10) > pkg.endDate) { need = 0; break }
        if (start <= toISO(new Date())) continue // 跳过已过去的时段，不补排到过去
        created.push({
          id: nid('l'), packageId: pkg.id, memberId: pkg.memberId, coachId: pkg.coachId,
          startAt: start, endAt: weekDateISO(w, s.dow, s.h + 1, s.m),
          status: 'scheduled', focus: '待教练根据阶段目标填写',
        })
        need--
      }
    }
    lessons.value.push(...created)
  }

  // ---------- 顾问：确认购买，生成课包 + 排课 + 规则 + 续费提醒 ----------
  function convertTrial(trialId: string, catalogId: string, plan: YogaPackage['plan']): YogaPackage {
    const t = trialById(trialId)!
    const item = catalog.value.find(c => c.id === catalogId)!
    const start = new Date()
    const pkg: YogaPackage = {
      id: nid('pkg'), memberId: t.memberId, coachId: t.coachId!, consultantId: t.consultantId,
      sourceTrialId: t.id, name: item.name, totalSessions: item.sessions,
      remainingSessions: item.sessions, price: item.price,
      startDate: toISODate(start), endDate: toISODate(addDays(start, item.validMonths * 30)),
      status: 'active', createdAt: toISO(start), plan,
    }
    packages.value.unshift(pkg)
    generateLessons(pkg)
    t.status = '已转化'
    t.convertedPackageId = pkg.id
    return pkg
  }

  /** 直接购买（新会员无体验课的扩展入口，当前演示主要走转化） */
  function markTrialLost(trialId: string, reason: string) {
    const t = trialById(trialId)!
    t.status = '已流失'
    t.lostReason = reason
  }

  // ---------- 教练：每节课后训练记录 ----------
  function saveLessonRecord(lessonId: string, record: LessonRecord, flagProgressBehind = false) {
    const l = lessons.value.find(x => x.id === lessonId)!
    l.status = 'completed'
    l.record = { ...record, filledAt: toISO(new Date()) }
    const pkg = packageById(l.packageId)
    if (pkg) pkg.remainingSessions = Math.max(0, pkg.remainingSessions - 1)

    // 1) 疼痛较课前升高且达到 5 分 → 自动异常工单 + 调整下节课
    if (record.painAfter >= 5 && record.painAfter > record.painBefore) {
      const next = nextLessonOf(l.memberId)
      const inc = createIncident({
        type: 'knee_discomfort',
        memberId: l.memberId, coachId: l.coachId, consultantId: pkg?.consultantId ?? '',
        packageId: l.packageId, lessonId: l.id,
        linkedLessonIds: next ? [l.id, next.id] : [l.id],
        title: `${nameOf(l.memberId)}课后疼痛升高（${record.painBefore} → ${record.painAfter}）`,
        detail: `教练课后记录显示疼痛加重：${record.painNote || '未填写疼痛说明'}。依据体态评估风险提示处理。`,
        firstAction: '系统已通知顾问，并将下节课标记为「按风险调整」：暂停引发疼痛的动作，回到无痛动作库。',
      })
      if (next) {
        next.focus = `【已按风险调整】${(next.focus ?? '').replace(/^【.*?】/, '')} 暂停引发疼痛动作，复评疼痛反应`
        inc.detail += ` 已联动调整下节课（${weekdayCN(next.startAt)}）重点。`
      }
    }

    // 2) 教练勾选进度落后 → 工单
    if (flagProgressBehind) {
      createIncident({
        type: 'progress_behind',
        memberId: l.memberId, coachId: l.coachId, consultantId: pkg?.consultantId ?? '',
        packageId: l.packageId, lessonId: l.id, linkedLessonIds: [l.id],
        title: `${nameOf(l.memberId)}课程进度落后`,
        detail: `教练在第 ${completedLessons(l.packageId).length} 节课后标注进度落后：${record.coachNote || '见训练记录'}`,
        firstAction: '已同步顾问，需共同评估补课、改频次或调整阶段目标。',
      })
    }

    // 3) 自动把下节课重点设为「上节课反馈」
    const next = nextLessonOf(l.memberId)
    if (next && !(next.focus ?? '').startsWith('【')) {
      next.focus = `承接上节：${record.coachNote || '复习上次动作'}｜疼痛 ${record.painBefore}→${record.painAfter}`
    }
  }

  // ---------- 会员：请假 / 临时改时间 ----------
  function memberRequestLeave(lessonId: string, reason: string) {
    const l = lessons.value.find(x => x.id === lessonId)!
    const hours = (parseISO(l.startAt).getTime() - Date.now()) / 3600000
    l.status = 'member_leave'
    l.reason = reason
    createIncident({
      type: 'reschedule_request',
      memberId: l.memberId, coachId: l.coachId,
      consultantId: packageById(l.packageId)?.consultantId ?? '',
      packageId: l.packageId, lessonId: l.id, linkedLessonIds: [l.id],
      title: `${nameOf(l.memberId)}请假：${weekdayCN(l.startAt)} ${l.startAt.slice(11, 16)}`,
      detail: `会员请假，原因：${reason}。距开课 ${hours.toFixed(1)} 小时。`,
      firstAction: hours >= 24
        ? '符合 24 小时前请假规则，不扣课时，待顾问/教练补排。'
        : '不足 24 小时，按规则记为「临时改期」（每月限 2 次），48 小时内可补排一次。',
    })
  }

  function memberReschedule(lessonId: string, newStart: string) {
    const l = lessons.value.find(x => x.id === lessonId)!
    const hours = (parseISO(l.startAt).getTime() - Date.now()) / 3600000
    const endD = addDays(parseISO(newStart), 0)
    endD.setHours(endD.getHours() + 1)
    const makeup: Lesson = {
      ...l, id: nid('l'), status: 'scheduled', startAt: newStart,
      endAt: toISO(endD), reason: undefined,
      focus: `补：${(l.focus ?? '').replace(/^【.*?】/, '')}`,
    }
    lessons.value.push(makeup)
    l.status = 'rescheduled'
    l.rescheduledTo = makeup.id
    createIncident({
      type: 'reschedule_request',
      memberId: l.memberId, coachId: l.coachId,
      consultantId: packageById(l.packageId)?.consultantId ?? '',
      packageId: l.packageId, lessonId: l.id, linkedLessonIds: [l.id, makeup.id],
      title: `${nameOf(l.memberId)}临时换时间 → ${weekdayCN(newStart)} ${newStart.slice(11, 16)}`,
      detail: `原课程 ${l.startAt.replace('T', ' ')}，改至 ${newStart.replace('T', ' ')}。距开课 ${hours.toFixed(1)} 小时。`,
      firstAction: hours >= 24
        ? '提前 24 小时以上改期，不占用临时改期次数，已生成补排课节。'
        : '不足 24 小时，记为本月临时改期 1 次（限 2 次/月），已生成补排课节。',
    })
  }

  // ---------- 教练：请假（影响课节批量挂起） ----------
  function coachRequestLeave(coachId: string, fromISO: string, toISO: string, reason: string) {
    const affected = lessons.value.filter(l =>
      l.coachId === coachId && l.status === 'scheduled' &&
      l.startAt >= fromISO && l.startAt <= toISO)
    affected.forEach(l => { l.status = 'coach_leave'; l.reason = reason })
    const byMember = new Map<string, string[]>()
    affected.forEach(l => {
      byMember.set(l.memberId, [...(byMember.get(l.memberId) ?? []), l.id])
    })
    byMember.forEach((lessonIds, memberId) => {
      const pkg = packageById(lessons.value.find(x => x.id === lessonIds[0])!.packageId)
      createIncident({
        type: 'coach_leave', memberId, coachId,
        consultantId: pkg?.consultantId ?? '', packageId: pkg?.id,
        lessonId: lessonIds[0], linkedLessonIds: lessonIds,
        title: `教练${nameOf(coachId)}请假，${nameOf(memberId)}课程待处理`,
        detail: `教练请假：${reason}（${fromISO.replace('T', ' ')} 起）。受影响课节 ${lessonIds.length} 节，不扣课时。`,
        firstAction: '已挂起受影响课程并通知会员；可选改期或安排同性别备选教练代课，训练记录自动共享。',
      })
    })
  }

  /** 处理教练请假：改期 or 代课 */
  function resolveCoachLeave(incidentId: string, choice: 'reschedule' | 'substitute', payload: string, actorId: string) {
    const inc = incidents.value.find(i => i.id === incidentId)!
    if (choice === 'substitute' && !userById(payload)) return
    inc.linkedLessonIds.forEach(id => {
      const l = lessons.value.find(x => x.id === id)
      if (!l || l.status !== 'coach_leave') return
      if (choice === 'reschedule') {
        const newStart = payload
        const endD = addDays(parseISO(newStart), 0)
        endD.setHours(endD.getHours() + 1)
        l.status = 'scheduled'
        l.startAt = newStart
        l.endAt = toISO(endD)
        l.reason = undefined
        inc.timeline.push(entry(actorId, 'consultant', `已改期至 ${newStart.replace('T', ' ')}，不扣课时。`, 'action'))
      } else {
        const sub = userById(payload)!
        l.status = 'scheduled'
        l.coachId = sub.id
        l.reason = undefined
        inc.timeline.push(entry(actorId, 'consultant', `安排${sub.name}（${sub.gender}教练）代课，体态评估/风险提示/历次训练记录已自动共享。`, 'action'))
      }
    })
    resolveIncident(incidentId, choice === 'reschedule' ? '课程已改期' : '已安排代课教练', actorId)
  }

  // ---------- 换教练（冻结 → 交接完整记录 → 重排） ----------
  function requestCoachChange(memberId: string, reason: string) {
    const pkg = activePackagesOfMember(memberId)[0]
    if (!pkg) return
    const future = lessons.value.filter(l =>
      l.packageId === pkg.id && l.status === 'scheduled')
    future.forEach(l => { l.focus = `【待确认】换教练评估中，暂维持原排课` })
    createIncident({
      type: 'coach_change', memberId, coachId: pkg.coachId, consultantId: pkg.consultantId,
      packageId: pkg.id, linkedLessonIds: future.slice(0, 4).map(l => l.id),
      title: `${nameOf(memberId)}申请更换教练（${nameOf(pkg.coachId)} → 待定）`,
      detail: reason,
      firstAction: `已挂起后续 ${future.length} 节排课确认；新教练可查看完整体态评估、风险提示与全部训练记录，无需从零沟通。`,
    })
  }

  function approveCoachChange(incidentId: string, newCoachId: string, actorId: string) {
    const inc = incidents.value.find(i => i.id === incidentId)!
    const pkg = packageById(inc.packageId)!
    const oldCoach = pkg.coachId
    pkg.coachId = newCoachId
    lessons.value
      .filter(l => l.packageId === pkg.id && l.status === 'scheduled')
      .forEach(l => { l.coachId = newCoachId; l.focus = (l.focus ?? '').replace(/^【待确认】.*?/, '【新教练】请先阅读历史训练记录与风险提示，本节重点：复评与衔接') })
    inc.coachId = newCoachId
    inc.timeline.push(entry(actorId, 'consultant',
      `已完成教练交接：${nameOf(oldCoach)} → ${nameOf(newCoachId)}。体态评估、动作限制、禁忌动作、${completedLessons(pkg.id).length} 节训练记录、疼痛曲线与家庭作业已全部同步。`, 'action'))
    resolveIncident(incidentId, `会员已转给${nameOf(newCoachId)}，训练档案完整交接`, actorId)
  }

  // ---------- 异常工单 ----------
  interface CreateIncidentInput {
    type: Incident['type']
    memberId: string
    coachId: string
    consultantId: string
    packageId?: string
    lessonId?: string
    linkedLessonIds: string[]
    title: string
    detail: string
    firstAction: string
  }

  function createIncident(input: CreateIncidentInput): Incident {
    const inc: Incident = {
      id: nid('i'), type: input.type, status: 'open',
      memberId: input.memberId, coachId: input.coachId, consultantId: input.consultantId,
      packageId: input.packageId, lessonId: input.lessonId,
      linkedLessonIds: input.linkedLessonIds, createdAt: toISO(new Date()),
      title: input.title, detail: input.detail,
      timeline: [entry('system', 'system', input.firstAction, 'action')],
    }
    incidents.value.unshift(inc)
    return inc
  }

  function addIncidentNote(incidentId: string, actorId: string, actorRole: Role, content: string) {
    const inc = incidents.value.find(i => i.id === incidentId)!
    inc.timeline.push(entry(actorId, actorRole, content))
    if (inc.status === 'open') inc.status = 'processing'
  }

  function resolveIncident(incidentId: string, resolution: string, actorId: string) {
    const inc = incidents.value.find(i => i.id === incidentId)!
    inc.status = 'resolved'
    inc.resolvedAt = toISO(new Date())
    inc.resolution = resolution
    inc.timeline.push(entry(actorId, 'consultant', `工单关闭：${resolution}`, 'action'))
  }

  // ---------- 会员：主动上报身体不适 ----------
  function reportPain(memberId: string, bodyPart: string, level: number, note: string) {
    const pkg = activePackagesOfMember(memberId)[0]
    const last = lastRecordOf(memberId)
    const inc = createIncident({
      type: 'knee_discomfort', memberId,
      coachId: pkg?.coachId ?? last?.lesson.coachId ?? '',
      consultantId: pkg?.consultantId ?? '',
      packageId: pkg?.id, lessonId: last?.lesson.id,
      linkedLessonIds: last ? [last.lesson.id] : [],
      title: `${nameOf(memberId)}反馈${bodyPart}不适（疼痛 ${level}/10）`,
      detail: `会员主动上报：${bodyPart}，疼痛等级 ${level}/10。说明：${note || '无'}`,
      firstAction: '已通知责任教练与顾问；下节课教练须先复核疼痛反应再安排动作，排课进度让位于安全。',
    })
    const next = nextLessonOf(memberId)
    if (next) {
      next.focus = `【会员上报不适】开课先复评${bodyPart}（${level}/10），避免激惹动作`
      inc.linkedLessonIds.push(next.id)
    }
  }

  // ---------- 投诉 ----------
  function createComplaint(memberId: string, consultantId: string, detail: string) {
    return createIncident({
      type: 'complaint', memberId, coachId: activePackagesOfMember(memberId)[0]?.coachId ?? '',
      consultantId, linkedLessonIds: [], title: `${nameOf(memberId)}的投诉`, detail,
      firstAction: '投诉已升级至顾问主管，相关外呼/跟进任务冻结，48 小时内响应。',
    })
  }

  // ---------- 续费 ----------
  function activePackagesOfMember(memberId: string) {
    return packages.value.filter(p => p.memberId === memberId && p.status === 'active')
  }

  function updateRenewal(id: string, patch: Partial<Renewal>) {
    const r = renewals.value.find(x => x.id === id)
    if (r) Object.assign(r, patch)
  }

  function markRenewalViewed(id: string) {
    const r = renewals.value.find(x => x.id === id)
    if (r) r.lastViewedRecordAt = toISO(new Date())
  }

  /** 续费：新课包继承剩余课时，新排课从课包结束后开始 */
  function renewPackage(renewalId: string, catalogId: string, actorId: string): YogaPackage {
    const r = renewals.value.find(x => x.id === renewalId)!
    const old = packageById(r.packageId)!
    const item = catalog.value.find(c => c.id === catalogId)!
    const start = new Date()
    const mergedSessions = item.sessions + old.remainingSessions
    const pkg: YogaPackage = {
      id: nid('pkg'), memberId: old.memberId, coachId: old.coachId, consultantId: r.consultantId,
      name: item.name, totalSessions: mergedSessions, remainingSessions: mergedSessions, price: item.price,
      startDate: toISODate(start), endDate: toISODate(addDays(start, item.validMonths * 30)),
      status: 'active', createdAt: toISO(start),
      plan: JSON.parse(JSON.stringify(old.plan)),
    }
    packages.value.unshift(pkg)
    generateLessons(pkg)
    old.status = 'used_up'
    r.status = '已续费'
    r.renewedPackageId = pkg.id
    resolveRelatedExpiry(old.id, actorId)
    return pkg
  }

  function resolveRelatedExpiry(packageId: string, actorId: string) {
    incidents.value
      .filter(i => i.type === 'package_expiring' && i.packageId === packageId && i.status !== 'resolved')
      .forEach(i => resolveIncident(i.id, '会员已续费，剩余课时并入新课包', actorId))
  }

  /** 系统规则：到期前 14 天且剩余 > 0 的课包自动产生续费提醒（幂等） */
  function ensureExpiryIncidents() {
    packages.value.forEach(p => {
      if (p.status !== 'active') return
      const d = daysUntil(p.endDate)
      if (d <= 14 && p.remainingSessions > 0) {
        const exists = incidents.value.some(i =>
          i.type === 'package_expiring' && i.packageId === p.id && i.status !== 'resolved')
        if (!exists) {
          createIncident({
            type: 'package_expiring', memberId: p.memberId, coachId: p.coachId,
            consultantId: p.consultantId, packageId: p.id, linkedLessonIds: [],
            title: `${p.name} ${d} 天后到期，剩余 ${p.remainingSessions} 节`,
            detail: '系统到期前 14 天自动提醒。续费沟通须以真实训练记录为依据。',
            firstAction: '已生成续费工单，请顾问先查看训练进展与风险提示再沟通。',
          })
        }
        const hasRenewal = renewals.value.some(rn => rn.packageId === p.id)
        if (!hasRenewal) {
          renewals.value.push({
            id: nid('r'), packageId: p.id, memberId: p.memberId, consultantId: p.consultantId,
            status: '待沟通', createdAt: toISO(new Date()), consultantNote: '',
          })
        }
      }
    })
  }

  // ---------- 顾问看板统计 ----------
  const conversionStats = computed(() => {
    const list = trials.value
    const scheduled = list.filter(t => t.status === '待安排' || t.status === '已安排').length
    const done = list.filter(t => t.status === '已完成').length
    const converted = list.filter(t => t.status === '已转化').length
    const lost = list.filter(t => t.status === '已流失').length
    const rate = (converted + lost) ? Math.round((converted / (converted + lost)) * 100) : 0
    return { total: list.length, scheduled, done, converted, lost, rate }
  })

  /** 教练周视图：某周课节 */
  function coachWeekLessons(coachId: string, weekOffset: number) {
    const mon = weekDateISO(weekOffset, 0, 0, 0)
    const nextMon = weekDateISO(weekOffset + 1, 0, 0, 0)
    return lessons.value
      .filter(l => l.coachId === coachId && l.startAt >= mon && l.startAt < nextMon)
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
  }

  /** 该教练名下全部会员（有有效课包或待上体验课） */
  function coachMembers(coachId: string) {
    const pkgMembers = new Set(packages.value.filter(p => p.coachId === coachId && p.status === 'active').map(p => p.memberId))
    trials.value.filter(t => t.coachId === coachId && (t.status === '已安排' || t.status === '已完成')).forEach(t => pkgMembers.add(t.memberId))
    return [...pkgMembers]
  }

  return {
    // state
    users, trials, assessments, packages, lessons, leaveRules, renewals, incidents, catalog,
    currentUserId, currentUser,
    // derived
    coaches, members, consultants, openIncidents, conversionStats,
    // helpers
    switchUser, userById, nameOf, assessmentOfMember, assessmentOfTrial, packageById, trialById,
    lessonsOfPackage, completedLessons, packageProgress, lastRecordOf, nextLessonOf, incidentsOf,
    incidentMeta, activePackagesOfMember, coachWeekLessons, coachMembers, parseSlot,
    // actions
    createTrial, scheduleTrial, saveAssessment, convertTrial, markTrialLost,
    saveLessonRecord, memberRequestLeave, memberReschedule,
    coachRequestLeave, resolveCoachLeave, requestCoachChange, approveCoachChange,
    addIncidentNote, resolveIncident, createComplaint, reportPain,
    updateRenewal, markRenewalViewed, renewPackage, ensureExpiryIncidents,
  }
})

// ---------- 异常类型展示元数据 ----------
export const INCIDENT_META: Record<Incident['type'], { label: string; tone: 'danger' | 'warn' | 'info' | 'brand'; icon: string }> = {
  knee_discomfort: { label: '身体不适', tone: 'danger', icon: '🩺' },
  coach_leave: { label: '教练请假', tone: 'warn', icon: '🏖️' },
  reschedule_request: { label: '请假/改期', tone: 'info', icon: '🕐' },
  progress_behind: { label: '进度落后', tone: 'warn', icon: '📉' },
  coach_change: { label: '换教练', tone: 'brand', icon: '🔄' },
  package_expiring: { label: '课包临期', tone: 'warn', icon: '⏳' },
  complaint: { label: '投诉', tone: 'danger', icon: '🚩' },
}
