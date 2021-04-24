<template>
  <header class="text-center text-white masthead">
    <div class="masthead-content">
      <div class="container">
        <h1 class="masthead-heading mb-0 linear-gradient">Hola, amigos!</h1>
        <h2 class="masthead-subheading mb-0">Coming soon.</h2><a class="btn btn-primary btn-xl rounded-pill mt-5" role="button" href="#">Learn More</a>
      </div>
    </div>
  </header>
  <section>
      <div class="container">
          <div class="row align-items-center">
              <div class="col-lg-6 order-lg-2">
                  <div class="p-5"><img class="rounded-circle img-fluid" src="assets/img/taco-badge.jpg"></div>
              </div>
              <div class="col-lg-6 order-lg-1">
                  <div class="p-5">
                      <h2 class="display-4">For those that love Tezos and tacos...</h2>
                      <p>We have some irons in the fire. We don't want to commit to anything publicly yet, but when we do we'll let you know here.</p>
                  </div>
              </div>
          </div>
      </div>
  </section>
  <section>
      <div class="container">
          <div class="row align-items-center">
              <div class="col-lg-6 order-lg-1">
                  <div class="p-5"><img class="rounded-circle img-fluid" src="assets/img/poncho.jpg"></div>
              </div>
              <div class="col-lg-6 order-lg-2">
                  <div class="p-5">
                      <h2 class="display-4">We salute you!</h2>
                      <p>Keep on collecting those $XTZ, building on the Tezos blockchain, trading those tokens, and eating that dank mexican food. Without you none of this would be here.</p>
                  </div>
              </div>
          </div>
      </div>
  </section>
  <section>
      <div class="container">
          <div class="row align-items-center">
              <div class="col-lg-6 order-lg-2">
                  <div class="p-5"><img class="rounded-circle img-fluid" src="assets/img/ingredients.jpg"></div>
              </div>
              <div class="col-lg-6 order-lg-1">
                  <div class="p-5">
                      <h2 class="display-4">Ingredients. Yum.</h2>
                      <p>Only the finest and most natural ingredients are available and used by Dos Esposas Restaurante.</p>
                  </div>
              </div>
          </div>
      </div>
  </section>
</template>

<script>
export default {
  name: 'Splash'
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
.linear-gradient {
  animation: flow 10s ease-in-out infinite;
  background: linear-gradient(-60deg, #e93388, #e48deb, #e43b49, #f1c9bd);
  background-size: 200%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

@keyframes flow {
  0% {
    background-position: 0 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>
