<script>
  import Reader from './Reader.svelte';
</script>

<main>
  <h1>Svelte Speed Reader</h1>
  <span class="byline">Made by <a href="https://twitter.com/dbwdev" target="_blank">@dbwdev</a> | <a href="https://github.com/dbwdev/svelte-reader" target="_blank">GitHub</a></span>
  <Reader />
</main>

<style>
  main {
    text-align: center;
    padding: 1em;
    max-width: 240px;
    margin: 0 auto;
  }

  h1 {
    color: #ff3e00;
    text-transform: uppercase;
    font-size: 4em;
    font-weight: 100;
  }

  @media (min-width: 640px) {
    main {
      max-width: none;
    }
  }


  @media (max-width: 800px) {
    h1 {
      font-size: 1.5rem;
    }
  }
</style>
