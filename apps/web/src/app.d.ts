// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces

declare global {
  namespace App {}
}

declare module '$env/static/public' {
  export const PUBLIC_API_URL: string;
  export const PUBLIC_APP_URL: string;
  export const PUBLIC_MINIO_URL: string;
}

export {};
