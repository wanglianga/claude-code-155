import type {
  User,
  TrialBooking,
  CoachAssessment,
  YogaPackage,
  Lesson,
  LessonRecord,
  LeaveRule,
  Renewal,
  Incident,
  PackageCatalogItem,
} from '@/types'
import { weekDateISO, toISO, addDays, toISODate } from '@/utils/date'

const past = (daysAgo: number, h = 10, m = 0): string => {
  const d = addDays(new Date(), -daysAgo)
  d.setHours(h, m, 0, 0)
  return toISO(d)
}
const futureISO = (daysAhead: number, h = 10, m = 0): string => {
  const d = addDays(new Date(), daysAhead)
  d.setHours(h, m, 0, 0)
  return toISO(d)
}
const daysFromNowISO = (days: number): string => toISODate(addDays(new Date(), days))

// ---------------- 用户 ----------------
export const users: User[] = [
  { id: 'm1', name: '林晚晴', role: 'member', gender: '女', phone: '138****1027' },
  { id: 'm2', name: '周予安', role: 'member', gender: '男', phone: '139****5520' },
  { id: 'm3', name: '苏晓', role: 'member', gender: '女', phone: '137****8814' },
  { id: 'm4', name: '陈默', role: 'member', gender: '男', phone: '186****3309' },
  { id: 'm5', name: '何佳佳', role: 'member', gender: '女', phone: '135****7762' },
  { id: 'm6', name: '方芷', role: 'member', gender: '女', phone: '150****2198' },
  { id: 'm7', name: '叶知秋', role: 'member', gender: '女', phone: '189****6641' },
  {
    id: 'c1', name: '沈若', role: 'coach', gender: '女', phone: '133****0918',
    title: '高级私教 · 8 年', specialties: ['体态矫正', '运动康复', '普拉提'],
  },
  {
    id: 'c2', name: '顾一帆', role: 'coach', gender: '男', phone: '188****4460',
    title: '私教 · 5 年', specialties: ['力量瑜伽', '肩颈理疗', '体式精进'],
  },
  {
    id: 'c3', name: '唐柠', role: 'coach', gender: '女', phone: '177****2056',
    title: '私教 · 6 年', specialties: ['温和理疗', '孕产康复', '呼吸法'],
  },
  { id: 'a1', name: '许岚', role: 'consultant', gender: '女', phone: '180****6633', title: '课程顾问' },
  { id: 'a2', name: '罗景', role: 'consultant', gender: '男', phone: '180****7788', title: '课程顾问' },
]

// ---------------- 套餐目录 ----------------
export const catalog: PackageCatalogItem[] = [
  { id: 'p-trial', name: '私教体验课', sessions: 1, price: 99, validMonths: 1, tagline: '体态评估 + 定制体验' },
  { id: 'p-12', name: '入门私教课包', sessions: 12, price: 3600, validMonths: 3, tagline: '建立训练习惯，打基础' },
  { id: 'p-24', name: '进阶私教课包', sessions: 24, price: 6600, validMonths: 6, tagline: '系统矫正与能力提升' },
  { id: 'p-50', name: '年度私教课包', sessions: 50, price: 12800, validMonths: 12, tagline: '长期陪伴，单位成本最低' },
]

