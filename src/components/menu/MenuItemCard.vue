<template>
  <div class="card menu-item-card h-100">
    <div class="row g-0 h-100" v-if="itemData.name">
      <div class="col-md-4">
        <img :src="itemData.thumbnailUri" class="card-img-top p-3" :alt="itemData.name">
      </div>
      <div class="col-md-8">
        <div class="card-body">
          <h4 class="card-title">
            <div class="text-truncate" :title="itemData.name">{{ itemData.name }}</div>
            <div class="fw-light">{{ itemData.symbol }}</div>
          </h4>
          <div class="text-muted fw-light">TOTAL SUPPLY</div>
          <div class="mb-2">{{ shiftDownBy(itemData.totalSupply, itemData.decimals).toLocaleString() }}</div>
          <div class="text-muted fw-light">CONTRACT</div>
          <div class="text-truncate">
            <small><span :title="itemData.contractAddress">{{ itemData.contractAddress }}</span></small>
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <div class="p-4 text-center">
        <div class="mb-4 spinner-border" style="width: 3rem; height: 3rem;" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <div class="fw-light">
          Loading from ꜩ blockchain
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as api from '../../util/api';
import * as Auth from '../../util/auth';
import * as Tezos from '../../util/tezos';
import store from '../../util/storage';

export default {
  name: 'MenuItemCard',
  props: {
    item: Object
  },
  data: () => ({
    api: api,
    itemData: {},
    loggedIn: Auth.isLoggedIn(),
    store: store
  }),
  mounted: async function () {
    let itemData = this.store.store.existsItem(this.item.contract);
    if (itemData) {
      console.log('cached item', itemData);
      this.itemData = itemData;
    } else {
      console.log('getting from tezos');
      this.itemData = await this.getMenuItemFromTezos(this.item);
      this.store.store.update(this.item.contract, this.itemData);
    }
  },
  methods: {
    getMenuItemFromTezos: async function () {
      let data = {};
      data['contractAddress'] = this.item.contract;

      let contract = await Tezos.getTokenContract(this.item.contract);
      console.log("token contract", contract);

      contract.storage()
      .then((storage) => {
        console.log('storage', storage);
        data['totalSupply'] = storage.assets.total_supply;
      })
      .catch((error) => console.log(`Error: ${JSON.stringify(error, null, 2)}`));

      let metadata = await Tezos.getTokenMetadata(contract, 0);
      console.log('token metadata', metadata);
      if (metadata !== undefined) {
        data['name'] = metadata.name;
        data['symbol'] = metadata.symbol;
        data['decimals'] = metadata.decimals;
        data['description'] = metadata.description;
        data['thumbnailUri'] = metadata.thumbnailUri;
        data['lastRefreshedAt'] = new Date();
      }

      return data;
    },
    shiftDownBy(number, decimals) {
      return number / Math.pow(10, decimals);
    }
  }
}
</script>

<style scoped>
.menu-item-card:hover {
  background-color: #ee0979;
  color: #fff;
  border-color: #ee0979;
  cursor: pointer;
}

.menu-item-card:hover .text-muted {
  color: #33081d !important;
}
</style>
