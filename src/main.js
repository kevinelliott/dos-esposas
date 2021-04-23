import { createApp } from 'vue'
import App from './App.vue'
import VueGtag from "vue-gtag-next";
import router from './router';

createApp(App)
  .use(router)
  .use(VueGtag, {
    config: { id: "G-WBF050VEEQ" }
  })
  .mount('#app')
