<template>
  <div class="section">
    <div class="container">
      <h1>Ingredients</h1>
      <p class="mb-4">
        At Dos Esposas Restaurante we acquire and use only the finest, freshest, and highest quality ingredients. And because they are the best they keep their value and make great meals.
      </p>
      <div class="row row-cols-1 row-cols-md-3 g-4">
        <div class="col" v-for="ingredient in availableIngredients" :key="ingredient.name">
          <IngredientCard :ingredient="ingredient" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as api from '../../util/api';
import * as Auth from '../../util/auth';
import store from '../../util/storage';

import IngredientCard from './IngredientCard';

export default {
  name: 'Ingredients',
  components: { IngredientCard },
  data: () => ({
    api: api,
    availableIngredients: [],
    ingredients: [],
    loggedIn: Auth.isLoggedIn(),
    store: store,
    wallet: { address: '' }
  }),
  mounted: async function () {
    this.getIngredients();
  },
  methods: {
    getIngredients: async function () {
      let resp = await this.api.request.get('/ingredients'), data;
      if (resp.status == 200 && resp.data) {
        data = resp.data;
        console.log('data', data);
        if (data.available !== undefined) {
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
