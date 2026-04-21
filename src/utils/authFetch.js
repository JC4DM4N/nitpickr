export async function authFetch(path, options = {}) {
  const url = path.startsWith('/') ? `/api${path}` : path;
  const res = await fetch(url, options);
  if (res.status === 401) {
    window.dispatchEvent(new Event('auth:expired'));
  }
  return res;
}