// ---------------- 体验课预约 ----------------
export const trials: TrialBooking[] = [
  {
    id: 't1', memberId: 'm1', consultantId: 'a1', createdAt: past(63, 15),
    exerciseBase: '偶尔运动', painAreas: ['腰部', '膝部'], painNote: '久坐后腰酸，上下楼偶尔右膝发软',
    flexibility: '僵硬', goals: ['缓解疼痛', '改善体态'], goalNote: '想改善含胸驼背和腰疼',
    availableSlots: ['周二 19:00 后', '周五 19:00 后'], budget: 8000,
    mindOppositeGenderCoach: true, preferredCoachGender: '女',
    status: '已转化', scheduledAt: weekDateISO(-9, 1, 19), coachId: 'c1', convertedPackageId: 'pkg1',
  },
  {
    id: 't2', memberId: 'm2', consultantId: 'a2', createdAt: past(6, 11),
    exerciseBase: '规律运动', painAreas: ['肩颈'], painNote: '健身后肩紧，左侧明显',
    flexibility: '一般', goals: ['提升运动表现', '增肌塑形'], goalNote: '想配合力量训练改善活动度',
    availableSlots: ['周四 19:00 后', '周六上午'], budget: 5000,
    mindOppositeGenderCoach: false, preferredCoachGender: '不限',
    status: '已安排', scheduledAt: weekDateISO(0, 3, 19), coachId: 'c2',
  },
  {
    id: 't3', memberId: 'm3', consultantId: 'a1', createdAt: past(49, 16),
    exerciseBase: '零基础', painAreas: ['肩颈', '腰部'], painNote: '无运动习惯，弯腰会酸',
    flexibility: '僵硬', goals: ['缓解疼痛', '塑形'], goalNote: '',
    availableSlots: ['周二 18:00', '周五 18:00'], budget: 4000,
    mindOppositeGenderCoach: true, preferredCoachGender: '女',
    status: '已转化', scheduledAt: weekDateISO(-5, 1, 18), coachId: 'c1', convertedPackageId: 'pkg3',
  },
  {
    id: 't4', memberId: 'm4', consultantId: 'a2', createdAt: past(35, 20),
    exerciseBase: '偶尔运动', painAreas: [], painNote: '无明显疼痛，想减压改善睡眠',
    flexibility: '一般', goals: ['减压放松', '提升柔韧'], goalNote: '',
    availableSlots: ['周一 19:00 后', '周四 19:00 后'], budget: 4000,
    mindOppositeGenderCoach: false, preferredCoachGender: '不限',
    status: '已转化', scheduledAt: weekDateISO(-4, 0, 19), coachId: 'c2', convertedPackageId: 'pkg4',
  },
  {
    id: 't5', memberId: 'm5', consultantId: 'a1', createdAt: past(24, 14),
    exerciseBase: '零基础', painAreas: ['腰部'], painNote: '姨妈期腰酸明显',
    flexibility: '一般', goals: ['缓解疼痛'], goalNote: '',
    availableSlots: ['工作日白天'], budget: 2000,
    mindOppositeGenderCoach: false, preferredCoachGender: '不限',
    status: '已流失', scheduledAt: weekDateISO(-3, 2, 14), coachId: 'c3',
    lostReason: '预算与课包档位不匹配 + 工作日时间不稳定，顾问连续电话推销引发投诉',
  },
  {
    id: 't6', memberId: 'm6', consultantId: 'a2', createdAt: past(1, 9, 30),
    exerciseBase: '零基础', painAreas: ['肩颈'], painNote: '长期伏案，肩颈僵硬',
    flexibility: '一般', goals: ['改善体态', '缓解疼痛'], goalNote: '同事推荐来的',
    availableSlots: ['周三 18:00 后', '周六 10:00'], budget: 4000,
    mindOppositeGenderCoach: false, preferredCoachGender: '不限',
    status: '待安排',
  },
]

// ---------------- 教练体态评估（训练域） ----------------
export const assessments: CoachAssessment[] = [
  {
    id: 'as1', trialId: 't1', memberId: 'm1', coachId: 'c1', filledAt: weekDateISO(-9, 1, 20, 30),
    postureFindings: ['上交叉综合征（圆肩含胸）', '骨盆前倾', '膝超伸（右侧明显）', '足弓轻度塌陷'],
    postureNote: '久坐模式明显，右侧承重多于左侧；核心激活顺序异常，腰部代偿。',
    movementLimits: ['深蹲踝背屈受限', '髋屈肌紧张', '肩屈曲活动度不足'],
    contraindicatedMoves: ['深度跳跃', '负重深蹲', '仰卧直腿抬腿（腰痛期）'],
    courseSuggestion: '前 8 节以呼吸重建与核心激活为主，配合髋踝活动度；中期加入稳定训练；不建议短期内追求高难度体式。建议每周 2 节。',
    suggestedFrequency: 2,
    riskWarnings: [
      '右膝髌腱区域按压不适，所有屈膝动作以无痛范围为界，出现刺痛立即停止',
      '腰痛急性期避免前屈类动作，先做减压处理',
    ],
    recommendedPackageIds: ['p-24'],
  },
  {
    id: 'as3', trialId: 't3', memberId: 'm3', coachId: 'c1', filledAt: weekDateISO(-5, 1, 19, 30),
    postureFindings: ['头前伸', '圆肩', '骨盆轻度前倾'],
    postureNote: '零基础，本体感觉较弱，需要更多动作学习时间。',
    movementLimits: ['肩外展受限', '髋部紧张'],
    contraindicatedMoves: ['四柱支撑（初期）'],
    courseSuggestion: '12 节入门课包，前 4 节动作模式学习，节奏宜慢；每周 2 节，配合家庭练习。',
    suggestedFrequency: 2,
    riskWarnings: ['手腕承压弱，平板类动作先跪姿降阶', '训练后次日肌肉酸胀为正常反应，关节刺痛需立刻反馈'],
    recommendedPackageIds: ['p-12'],
  },
  {
    id: 'as4', trialId: 't4', memberId: 'm4', coachId: 'c2', filledAt: weekDateISO(-4, 0, 20, 30),
    postureFindings: ['轻微高低肩（右高）', '胸椎灵活性一般'],
    postureNote: '压力大、呼吸浅，以放松恢复类训练切入。',
    movementLimits: ['胸椎旋转受限'],
    contraindicatedMoves: [],
    courseSuggestion: '12 节入门课包，以呼吸与胸椎活动度为主，兼顾睡眠质量，每周 2 节。',
    suggestedFrequency: 2,
    riskWarnings: ['空腹或酒后不宜训练'],
    recommendedPackageIds: ['p-12'],
  },
  {
    id: 'as5', trialId: 't5', memberId: 'm5', coachId: 'c3', filledAt: weekDateISO(-3, 2, 15, 30),
    postureFindings: ['盆底肌轻度紧张', '骨盆位置基本中立'],
    postureNote: '症状与生理期强相关，适合温和理疗方向。',
    movementLimits: ['核心耐受力弱'],
    contraindicatedMoves: ['生理期高强度扭转'],
    courseSuggestion: '建议短期小班或低频私教先行，暂不推荐大课包。',
    suggestedFrequency: 1,
    riskWarnings: ['生理期训练强度需减半'],
    recommendedPackageIds: ['p-12'],
  },
]

