<script>
  export let id;
  export let node = { title: id, children: [] };
  export let nodes; // объект или Map с доступом nodes[id]
  export let getNode = (nid) => nodes[nid] || { title: nid, children: [] };

  // колбэки от родителя:
  export let expandNode = (id) => {};
  export let toggleNode = (id) => {};
  export let setFocus = () => {};

  $: hasChildren = Array.isArray(node.children) && node.children.length > 0;
</script>

<li class="tree-node-item">
  <div
    class="tree-node flex items-start installer-row"
    role="treeitem"
    aria-expanded={node.expanded}
    aria-selected={!!node.checked}
    tabindex="0"
    on:mouseenter={() => setFocus(id)}
    on:focus={() => setFocus(id)}
    data-id={id}
    data-title={node.title}
  >
    <!-- collapse icon -->
    <span
      class="collapse-icon"
      on:click={() => hasChildren && expandNode(id)}
    >
      {#if hasChildren}
        {node.expanded ? '▾' : '▸'}
      {/if}
    </span>

    <!-- checkbox -->
    <input
      type="checkbox"
      class="form-check-input"
      id={"cb-" + id}
      checked={node.checked}
      indeterminate={node.indeterminate}
      data-node-id={id}
      on:change={() => toggleNode(id)}
    />

    <!-- label -->
    <label class="node-label" for={"cb-" + id} data-node-id={id}>
      {node.title}{#if node.required}<span class="opacity-70"> (required)</span>{/if}
    </label>
  </div>

  {#if hasChildren && node.expanded}
    <ul class="node-children">
      {#each node.children as childId}
        <svelte:self
          id={childId}
          node={getNode(childId)}
          nodes={nodes}
          {getNode}
          {expandNode}
          {toggleNode}
          {setFocus}
        />
      {/each}
    </ul>
  {/if}
</li>

<style>
  .tree-node { cursor: pointer; user-select: none; }
  .node-children { margin-left: 1.5rem; list-style: none; padding-left: 0; }
  .collapse-icon { width: 1.125rem; display:inline-block; text-align:center; cursor:pointer; }
  .node-label { margin-left: .25rem; }
  .tree-node-item { margin-bottom: 0.25rem; }
  .installer-row:focus { outline: 2px solid hsl(var(--p)); outline-offset: 1px; }
</style>
