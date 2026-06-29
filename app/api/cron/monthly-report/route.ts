import { NextRequest, NextResponse } from "next/server";
import { getMonthlyReportPeriod } from "../../../../lib/reportTime";
import { syncReportToGoogleSheet } from "../../../../lib/reportSync";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) return true;

  const queryToken = request.nextUrl.searchParams.get("token");
  const authHeader = request.headers.get("authorization");

  return queryToken === secret || authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json(
        {
          ok: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const period = getMonthlyReportPeriod();
    const result = await syncReportToGoogleSheet(period);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}