// ---------------- 课包与排课计划 ----------------
export const packages: YogaPackage[] = [
  {
    id: 'pkg1', memberId: 'm1', coachId: 'c1', consultantId: 'a1', sourceTrialId: 't1',
    name: '进阶私教课包', totalSessions: 24, remainingSessions: 5, price: 6600,
    startDate: toISODate(addDays(new Date(), -70)),
    endDate: daysFromNowISO(12), status: 'active', createdAt: past(63, 16),
    plan: {
      frequencyPerWeek: 2, preferredTimes: ['周二 19:00', '周五 19:00'],
      phaseGoals: ['第一阶段：重建呼吸与核心激活', '第二阶段：改善骨盆前倾与慢性腰痛', '第三阶段：整体姿态与稳定进阶'],
      note: '会员膝盖风险提示优先于进度，疼痛反复时回到康复动作库。',
    },
  },
  {
    id: 'pkg3', memberId: 'm3', coachId: 'c1', consultantId: 'a1', sourceTrialId: 't3',
    name: '入门私教课包', totalSessions: 12, remainingSessions: 4, price: 3600,
    startDate: toISODate(addDays(new Date(), -35)),
    endDate: daysFromNowISO(40), status: 'active', createdAt: past(35, 19),
    plan: {
      frequencyPerWeek: 2, preferredTimes: ['周二 18:00', '周五 18:00'],
      phaseGoals: ['动作模式学习（肩/髋）', '缓解久坐肩颈腰痛', '建立家庭练习习惯'],
      note: '零基础学员，需控制强度并多鼓励。',
    },
  },
  {
    id: 'pkg4', memberId: 'm4', coachId: 'c2', consultantId: 'a2', sourceTrialId: 't4',
    name: '入门私教课包', totalSessions: 12, remainingSessions: 6, price: 3600,
    startDate: toISODate(addDays(new Date(), -28)),
    endDate: daysFromNowISO(80), status: 'active', createdAt: past(28, 20),
    plan: {
      frequencyPerWeek: 2, preferredTimes: ['周一 19:00', '周四 19:00'],
      phaseGoals: ['呼吸与放松', '胸椎灵活性', '轻度力量与睡眠改善'],
      note: '工作忙，允许偶尔改期；连续缺勤要主动回访。',
    },
  },
]

// ---------------- 课节与训练记录（程序生成历史课） ----------------
const MOVES_M1 = ['猫牛式', '桥式', '蚌式开合', '死虫式', '下犬式（屈膝版）', '弓步伸展', '骨盆倾斜练习', '婴儿式放松', '侧平板（跪姿）', '墙天使']
const MOVES_M3 = ['呼吸练习', '猫牛式', '跪姿平板', '桥式', '肩部环绕', '婴儿式', '弹力带外旋', '登山者（降阶）']
const MOVES_M4 = ['腹式呼吸', '胸椎泡沫轴放松', '穿针式', '婴儿式', '坐姿前屈', '腿墙上倒箭式', '仰卧脊柱扭转']

