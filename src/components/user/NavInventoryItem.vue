<template>
  <li>
    <a class="dropdown-item" href="#">
      <div class="row">
        <div class="col">
          <div style="width: 50px; height: 50px;">
            <img class="img-fluid" :src="item.thumbnail_uri">
          </div>
        </div>
        <div class="col text-end">
          <h5 class='mb-0'>{{ item.symbol }}</h5>
          <div>{{ new Number(item.balance).toLocaleString() }}</div>
        </div>
      </div>
    </a>
  </li>
</template>

<script>
export default {
  name: 'NavInventoryItem',
  props: ['item']
}
</script>