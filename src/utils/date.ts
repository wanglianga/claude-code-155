// 日期工具：全部基于运行时的“今天”，保证演示数据永远是当前周
export function fmt(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function today(): string {
  return fmt(new Date())
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return fmt(d)
}

export function daysAgo(n: number): string {
  return addDays(today(), -n)
}

export function daysBetween(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()
  return Math.round(ms / 86400000)
}

export function weekdayOf(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getDay()
}

export const WEEKDAY_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function weekdayCn(dateStr: string): string {
  return WEEKDAY_CN[weekdayOf(dateStr)]
}

/** 从 from（含）起找到 weekday(0-6) 的下一个日期 */
export function nextWeekday(from: string, weekday: number): string {
  let d = from
  for (let i = 0; i < 8; i++) {
    if (weekdayOf(d) === weekday) return d
    d = addDays(d, 1)
  }
  return d
}

export function nowStr(): string {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${fmt(d)} ${hh}:${mm}`
}

let seq = 0
export function uid(prefix: string): string {
  seq += 1
  return `${prefix}_${Date.now().toString(36)}_${seq}_${Math.floor(Math.random() * 1e4)}`
}