function makeRecord(opts: {
  at: string
  moves: string[]
  completion: number
  feeling: string
  painBefore: number
  painAfter: number
  painNote?: string
  home: string
  coachNote: string
  tags: string[]
}): LessonRecord {
  return {
    filledAt: opts.at, completedMoves: opts.moves, completion: opts.completion,
    bodyFeeling: opts.feeling, painBefore: opts.painBefore, painAfter: opts.painAfter,
    painNote: opts.painNote ?? '', homePractice: opts.home, coachNote: opts.coachNote, effectTags: opts.tags,
  }
}

function weeklyCompletedLessons(opts: {
  idPrefix: string
  packageId: string
  memberId: string
  coachId: string
  weeks: number[] // week offsets（必须已结束）
  weekdays: number[]
  hour: number
  durationH: number
  moves: string[]
  home: string
  /** 返回某节课的记录（idx 为全局序号） */
  recordFor: (idx: number, week: number, dow: number, at: string) => LessonRecord
  focusFor: (idx: number) => string
}): Lesson[] {
  const out: Lesson[] = []
  let idx = 0
  for (const w of opts.weeks) {
    for (const dow of opts.weekdays) {
      idx++
      const start = weekDateISO(w, dow, opts.hour)
      const end = weekDateISO(w, dow, opts.hour + opts.durationH)
      out.push({
        id: `${opts.idPrefix}-${idx}`, packageId: opts.packageId, memberId: opts.memberId, coachId: opts.coachId,
        startAt: start, endAt: end, status: 'completed', focus: opts.focusFor(idx),
        record: opts.recordFor(idx, w, dow, start),
      })
    }
  }
  return out
}

