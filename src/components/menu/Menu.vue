<template>
  <div class="section">
    <div class="container">
      <h1>Menu</h1>
      <p class="mb-4">
        At Dos Esposas Restaurante we acquire and use only the finest, freshest, and highest quality ingredients. And because they are the best they keep their value and make great meals.
      </p>
      <div class="row">
        <div class="col-xs-12 col-sm-12 col-md-2 g-2">
          <ul class="nav nav-pills mb-3 flex-md-column" id="horizontal-list-tab" role="tablist">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" id="list-ingredients-list" data-bs-toggle="pill" data-bs-target="#list-ingredients" type="button" role="tab" aria-controls="ingredients" aria-selected="true">Ingredients</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="list-entrees-list" data-bs-toggle="pill" data-bs-target="#list-entrees" type="button" role="tab" aria-controls="entrees" aria-selected="false">Entrées</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="list-drinks-list" data-bs-toggle="pill" data-bs-target="#list-drinks" type="button" role="tab" aria-controls="drinks" aria-selected="false">Drinks</button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="list-deserts-list" data-bs-toggle="pill" data-bs-target="#list-deserts" type="button" role="tab" aria-controls="deserts" aria-selected="false">Deserts</button>
            </li>
          </ul>
        </div>
        <div class="w-100 d-none d-xs-block"></div>
        <div class="col-xs-12 col-sm-12 col-md-10">
          <div class="tab-content" id="nav-tabContent">
            <div class="tab-pane fade show active" id="list-ingredients" role="tabpanel" aria-labelledby="list-ingredients-list">
              <div class="row row-cols-xs-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4">
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

@media (max-width: 767.98px) {
  .nav-pills > li {
    float: none;
    display: block;
  }
}
</style>
