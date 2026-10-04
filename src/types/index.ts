// ============================================================
// 栖兰瑜伽 · 私教全流程领域模型
// 三类角色围绕同一套训练记录协作：会员 / 教练 / 顾问（销售）
// 关键边界：教练的体态评估、风险提示属于「训练域」，任何角色不可修改，
// 顾问只能基于真实训练记录做续费沟通。
// ============================================================

export type Role = 'member' | 'coach' | 'consultant'

export interface User {
  id: string
  name: string
  role: Role
  gender: '女' | '男'
  phone: string
  title?: string
  /** 教练擅长方向 */
  specialties?: string[]
}

// ---------- 体验课预约（会员填写的预约问卷） ----------
export type ExerciseBase = '零基础' | '偶尔运动' | '规律运动' | '资深练习者'
export type Flexibility = '僵硬' | '一般' | '良好' | '优秀'
export type TrialStatus = '待安排' | '已安排' | '已完成' | '已转化' | '已流失'

export interface TrialBooking {
  id: string
  memberId: string
  consultantId: string
  createdAt: string
  // 会员问卷
  exerciseBase: ExerciseBase
  painAreas: string[]
  painNote: string
  flexibility: Flexibility
  goals: string[]
  goalNote: string
  /** 可上课时间，如「周三 18:00 后」 */
  availableSlots: string[]
  /** 课包预算（元） */
  budget: number
  /** 是否介意异性教练 */
  mindOppositeGenderCoach: boolean
  preferredCoachGender: '不限' | '女' | '男'
  // 顾问安排
  status: TrialStatus
  scheduledAt?: string
  coachId?: string
  /** 转化后生成的课包 id */
  convertedPackageId?: string
  lostReason?: string
}

// ---------- 教练体态评估（训练域，只读锁定） ----------
export interface CoachAssessment {
  id: string
  trialId: string
  memberId: string
  coachId: string
  filledAt: string
  /** 体态评估：如 骨盆前倾、上交叉综合征、高低肩 */
  postureFindings: string[]
  postureNote: string
  /** 动作限制 */
  movementLimits: string[]
  /** 禁忌动作 */
  contraindicatedMoves: string[]
  /** 课程建议 */
  courseSuggestion: string
  /** 每周建议频次 */
  suggestedFrequency: number
  /** 风险提示（训练专业判断，不允许顾问编辑/删减） */
  riskWarnings: string[]
  /** 推荐套餐 id */
  recommendedPackageIds: string[]
}

// ---------- 课包 ----------
export type PackageStatus = 'active' | 'expired' | 'used_up' | 'frozen'

export interface PackagePlan {
  /** 每周上课次数 */
  frequencyPerWeek: number
  preferredTimes: string[]
  /** 阶段目标 */
  phaseGoals: string[]
  note: string
}

export interface YogaPackage {
  id: string
  memberId: string
  coachId: string
  consultantId: string
  sourceTrialId?: string
  name: string
  totalSessions: number
  remainingSessions: number
  price: number
  startDate: string
  endDate: string
  status: PackageStatus
  plan: PackagePlan
  createdAt: string
}

// ---------- 课节与训练记录 ----------
export type LessonStatus =
  | 'scheduled' // 已排课
  | 'completed' // 已完成
  | 'member_leave' // 会员请假
  | 'coach_leave' // 教练请假
  | 'rescheduled' // 已改期
  | 'cancelled' // 已取消

export interface LessonRecord {
  filledAt: string
  /** 完成动作 */
  completedMoves: string[]
  /** 完成度 0-100 */
  completion: number
  /** 体感 */
  bodyFeeling: string
  /** 课前疼痛等级 0-10 */
  painBefore: number
  /** 课后疼痛等级 0-10 */
  painAfter: number
  painNote: string
  /** 家庭练习 */
  homePractice: string
  /** 教练备注（含下节课重点建议） */
  coachNote: string
  /** 本次训练效果标签 */
  effectTags: string[]
}

export interface Lesson {
  id: string
  packageId: string
  memberId: string
  coachId: string
  /** ISO 时间 */
  startAt: string
  endAt: string
  status: LessonStatus
  /** 本节课重点（来自上次记录/阶段目标）；请假/取消课节可无重点 */
  focus?: string
  /** 请假/改期原因 */
  reason?: string
  record?: LessonRecord
  /** 改期后的新课节 id */
  rescheduledTo?: string
}

// ---------- 请假规则 ----------
export interface LeaveRule {
  id: string
  title: string
  content: string
}

// ---------- 续费 ----------
export type RenewalStatus = '待沟通' | '沟通中' | '已续费' | '暂不续费'

export interface Renewal {
  id: string
  packageId: string
  memberId: string
  consultantId: string
  status: RenewalStatus
  createdAt: string
  /** 顾问沟通备注（只能写在续费跟进里，不能改写教练的风险提示） */
  consultantNote: string
  renewedPackageId?: string
  /** 顾问上次查看训练记录的时间，用于提示"有新训练进展" */
  lastViewedRecordAt?: string
}

// ---------- 异常事件 / 协同工单（三端围绕同一记录处理） ----------
export type IncidentType =
  | 'knee_discomfort' // 会员膝盖不适
  | 'coach_leave' // 教练请假
  | 'reschedule_request' // 会员临时换时间
  | 'progress_behind' // 课程进度落后
  | 'coach_change' // 会员要求换教练
  | 'package_expiring' // 课包即将过期
  | 'complaint' // 投诉

export type IncidentStatus = 'open' | 'processing' | 'resolved'

export interface IncidentTimelineEntry {
  id: string
  at: string
  actorId: string
  actorRole: Role | 'system'
  /** 系统动作（自动排课/自动生成提醒）或人工留言 */
  kind: 'note' | 'action'
  content: string
}

export interface Incident {
  id: string
  type: IncidentType
  status: IncidentStatus
  memberId: string
  coachId: string
  consultantId: string
  packageId?: string
  lessonId?: string
  createdAt: string
  title: string
  detail: string
  /** 关联的训练记录课节（同一套数据依据） */
  linkedLessonIds: string[]
  timeline: IncidentTimelineEntry[]
  resolvedAt?: string
  resolution?: string
}

// ---------- 可售套餐（目录） ----------
export interface PackageCatalogItem {
  id: string
  name: string
  sessions: number
  price: number
  validMonths: number
  tagline: string
}
