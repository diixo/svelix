<style>
  .tree-node { cursor: pointer; user-select: none; }
  .node-children { margin-left: 1.5rem; list-style: none; padding-left: 0; }
  .collapse-icon { width: 1.125rem; display:inline-block; text-align:center; cursor:pointer; }
  .node-label { margin-left: .25rem; }
  .tree-node-item { margin-bottom: 0.25rem; }
  .d-none { display: none; }
</style>


<script>
  export let id;
  export let node = { title: id, children: [] };
  export let nodes; // объект или Map с доступом nodes[id]
  export let getNode = (nid) => nodes[nid] || { title: nid, children: [] };

  // колбэки от родителя:
  export let onExpand = (id) => {};
  export let onToggle = (id) => {};

  // Состояние открытия (как ul.classList.remove/add)
  let expanded = false;

  const hasChildren = Array.isArray(node.children) && node.children.length > 0;

  function toggleExpand(event) {
    event.stopPropagation();

    if (!hasChildren) return;

    expanded = !expanded;

    // логика смены иконки и d-none такая же как в JS
  }
</script>

<li class="tree-node-item">
  <!-- Абсолютно тот же контейнер -->
  <div>
    <!-- collapseIcon -->
    <span
      class="collapse-icon"
      on:click={toggleExpand}
    >
      {hasChildren ? (expanded ? '▾' : '▸') : ''}
    </span>

    <!-- checkbox -->
    <input
      type="checkbox"
      id={"cb-" + id}
      class="form-check-input"
      data-node-id={id}
      checked={node.checked}
      on:change={() => onToggle(id)}
    />

    <!-- label -->
    <label
      class="node-label"
      for={"cb-" + id}
      data-node-id={id}
    >
      {node.title || id}
    </label>
  </div>

  {#if hasChildren}
    <ul class={`node-children ${expanded ? '' : 'd-none'}`} id={"children-" + id} >
      {#each node.children as childId}
        <svelte:self
          id={childId}
          node={getNode(childId)}
          nodes={nodes}
          {getNode}
          onToggle={onToggle}
          onExpand={onExpand}
        />
      {/each}
    </ul>
  {/if}
</li>
