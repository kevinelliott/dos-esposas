<template>
  <div class="section">
    <div class="container">
      <h1>Ingredients</h1>
      <p class="mb-4">
        At Dos Esposas Restaurante we acquire and use only the finest, freshest, and highest quality ingredients. And because they are the best they keep their value and make great meals.
      </p>
      <div class="row row-cols-1 row-cols-md-3 g-4">
        <div class="col" v-for="ingredient in ingredients" :key="ingredient.name">
          <div class="card h-100" style="width: 18rem;">
            <img :src="ingredient.thumbnailUri" class="card-img-top p-5" :alt="ingredient.name">
            <div class="card-body">
              <h3 class="card-title">
                <div class="row">
                  <div class="col text-truncate" :title="ingredient.name">{{ ingredient.name }}</div>
                  <div class="col text-end text-muted">{{ ingredient.symbol }}</div>
                </div>
              </h3>
              <p class="card-text text-justify fw-light" style="text-align: justify;">
                {{ ingredient.description }}
              </p>
            </div>
            <div class="card-footer">
              <div class="card-text text-truncate">
                <small class="text-muted"><strong>CONTRACT</strong> <span :title="ingredient.contractAddress">{{ ingredient.contractAddress }}</span></small>
              </div>
            </div>
          </div>
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
  name: 'Ingredients',
  data: () => ({
    api: api,
    availableIngredients: [],
    ingredients: [],
    loggedIn: Auth.isLoggedIn(),
    wallet: { address: '' }
  }),
  mounted: async function () {
    this.wallet = await Tezos.getActiveAccount();
    this.getIngredients();
  },
  methods: {
    getIngredients: async function () {
      let resp = await this.api.request.get('/ingredients'), data;
      if (resp.status == 200 && resp.data) {
        data = resp.data;
        console.log('data', data);
        if (data.available !== undefined) {
          data.available.forEach(async (ingredient) => {
            console.log(ingredient);
            let metadata = await Tezos.getTokenMetadata(ingredient.contract, 0);
            metadata['contractAddress'] = ingredient.contract;
            console.log('token metadata', metadata);
            if (metadata !== undefined) {
              this.ingredients.push(metadata);
            }
          });
          this.availableIngredients = data.available;
        }
      }
      return;
    }
  }
}
</script>

<style scoped>
.section {
  margin-top: 100px;
  margin-bottom: 40px;
}

.ingredient {
  width: 200px;
  height: 200px;
  padding: 20px;
  background-color: #ff0000;
}
</style>
