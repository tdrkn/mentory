import { browser } from '$app/environment';

/**
 * Auto-detect API URL based on the current browser location.
 * If someone opens http://192.168.1.5:3000 — API will be http://192.168.1.5:4000
 * If someone opens http://localhost:3000 — API will be http://localhost:4000
 * Works on any server without config changes.
 */
export function getApiUrl(): string {
  if (browser) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:4000`;
  }
  // SSR fallback — used inside containers where API is reachable via container name
  return 'http://api:4000';
}

export function getMinioUrl(): string {
  if (browser) {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:9000`;
  }
  return 'http://minio:9000';
}
