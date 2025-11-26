<script>
  let users = [];
  let message = '';
  let loading = false;

  async function fetchUsers() {
    loading = true;
    const res = await fetch('/api/users');
    users = await res.json();
    loading = false;
  }

  async function fetchHello() {
    const res = await fetch('/api/hello');
    const data = await res.json();
    message = data.message;
  }
</script>

<main>
  <h1>🦊 Elysia + Svelte</h1>
  
  <div class="buttons">
    <button on:click={fetchHello}>Get Hello Message</button>
    <button on:click={fetchUsers}>Fetch Users</button>
  </div>

  {#if message}
    <p class="message">{message}</p>
  {/if}

  {#if loading}
    <p>Loading...</p>
  {:else if users.length > 0}
    <ul>
      {#each users as user}
        <li>{user.name} - {user.email}</li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  main {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  h1 {
    color: #ff3e00;
  }

  .buttons {
    display: flex;
    gap: 1rem;
    margin: 1rem 0;
  }

  button {
    padding: 0.5rem 1rem;
    background: #ff3e00;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:hover {
    background: #cc3200;
  }

  .message {
    padding: 1rem;
    background: #f0f0f0;
    border-radius: 4px;
  }

  ul {
    list-style: none;
    padding: 0;
  }

  li {
    padding: 0.5rem;
    margin: 0.5rem 0;
    background: #f9f9f9;
    border-radius: 4px;
  }
</style>