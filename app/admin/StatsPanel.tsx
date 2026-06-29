"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

type PageView = {
  id: string;
  visitor_id: string;
  page_path: string;
  device_type: string;
  theme_mode: string | null;
  created_at: string;
};

type ButtonClick = {
  id: string;
  visitor_id: string;
  button_id: string | null;
  button_title: string;
  button_type: string;
  target_url: string;
  created_at: string;
};

type ButtonStat = {
  title: string;
  type: string;
  clicks: number;
  ctr: number;
};

function isAfter(dateString: string, date: Date) {
  return new Date(dateString).getTime() >= date.getTime();
}

function uniqueCount(items: { visitor_id: string }[]) {
  return new Set(items.map((item) => item.visitor_id)).size;
}

function percent(value: number, total: number) {
  if (total === 0) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

export default function StatsPanel() {
  const [pageViews, setPageViews] = useState<PageView[]>([]);
  const [buttonClicks, setButtonClicks] = useState<ButtonClick[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadStats() {
    setLoading(true);

    const { data: viewsData, error: viewsError } = await supabase
      .from("page_views")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000);

    const { data: clicksData, error: clicksError } = await supabase
      .from("button_clicks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (viewsError) {
      setMessage("讀取瀏覽數失敗：" + viewsError.message);
    }

    if (clicksError) {
      setMessage("讀取點擊數失敗：" + clicksError.message);
    }

    setPageViews(viewsData || []);
    setButtonClicks(clicksData || []);
    setLoading(false);
  }

  useEffect(() => {
    loadStats();
  }, []);

  const stats = useMemo(() => {
    const now = new Date();

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayViews = pageViews.filter((item) => isAfter(item.created_at, todayStart));
    const weekViews = pageViews.filter((item) => isAfter(item.created_at, sevenDaysAgo));
    const monthViews = pageViews.filter((item) => isAfter(item.created_at, monthStart));
    const last30Views = pageViews.filter((item) => isAfter(item.created_at, thirtyDaysAgo));

    const todayClicks = buttonClicks.filter((item) => isAfter(item.created_at, todayStart));
    const weekClicks = buttonClicks.filter((item) => isAfter(item.created_at, sevenDaysAgo));
    const monthClicks = buttonClicks.filter((item) => isAfter(item.created_at, monthStart));

    const deviceMap = last30Views.reduce<Record<string, number>>((acc, item) => {
      acc[item.device_type || "unknown"] = (acc[item.device_type || "unknown"] || 0) + 1;
      return acc;
    }, {});

    const themeMap = last30Views.reduce<Record<string, number>>((acc, item) => {
      acc[item.theme_mode || "unknown"] = (acc[item.theme_mode || "unknown"] || 0) + 1;
      return acc;
    }, {});

    const buttonMap = monthClicks.reduce<Record<string, ButtonStat>>((acc, item) => {
      const key = `${item.button_type}-${item.button_title}`;

      if (!acc[key]) {
        acc[key] = {
          title: item.button_title,
          type: item.button_type,
          clicks: 0,
          ctr: 0,
        };
      }

      acc[key].clicks += 1;
      return acc;
    }, {});

    const buttonStats = Object.values(buttonMap)
      .map((item) => ({
        ...item,
        ctr: monthViews.length === 0 ? 0 : (item.clicks / monthViews.length) * 100,
      }))
      .sort((a, b) => b.clicks - a.clicks);

    return {
      todayViews,
      weekViews,
      monthViews,
      todayClicks,
      weekClicks,
      monthClicks,
      deviceMap,
      themeMap,
      buttonStats,
    };
  }, [pageViews, buttonClicks]);

  if (loading) {
    return <section className="admin-card admin-card-full">統計資料載入中...</section>;
  }

  return (
    <section className="admin-card admin-card-full">
      <div className="stats-head">
        <div>
          <h2>數據統計</h2>
          <p>瀏覽數、點擊數、CTR 點擊率</p>
        </div>

        <button onClick={loadStats}>重新整理數據</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>今日瀏覽數</span>
          <strong>{stats.todayViews.length}</strong>
          <small>不重複訪客：{uniqueCount(stats.todayViews)}</small>
        </div>

        <div className="stat-card">
          <span>本週瀏覽數</span>
          <strong>{stats.weekViews.length}</strong>
          <small>不重複訪客：{uniqueCount(stats.weekViews)}</small>
        </div>

        <div className="stat-card">
          <span>本月瀏覽數</span>
          <strong>{stats.monthViews.length}</strong>
          <small>不重複訪客：{uniqueCount(stats.monthViews)}</small>
        </div>

        <div className="stat-card">
          <span>總瀏覽數</span>
          <strong>{pageViews.length}</strong>
          <small>總訪客：{uniqueCount(pageViews)}</small>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span>今日點擊數</span>
          <strong>{stats.todayClicks.length}</strong>
          <small>CTR：{percent(stats.todayClicks.length, stats.todayViews.length)}</small>
        </div>

        <div className="stat-card">
          <span>本週點擊數</span>
          <strong>{stats.weekClicks.length}</strong>
          <small>CTR：{percent(stats.weekClicks.length, stats.weekViews.length)}</small>
        </div>

        <div className="stat-card">
          <span>本月點擊數</span>
          <strong>{stats.monthClicks.length}</strong>
          <small>CTR：{percent(stats.monthClicks.length, stats.monthViews.length)}</small>
        </div>

        <div className="stat-card">
          <span>總點擊數</span>
          <strong>{buttonClicks.length}</strong>
          <small>總 CTR：{percent(buttonClicks.length, pageViews.length)}</small>
        </div>
      </div>

      <div className="stats-section">
        <h3>裝置比例｜近 30 天</h3>

        <div className="mini-list">
          {Object.entries(stats.deviceMap).map(([key, value]) => (
            <div key={key}>
              <span>{key}</span>
              <strong>
                {value} 次｜{percent(value, stats.weekViews.length || pageViews.length)}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-section">
        <h3>主題模式使用比例｜近 30 天</h3>

        <div className="mini-list">
          {Object.entries(stats.themeMap).map(([key, value]) => (
            <div key={key}>
              <span>{key}</span>
              <strong>
                {value} 次｜{percent(value, stats.weekViews.length || pageViews.length)}
              </strong>
            </div>
          ))}
        </div>
      </div>

      <div className="stats-section">
        <h3>本月按鈕點擊排行</h3>

        <div className="stats-table">
          <div className="stats-table-row stats-table-head">
            <span>排名</span>
            <span>按鈕名稱</span>
            <span>類型</span>
            <span>點擊</span>
            <span>CTR</span>
          </div>

          {stats.buttonStats.length === 0 ? (
            <p className="empty-stats">目前還沒有按鈕點擊紀錄</p>
          ) : (
            stats.buttonStats.map((button, index) => (
              <div className="stats-table-row" key={`${button.type}-${button.title}`}>
                <span>{index + 1}</span>
                <span>{button.title}</span>
                <span>{button.type === "large" ? "大按鈕" : "小格子"}</span>
                <span>{button.clicks}</span>
                <span>{button.ctr.toFixed(1)}%</span>
              </div>
            ))
          )}
        </div>
      </div>

      {message && <p className="admin-message">{message}</p>}
    </section>
  );
}