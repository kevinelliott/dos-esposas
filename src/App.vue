<template>
  <Header />
  <Splash />
</template>

<script>
import * as Auth from './util/auth';
import Header from './components/Header.vue'
import Splash from './components/Splash.vue'

import { isLoggedIn } from 'axios-jwt';

export default {
  name: 'App',
  components: { Header, Splash },
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
