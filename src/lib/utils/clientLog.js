export async function clientLog(tag, payload = {}) {
  try {
    const body = { ...payload, ts: new Date().toLocaleString() };
    // Mirror to console for local triage
    // eslint-disable-next-line no-console
    console.log('[client-log]', tag, body);
    // await fetch('/__client_log', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'X-Tag': tag },
    //   body: JSON.stringify(body),
    //   // keepalive lets logs succeed during unloads
    //   keepalive: true,
    // });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[client-log] failed', tag, e);
  }
}

