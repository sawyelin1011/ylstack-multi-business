<script lang="ts">
  import MainLayout from '$lib/layouts/MainLayout.svelte';
  import { onMount } from 'svelte';
  import { api } from '$lib/api/client';
  import { isAuthenticated, isAdmin } from '$lib/auth/store';
  import { goto } from '$app/navigation';
  import Card from '$lib/components/Card.svelte';

  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }

    if (!$isAdmin) {
      goto('/');
      return;
    }
  });

  let plugins = [
    { name: 'hello-plugin', version: '1.0.0', description: 'A simple hello world plugin', enabled: true },
    { name: 'pages-plugin', version: '1.0.0', description: 'Content page management system', enabled: true },
    { name: 'forms-plugin', version: '1.0.0', description: 'Form builder and submission management', enabled: false },
  ];
</script>

<MainLayout>
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900">Plugins</h1>
    <p class="mt-2 text-gray-600">Manage platform plugins</p>
  </div>

  <div class="space-y-4">
    {#each plugins as plugin}
      <Card>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold text-gray-900">{plugin.name}</h3>
            <p class="text-sm text-gray-600 mt-1">{plugin.description}</p>
            <p class="text-xs text-gray-500 mt-1">Version: {plugin.version}</p>
          </div>
          <div class="flex items-center space-x-2">
            <span
              class="px-3 py-1 rounded-full text-sm font-medium"
              class:bg-green-100={plugin.enabled}
              class:text-green-800={plugin.enabled}
              class:bg-gray-100={!plugin.enabled}
              class:text-gray-800={!plugin.enabled}
            >
              {plugin.enabled ? 'Enabled' : 'Disabled'}
            </span>
            <button class="px-3 py-1 text-sm text-primary-600 hover:text-primary-800">
              Configure
            </button>
          </div>
        </div>
      </Card>
    {/each}
  </div>
</MainLayout>
