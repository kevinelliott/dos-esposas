<template>
  <div class="card h-100">
    <div class="row g-0 h-100" v-if="ingredientData.name">
      <div class="col-md-4">
        <img :src="ingredientData.thumbnailUri" class="card-img-top p-3" :alt="ingredientData.name">
      </div>
      <div class="col-md-8">
        <div class="card-body">
          <h4 class="card-title">
            <div class="text-truncate" :title="ingredientData.name">{{ ingredientData.name }}</div>
            <div class="fw-light">{{ ingredientData.symbol }}</div>
          </h4>
          <div class="text-muted fw-light">TOTAL SUPPLY</div>
          <div class="mb-2">{{ ingredientData.totalSupply.shiftedBy(ingredientData.decimals * -1).toFormat() }}</div>
          <div class="text-muted fw-light">CONTRACT</div>
          <div class="text-truncate">
            <small><span :title="ingredientData.contractAddress">{{ ingredientData.contractAddress }}</span></small>
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

export default {
  name: 'IngredientCard',
  props: {
    ingredient: Object
  },
  data: () => ({
    api: api,
    ingredientData: {},
    loggedIn: Auth.isLoggedIn()
  }),
  mounted: async function () {
    this.ingredientData = await this.getIngredientFromTezos(this.ingredient);
  },
  methods: {
    getIngredientFromTezos: async function () {
      console.log(this.ingredient);
      let data = {};
      data['contractAddress'] = this.ingredient.contract;

      let contract = await Tezos.getTokenContract(this.ingredient.contract);
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
      }

      return data;
    }
  }
}
</script>

<style scoped>
.ingredient {
  width: 200px;
  height: 200px;
  padding: 20px;
  background-color: #ff0000;
}
</style>
