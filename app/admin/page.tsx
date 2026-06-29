"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { supabase } from "../../lib/supabase";
import StatsPanel from "./StatsPanel";
import ReportsPanel from "./ReportsPanel";

type ThemeMode = "system" | "light" | "dark";
type ActiveTab = "front" | "buttons" | "stats" | "reports";
type ButtonType = "large" | "grid";

type SiteImageField =
  | "background_image_url"
  | "cover_image_url"
  | "avatar_image_url"
  | "light_background_image_url"
  | "light_cover_image_url"
  | "light_avatar_image_url"
  | "dark_background_image_url"
  | "dark_cover_image_url"
  | "dark_avatar_image_url";

type SiteSettings = {
  id: string;
  site_name: string;
  tags: string[];
  intro_content: string;
  cover_image_url: string | null;
  avatar_image_url: string | null;
  background_image_url: string | null;
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
  button_type: ButtonType;
  title: string;
  url: string;
  icon_text: string | null;
  image_url: string | null;
  is_visible: boolean;
  sort_order: number;
};

const emptyButton = (buttonType: ButtonType) => ({
  button_type: buttonType,
  title: "",
  url: "#",
  icon_text: "",
  image_url: "",
  is_visible: true,
  sort_order: 99,
});

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("front");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [tagsText, setTagsText] = useState("");
  const [buttons, setButtons] = useState<LinkButton[]>([]);

  const [newLargeButton, setNewLargeButton] = useState(emptyButton("large"));
  const [newGridButton, setNewGridButton] = useState(emptyButton("grid"));

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
      loadButtons();
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
    loadButtons();
  }

  async function logout() {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setSettings(null);
    setButtons([]);
    setMessage("已登出");
  }

  async function loadSettings() {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      setMessage("讀取基本資料失敗：" + error.message);
      return;
    }

    setSettings(data);
    setTagsText(data.tags.join("、"));
  }

  async function loadButtons() {
    const { data, error } = await supabase
      .from("link_buttons")
      .select("*")
      .order("button_type", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      setMessage("讀取按鈕失敗：" + error.message);
      return;
    }

    setButtons(data || []);
  }

    async function uploadImage(
      event: ChangeEvent<HTMLInputElement>,
      field: SiteImageField
    ) {
    if (!settings) return;

    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("圖片上傳中...");

    const ext = file.name.split(".").pop();
    const folder = field.replace("_image_url", "").split("_").join("-");
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

async function uploadButtonImage(
  event: ChangeEvent<HTMLInputElement>,
  buttonId: string
) {
  const file = event.target.files?.[0];
  if (!file) return;

  setUploading(true);
  setMessage("按鈕圖片上傳中...");

  const ext = file.name.split(".").pop();
  const fileName = `buttons/${buttonId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("site-assets")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    setUploading(false);
    setMessage("按鈕圖片上傳失敗：" + uploadError.message);
    return;
  }

  const { data } = supabase.storage
    .from("site-assets")
    .getPublicUrl(fileName);

  const publicUrl = data.publicUrl;

  const { error: updateError } = await supabase
    .from("link_buttons")
    .update({
      image_url: publicUrl,
    })
    .eq("id", buttonId);

  if (updateError) {
    setUploading(false);
    setMessage("按鈕圖片網址儲存失敗：" + updateError.message);
    return;
  }

  setButtons((currentButtons) =>
    currentButtons.map((button) =>
      button.id === buttonId
        ? {
            ...button,
            image_url: publicUrl,
          }
        : button
    )
  );

  setUploading(false);
  setMessage("按鈕圖片已上傳，前台重新整理就會更新");
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
        background_image_url: settings.background_image_url,
        cover_image_url: settings.cover_image_url,
        avatar_image_url: settings.avatar_image_url,
        light_background_image_url: settings.light_background_image_url,
        light_cover_image_url: settings.light_cover_image_url,
        light_avatar_image_url: settings.light_avatar_image_url,

        dark_background_image_url: settings.dark_background_image_url,
        dark_cover_image_url: settings.dark_cover_image_url,
        dark_avatar_image_url: settings.dark_avatar_image_url,
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

    setMessage("前台資料已儲存，前台重新整理就會更新");
    loadSettings();
  }

  function updateButton(
    id: string,
    field: keyof LinkButton,
    value: string | number | boolean
  ) {
    setButtons((currentButtons) =>
      currentButtons.map((button) =>
        button.id === id ? { ...button, [field]: value } : button
      )
    );
  }

  async function saveButton(button: LinkButton) {
    setMessage("按鈕儲存中...");

    const { error } = await supabase
      .from("link_buttons")
      .update({
        title: button.title,
        url: button.url,
        icon_text: button.icon_text || null,
        image_url: button.image_url || null,
        is_visible: button.is_visible,
        sort_order: button.sort_order,
      })
      .eq("id", button.id);

    if (error) {
      setMessage("按鈕儲存失敗：" + error.message);
      return;
    }

    setMessage("按鈕已儲存，前台重新整理就會更新");
    loadButtons();
  }

  async function addButton(buttonType: ButtonType) {
    const draft = buttonType === "large" ? newLargeButton : newGridButton;

    if (!draft.title.trim()) {
      setMessage("請先輸入按鈕名稱");
      return;
    }

    setMessage("新增按鈕中...");

    const { error } = await supabase.from("link_buttons").insert({
      button_type: draft.button_type,
      title: draft.title.trim(),
      url: draft.url || "#",
      icon_text: draft.icon_text || null,
      image_url: draft.image_url || null,
      is_visible: draft.is_visible,
      sort_order: Number(draft.sort_order) || 99,
    });

    if (error) {
      setMessage("新增失敗：" + error.message);
      return;
    }

    if (buttonType === "large") {
      setNewLargeButton(emptyButton("large"));
    } else {
      setNewGridButton(emptyButton("grid"));
    }

    setMessage("新增成功");
    loadButtons();
  }

  async function deleteButton(button: LinkButton) {
    const ok = window.confirm(`確定要刪除「${button.title}」嗎？`);
    if (!ok) return;

    setMessage("刪除中...");

    const { error } = await supabase
      .from("link_buttons")
      .delete()
      .eq("id", button.id);

    if (error) {
      setMessage("刪除失敗：" + error.message);
      return;
    }

    setMessage("已刪除");
    loadButtons();
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

  const largeButtons = buttons.filter((button) => button.button_type === "large");
  const gridButtons = buttons.filter((button) => button.button_type === "grid");

  return (
    <main className="admin-page">
      <section className="admin-layout">
        <aside className="admin-sidebar">
          <h1>藏精閣後台</h1>
          <p>微官網管理系統</p>

          <div className="side-menu">
            <button
              className={activeTab === "front" ? "active" : ""}
              onClick={() => setActiveTab("front")}
            >
              管理1｜前台資料
            </button>

            <button
              className={activeTab === "buttons" ? "active" : ""}
              onClick={() => setActiveTab("buttons")}
            >
              管理2｜按鈕管理
            </button>

            <button
              className={activeTab === "stats" ? "active" : ""}
              onClick={() => setActiveTab("stats")}
            >
              管理3｜數據統計
            </button>

            <button
              className={activeTab === "reports" ? "active" : ""}
              onClick={() => setActiveTab("reports")}
            >
              管理4｜週報月報
            </button>

            <a href="/" target="_blank">
              查看前台
            </a>

            <button className="logout-side" onClick={logout}>
              登出
            </button>
          </div>
        </aside>

        <section className="admin-content">
          <div className="admin-content-head">
            <div>
              <h2>
                {activeTab === "front"
                  ? "管理1｜前台資料"
                  : activeTab === "buttons"
                  ? "管理2｜按鈕管理"
                  : activeTab === "stats"
                  ? "管理3｜數據統計"
                  : "管理4｜週報月報"}
              </h2>
              <p>
                {activeTab === "front"
                  ? "修改封面、頭像、店名、標籤、簡介與聯絡方式"
                  : activeTab === "buttons"
                  ? "修改整排大按鈕與小格子按鈕"
                  : activeTab === "stats"
                  ? "查看瀏覽數、點擊數、CTR 與排行"
                  : "查看週報、月報、成長比較與按鈕排行"}
              </p>
            </div>
          </div>

          {activeTab === "front" && settings && (
            <FrontSettingsPanel
              settings={settings}
              setSettings={setSettings}
              tagsText={tagsText}
              setTagsText={setTagsText}
              uploadImage={uploadImage}
              uploading={uploading}
              saveSettings={saveSettings}
              message={message}
            />
          )}

          {activeTab === "buttons" && (
            <ButtonsPanel
              largeButtons={largeButtons}
              gridButtons={gridButtons}
              newLargeButton={newLargeButton}
              setNewLargeButton={setNewLargeButton}
              newGridButton={newGridButton}
              setNewGridButton={setNewGridButton}
              updateButton={updateButton}
              saveButton={saveButton}
              addButton={addButton}
              deleteButton={deleteButton}
              uploadButtonImage={uploadButtonImage}
              message={message}
            />
            )}

              {activeTab === "stats" && <StatsPanel />}
              {activeTab === "reports" && <ReportsPanel />}
        </section>
      </section>
    </main>
  );
}

function FrontSettingsPanel({
  settings,
  setSettings,
  tagsText,
  setTagsText,
  uploadImage,
  uploading,
  saveSettings,
  message,
}: {
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
  tagsText: string;
  setTagsText: (value: string) => void;
  uploadImage: (
    event: ChangeEvent<HTMLInputElement>,
    field: SiteImageField
  ) => void;  uploading: boolean;
  saveSettings: () => void;
  message: string;
}) {
  return (
    <section className="admin-card admin-card-full">
      <h2>首頁基本資料</h2>

<h3 className="theme-image-title">淺色主題｜紅白調圖片</h3>

<div className="image-upload-grid">
  <div className="image-upload-box">
    <h3>淺色背景圖</h3>

    {settings.light_background_image_url ? (
      <img
        className="cover-preview"
        src={settings.light_background_image_url}
        alt="淺色背景圖預覽"
      />
    ) : (
      <div className="empty-preview">尚未上傳淺色背景圖</div>
    )}

    <input
      type="file"
      accept="image/*"
      onChange={(event) => uploadImage(event, "light_background_image_url")}
      disabled={uploading}
    />
  </div>

  <div className="image-upload-box">
    <h3>淺色封面圖</h3>

    {settings.light_cover_image_url ? (
      <img
        className="cover-preview"
        src={settings.light_cover_image_url}
        alt="淺色封面圖預覽"
      />
    ) : (
      <div className="empty-preview">尚未上傳淺色封面圖</div>
    )}

    <input
      type="file"
      accept="image/*"
      onChange={(event) => uploadImage(event, "light_cover_image_url")}
      disabled={uploading}
    />
  </div>

  <div className="image-upload-box">
    <h3>淺色頭像</h3>

    {settings.light_avatar_image_url ? (
      <img
        className="avatar-preview"
        src={settings.light_avatar_image_url}
        alt="淺色頭像預覽"
      />
    ) : (
      <div className="empty-preview avatar-empty">淺</div>
    )}

    <input
      type="file"
      accept="image/*"
      onChange={(event) => uploadImage(event, "light_avatar_image_url")}
      disabled={uploading}
    />
  </div>
</div>

<h3 className="theme-image-title">深色主題｜黑金調圖片</h3>

<div className="image-upload-grid">
  <div className="image-upload-box">
    <h3>深色背景圖</h3>

    {settings.dark_background_image_url ? (
      <img
        className="cover-preview"
        src={settings.dark_background_image_url}
        alt="深色背景圖預覽"
      />
    ) : (
      <div className="empty-preview">尚未上傳深色背景圖</div>
    )}

    <input
      type="file"
      accept="image/*"
      onChange={(event) => uploadImage(event, "dark_background_image_url")}
      disabled={uploading}
    />
  </div>

  <div className="image-upload-box">
    <h3>深色封面圖</h3>

    {settings.dark_cover_image_url ? (
      <img
        className="cover-preview"
        src={settings.dark_cover_image_url}
        alt="深色封面圖預覽"
      />
    ) : (
      <div className="empty-preview">尚未上傳深色封面圖</div>
    )}

    <input
      type="file"
      accept="image/*"
      onChange={(event) => uploadImage(event, "dark_cover_image_url")}
      disabled={uploading}
    />
  </div>

  <div className="image-upload-box">
    <h3>深色頭像</h3>

    {settings.dark_avatar_image_url ? (
      <img
        className="avatar-preview"
        src={settings.dark_avatar_image_url}
        alt="深色頭像預覽"
      />
    ) : (
      <div className="empty-preview avatar-empty">深</div>
    )}

    <input
      type="file"
      accept="image/*"
      onChange={(event) => uploadImage(event, "dark_avatar_image_url")}
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
          <option value="light">淺色主題｜紅白調</option>
          <option value="dark">深色主題｜黑紅調</option>
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

      <button onClick={saveSettings}>儲存前台資料</button>

      {message && <p className="admin-message">{message}</p>}
    </section>
  );
}

function ButtonsPanel({
  largeButtons,
  gridButtons,
  newLargeButton,
  setNewLargeButton,
  newGridButton,
  setNewGridButton,
  updateButton,
  saveButton,
  addButton,
  deleteButton,
  uploadButtonImage,
  message,
}: {
  largeButtons: LinkButton[];
  gridButtons: LinkButton[];
  newLargeButton: ReturnType<typeof emptyButton>;
  setNewLargeButton: (button: ReturnType<typeof emptyButton>) => void;
  newGridButton: ReturnType<typeof emptyButton>;
  setNewGridButton: (button: ReturnType<typeof emptyButton>) => void;
  updateButton: (
    id: string,
    field: keyof LinkButton,
    value: string | number | boolean
  ) => void;
  saveButton: (button: LinkButton) => void;
  addButton: (buttonType: ButtonType) => void;
  deleteButton: (button: LinkButton) => void;
  uploadButtonImage: (
    event: ChangeEvent<HTMLInputElement>,
    buttonId: string
  ) => void;
message: string;
}) {
  return (
    <>
      <section className="admin-card admin-card-full">
        <h2>整排式大按鈕</h2>

        <NewButtonBox
          title="新增大按鈕"
          draft={newLargeButton}
          setDraft={setNewLargeButton}
          onAdd={() => addButton("large")}
        />

        <div className="button-list">
          {largeButtons.map((button) => (
            <ButtonEditor
              key={button.id}
              button={button}
              updateButton={updateButton}
              saveButton={saveButton}
              deleteButton={deleteButton}
              uploadButtonImage={uploadButtonImage}
            />
          ))}
        </div>
      </section>

      <section className="admin-card admin-card-full">
        <h2>小格子按鈕</h2>

        <NewButtonBox
          title="新增小格子按鈕"
          draft={newGridButton}
          setDraft={setNewGridButton}
          onAdd={() => addButton("grid")}
        />

        <div className="button-list">
          {gridButtons.map((button) => (
            <ButtonEditor
              key={button.id}
              button={button}
              updateButton={updateButton}
              saveButton={saveButton}
              deleteButton={deleteButton}
              uploadButtonImage={uploadButtonImage}
            />
          ))}
        </div>

        {message && <p className="admin-message">{message}</p>}
      </section>
    </>
  );
}

function NewButtonBox({
  title,
  draft,
  setDraft,
  onAdd,
}: {
  title: string;
  draft: ReturnType<typeof emptyButton>;
  setDraft: (button: ReturnType<typeof emptyButton>) => void;
  onAdd: () => void;
}) {
  return (
    <div className="new-button-box">
      <h3>{title}</h3>

      <div className="admin-grid">
        <label>
          按鈕名稱
          <input
            value={draft.title}
            onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            placeholder="例如：Telegram 一鍵訂閱全頻道"
          />
        </label>

        <label>
          連結
          <input
            value={draft.url}
            onChange={(event) => setDraft({ ...draft, url: event.target.value })}
            placeholder="https://..."
          />
        </label>
      </div>

      <div className="admin-grid">
        <label>
          Emoji / Icon
          <input
            value={draft.icon_text || ""}
            onChange={(event) =>
              setDraft({ ...draft, icon_text: event.target.value })
            }
            placeholder="🌐"
          />
        </label>

        <label>
          排序
          <input
            type="number"
            value={draft.sort_order}
            onChange={(event) =>
              setDraft({ ...draft, sort_order: Number(event.target.value) })
            }
          />
        </label>
      </div>

      <label>
        圖片網址
        <input
          value={draft.image_url || ""}
          onChange={(event) => setDraft({ ...draft, image_url: event.target.value })}
          placeholder="可先留空，之後會加圖片上傳"
        />
      </label>

      <label className="check-row">
        <input
          type="checkbox"
          checked={draft.is_visible}
          onChange={(event) =>
            setDraft({ ...draft, is_visible: event.target.checked })
          }
        />
        顯示這個按鈕
      </label>

      <button onClick={onAdd}>新增</button>
    </div>
  );
}

function ButtonEditor({
  button,
  updateButton,
  saveButton,
  deleteButton,
  uploadButtonImage,
}: {
  button: LinkButton;
  updateButton: (
    id: string,
    field: keyof LinkButton,
    value: string | number | boolean
  ) => void;
  saveButton: (button: LinkButton) => void;
  deleteButton: (button: LinkButton) => void;
  uploadButtonImage: (
    event: ChangeEvent<HTMLInputElement>,
    buttonId: string
  ) => void;
}) {
  return (
    <div className="button-editor">
      <div className="button-editor-head">
        <strong>{button.title || "未命名按鈕"}</strong>
        <span>{button.button_type === "large" ? "大按鈕" : "小格子"}</span>
      </div>

      <div className="admin-grid">
        <label>
          按鈕名稱
          <input
            value={button.title}
            onChange={(event) => updateButton(button.id, "title", event.target.value)}
          />
        </label>

        <label>
          連結
          <input
            value={button.url}
            onChange={(event) => updateButton(button.id, "url", event.target.value)}
          />
        </label>
      </div>

      <div className="admin-grid">
        <label>
          Emoji / Icon
          <input
            value={button.icon_text || ""}
            onChange={(event) =>
              updateButton(button.id, "icon_text", event.target.value)
            }
          />
        </label>

        <label>
          排序
          <input
            type="number"
            value={button.sort_order}
            onChange={(event) =>
              updateButton(button.id, "sort_order", Number(event.target.value))
            }
          />
        </label>
      </div>

      <label>
        圖片網址
        <input
          value={button.image_url || ""}
          onChange={(event) =>
            updateButton(button.id, "image_url", event.target.value)
          }
          placeholder="有圖片網址時，前台會優先顯示圖片"
        />
      </label>

      <label>
        上傳按鈕圖片
        <input
          type="file"
          accept="image/*"
          onChange={(event) => uploadButtonImage(event, button.id)}
        />
      </label>

{button.image_url && (
  <div className="button-image-preview">
    <img src={button.image_url} alt="按鈕圖片預覽" />
  </div>
)}

      <label className="check-row">
        <input
          type="checkbox"
          checked={button.is_visible}
          onChange={(event) =>
            updateButton(button.id, "is_visible", event.target.checked)
          }
        />
        前台顯示這個按鈕
      </label>

      <div className="button-actions">
        <button onClick={() => saveButton(button)}>儲存這個按鈕</button>
        <button className="danger-btn" onClick={() => deleteButton(button)}>
          刪除
        </button>
      </div>
    </div>
  );
}