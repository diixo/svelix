<script>
  export let id;
  export let depth = 0;
  // Current node is passed as a prop to ensure reactivity when parent map updates
  export let node;
  export let expandNode;
  export let toggleNode;
  export let getNode; // helper to fetch child node objects by id
  export let setFocus = () => {};
</script>

{#if node}
  <div class="flex items-start gap-2 py-1 installer-row" style={`padding-left: ${Math.min(depth*1.0, 2)}rem`} role="treeitem" aria-expanded={node.expanded} aria-selected={!!node.checked} tabindex="0" on:mouseenter={() => setFocus(id)} on:focus={() => setFocus(id)} data-id={id} data-title={node.title}>
    <button class="btn btn-xs rounded-none" on:click={() => expandNode(id)} disabled={node.loading} title={node.expanded ? 'Collapse' : 'Expand'}>
      {#if node.loading}
        …
      {:else}
        {node.expanded ? '−' : '+'}
      {/if}
    </button>
    <input type="checkbox" class="checkbox checkbox-xs mt-1 accent-green-600" checked={node.checked} indeterminate={node.indeterminate} on:change={() => toggleNode(id)}>
    <div class="text-sm leading-tight select-text">{node.title}{#if node.required}<span class="opacity-70"> (required)</span>{/if}</div>
  </div>
  {#if node.expanded}
    {#each (node.children || []) as childId}
      <svelte:self id={childId} depth={depth + 1} node={getNode(childId)} {expandNode} {toggleNode} {getNode} {setFocus} />
    {/each}
  {/if}
{/if}

<style>
  .installer-row:focus { outline: 2px solid hsl(var(--p)); outline-offset: 1px; }
</style>
