"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type ThemeMode = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

type SiteSettings = {
  site_name: string;
  tags: string[];
  intro_content: string;

  background_image_url: string | null;
  cover_image_url: string | null;
  avatar_image_url: string | null;

  light_background_image_url: string | null;
  light_cover_image_url: string | null;
  light_avatar_image_url: string | null;

  dark_background_image_url: string | null;
  dark_cover_image_url: string | null;
  dark_avatar_image_url: string | null;

  line_label: string;
  line_url: string;
  line_is_visible: boolean;

  telegram_label: string;
  telegram_url: string;
  telegram_is_visible: boolean;

  default_theme: ThemeMode;
  allow_theme_switch: boolean;
};

type LinkButton = {
  id: string;
  button_type: "large" | "grid";
  title: string;
  url: string;
  icon_text: string | null;
  image_url: string | null;
  is_visible: boolean;
  sort_order: number;
};

const fallbackSettings: SiteSettings = {
  site_name: "藏精閣",
  tags: ["全台", "嚴選", "情報中心"],
  intro_content:
    "📌 客服時間：11:00 - 04:30\n📌 營業時間：12:00 - 04:30\n🌏 服務地區：台北 / 新北 / 桃園 / 新竹 / 台中 / 台南 / 高雄\n📮 預約方式：請先看完問與答，再告訴我們想要約的時間、哪些地區、什麼方案。",

  background_image_url: null,
  cover_image_url: null,
  avatar_image_url: null,

  light_background_image_url: null,
  light_cover_image_url: null,
  light_avatar_image_url: null,

  dark_background_image_url: null,
  dark_cover_image_url: null,
  dark_avatar_image_url: null,

  line_label: "LINE 一鍵聯絡",
  line_url: "#",
  line_is_visible: true,

  telegram_label: "Telegram 聯絡",
  telegram_url: "#",
  telegram_is_visible: true,

  default_theme: "system",
  allow_theme_switch: true,
};

function getVisitorId() {
  const key = "visitor-id";
  const saved = localStorage.getItem(key);

  if (saved) return saved;

  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}

function getDeviceType() {
  const width = window.innerWidth;

  if (width <= 767) return "mobile";
  if (width <= 1024) return "tablet";
  return "desktop";
}

