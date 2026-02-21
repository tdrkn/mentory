import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

/**
 * Auto-detect API URL based on the current browser location.
 * If someone opens http://192.168.1.5:3000 — API will be http://192.168.1.5:4000
 * If someone opens http://localhost:3000 — API will be http://localhost:4000
 * Works on any server without config changes.
 */
export function getApiUrl(): string {
  if (env.PUBLIC_API_URL) {
    // Keep only origin-level base URL; api client adds `/api` itself.
    return env.PUBLIC_API_URL.replace(/\/+$/, '').replace(/\/api$/, '');
  }

  if (browser) {
    const { origin, protocol, hostname, port } = window.location;

    // Behind reverse proxy on standard ports: API is available on same origin.
    if (!port || port === '80' || port === '443') {
      return origin;
    }

    // Local/dev fallback where web runs on :3000 and API on :4000.
    return `${protocol}//${hostname}:4000`;
  }
  // SSR fallback — used inside containers where API is reachable via container name
  return 'http://api:4000';
}

export function getMinioUrl(): string {
  if (env.PUBLIC_MINIO_URL) {
    return env.PUBLIC_MINIO_URL.replace(/\/+$/, '');
  }

  if (browser) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:9000`;
  }
  return 'http://minio:9000';
}
