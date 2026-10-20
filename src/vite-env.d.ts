/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Short commit SHA of this build (see vite.config.ts). */
declare const __APP_COMMIT__: string;
/** ISO timestamp of this build. */
declare const __APP_BUILT_AT__: string;
