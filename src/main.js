import { createApp } from 'vue'
import App from './App.vue'
import VueGtag from "vue-gtag-next";


createApp(App)
  .use(VueGtag, {
    config: { id: "G-WBF050VEEQ" }
  })
  .mount('#app')
