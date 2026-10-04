// 日期工具：种子数据与课表都按「当前自然周（周一开始）」生成，保证任何时间打开都可演示

export const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function toISO(d: Date): string {
  return `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function mondayOf(d: Date = new Date()): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = (x.getDay() + 6) % 7 // 周一=0
  return addDays(x, -dow)
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** weekOffset: 0 本周, -1 上周, 1 下周；dow: 周一=0 … 周日=6 */
export function weekDate(weekOffset: number, dow: number, h = 0, m = 0): Date {
  const d = addDays(mondayOf(), weekOffset * 7 + dow)
  d.setHours(h, m, 0, 0)
  return d
}

export function weekDateISO(weekOffset: number, dow: number, h = 0, m = 0): string {
  return toISO(weekDate(weekOffset, dow, h, m))
}

export function parseISO(s: string): Date {
  return new Date(s.length === 10 ? `${s}T00:00` : s)
}

export function fmtTime(iso: string): string {
  const d = parseISO(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fmtDate(iso: string): string {
  return toISODate(parseISO(iso))
}

export function fmtMD(iso: string): string {
  const d = parseISO(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function fmtDateTime(iso: string): string {
  return `${fmtMD(iso)} ${fmtTime(iso)}`
}

export function weekdayCN(iso: string): string {
  return WEEK_LABELS[(parseISO(iso).getDay() + 6) % 7]
}

export function dayLabel(iso: string): string {
  const today = toISODate(new Date())
  const that = fmtDate(iso)
  const diff = Math.round((parseISO(that).getTime() - parseISO(today).getTime()) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff === -1) return '昨天'
  return `${weekdayCN(iso)} ${fmtMD(iso)}`
}

export function daysUntil(iso: string): number {
  const today = parseISO(toISODate(new Date())).getTime()
  return Math.round((parseISO(iso).getTime() - today) / 86400000)
}

export function relativeFromNow(iso: string): string {
  const diff = Date.now() - parseISO(iso).getTime()
  const mins = Math.round(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} 天前`
  return fmtDateTime(iso)
}

export function weekRangeLabel(weekOffset: number): string {
  const mon = weekDate(weekOffset, 0)
  const sun = weekDate(weekOffset, 6)
  const prefix = weekOffset === 0 ? '本周' : weekOffset === 1 ? '下周' : weekOffset === -1 ? '上周' : ''
  return `${prefix} ${mon.getMonth() + 1}.${mon.getDate()} - ${sun.getMonth() + 1}.${sun.getDate()}`
}
