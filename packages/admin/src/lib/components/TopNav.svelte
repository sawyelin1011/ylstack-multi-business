<script lang="ts">
  import { user, auth } from '$lib/auth/store';

  export let menuClick: () => void;
</script>

<header class="bg-white border-b border-gray-200 h-16">
  <div class="flex items-center justify-between h-full px-4">
    <!-- Mobile menu button -->
    <button
      on:click={menuClick}
      class="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>

    <!-- Spacer for desktop -->
    <div class="hidden md:block"></div>

    <!-- User menu -->
    {#if $user}
      <div class="flex items-center space-x-4">
        <span class="text-sm text-gray-600">{$user.email}</span>
        <button
          on:click={() => auth.logout()}
          class="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
        >
          Logout
        </button>
      </div>
    {/if}
  </div>
</header>
