<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { initAuth } from '$lib/stores/auth';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

  const queryClient = new QueryClient();

  onMount(() => {
    initAuth();
  });
</script>

<QueryClientProvider client={queryClient}>
  <slot />
</QueryClientProvider>
