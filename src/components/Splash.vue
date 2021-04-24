<template>
  <header class="text-center text-white masthead">
    <div class="masthead-content">
      <div class="container">
        <h1 class="masthead-heading mb-0 linear-gradient">Hola, amigos!</h1>
        <h2 class="masthead-subheading mb-0">Coming soon.</h2>
      </div>
    </div>
  </header>
  <div class="section-email-list p-5 text-center">
    <div>
      <div class="container">
        <div id="mc_embed_signup">
          <form action="https://restaurant.us1.list-manage.com/subscribe/post?u=939a9d2a0c4ee66e364cb8ef7&amp;id=5ed757d3fb" method="post" id="mc-embedded-subscribe-form" name="mc-embedded-subscribe-form" class="validate" target="_blank" novalidate>
            <div id="mc_embed_signup_scroll">
              <div class="row">
                <div class="mc-field-group col">
                  <div class="row mt-2 justify-content-center">
                    <div class="col-7">
                      <input type="email" value="" name="EMAIL" class="required email form-control form-control-lg rounded-pill p-4" id="mce-EMAIL" placeholder="Email address">
                    </div>
                    <div class="col-auto">
                      <input type="submit" value="Get Notified" name="subscribe" id="mc-embedded-subscribe" class="mt-1 btn btn-light btn-xl rounded-pill">
                    </div>
                  </div>
                  <div class="mt-4 row justify-content-center">
                    <div class="col-12">
                      <h3 class="text-light fw-lighter">Enter your email address and we'll keep you informed.</h3>
                    </div>
                  </div>
                </div>
              </div>
              <div id="mce-responses" class="clear">
                <div class="response" id="mce-error-response" style="display:none"></div>
                <div class="response" id="mce-success-response" style="display:none"></div>
              </div>
              <div style="position: absolute; left: -5000px;" aria-hidden="true"><input type="text" name="b_939a9d2a0c4ee66e364cb8ef7_5ed757d3fb" tabindex="-1" value=""></div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
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
.section-email-list {
  background-color: #198754;
}

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
