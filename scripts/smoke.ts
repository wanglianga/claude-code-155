// 核心业务规则冒烟测试：在 Node 中以 SSR 方式构建后运行
import { createPinia, setActivePinia } from 'pinia'
import { useYogaStore } from '../src/stores/yoga'

let pass = 0, fail = 0
function assert(cond: boolean, msg: string) {
  if (cond) { pass++; console.log('  ✅', msg) }
  else { fail++; console.log('  ❌', msg) }
}
function section(name: string) { console.log('\n=== ' + name + ' ===') }

setActivePinia(createPinia())
const store = useYogaStore()
store.switchUser('a1')

section('种子数据')
assert(store.trials.length === 6, '6 条体验预约')
assert(store.packages.length === 3, '3 个有效课包')
assert(store.openIncidents.length >= 6, `存在进行中工单（实际 ${store.openIncidents.length}）`)
assert(store.lessons.filter(l => l.status === 'completed').length === 19 + 8 + 6, '历史已完成课节 33 节')

section('体验预约 → 安排（性别偏好强制校验）')
const tid = store.createTrial('m7', 'a1', {
  exerciseBase: '零基础', painAreas: ['膝部'], painNote: '偶尔疼', flexibility: '一般',
  goals: ['缓解疼痛'], goalNote: '', availableSlots: ['周三 18:00 后'], budget: 4000,
  mindOppositeGenderCoach: true, preferredCoachGender: '女',
})
let blocked = false
try { store.scheduleTrial(tid, 'c2', '2099-01-01T10:00') } catch { blocked = true }
assert(blocked, '为介意异性的会员安排男教练被拦截')
store.scheduleTrial(tid, 'c3', '2099-01-01T10:00')
assert(store.trialById(tid)?.status === '已安排', '安排女教练成功')

section('教练体态评估（训练域）')
store.switchUser('c3')
store.saveAssessment({
  trialId: tid, memberId: 'm7', coachId: 'c3',
  postureFindings: ['骨盆前倾'], postureNote: '测试', movementLimits: ['踝背屈受限'],
  contraindicatedMoves: ['负重深蹲'], courseSuggestion: '12 节入门，每周 2 节', suggestedFrequency: 2,
  riskWarnings: ['膝痛期禁止跳跃类动作'], recommendedPackageIds: ['p-12'],
})
assert(store.trialById(tid)?.status === '已完成', '评估后体验课状态 → 已完成')
assert(store.assessmentOfTrial(tid)?.riskWarnings[0] === '膝痛期禁止跳跃类动作', '风险提示已保存')

section('确认购买 → 课包/排课/请假规则/续费提醒')
store.switchUser('a1')
const pkg = store.convertTrial(tid, 'p-12', {
  frequencyPerWeek: 2, preferredTimes: ['周三 18:00 后'], phaseGoals: ['阶段一'], note: '测试',
})
assert(store.trialById(tid)?.status === '已转化', '体验状态 → 已转化')
assert(pkg.totalSessions === 12 && pkg.remainingSessions === 12, '课包 12 节')
const generated = store.lessonsOfPackage(pkg.id)
assert(generated.length === 12, `按计划生成 12 节课（实际 ${generated.length}）`)
assert(generated.every(l => l.coachId === 'c3'), '新课全部归属所选教练')

section('课后记录：疼痛升高 → 自动工单 + 下节风险调整')
store.switchUser('c3')
const firstLesson = generated[0].id
store.saveLessonRecord(firstLesson, {
  filledAt: '', completedMoves: ['猫牛式'], completion: 60, bodyFeeling: '膝痛加重',
  painBefore: 4, painAfter: 7, painNote: '屈膝刺痛', homePractice: '休息',
  coachNote: '暂停屈膝', effectTags: ['需关注'],
})
assert(store.packageById(pkg.id)!.remainingSessions === 11, '剩余课时 11')
const kneeInc = store.incidents.find(i => i.memberId === 'm7' && i.type === 'knee_discomfort')
assert(!!kneeInc, '自动生成身体不适工单')
assert(generated[1].focus?.includes('已按风险调整'), '下节课重点自动按风险调整')

section('会员临时改期 / 请假')
store.switchUser('m7')
store.memberReschedule(generated[2].id, '2099-02-01T18:00')
assert(store.incidents.some(i => i.type === 'reschedule_request' && i.memberId === 'm7'), '生成改期工单')
assert(store.lessons.some(l => l.startAt === '2099-02-01T18:00' && l.status === 'scheduled'), '补排课节已生成')

section('教练请假 → 挂起课程 → 代课/改期处理')
store.switchUser('c3')
const affected = generated[4]
const leaveDate = affected.startAt.slice(0, 10)
store.coachRequestLeave('c3', `${leaveDate}T00:00`, `${leaveDate}T23:59`, '培训')
const leaveInc = store.incidents.find(i => i.type === 'coach_leave' && i.memberId === 'm7' && i.status !== 'resolved')
assert(!!leaveInc, '生成教练请假工单')
store.switchUser('a1')
store.resolveCoachLeave(leaveInc!.id, 'substitute', 'c1', 'a1')
assert(leaveInc!.status === 'resolved', '安排代课后工单关闭')

section('换教练：完整档案交接')
store.switchUser('m3')
const beforePkg = store.activePackagesOfMember('m3')[0]
const futureBefore = store.lessons.filter(l => l.packageId === beforePkg.id && l.status === 'scheduled').length
store.requestCoachChange('m3', '希望风格温和')
const chgInc = store.incidents.find(i => i.type === 'coach_change' && i.memberId === 'm3' && i.status !== 'resolved')
assert(!!chgInc, '换教练工单已创建')
store.switchUser('a1')
store.approveCoachChange(chgInc!.id, 'c3', 'a1')
assert(beforePkg.coachId === 'c3', '课包责任教练变更')
assert(store.lessons.filter(l => l.packageId === beforePkg.id && l.status === 'scheduled').every(l => l.coachId === 'c3'), '未来课节全部转交给新教练')
assert(futureBefore === store.lessons.filter(l => l.packageId === beforePkg.id && l.status === 'scheduled').length, '排课数量不变')
assert(store.assessmentOfMember('m3')?.coachId === 'c1', '历史评估仍保留原教练署名（档案不丢）')

section('续费：基于记录、剩余课时并入、临期工单关闭')
store.switchUser('a1')
const r1 = store.renewals.find(r => r.memberId === 'm1' && r.status !== '已续费')!
const oldRemaining = store.packageById(r1.packageId)!.remainingSessions
const newPkg = store.renewPackage(r1.id, 'p-24', 'a1')
assert(newPkg.totalSessions === 24 + oldRemaining, `剩余 ${oldRemaining} 节并入新课包（共 ${newPkg.totalSessions}）`)
assert(store.renewals.find(r => r.id === r1.id)?.status === '已续费', '续费状态更新')
assert(!store.incidents.some(i => i.type === 'package_expiring' && i.packageId === r1.packageId && i.status !== 'resolved'), '临期工单自动关闭')

section('销售/训练边界')
const warnings = store.assessmentOfMember('m1')?.riskWarnings ?? []
assert(warnings.some(w => w.includes('右膝')), '风险提示原文可查')
assert(store.renewals.find(r => r.memberId === 'm1')?.consultantNote !== undefined, '顾问备注独立字段，不与风险提示混写')

console.log(`\n结果：${pass} 通过，${fail} 失败`)
if (fail) process.exit(1)
