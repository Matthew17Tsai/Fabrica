/**
 * GET /api/usage/summary
 *
 * Returns aggregated API usage and cost data from the api_usage table.
 *
 * Response:
 * {
 *   total_cost_usd: number;
 *   breakdown: Array<{
 *     service: string;
 *     operation: string;
 *     call_count: number;
 *     total_cost_usd: number;
 *     first_call: string;
 *     last_call: string;
 *   }>;
 * }
 */

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const db = getDb();

  const breakdown = db.prepare(`
    SELECT
      service,
      operation,
      COUNT(*) as call_count,
      ROUND(SUM(cost_usd), 4) as total_cost_usd,
      MIN(created_at) as first_call,
      MAX(created_at) as last_call
    FROM api_usage
    GROUP BY service, operation
    ORDER BY total_cost_usd DESC
  `).all() as {
    service: string;
    operation: string;
    call_count: number;
    total_cost_usd: number;
    first_call: string;
    last_call: string;
  }[];

  const totalRow = db.prepare(
    "SELECT ROUND(SUM(cost_usd), 4) as total FROM api_usage"
  ).get() as { total: number | null };

  return NextResponse.json({
    total_cost_usd: totalRow.total ?? 0,
    breakdown,
  });
}
