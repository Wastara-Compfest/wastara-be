import { sql } from "drizzle-orm";

import { db } from "../db/client.js";

export async function nextDefectId(): Promise<string> {
  const rows = await db.execute<{ nextval: string }>(
    sql`select nextval('defect_event_seq') as nextval`,
  );
  const n = Number(rows[0]?.nextval);
  return `DEF-${String(n).padStart(5, "0")}`;
}
