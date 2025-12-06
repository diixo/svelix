export async function patTest(host, token) {
  const res = await fetch('http://127.0.0.1:8001/confluence/pat/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confluence_host: host, token }),
  });
  return res.json();
}

export async function patSave(host, token) {
  const body = token ? { confluence_host: host, token } : { confluence_host: host };
  const res = await fetch('http://127.0.0.1:8001/confluence/pat/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function getPat() {
  const res = await fetch('http://127.0.0.1:8001/confluence/pat');
  return res.json();
}

export async function treeBySpace(space, rootPageId = '') {
  const params = new URLSearchParams();
  if (space) params.set('space', space);
  if (rootPageId) params.set('root_page_id', rootPageId);
  const url = `http://127.0.0.1:8001/confluence/tree?${params.toString()}`;
  const res = await fetch(url);
  return res.json();
}

export async function resolveRoot(space) {
  const r = await treeBySpace(space);
  return r && r.root_page_id ? r.root_page_id : '';
}

export async function selection(space, includeIds, excludeIds = []) {
  const res = await fetch('http://127.0.0.1:8001/confluence/selection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ space, include_ids: includeIds, exclude_ids: excludeIds }),
  });
  return res.json();
}

export async function evaluate(space, rootPageId, workers = 10) {
  const res = await fetch('http://127.0.0.1:8001/confluence/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ space, root_page_id: rootPageId, workers }),
  });
  return res.json();
}

export async function pull(space, workers = 10) {
  const res = await fetch('http://127.0.0.1:8001/confluence/pull', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ space, workers }),
  });
  return res.json();
}

export async function build(space) {
  const res = await fetch('http://127.0.0.1:8001/confluence/build', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ space }),
  });
  return res.json();
}

export async function activate(space) {
  const res = await fetch('http://127.0.0.1:8001/confluence/activate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ space }),
  });
  return res.json();
}

export async function getStatus(space) {
  const res = await fetch(`http://127.0.0.1:8001/confluence/status?space=${encodeURIComponent(space)}`);
  return res.json();
}
