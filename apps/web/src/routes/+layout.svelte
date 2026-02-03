<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { initAuth } from '$lib/stores/auth';

  onMount(() => {
    initAuth();
  });
</script>

<slot />
