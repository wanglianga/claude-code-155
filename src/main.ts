import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { useAuthStore } from './stores/auth'
import { useDataStore } from './stores/data'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// 路由守卫依赖登录态与数据，需在 router 之前完成初始化
useDataStore().init()
useAuthStore().init()

app.use(router)
app.mount('#app')
