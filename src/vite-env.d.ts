/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GIPHY_API_KEY: string;
  readonly VITE_E2E_TEST_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
