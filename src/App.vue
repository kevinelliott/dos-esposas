<template>
  <Header />
  <router-view />
  <Footer />
</template>

<script>
import * as Auth from './util/auth';
import Footer from './components/Footer.vue';
import Header from './components/Header.vue';

import { isLoggedIn } from 'axios-jwt';

export default {
  name: 'App',
  components: { Header, Footer },
  data: () => ({
    loggedIn: isLoggedIn(),
  }),
  methods: {
    login: async function() {
      this.loggedIn = await Auth.login();
    },
    logout: async function() {
      await Auth.logout();
      location.reload();
    }
  }
}
</script>

<style>
#app {
}
</style>
