<template>
  <header>
    <nav class="navbar navbar-dark navbar-expand-lg fixed-top navbar-custom">
      <div class="container">
        <a class="navbar-brand" href="#">Dos Esposas Restaurante</a>
        <button class="navbar-toggler" data-bs-toggle="collapse">
          <span class="visually-hidden">Toggle navigation</span>
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse">
          <ul class="navbar-nav me-auto my-2 my-lg-0">
          </ul>
          <button class="btn btn-outline-success" v-on:click="login">Connect Wallet</button>
        </div>
      </div>
    </nav>
    <noscript>
      <strong>We're sorry but Dos Esposas Restaurante doesn't work properly without JavaScript enabled. Please enable it to continue.</strong>
    </noscript>
  </header>
</template>

<script>
import * as Auth from '../util/auth';

import { isLoggedIn } from 'axios-jwt';

export default {
  name: 'Header',
  data: () => ({
    loggedIn: isLoggedIn(),
  }),
  methods: {
    login: async function() {
      this.loggedIn = await Auth.login();
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