export default function Home() {
  const [settings, setSettings] = useState<SiteSettings>(fallbackSettings);
  const [buttons, setButtons] = useState<LinkButton[]>([]);
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const [loading, setLoading] = useState(true);
  const [viewTracked, setViewTracked] = useState(false);

  useEffect(() => {
    async function loadData() {
      const { data: siteData, error: siteError } = await supabase
        .from("site_settings")
        .select("*")
        .limit(1)
        .single();

      if (siteError) {
        console.log("site_settings error:", siteError.message);
      }

      if (siteData) {
        setSettings({
          ...fallbackSettings,
          ...siteData,
        });

        const savedTheme = localStorage.getItem("theme-mode") as ThemeMode | null;
        setThemeMode(savedTheme || siteData.default_theme || "system");
      }

      const { data: buttonData, error: buttonError } = await supabase
        .from("link_buttons")
        .select("*")
        .eq("is_visible", true)
        .order("button_type", { ascending: true })
        .order("sort_order", { ascending: true });

      if (buttonError) {
        console.log("link_buttons error:", buttonError.message);
      }

      if (buttonData) {
        setButtons(buttonData);
      }

      setLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      if (themeMode === "system") {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setResolvedTheme(isDark ? "dark" : "light");
      } else {
        setResolvedTheme(themeMode);
      }
    };

    updateTheme();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", updateTheme);

    return () => media.removeEventListener("change", updateTheme);
  }, [themeMode]);

  useEffect(() => {
    async function trackPageView() {
      if (viewTracked) return;

      const visitorId = getVisitorId();

      await supabase.from("page_views").insert({
        visitor_id: visitorId,
        page_path: "/",
        device_type: getDeviceType(),
        theme_mode: themeMode,
        user_agent: navigator.userAgent,
      });

      setViewTracked(true);
    }

    trackPageView();
  }, [themeMode, viewTracked]);

  const changeTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem("theme-mode", mode);
  };

  async function trackButtonClick(button: LinkButton) {
    const visitorId = getVisitorId();

    await supabase.from("button_clicks").insert({
      visitor_id: visitorId,
      button_id: button.id,
      button_title: button.title,
      button_type: button.button_type,
      target_url: button.url,
      page_path: "/",
    });
  }

  const largeButtons = buttons.filter((button) => button.button_type === "large");
  const gridButtons = buttons.filter((button) => button.button_type === "grid");

  const currentBackgroundImage =
    resolvedTheme === "dark"
      ? settings.dark_background_image_url ||
        settings.background_image_url ||
        settings.light_background_image_url
      : settings.light_background_image_url ||
        settings.background_image_url ||
        settings.dark_background_image_url;

  const currentCoverImage =
    resolvedTheme === "dark"
      ? settings.dark_cover_image_url ||
        settings.cover_image_url ||
        settings.light_cover_image_url
      : settings.light_cover_image_url ||
        settings.cover_image_url ||
        settings.dark_cover_image_url;

  const currentAvatarImage =
    resolvedTheme === "dark"
      ? settings.dark_avatar_image_url ||
        settings.avatar_image_url ||
        settings.light_avatar_image_url
      : settings.light_avatar_image_url ||
        settings.avatar_image_url ||
        settings.dark_avatar_image_url;

  return (
    <main
      className={currentBackgroundImage ? "site has-background" : "site"}
      data-theme={resolvedTheme}
      style={
        currentBackgroundImage
          ? {
              backgroundImage:
                resolvedTheme === "dark"
                  ? `linear-gradient(rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.78)), url(${currentBackgroundImage})`
                  : `linear-gradient(rgba(255, 244, 244, 0.72), rgba(255, 244, 244, 0.88)), url(${currentBackgroundImage})`,
            }
          : undefined
      }
    >
      <section className="phone-shell">
        {settings.allow_theme_switch && (
          <div className="theme-switcher">
            <button
              className={themeMode === "system" ? "active" : ""}
              onClick={() => changeTheme("system")}
            >
              跟隨系統
            </button>

            <button
              className={themeMode === "light" ? "active" : ""}
              onClick={() => changeTheme("light")}
            >
              淺色主題
            </button>

            <button
              className={themeMode === "dark" ? "active" : ""}
              onClick={() => changeTheme("dark")}
            >
              深色主題
            </button>
          </div>
        )}

        <div
          className="cover"
          style={
            currentCoverImage
              ? { backgroundImage: `url(${currentCoverImage})` }
              : undefined
          }
        >
          {!currentCoverImage && <div className="cover-text">CANG JING GE</div>}
        </div>

        <div className="profile-card">
          <div className="avatar">
            {currentAvatarImage ? (
              <img src={currentAvatarImage} alt="頭像" />
            ) : (
              "藏"
            )}
          </div>

          <h1>{settings.site_name}</h1>

          <div className="tags">
            {settings.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>

          <div className="intro">
            {settings.intro_content.split("\n").map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>

          <div className="contact-row">
            {settings.line_is_visible && (
              <a href={settings.line_url} className="contact-btn" target="_blank">
                {settings.line_label}
              </a>
            )}

            {settings.telegram_is_visible && (
              <a
                href={settings.telegram_url}
                className="contact-btn"
                target="_blank"
              >
                {settings.telegram_label}
              </a>
            )}
          </div>
        </div>

        {loading && <div className="loading">資料載入中...</div>}

        <div className="big-links">
          {largeButtons.map((button) => (
            <a
              className="big-link"
              href={button.url}
              key={button.id}
              target="_blank"
              onClick={() => trackButtonClick(button)}
            >
              <span className="icon">
                {button.image_url ? (
                  <img src={button.image_url} alt="" />
                ) : (
                  button.icon_text
                )}
              </span>
              <span>{button.title}</span>
            </a>
          ))}
        </div>

        <div className="grid-links">
          {gridButtons.map((button) => (
            <a
              className="grid-link"
              href={button.url}
              key={button.id}
              target="_blank"
              onClick={() => trackButtonClick(button)}
            >
              <span className="grid-icon">
                {button.image_url ? (
                  <img src={button.image_url} alt="" />
                ) : (
                  button.icon_text
                )}
              </span>
              <span>{button.title}</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}