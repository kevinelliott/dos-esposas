<template>
  <header>
    <nav class="navbar navbar-dark navbar-expand-lg fixed-top navbar-custom">
      <div class="container">
        <a class="navbar-brand" href="/">Dos Esposas Restaurante</a>
        <button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span class="visually-hidden">Toggle navigation</span>
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarSupportedContent">
          <ul class="navbar-nav me-auto my-2 my-lg-0">
            <router-link to="/menu" class="text-decoration-none">Menu</router-link>
          </ul>
          <span v-if="loggedIn">
            <div class="btn-group">
              <button class="btn btn-outline-success">{{ truncateAddress(wallet.address) }}</button>
              <button class="btn btn-outline-success" v-on:click="logout">Disconnect</button>
            </div>
          </span>
          <span v-else>
            <button class="btn btn-outline-success" v-on:click="login">Connect Wallet</button>
          </span>
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
import * as Tezos from '../util/tezos';

import { isLoggedIn } from 'axios-jwt';

export default {
  name: 'Header',
  data: () => ({
    loggedIn: isLoggedIn(),
    wallet: { address: '' }
  }),
  mounted: async function () {
    this.wallet = await Tezos.getActiveAccount();
  },
  methods: {
    login: async function() {
      this.loggedIn = await Auth.login();
      this.wallet = await Tezos.getActiveAccount();
      console.log(this.wallet);
    },
    logout: async function() {
      await Auth.logout();
      location.reload();
    },
    truncateAddress: function(address) {
      if (address === undefined) { return ''; }
      return address.substr(0, 5) + '...' + address.substr(address.length - 5, 5);
    }
  }
}
</script>

<style scoped>
</style>