export const lessons: Lesson[] = [
  // ===== 林晚晴 pkg1：过去 9 周每周二/五 + 本周二共 19 节已完成 =====
  ...weeklyCompletedLessons({
    idPrefix: 'l1', packageId: 'pkg1', memberId: 'm1', coachId: 'c1',
    weeks: [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0], weekdays: [1], hour: 19, durationH: 1,
    moves: MOVES_M1, home: '每天 2 组猫牛式 + 5 分钟腹式呼吸',
    focusFor: (i) => (i <= 8 ? '呼吸重建与核心激活' : i <= 16 ? '骨盆前倾调整与腰痛管理' : '稳定进阶，监测膝盖反应'),
    recordFor: (i, _w, dow, at) => {
      // 最近一节（本周二）膝盖不适加重
      if (i === 19) {
        return makeRecord({
          at: weekDateISO(0, 1, 20, 10), moves: ['猫牛式', '蚌式开合', '死虫式', '下犬式（屈膝版）'],
          completion: 65, feeling: '训练中段右膝酸软，后半程不敢发力',
          painBefore: 5, painAfter: 6, painNote: '右膝内侧酸胀，下犬式屈膝时明显；冷敷后缓解',
          home: '暂停弓步类，继续猫牛式与呼吸，疼痛超过 3 天立即告知',
          coachNote: '膝盖风险提示触发：下节课取消弓步与下犬，改仰卧/俯卧动作库；建议顾问暂缓续费沟通中的强度承诺。',
          tags: ['需关注'],
        })
      }
      if (i === 18) {
        return makeRecord({
          at, moves: ['桥式', '死虫式', '骨盆倾斜练习', '弓步伸展'], completion: 85,
          feeling: '腰部轻松，弓步时右膝有轻微感觉', painBefore: 4, painAfter: 3,
          painNote: '弓步最后两组右膝前方轻微酸胀', home: '弓步减半，出现刺痛停止',
          coachNote: '腰痛持续改善，膝盖出现早期信号，下节课观察。', tags: ['腰痛缓解', '核心激活'],
        })
      }
      if (i === 17) {
        return makeRecord({
          at, moves: MOVES_M1.slice(0, 6), completion: 90,
          feeling: '状态好，核心能主动发力', painBefore: 4, painAfter: 2,
          painNote: '无', home: '每天 2 组猫牛式 + 蚌式 15 次×2',
          coachNote: '第二阶段目标基本达成，可进入稳定进阶，但膝盖仍为红线。', tags: ['腰痛缓解', '核心激活', '姿态改善'],
        })
      }
      const t = i / 16
      return makeRecord({
        at, moves: opts_moves(i, MOVES_M1), completion: Math.round(70 + t * 20),
        feeling: i < 6 ? '动作陌生，腰容易代偿' : '逐渐找到发力感',
        painBefore: Math.max(2, Math.round(7 - t * 4)), painAfter: Math.max(1, Math.round(5 - t * 3)),
        painNote: '', home: '每天 2 组猫牛式 + 5 分钟腹式呼吸',
        coachNote: i < 6 ? '继续降阶，建立呼吸-核心顺序。' : '稳步推进，保持无痛范围。',
        tags: i < 6 ? ['核心激活'] : ['腰痛缓解', '活动度改善'],
      })
    },
  }),
  ...weeklyCompletedLessons({
    idPrefix: 'l1f', packageId: 'pkg1', memberId: 'm1', coachId: 'c1',
    weeks: [-9, -8, -7, -6, -5, -4, -3, -2, -1], weekdays: [4], hour: 19, durationH: 1,
    moves: MOVES_M1, home: '每天 2 组猫牛式 + 5 分钟腹式呼吸',
    focusFor: () => '当周复习与活动度',
    recordFor: (i, _w, _dow, at) => makeRecord({
      at, moves: opts_moves(i + 3, MOVES_M1), completion: 80 + (i % 2) * 8,
      feeling: '放松为主，课后腰背轻松', painBefore: 5, painAfter: 3,
      home: '泡沫轴放松大腿前侧/后侧各 2 分钟', coachNote: '复习课，巩固本周动作模式。',
      tags: ['活动度改善', '腰痛缓解'],
    }),
  }),
  // 林晚晴未来排课
  {
    id: 'l1-next1', packageId: 'pkg1', memberId: 'm1', coachId: 'c1',
    startAt: weekDateISO(0, 4, 19), endAt: weekDateISO(0, 4, 20), status: 'scheduled',
    focus: '【已按风险调整】取消弓步/下犬，仰卧位核心与髋稳定，评估右膝反应',
  },
  {
    id: 'l1-next2', packageId: 'pkg1', memberId: 'm1', coachId: 'c1',
    startAt: weekDateISO(1, 1, 19), endAt: weekDateISO(1, 1, 20), status: 'scheduled',
    focus: '视膝盖恢复决定是否回到站立动作',
  },
  {
    id: 'l1-next3', packageId: 'pkg1', memberId: 'm1', coachId: 'c1',
    startAt: weekDateISO(1, 4, 19), endAt: weekDateISO(1, 4, 20), status: 'scheduled', focus: '稳定训练',
  },
  {
    id: 'l1-next4', packageId: 'pkg1', memberId: 'm1', coachId: 'c1',
    startAt: weekDateISO(2, 1, 19), endAt: weekDateISO(2, 1, 20), status: 'scheduled', focus: '稳定训练',
  },

  // ===== 苏晓 pkg3：过去 4 周 8 节完成，进度落后 =====
  ...weeklyCompletedLessons({
    idPrefix: 'l3', packageId: 'pkg3', memberId: 'm3', coachId: 'c1',
    weeks: [-4, -3, -2, -1], weekdays: [1, 4], hour: 18, durationH: 1,
    moves: MOVES_M3, home: '每天 5 分钟呼吸 + 猫牛式',
    focusFor: () => '动作模式学习与肩颈放松',
    recordFor: (i, _w, _d, at) => makeRecord({
      at, moves: opts_moves(i, MOVES_M3), completion: 55 + (i % 3) * 8,
      feeling: i % 2 === 0 ? '记不住动作，回家没练' : '课后肩颈轻松两天',
      painBefore: 4, painAfter: 3, painNote: '',
      home: '每天 5 分钟呼吸 + 猫牛式',
      coachNote: i % 2 === 0
        ? '缺勤后状态回落，阶段目标完成约 40%，需要补课与重排节奏。'
        : '课堂完成可以，但家庭练习为 0，效果难沉淀。',
      tags: i % 2 === 0 ? ['需关注'] : ['活动度改善'],
    }),
  }),
  {
    id: 'l3-next1', packageId: 'pkg3', memberId: 'm3', coachId: 'c1',
    startAt: weekDateISO(0, 4, 18), endAt: weekDateISO(0, 4, 19), status: 'scheduled',
    focus: '【待确认】换教练评估中，暂维持原排课',
  },
  {
    id: 'l3-next2', packageId: 'pkg3', memberId: 'm3', coachId: 'c1',
    startAt: weekDateISO(1, 1, 18), endAt: weekDateISO(1, 1, 19), status: 'scheduled', focus: '【待确认】换教练评估中，暂维持原排课',
  },
  {
    id: 'l3-next3', packageId: 'pkg3', memberId: 'm3', coachId: 'c1',
    startAt: weekDateISO(1, 4, 18), endAt: weekDateISO(1, 4, 19), status: 'scheduled', focus: '【待确认】换教练评估中，暂维持原排课',
  },
  {
    id: 'l3-next4', packageId: 'pkg3', memberId: 'm3', coachId: 'c1',
    startAt: weekDateISO(2, 1, 18), endAt: weekDateISO(2, 1, 19), status: 'scheduled', focus: '【待确认】换教练评估中，暂维持原排课',
  },

  // ===== 陈默 pkg4：过去 3 周 6 节完成 =====
  ...weeklyCompletedLessons({
    idPrefix: 'l4', packageId: 'pkg4', memberId: 'm4', coachId: 'c2',
    weeks: [-3, -2, -1], weekdays: [0, 3], hour: 19, durationH: 1,
    moves: MOVES_M4, home: '睡前腿墙上倒箭式 5 分钟',
    focusFor: () => '呼吸放松与胸椎灵活性',
    recordFor: (i, _w, _d, at) => makeRecord({
      at, moves: opts_moves(i, MOVES_M4), completion: 82 + (i % 2) * 6,
      feeling: '课后入睡明显变快', painBefore: 1, painAfter: 1, painNote: '无疼痛',
      home: '睡前腿墙上倒箭式 5 分钟',
      coachNote: '配合度好，胸椎旋转改善；本月有一次临时改期。', tags: ['减压放松', '活动度改善'],
    }),
  }),
  // 本周一：会员临时换时间 → 改期到下周一
  {
    id: 'l4-mon', packageId: 'pkg4', memberId: 'm4', coachId: 'c2',
    startAt: weekDateISO(0, 0, 19), endAt: weekDateISO(0, 0, 20), status: 'rescheduled',
    reason: '会员临时加班，提前 3 小时申请改期', rescheduledTo: 'l4-makeup', focus: '已改期',
  },
  {
    id: 'l4-makeup', packageId: 'pkg4', memberId: 'm4', coachId: 'c2',
    startAt: weekDateISO(1, 0, 19), endAt: weekDateISO(1, 0, 20), status: 'scheduled',
    focus: '补：呼吸与胸椎复习',
  },
  // 本周四：教练请假（待协同处理）
  {
    id: 'l4-thu', packageId: 'pkg4', memberId: 'm4', coachId: 'c2',
    startAt: weekDateISO(0, 3, 19), endAt: weekDateISO(0, 3, 20), status: 'coach_leave',
    reason: '顾一帆家中急事需请假两天', focus: '教练请假待处理',
  },
  {
    id: 'l4-next-thu', packageId: 'pkg4', memberId: 'm4', coachId: 'c2',
    startAt: weekDateISO(1, 3, 19), endAt: weekDateISO(1, 3, 20), status: 'scheduled', focus: '胸椎旋转进阶',
  },
  {
    id: 'l4-next-mon2', packageId: 'pkg4', memberId: 'm4', coachId: 'c2',
    startAt: weekDateISO(2, 0, 19), endAt: weekDateISO(2, 0, 20), status: 'scheduled', focus: '轻度力量',
  },
  {
    id: 'l4-next-thu2', packageId: 'pkg4', memberId: 'm4', coachId: 'c2',
    startAt: weekDateISO(2, 3, 19), endAt: weekDateISO(2, 3, 20), status: 'scheduled', focus: '轻度力量',
  },
]

