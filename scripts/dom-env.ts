// happy-dom 全局环境垫片，必须在任何依赖 DOM 的模块之前导入
import { Window } from 'happy-dom'
const win = new Window({ url: 'http://localhost/' })
const g = globalThis as any
g.window = win
g.document = win.document
try { Object.defineProperty(g, 'navigator', { value: win.navigator, configurable: true }) } catch { /* node 内置只读 navigator 可直接使用 */ }
g.location = win.location
g.history = win.history
g.HTMLElement = win.HTMLElement
g.Element = win.Element
g.Node = win.Node
g.SVGElement = win.SVGElement
g.Event = win.Event
g.MouseEvent = win.MouseEvent
g.KeyboardEvent = win.KeyboardEvent
g.customElements = win.customElements
g.getComputedStyle = win.getComputedStyle
g.requestAnimationFrame = (cb: any) => setTimeout(cb, 0)
g.cancelAnimationFrame = (id: any) => clearTimeout(id)
export { win }
