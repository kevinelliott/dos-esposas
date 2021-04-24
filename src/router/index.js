import { createWebHistory, createRouter } from 'vue-router';
import { isLoggedIn } from 'axios-jwt';
import * as Auth from '../util/auth';

// Components
import PageNotFound from '../components/PageNotFound';
import Splash from '../components/Splash';
// User
import Profile from '../components/user/Profile';
// Content
import Menu from '../components/menu/Menu';


// Routes
const routes = [
  // General
  { path: '/', name: 'Splash', component: Splash },
  // User
  { path: '/profile', name: 'Profile', component: Profile, meta: { requiresAuth: true } },
  // Content
  { path: '/menu', name: 'Menu', component: Menu },
  // Not Found
  { path: '/:pathMatch(.*)*', name: 'PageNotFound', component: PageNotFound }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to, from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isLoggedIn()) {
      await Auth.login();
      next();
    } else {
      next();
    }
  } else {
    next();
  }
});

router.afterEach(async (to/*, from*/) => {
  if (!window['ga']) {
    return;
  }
  window.ga('set', 'page', to.path);
  window.ga('send', 'pageview');
  // console.log('Router =>', {to: to, from: from});
});

export default router;
