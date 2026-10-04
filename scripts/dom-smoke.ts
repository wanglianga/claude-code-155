// 真实 DOM 冒烟：挂载完整 App，切换全部身份与路由，检查渲染无异常
import './dom-env'
import { win } from './dom-env'
import { createApp, nextTick } from 'vue'
import { createPinia } from 'pinia'
import App from '../src/App.vue'
import { router } from '../src/router'
import { useYogaStore } from '../src/stores/yoga'

let pass = 0, fail = 0
function check(cond: boolean, msg: string) {
  if (cond) { pass++; console.log('  ✅', msg) } else { fail++; console.log('  ❌', msg) }
}

const errors: unknown[] = []
win.addEventListener('error', (e: any) => errors.push(e.message || e))

async function main() {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.config.errorHandler = (err) => errors.push(err)
  const root = win.document.createElement('div')
  win.document.body.appendChild(root)
  app.mount(root)

  const store = useYogaStore()
  await router.isReady()

  async function goto(user: string, path: string) {
    store.switchUser(user)
    await nextTick() // 先让 App 的身份重定向 watcher 完成
    await router.push(path)
    await nextTick(); await new Promise(r => setTimeout(r, 60))
  }
  const pageText = () => root.textContent ?? ''

  // 路由级渲染检查
  const pageCases: [string, string, string[]][] = [
    ['m1', '/member', ['林晚晴', '风险提示', '续费提醒']],
    ['m1', '/member/trial', ['']],
    ['m1', '/member/schedule', ['我的课表']],
    ['m1', '/member/records', ['课节记录', '上报身体不适']],
    ['m7', '/member/trial', ['预约问卷']],
    ['c1', '/coach', ['本周教学', '体态评估', '我的会员']],
    ['c2', '/coach', ['顾一帆']],
    ['a1', '/consultant', ['体验转化率', '续费跟进']],
    ['a1', '/consultant/incidents', ['异常协同中心']],
    ['a2', '/consultant', ['体验转化']],
    ['a2', '/consultant/incidents', ['协同']],
  ]

  for (const [user, path, kws] of pageCases) {
    await goto(user, path)
    const text = pageText()
    check(text.length > 200, `${user}@${path} 页面正常渲染（${text.length} 字符）`)
    for (const kw of kws) if (kw) check(text.includes(kw), `${user}@${path} 包含「${kw}」`)
  }

  // 交互：会员端打开疼痛上报弹窗
  await goto('m1', '/member/records')
  const btns = [...root.querySelectorAll('button')] as any[]
  const painBtn = btns.find(b => (b.textContent || '').includes('上报身体不适'))
  check(!!painBtn, '找到「上报身体不适」按钮')
  painBtn?.dispatchEvent(new win.Event('click', { bubbles: true }))
  await nextTick()
  check((win.document.body.textContent || '').includes('当前疼痛程度'), '疼痛上报弹窗可打开')

  // 回到教练端确认无报错
  await goto('c1', '/coach')
  check(!pageText().includes('Cannot read'), '教练端无运行时报错文案')

  console.log(`\n运行时错误：${errors.length ? '\n' + errors.map(String).join('\n') : '无'}`)
  console.log(`\n结果：${pass} 通过，${fail} 失败`)
  if (fail || errors.length) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })
