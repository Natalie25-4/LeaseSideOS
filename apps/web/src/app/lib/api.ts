import type { Lease } from "./types";

// Backend runs on :4000 in local dev (see apps/backend/src/index.ts).
// Override with NEXT_PUBLIC_API_URL for other environments once this
// actually gets deployed somewhere.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchLeases(): Promise<Lease[]> {
  const res = await fetch(`${API_BASE_URL}/leases`, { cache: "no-store" });

  if (!res.ok) {
    throw new ApiError(
      `Failed to load leases (${res.status})`,
      res.status
    );
  }

  const data = (await res.json()) as { leases: Lease[] };
  return data.leases;
}
