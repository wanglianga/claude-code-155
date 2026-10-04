import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import './styles/main.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)

// 启动后执行一次系统规则：课包临期自动生成续费工单
import { useYogaStore } from './stores/yoga'
const store = useYogaStore()
store.ensureExpiryIncidents()

app.mount('#app')
