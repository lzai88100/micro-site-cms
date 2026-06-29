"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type PageView = {
  id: string;
  visitor_id: string;
  device_type: string;
  theme_mode: string | null;
  created_at: string;
};

type ButtonClick = {
  id: string;
  visitor_id: string;
  button_title: string;
  button_type: string;
  target_url: string;
  created_at: string;
};

function isBetween(dateString: string, start: Date, end: Date) {
  const time = new Date(dateString).getTime();
  return time >= start.getTime() && time < end.getTime();
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

function topButtons(clicks: ButtonClick[]) {
  const map = clicks.reduce<Record<string, number>>((acc, item) => {
    acc[item.button_title] = (acc[item.button_title] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(map)
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => b.count - a.count);
}

export default function ReportsPanel() {
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [buttonClicks, setButtonClicks] = useState<ButtonClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<"week" | "month">("week");

  async function loadReports() {
    setLoading(true);

    const { data: viewsData } = await supabase
      .from("page_views")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20000);

    const { data: clicksData } = await supabase
      .from("button_clicks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20000);

    setPageViews(viewsData || []);
    setButtonClicks(clicksData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadReports();
  }, []);

  const report = useMemo(() => {
    const now = new Date();

    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);

    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - 14);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentStart = reportType === "week" ? thisWeekStart : thisMonthStart;
    const currentEnd = reportType === "week" ? now : nextMonthStart;

    const previousStart = reportType === "week" ? lastWeekStart : lastMonthStart;
    const previousEnd = reportType === "week" ? thisWeekStart : thisMonthStart;

    const currentViews = pageViews.filter((item) =>
      isBetween(item.created_at, currentStart, currentEnd)
    );

    const previousViews = pageViews.filter((item) =>
      isBetween(item.created_at, previousStart, previousEnd)
    );

    const currentClicks = buttonClicks.filter((item) =>
      isBetween(item.created_at, currentStart, currentEnd)
    );

    const previousClicks = buttonClicks.filter((item) =>
      isBetween(item.created_at, previousStart, previousEnd)
    );

    const buttonRank = topButtons(currentClicks);
    const highestButton = buttonRank[0];
    const lowestButton = buttonRank.length > 0 ? buttonRank[buttonRank.length - 1] : null;

    return {
      currentViews,
      previousViews,
      currentClicks,
      previousClicks,
      currentVisitors: uniqueVisitors(currentViews),
      previousVisitors: uniqueVisitors(previousViews),
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
      buttonRank,
      highestButton,
      lowestButton,
    };
  }, [pageViews, buttonClicks, reportType]);

  if (loading) {
    return <section className="admin-card admin-card-full">週報月報載入中...</section>;
  }

  return (
    <section className="admin-card admin-card-full">
      <div className="report-head">
        <div>
          <h2>週報 / 月報</h2>
          <p>自動整理瀏覽數、訪客數、點擊數與按鈕排行</p>
        </div>

        <button onClick={loadReports}>重新整理報表</button>
      </div>

      <div className="report-tabs">
        <button
          className={reportType === "week" ? "active" : ""}
          onClick={() => setReportType("week")}
        >
          週報
        </button>

        <button
          className={reportType === "month" ? "active" : ""}
          onClick={() => setReportType("month")}
        >
          月報
        </button>
      </div>

      <div className="report-summary">
        <h3>{reportType === "week" ? "本週報表" : "本月報表"}</h3>

        <div className="report-grid">
          <div>
            <span>瀏覽數</span>
            <strong>{report.currentViews.length}</strong>
            <small>
              {growthText(report.currentViews.length, report.previousViews.length)}
            </small>
          </div>

          <div>
            <span>不重複訪客</span>
            <strong>{report.currentVisitors}</strong>
            <small>
              {growthText(report.currentVisitors, report.previousVisitors)}
            </small>
          </div>

          <div>
            <span>按鈕點擊數</span>
            <strong>{report.currentClicks.length}</strong>
            <small>
              {growthText(report.currentClicks.length, report.previousClicks.length)}
            </small>
          </div>

          <div>
            <span>整體 CTR</span>
            <strong>
              {report.currentViews.length === 0
                ? "0%"
                : `${((report.currentClicks.length / report.currentViews.length) * 100).toFixed(
                    1
                  )}%`}
            </strong>
            <small>點擊數 ÷ 瀏覽數</small>
          </div>
        </div>
      </div>

      <div className="report-block">
        <h3>重點摘要</h3>

        <div className="report-note">
          <p>
            本期瀏覽數為 <b>{report.currentViews.length}</b>，較上一期
            <b> {growthText(report.currentViews.length, report.previousViews.length)}</b>。
          </p>

          <p>
            本期不重複訪客為 <b>{report.currentVisitors}</b>，按鈕總點擊數為{" "}
            <b>{report.currentClicks.length}</b>。
          </p>

          <p>
            最高點擊按鈕：
            <b>{report.highestButton ? `${report.highestButton.title}（${report.highestButton.count} 次）` : "尚無資料"}</b>
          </p>

          <p>
            最低點擊按鈕：
            <b>{report.lowestButton ? `${report.lowestButton.title}（${report.lowestButton.count} 次）` : "尚無資料"}</b>
          </p>
        </div>
      </div>

      <div className="report-block">
        <h3>按鈕點擊排行榜</h3>

        <div className="report-table">
          <div className="report-table-row report-table-head">
            <span>排名</span>
            <span>按鈕名稱</span>
            <span>點擊數</span>
          </div>

          {report.buttonRank.length === 0 ? (
            <p className="empty-stats">目前還沒有點擊資料</p>
          ) : (
            report.buttonRank.map((button, index) => (
              <div className="report-table-row" key={button.title}>
                <span>{index + 1}</span>
                <span>{button.title}</span>
                <span>{button.count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}