export const Config = {
  server: {
    port: parseInt(process.env.PORT ?? '44300', 10),
    env: process.env.NODE_ENV ?? 'development',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  },
  sap: {
    odataBaseUrl: process.env.SAP_ODATA_BASE_URL ?? '',
    csrfFetchPath: process.env.SAP_ODATA_CSRF_PATH ?? '/',
    sessionTtlSeconds: parseInt(process.env.SAP_SESSION_TTL_SECONDS ?? '1800', 10),
    sessionDir: process.env.SAP_SESSION_DIR ?? './sap-sessions',
    productBaseUrl: process.env.SAP_PRODUCT_BASE_URL ?? '',
    materialStockBaseUrl: process.env.SAP_MATERIAL_STOCK_BASE_URL ?? '',
    // DEMO ONLY: when true, App 2 (GR from Production) skips the SAP POST and
    // returns a dummy success. Defaults to on; set to 'false' once SAP is ready.
    demoStubGrProduction: (process.env.SAP_DEMO_STUB_GR_PRODUCTION ?? 'true') !== 'false',
    // DEMO ONLY: when true, App 3 (GI to Production) skips the SAP POST and
    // returns a dummy success. Defaults to on; set to 'false' once SAP is ready.
    demoStubGiProduction: (process.env.SAP_DEMO_STUB_GI_PRODUCTION ?? 'true') !== 'false',
  },
} as const;

export type AppConfig = typeof Config;
