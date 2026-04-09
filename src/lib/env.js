function readEnv(name, fallback) {
  const value = process.env[name];
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing environment variable: ${name}`);
}

export const env = {
  databaseUrl: readEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/bpc_pos?schema=public"),
  valkeyUrl: readEnv("VALKEY_URL", "redis://localhost:6379"),
  accessSecret: readEnv("JWT_ACCESS_SECRET", "change-me-access-secret"),
  refreshSecret: readEnv("JWT_REFRESH_SECRET", "change-me-refresh-secret"),
  appUrl: readEnv("APP_URL", "http://localhost:3000"),
  defaultTimezone: readEnv("DEFAULT_TIMEZONE", "Asia/Dhaka")
};
