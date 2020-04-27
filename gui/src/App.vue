<template>
  <div id="app">
    <Main />
  </div>
</template>

<script>
import Main from './components/Main.vue'

export default {
  name: 'App',
  components: {
    Main
  }
}
</script>

<style>
html,
body {
    height: 100%;
}

body {
    /*background-color: #f5f5f5 !important;s*/
	background-image: url("../public/img/background.png");
}
</style>
