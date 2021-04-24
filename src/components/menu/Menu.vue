<template>
  <div class="section">
    <div class="container">
      <h1>Menu</h1>
      <p class="mb-4">
        At Dos Esposas Restaurante we acquire and use only the finest, freshest, and highest quality ingredients. And because they are the best they keep their value and make great meals.
      </p>
      <div class="row">
        <div class="col-2 col-sm-3 col-md-2">
          <div class="list-group" id="list-tab" role="tablist">
            <a class="list-group-item list-group-item-action active" id="list-ingredients-list" data-bs-toggle="list" href="#list-ingredients" role="tab" aria-controls="ingredients">Ingredients</a>
            <a class="list-group-item list-group-item-action" id="list-entrees-list" data-bs-toggle="list" href="#list-entrees" role="tab" aria-controls="entrees">Entrées</a>
            <a class="list-group-item list-group-item-action" id="list-drinks-list" data-bs-toggle="list" href="#list-drinks" role="tab" aria-controls="drinks">Drinks</a>
            <a class="list-group-item list-group-item-action" id="list-deserts-list" data-bs-toggle="list" href="#list-deserts" role="tab" aria-controls="deserts">Deserts</a>
          </div>
        </div>
        <div class="col-10 col-sm-9 col-md-10">
          <div class="tab-content" id="nav-tabContent">
            <div class="tab-pane fade show active" id="list-ingredients" role="tabpanel" aria-labelledby="list-ingredients-list">
              <div class="row row-cols-1 row-cols-md-3 g-4">
                <div class="col" v-for="item in items.ingredients" :key="item.contractAddress">
                  <MenuItemCard :item="item" />
                </div>
              </div>
            </div>
            <div class="tab-pane fade" id="list-entrees" role="tabpanel" aria-labelledby="list-entrees-list">
              <div class="row row-cols-1 row-cols-md-3 g-4">
                <div class="col" v-for="item in items.entrees" :key="item.contractAddress">
                  <MenuItemCard :item="item" />
                </div>
              </div>
            </div>
            <div class="tab-pane fade" id="list-drinks" role="tabpanel" aria-labelledby="list-drinks-list">
              <div class="row row-cols-1 row-cols-md-3 g-4">
                <div class="col" v-for="item in items.drinks" :key="item.contractAddress">
                  <MenuItemCard :item="item" />
                </div>
              </div>
            </div>
            <div class="tab-pane fade" id="list-deserts" role="tabpanel" aria-labelledby="list-deserts-list">
              <div class="row row-cols-1 row-cols-md-3 g-4">
                <div class="col" v-for="item in items.deserts" :key="item.contractAddress">
                  <MenuItemCard :item="item" />
                </div>
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
import store from '../../util/storage';

import MenuItemCard from './MenuItemCard';

export default {
  name: 'Menu',
  components: { MenuItemCard },
  data: () => ({
    api: api,
    items: [],
    ingredients: [],
    loggedIn: Auth.isLoggedIn(),
    store: store,
    wallet: { address: '' }
  }),
  mounted: async function () {
    this.getMenu();
  },
  methods: {
    getMenu: async function () {
      let resp = await this.api.request.get('/menu'), data;
      if (resp.status == 200 && resp.data) {
        data = resp.data;
        console.log('data', data);
        if (data.items !== undefined) {
          this.items = data.items;
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
