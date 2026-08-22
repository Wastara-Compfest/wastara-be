import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 8000),
  databaseUrl: required(
    "DATABASE_URL",
    "postgresql://wastara:wastara@localhost:5432/wastara",
  ),
  evidenceDir: required("EVIDENCE_DIR", "./data/evidence"),
  modelServiceUrl: required("MODEL_SERVICE_URL", "http://localhost:8100"),
  internalApiKey: required("INTERNAL_API_KEY", "change-me"),
};
