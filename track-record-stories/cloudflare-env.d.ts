declare namespace Cloudflare {
  interface Env {
    DEV_GARMIN_API_KEY?: string;
    SESSION_SECRET?: string;
    GARMIN_MODE?: string;
    PERSONAL_OWNER_ID?: string;
    AUTH_MODE?: 'sites' | 'visitor';
    PUBLIC_ORIGIN?: string;
    CONNECT_RATE_LIMITER?: RateLimit;
    DATA_RATE_LIMITER?: RateLimit;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
