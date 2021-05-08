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
              <button class="btn btn-outline-success dropdown-toggle" data-bs-toggle="dropdown" href="#" role="button" aria-expanded="false">{{ truncateAddress(wallet.address) }}</button>
              <ul class="dropdown-menu dropdown-menu-end" style="overflow-y: auto; max-height: 80vh;">
                <li><h6 class="dropdown-header">Your Inventory</h6></li>
                <div
                  v-for="item in walletAssets"
                  :key="`token_${item.contract}`"
                  >
                  <NavInventoryItem :item="item" />
                </div>
              </ul>
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
import * as api from '../util/api';
import * as Auth from '../util/auth';
import * as Tezos from '../util/tezos';

import { isLoggedIn } from 'axios-jwt';

import NavInventoryItem from './user/NavInventoryItem';

export default {
  name: 'Header',
  components: { NavInventoryItem },
  data: () => ({
    api: api,
    loggedIn: isLoggedIn(),
    menuItems: [],
    menuItemsWhitelist: [],
    wallet: { address: '' },
    walletAssets: []
  }),
  mounted: async function () {
    await this.getMenu();
    this.wallet = await Tezos.getActiveAccount();
    await this.getWalletAssets();
  },
  methods: {
    getMenu: async function () {
      let resp = await this.api.request.get('/menu'), data;
      if (resp.status == 200 && resp.data) {
        data = resp.data;
        console.log('data', data);
        if (data.items !== undefined) {
          this.menuItems = data.items;
        }
      }
      this.menuItemsWhitelist = [];
      this.menuItems.available.forEach((item) => {
        this.menuItemsWhitelist.push(item.contract);
      });
      return;
    },
    getWalletAssets: async function() {
      this.walletAssets = [];
      const assets = await Tezos.getWalletAssets(this.wallet.address);
      await assets.forEach(async (asset) => {
        if (this.menuItemsWhitelist.includes(asset.contract)) {
          console.log('asset', asset);
          this.walletAssets.push(asset);
        }
      });
      return;
    },
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
.dropdown-menu {
  width: 300px !important;
}
</style>
