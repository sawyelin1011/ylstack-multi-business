<script lang="ts">
  export let open = false;
  export let title = '';

  function close() {
    open = false;
    dispatch('close');
  }

  function handleBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  function dispatch(name: string) {
    const event = new CustomEvent(name);
    (this as any).dispatchEvent(event);
  }
</script>

{#if open}
  <div
    role="dialog"
    aria-modal="true"
    class="fixed inset-0 z-50 flex items-center justify-center"
    on:click={handleBackdropClick}
  >
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50"></div>

    <!-- Modal content -->
    <div class="relative bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 max-h-[90vh] overflow-auto">
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h3 class="text-lg font-semibold text-gray-900">{title}</h3>
        <button
          on:click={close}
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div class="px-6 py-4">
        <slot />
      </div>
    </div>
  </div>
{/if}
