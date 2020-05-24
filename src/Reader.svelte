<script>
  import { onMount } from 'svelte'

  let acl = new Accelerometer({ frequency: 60 })

  acl.addEventListener('reading', () => {
    console.log('Acceleration along the X-axis ' + acl.x)
    console.log('Acceleration along the Y-axis ' + acl.y)
    console.log('Acceleration along the Z-axis ' + acl.z)
  })

  acl.start()

  const MIN_SPEED = 1000
  const MAX_SPEED = 50

  let word = ''
  let speed = 200

  let articleText = ''

  function startReading() {
    if (!articleText) alert('You need to enter some text!')
    renderWord(articleText.split(' ').reverse())
  }

  function renderWord(array) {
    const arrayCopy = [...array]

    function selectWord() {
      const currWord = arrayCopy.pop()
      if (currWord) word = currWord
      else word = 'END'

      setTimeout(selectWord, speed)
    }

    setTimeout(selectWord(), speed)
  }

  function increaseSpeed() {
    if (speed >= MAX_SPEED) speed -= 50
  }

  function decreaseSpeed() {
    if (speed <= MIN_SPEED) speed += 50
  }
</script>

<style>
  .container {
    display: grid;
    grid-template-rows: 1fr 1fr;
    height: 100vh;
    justify-items: center;

  }

  .word {
    align-self: center;
    display: inline-block;
    font-family: 'Avenir';
    font-size: 3rem;
  }

  .control-group {
  }

  @media (max-width: 800px) {
    .word {
      font-size: 2.5rem;
    }
  }
</style>

<div class="container">
  <span class="word">{word}</span>
  <div class="control-group">
    <div class="button-group">
      <button on:click={increaseSpeed}>+ Speed</button>
      <button on:click={decreaseSpeed}>- Speed</button>
    </div>

    <p>X is {acl.x}</p>
    <p>Y is {acl.y}</p>
    <p>Z is {acl.z}</p>
    <textarea on:change={e => (articleText = e.target.value)} />

    <div>
      <button on:click={startReading}>Start</button>
    </div>
  </div>
</div>