function opts_moves(i: number, pool: string[]): string[] {
  const start = i % 4
  return [pool[start % pool.length], pool[(start + 2) % pool.length], pool[(start + 4) % pool.length], pool[(start + 6) % pool.length]]
}

// ---------------- 请假规则 ----------------
export const leaveRules: LeaveRule[] = [
  {
    id: 'lr1', title: '会员请假',
    content: '开课前 24 小时在课表自助请假，不扣课时；24 小时内临时请假记录为「临时改期」，可在 48 小时内补排一次，每月不超过 2 次。',
  },
  {
    id: 'lr2', title: '教练请假',
    content: '教练在教练端提交请假后，系统同步通知会员与顾问，48 小时内协调改期或同性别备选教练代课，不扣会员课时；代课教练共享全部训练记录与风险提示。',
  },
  {
    id: 'lr3', title: '缺勤',
    content: '未请假且未到课按已到课扣除一次课时；如因身体突发不适，可在 12 小时内补凭证申请退回。',
  },
  {
    id: 'lr4', title: '有效期与顺延',
    content: '课包到期前 14 天系统自动提醒；续费后未使用课时可按规则顺延。有效期政策由顾问统一解释，教练不作销售承诺。',
  },
]

// ---------------- 续费 ----------------
export const renewals: Renewal[] = [
  {
    id: 'r1', packageId: 'pkg1', memberId: 'm1', consultantId: 'a1', status: '沟通中',
    createdAt: past(10, 11), consultantNote: '', lastViewedRecordAt: weekDateISO(-1, 4, 20),
  },
  {
    id: 'r3', packageId: 'pkg3', memberId: 'm3', consultantId: 'a1', status: '待沟通',
    createdAt: past(2, 9), consultantNote: '', lastViewedRecordAt: past(8),
  },
]

