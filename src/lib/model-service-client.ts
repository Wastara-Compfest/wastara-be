import { config } from "../config.js";
import { ApiError } from "./api-error.js";

export async function callModelService(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<{ status: number; body: unknown }> {
  let res: Response;
  try {
    res = await fetch(`${config.modelServiceUrl}${path}`, {
      method,
      headers:
        body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      503,
      "MODEL_SERVICE_UNAVAILABLE",
      "Model service tidak dapat dihubungi",
    );
  }

  const responseBody = await res.json().catch(() => null);
  return { status: res.status, body: responseBody };
}
