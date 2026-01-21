<script lang="ts">
  import MainLayout from '$lib/layouts/MainLayout.svelte';
  import { onMount } from 'svelte';
  import { isAuthenticated } from '$lib/auth/store';
  import { goto } from '$app/navigation';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Input from '$lib/components/Input.svelte';

  onMount(async () => {
    if (!$isAuthenticated) {
      goto('/login');
      return;
    }
  });

  let siteName = 'My YLStack Site';
  let siteDescription = '';
  let saving = false;

  async function saveSettings() {
    saving = true;
    await new Promise(resolve => setTimeout(resolve, 1000));
    saving = false;
  }
</script>

<MainLayout>
  <div class="mb-6">
    <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
    <p class="mt-2 text-gray-600">Configure your platform</p>
  </div>

  <div class="max-w-2xl">
    <Card title="General Settings">
      <Input
        name="siteName"
        label="Site Name"
        placeholder="My YLStack Site"
        bind:value={siteName}
      />

      <Input
        name="siteDescription"
        label="Site Description"
        placeholder="A brief description of your site"
        bind:value={siteDescription}
      />

      <div class="flex justify-end">
        <Button on:click={saveSettings} {loading={saving}}>
          Save Settings
        </Button>
      </div>
    </Card>

    <Card title="Security Settings" class="mt-6">
      <p class="text-gray-600">Security settings coming soon.</p>
    </Card>

    <Card title="Email Settings" class="mt-6">
      <p class="text-gray-600">Email configuration coming soon.</p>
    </Card>
  </div>
</MainLayout>