// ---------------- 异常 / 协同工单 ----------------
export const incidents: Incident[] = [
  {
    id: 'i1', type: 'knee_discomfort', status: 'processing', memberId: 'm1', coachId: 'c1', consultantId: 'a1',
    packageId: 'pkg1', lessonId: 'l1-19', linkedLessonIds: ['l1-19', 'l1f-9', 'l1-next1'],
    createdAt: weekDateISO(0, 1, 20, 30),
    title: '林晚晴右膝不适加重',
    detail: '第 19 节训练后疼痛 5 → 6，触发评估中的右膝风险提示。教练已调整下节课动作库。',
    timeline: [
      { id: 'i1-t1', at: weekDateISO(0, 1, 20, 15), actorId: 'c1', actorRole: 'coach', kind: 'action', content: '提交课后记录时勾选「疼痛升高」，系统自动生成异常工单并通知顾问。' },
      { id: 'i1-t2', at: weekDateISO(0, 1, 20, 20), actorId: 'system', actorRole: 'system', kind: 'action', content: '已将本周五课程重点改为仰卧位康复动作，冻结弓步/下犬类动作。' },
      { id: 'i1-t3', at: weekDateISO(0, 2, 9), actorId: 'a1', actorRole: 'consultant', kind: 'note', content: '已电话关心会员，说明先把膝盖处理好，续费沟通等教练确认稳定后再进行。' },
      { id: 'i1-t4', at: weekDateISO(0, 2, 9, 30), actorId: 'm1', actorRole: 'member', kind: 'note', content: '今天走路基本没感觉了，下犬还是先不做，我听教练的。' },
    ],
  },
  {
    id: 'i2', type: 'package_expiring', status: 'open', memberId: 'm1', coachId: 'c1', consultantId: 'a1',
    packageId: 'pkg1', linkedLessonIds: [],
    createdAt: past(2, 8),
    title: '进阶课包 12 天后到期，剩余 5 节',
    detail: '系统到期前 14 天自动提醒。会员正处于膝盖调整期，续费沟通须以训练记录为依据。',
    timeline: [
      { id: 'i2-t1', at: past(2, 8), actorId: 'system', actorRole: 'system', kind: 'action', content: '课包进入到期前 14 天窗口，自动生成续费工单（r1）。' },
      { id: 'i2-t2', at: past(1, 10), actorId: 'a1', actorRole: 'consultant', kind: 'note', content: '已查看训练记录：腰痛 7 → 3 改善明显，但膝盖是当前重点，准备先跟进恢复再谈续费。' },
    ],
  },
  {
    id: 'i3', type: 'coach_change', status: 'open', memberId: 'm3', coachId: 'c1', consultantId: 'a1',
    packageId: 'pkg3', linkedLessonIds: ['l3-7', 'l3-8'],
    createdAt: past(1, 19),
    title: '苏晓申请更换教练（沈若 → 唐柠）',
    detail: '会员反馈沈若上课节奏偏紧、压力大，希望换成风格更温和的唐柠（同为女教练，符合会员预约时的性别要求）。',
    timeline: [
      { id: 'i3-t1', at: past(1, 19), actorId: 'm3', actorRole: 'member', kind: 'note', content: '我知道老师很专业，但我每次上课都很紧张，想试试唐柠老师，风格温和一点。' },
      { id: 'i3-t2', at: past(1, 19, 5), actorId: 'system', actorRole: 'system', kind: 'action', content: '已冻结后续 4 节排课的教练确认，等待顾问协调；新教练可查看完整评估与全部训练记录。' },
      { id: 'i3-t3', at: past(1, 20), actorId: 'a1', actorRole: 'consultant', kind: 'note', content: '已和唐柠确认可接收周二/周五 18:00 时段，明天约三方沟通。' },
    ],
  },
  {
    id: 'i4', type: 'progress_behind', status: 'processing', memberId: 'm3', coachId: 'c1', consultantId: 'a1',
    packageId: 'pkg3', linkedLessonIds: ['l3-1', 'l3-3', 'l3-5', 'l3-7'],
    createdAt: past(7, 20),
    title: '苏晓课程进度落后（阶段目标完成约 40%）',
    detail: '12 节课包已上 8 节，因缺勤与缺少家庭练习，动作模式阶段目标完成约 40%。教练标注：需要补课与节奏重排。',
    timeline: [
      { id: 'i4-t1', at: past(7, 20), actorId: 'c1', actorRole: 'coach', kind: 'action', content: '在第 6 节记录中标注进度落后，系统生成工单并同步顾问。' },
      { id: 'i4-t2', at: past(6, 10), actorId: 'a1', actorRole: 'consultant', kind: 'note', content: '已和会员沟通时间问题，会员表示愿意调整，但提出想换教练。' },
      { id: 'i4-t3', at: past(1, 19, 10), actorId: 'system', actorRole: 'system', kind: 'action', content: '会员提交换教练申请，本工单与换教练工单合并跟进。' },
    ],
  },
  {
    id: 'i5', type: 'coach_leave', status: 'open', memberId: 'm4', coachId: 'c2', consultantId: 'a2',
    packageId: 'pkg4', lessonId: 'l4-thu', linkedLessonIds: ['l4-thu'],
    createdAt: weekDateISO(0, 2, 21),
    title: '顾一帆请假，本周四课程待处理',
    detail: '教练家中急事请假两天，影响陈默本周四 19:00 课程。需在改期 / 同性别备选教练代课中确认，不扣课时。',
    timeline: [
      { id: 'i5-t1', at: weekDateISO(0, 2, 21), actorId: 'c2', actorRole: 'coach', kind: 'action', content: '提交请假（周三、周四），系统自动通知会员与顾问并挂起受影响课程。' },
      { id: 'i5-t2', at: weekDateISO(0, 2, 21, 1), actorId: 'system', actorRole: 'system', kind: 'action', content: '已生成待处理工单：可选改期至下周日，或安排男教练代课（记录自动共享）。' },
    ],
  },
  {
    id: 'i6', type: 'reschedule_request', status: 'resolved', memberId: 'm4', coachId: 'c2', consultantId: 'a2',
    packageId: 'pkg4', lessonId: 'l4-mon', linkedLessonIds: ['l4-mon', 'l4-makeup'],
    createdAt: weekDateISO(0, 0, 16), resolvedAt: weekDateISO(0, 0, 16, 20),
    title: '陈默临时改期：本周一 → 下周一',
    detail: '会员加班，提前 3 小时申请改期（本月第 1 次临时改期）。已补排至下周一 19:00。',
    timeline: [
      { id: 'i6-t1', at: weekDateISO(0, 0, 16), actorId: 'm4', actorRole: 'member', kind: 'action', content: '申请把今晚课程改到下周一同时段。' },
      { id: 'i6-t2', at: weekDateISO(0, 0, 16, 10), actorId: 'system', actorRole: 'system', kind: 'action', content: '校验请假规则：提前不足 24 小时，记为本月第 1 次临时改期，可补排。' },
      { id: 'i6-t3', at: weekDateISO(0, 0, 16, 20), actorId: 'a2', actorRole: 'consultant', kind: 'action', content: '确认补排下周一 19:00（l4-makeup），工单关闭。' },
    ],
    resolution: '已补排至下周一 19:00，计入本月第 1 次临时改期。',
  },
  {
    id: 'i7', type: 'complaint', status: 'open', memberId: 'm5', coachId: 'c3', consultantId: 'a1',
    linkedLessonIds: [],
    createdAt: past(2, 17),
    title: '投诉：体验后被频繁电话推销',
    detail: '会员反馈体验课后三天内接到 5 通推销电话；教练评估建议为「低频起步、暂不推荐大课包」，但跟进中未被尊重。',
    timeline: [
      { id: 'i7-t1', at: past(2, 17), actorId: 'm5', actorRole: 'member', kind: 'note', content: '我已经说了预算有限，还是一直让我买 24 节，压力很大。' },
      { id: 'i7-t2', at: past(1, 9), actorId: 'system', actorRole: 'system', kind: 'action', content: '投诉工单升级至顾问主管，冻结该线索的外呼任务。' },
    ],
  },
]
