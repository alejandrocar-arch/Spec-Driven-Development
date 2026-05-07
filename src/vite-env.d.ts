/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_STORE_NAME?: string;
  readonly VITE_STORE_ADDRESS?: string;
  readonly VITE_SYNC_INTERVAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
