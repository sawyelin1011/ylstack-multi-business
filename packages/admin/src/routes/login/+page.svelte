<script lang="ts">
  import MainLayout from '$lib/layouts/MainLayout.svelte';
  import Input from '$lib/components/Input.svelte';
  import Button from '$lib/components/Button.svelte';
  import { auth } from '$lib/auth/store';
  import { goto } from '$app/navigation';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function handleLogin() {
    if (!email || !password) {
      error = 'Please fill in all fields';
      return;
    }

    loading = true;
    error = '';

    try {
      await auth.login(email, password);
      goto('/');
    } catch (err: any) {
      error = err.message || 'Login failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full">
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">YLStack Admin</h1>
      <p class="mt-2 text-gray-600">Sign in to your account</p>
    </div>

    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      {#if error}
        <div class="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      {/if}

      <form on:submit|preventDefault={handleLogin}>
        <Input
          name="email"
          type="email"
          label="Email"
          placeholder="you@example.com"
          bind:value={email}
          required
        />

        <Input
          name="password"
          type="password"
          label="Password"
          placeholder="••••••••"
          bind:value={password}
          required
        />

        <Button {loading} fullWidth type="submit">
          Sign In
        </Button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-sm text-gray-600">
          Don't have an account?
          <a href="/register" class="text-primary-600 hover:text-primary-700">Register</a>
        </p>
      </div>
    </div>
  </div>
</div>
