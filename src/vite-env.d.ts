/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FB_V1: string
  readonly VITE_FB_V2: string
  readonly VITE_FB_V3: string
  readonly VITE_FB_V4: string
  readonly VITE_FB_V5: string
  readonly VITE_FB_V6: string
  readonly VITE_FB_V7: string
  readonly VITE_FB_V8: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
