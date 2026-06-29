"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type ThemeMode = "system" | "light" | "dark";

type SiteSettings = {
  id: string;
  site_name: string;
  tags: string[];
  intro_content: string;
  cover_image_url: string | null;
  avatar_image_url: string | null;
  line_label: string;
  line_url: string;
  line_is_visible: boolean;
  telegram_label: string;
  telegram_url: string;
  telegram_is_visible: boolean;
  default_theme: ThemeMode;
  allow_theme_switch: boolean;
};

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [tagsText, setTagsText] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkLogin();
  }, []);

  async function checkLogin() {
    const { data } = await supabase.auth.getSession();

    if (data.session) {
      setIsLoggedIn(true);
      loadSettings();
    }
  }

  async function login() {
    setMessage("登入中...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("登入失敗：" + error.message);
      return;
    }

    setIsLoggedIn(true);
    setMessage("登入成功");
    loadSettings();
  }

  async function logout() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setSettings(null);
    setMessage("已登出");
  }

  async function loadSettings() {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      setMessage("讀取失敗：" + error.message);
      return;
    }

    setSettings(data);
    setTagsText(data.tags.join("、"));
  }

  async function uploadImage(
    event: React.ChangeEvent<HTMLInputElement>,
    field: "cover_image_url" | "avatar_image_url"
  ) {
    if (!settings) return;

    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("圖片上傳中...");

    const ext = file.name.split(".").pop();
    const folder = field === "cover_image_url" ? "covers" : "avatars";
    const fileName = `${folder}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("site-assets")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      setUploading(false);
      setMessage("圖片上傳失敗：" + error.message);
      return;
    }

    const { data } = supabase.storage
      .from("site-assets")
      .getPublicUrl(fileName);

    setSettings({
      ...settings,
      [field]: data.publicUrl,
    });

    setUploading(false);
    setMessage("圖片已上傳，記得按「儲存設定」才會更新到前台");
  }

  async function saveSettings() {
    if (!settings) return;

    setMessage("儲存中...");

    const tags = tagsText
      .split(/[、,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("site_settings")
      .update({
        site_name: settings.site_name,
        tags,
        intro_content: settings.intro_content,
        cover_image_url: settings.cover_image_url,
        avatar_image_url: settings.avatar_image_url,
        line_label: settings.line_label,
        line_url: settings.line_url,
        line_is_visible: settings.line_is_visible,
        telegram_label: settings.telegram_label,
        telegram_url: settings.telegram_url,
        telegram_is_visible: settings.telegram_is_visible,
        default_theme: settings.default_theme,
        allow_theme_switch: settings.allow_theme_switch,
      })
      .eq("id", settings.id);

    if (error) {
      setMessage("儲存失敗：" + error.message);
      return;
    }

    setMessage("已儲存，前台重新整理就會更新");
    loadSettings();
  }

  if (!isLoggedIn) {
    return (
      <main className="admin-page">
        <section className="admin-card login-card">
          <h1>藏精閣後台登入</h1>

          <label>
            Email
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="請輸入後台 Email"
            />
          </label>

          <label>
            密碼
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="請輸入密碼"
            />
          </label>

          <button onClick={login}>登入後台</button>

          {message && <p className="admin-message">{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-topbar">
        <div>
          <h1>藏精閣後台</h1>
          <p>基本資料管理</p>
        </div>

        <div className="admin-nav">
          <Link href="/admin/buttons">按鈕管理</Link>
          <Link href="/">看前台</Link>
          <button className="secondary-btn" onClick={logout}>
            登出
          </button>
        </div>
      </section>

      {!settings ? (
        <section className="admin-card">資料載入中...</section>
      ) : (
        <section className="admin-card">
          <h2>首頁基本資料</h2>

          <div className="image-upload-grid">
            <div className="image-upload-box">
              <h3>封面圖</h3>

              {settings.cover_image_url ? (
                <img
                  className="cover-preview"
                  src={settings.cover_image_url}
                  alt="封面圖預覽"
                />
              ) : (
                <div className="empty-preview">尚未上傳封面圖</div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(event) => uploadImage(event, "cover_image_url")}
                disabled={uploading}
              />
            </div>

            <div className="image-upload-box">
              <h3>頭像</h3>

              {settings.avatar_image_url ? (
                <img
                  className="avatar-preview"
                  src={settings.avatar_image_url}
                  alt="頭像預覽"
                />
              ) : (
                <div className="empty-preview avatar-empty">藏</div>
              )}

              <input
                type="file"
                accept="image/*"
                onChange={(event) => uploadImage(event, "avatar_image_url")}
                disabled={uploading}
              />
            </div>
          </div>

          <label>
            店名
            <input
              value={settings.site_name}
              onChange={(event) =>
                setSettings({ ...settings, site_name: event.target.value })
              }
            />
          </label>

          <label>
            標籤文字
            <input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              placeholder="全台、嚴選、情報中心"
            />
          </label>

          <label>
            簡介內容
            <textarea
              rows={8}
              value={settings.intro_content}
              onChange={(event) =>
                setSettings({ ...settings, intro_content: event.target.value })
              }
            />
          </label>

          <div className="admin-grid">
            <label>
              LINE 按鈕名稱
              <input
                value={settings.line_label}
                onChange={(event) =>
                  setSettings({ ...settings, line_label: event.target.value })
                }
              />
            </label>

            <label>
              LINE 連結
              <input
                value={settings.line_url}
                onChange={(event) =>
                  setSettings({ ...settings, line_url: event.target.value })
                }
              />
            </label>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={settings.line_is_visible}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  line_is_visible: event.target.checked,
                })
              }
            />
            顯示 LINE 按鈕
          </label>

          <div className="admin-grid">
            <label>
              Telegram 按鈕名稱
              <input
                value={settings.telegram_label}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    telegram_label: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Telegram 連結
              <input
                value={settings.telegram_url}
                onChange={(event) =>
                  setSettings({
                    ...settings,
                    telegram_url: event.target.value,
                  })
                }
              />
            </label>
          </div>

          <label className="check-row">
            <input
              type="checkbox"
              checked={settings.telegram_is_visible}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  telegram_is_visible: event.target.checked,
                })
              }
            />
            顯示 Telegram 按鈕
          </label>

          <label>
            前台預設主題
            <select
              value={settings.default_theme}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  default_theme: event.target.value as ThemeMode,
                })
              }
            >
              <option value="system">跟隨系統</option>
              <option value="light">亮面模式｜紅白調</option>
              <option value="dark">暗面模式｜黑金調</option>
            </select>
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={settings.allow_theme_switch}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  allow_theme_switch: event.target.checked,
                })
              }
            />
            允許客人手動切換主題
          </label>

          <button onClick={saveSettings}>儲存設定</button>

          {message && <p className="admin-message">{message}</p>}
        </section>
      )}
    </main>
  );
}