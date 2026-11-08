declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    HPX_OWNER_EMAIL?: string;
    HPX_ADMIN_PASSWORD?: string;
    HPX_ADMIN_NAME?: string;
    HPX_INGEST_ENABLED?: string;
    HPX_INGEST_URL?: string;
    HPX_ADMIN_SECRET?: string;
    HPX_SYNC_URL?: string;
    HPX_SYNC_BRIDGE_KEY?: string;
  }
}
