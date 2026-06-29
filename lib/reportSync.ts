import { createClient } from "@supabase/supabase-js";

type ReportPeriod = {
  reportType: "weekly" | "monthly";
  sheetTitle: string;
  startUtc: Date;
  endUtc: Date;
  previousStartUtc: Date;
  previousEndUtc: Date;
  periodStartLabel: string;
  periodEndLabel: string;
};

type PageView = {
  id: string;
  visitor_id: string;
  created_at: string;
};

type ButtonClick = {
  id: string;
  visitor_id: string;
  button_title: string;
  button_type: "large" | "grid";
  target_url: string;
  created_at: string;
};

function createServerSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

function uniqueVisitors(items: { visitor_id: string }[]) {
  return new Set(items.map((item) => item.visitor_id)).size;
}

function growthText(current: number, previous: number) {
  if (previous === 0 && current === 0) return "無變化";
  if (previous === 0) return "新增";

  const rate = ((current - previous) / previous) * 100;
  return `${rate >= 0 ? "成長" : "下降"} ${Math.abs(rate).toFixed(1)}%`;
}

function ctr(clicks: number, views: number) {
  if (views === 0) return "0%";
  return `${((clicks / views) * 100).toFixed(1)}%`;
}

function buildButtonRank(clicks: ButtonClick[], viewsCount: number) {
  const map = clicks.reduce<
    Record<string, { title: string; type: "large" | "grid"; clicks: number }>
  >((acc, item) => {
    const key = `${item.button_type}-${item.button_title}`;

    if (!acc[key]) {
      acc[key] = {
        title: item.button_title,
        type: item.button_type,
        clicks: 0,
      };
    }

    acc[key].clicks += 1;

    return acc;
  }, {});

  return Object.values(map)
    .map((item) => ({
      title: item.title,
      type: item.type,
      clicks: item.clicks,
      ctr: ctr(item.clicks, viewsCount),
    }))
    .sort((a, b) => b.clicks - a.clicks);
}

async function loadRangeData(period: ReportPeriod) {
  const supabase = createServerSupabase();

  const { data: currentViews, error: currentViewsError } = await supabase
    .from("page_views")
    .select("id, visitor_id, created_at")
    .gte("created_at", period.startUtc.toISOString())
    .lt("created_at", period.endUtc.toISOString());

  if (currentViewsError) {
    throw new Error(currentViewsError.message);
  }

  const { data: previousViews, error: previousViewsError } = await supabase
    .from("page_views")
    .select("id, visitor_id, created_at")
    .gte("created_at", period.previousStartUtc.toISOString())
    .lt("created_at", period.previousEndUtc.toISOString());

  if (previousViewsError) {
    throw new Error(previousViewsError.message);
  }

  const { data: currentClicks, error: currentClicksError } = await supabase
    .from("button_clicks")
    .select("id, visitor_id, button_title, button_type, target_url, created_at")
    .gte("created_at", period.startUtc.toISOString())
    .lt("created_at", period.endUtc.toISOString());

  if (currentClicksError) {
    throw new Error(currentClicksError.message);
  }

  const { data: previousClicks, error: previousClicksError } = await supabase
    .from("button_clicks")
    .select("id, visitor_id, button_title, button_type, target_url, created_at")
    .gte("created_at", period.previousStartUtc.toISOString())
    .lt("created_at", period.previousEndUtc.toISOString());

  if (previousClicksError) {
    throw new Error(previousClicksError.message);
  }

  return {
    currentViews: (currentViews || []) as PageView[],
    previousViews: (previousViews || []) as PageView[],
    currentClicks: (currentClicks || []) as ButtonClick[],
    previousClicks: (previousClicks || []) as ButtonClick[],
  };
}

export async function syncReportToGoogleSheet(period: ReportPeriod) {
  const webAppUrl = process.env.GOOGLE_REPORT_WEB_APP_URL;
  const token = process.env.GOOGLE_REPORT_SECRET_TOKEN;

  if (!webAppUrl) {
    throw new Error("Missing GOOGLE_REPORT_WEB_APP_URL");
  }

  if (!token) {
    throw new Error("Missing GOOGLE_REPORT_SECRET_TOKEN");
  }

  const { currentViews, previousViews, currentClicks, previousClicks } =
    await loadRangeData(period);

  const currentVisitors = uniqueVisitors(currentViews);
  const previousVisitors = uniqueVisitors(previousViews);

  const buttonRank = buildButtonRank(currentClicks, currentViews.length);
  const highestButton = buttonRank[0];
  const lowestButton = buttonRank.length > 0 ? buttonRank[buttonRank.length - 1] : null;

  const payload = {
    token,
    sheetTitle: period.sheetTitle,
    reportType: period.reportType,
    periodStart: period.periodStartLabel,
    periodEnd: period.periodEndLabel,
    generatedAt: new Date().toISOString(),
    summary: {
      views: currentViews.length,
      previousViews: previousViews.length,
      viewsGrowth: growthText(currentViews.length, previousViews.length),

      uniqueVisitors: currentVisitors,
      previousUniqueVisitors: previousVisitors,
      uniqueVisitorsGrowth: growthText(currentVisitors, previousVisitors),

      clicks: currentClicks.length,
      previousClicks: previousClicks.length,
      clicksGrowth: growthText(currentClicks.length, previousClicks.length),

      ctr: ctr(currentClicks.length, currentViews.length),

      highestButton: highestButton
        ? `${highestButton.title}（${highestButton.clicks} 次）`
        : "尚無資料",
      lowestButton: lowestButton
        ? `${lowestButton.title}（${lowestButton.clicks} 次）`
        : "尚無資料",
    },
    buttonRank,
  };

  const response = await fetch(webAppUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  let result: unknown;

  try {
    result = JSON.parse(text);
  } catch {
    result = text;
  }

  if (!response.ok) {
    throw new Error(`Google Apps Script error: ${text}`);
  }

  return {
    ok: true,
    sheetTitle: period.sheetTitle,
    periodStart: period.periodStartLabel,
    periodEnd: period.periodEndLabel,
    result,
  };
}