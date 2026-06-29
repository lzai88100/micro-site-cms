"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";

type ButtonType = "large" | "grid";

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

export default function AdminButtonsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [buttons, setButtons] = useState<LinkButton[]>([]);
  const [message, setMessage] = useState("");
  const [newLargeButton, setNewLargeButton] = useState(emptyButton("large"));
  const [newGridButton, setNewGridButton] = useState(emptyButton("grid"));

  useEffect(() => {
    checkLogin();
  }, []);

  async function checkLogin() {
    const { data } = await supabase.auth.getSession();

    if (!data.session) {
      setIsLoggedIn(false);
      setMessage("請先回到 /admin 登入後台");
      return;
    }

    setIsLoggedIn(true);
    loadButtons();
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

  function updateButton(id: string, field: keyof LinkButton, value: string | number | boolean) {
    setButtons((currentButtons) =>
      currentButtons.map((button) =>
        button.id === id ? { ...button, [field]: value } : button
      )
    );
  }

  async function saveButton(button: LinkButton) {
    setMessage("儲存中...");

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
      setMessage("儲存失敗：" + error.message);
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

    setMessage("新增中...");

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

  const largeButtons = buttons.filter((button) => button.button_type === "large");
  const gridButtons = buttons.filter((button) => button.button_type === "grid");

  if (!isLoggedIn) {
    return (
      <main className="admin-page">
        <section className="admin-card login-card">
          <h1>請先登入後台</h1>
          <p>{message}</p>
          <Link className="admin-link-btn" href="/admin">
            回到後台登入
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-topbar">
        <div>
          <h1>按鈕管理</h1>
          <p>管理前台整排式大按鈕與小格子按鈕</p>
        </div>

        <div className="admin-nav">
          <Link href="/admin">基本資料</Link>
          <Link href="/">看前台</Link>
        </div>
      </section>

      <section className="admin-card">
        <h2>整排式大按鈕</h2>

        <div className="new-button-box">
          <h3>新增大按鈕</h3>

          <div className="admin-grid">
            <label>
              按鈕名稱
              <input
                value={newLargeButton.title}
                onChange={(event) =>
                  setNewLargeButton({ ...newLargeButton, title: event.target.value })
                }
                placeholder="例如：Telegram 一鍵訂閱全頻道"
              />
            </label>

            <label>
              連結
              <input
                value={newLargeButton.url}
                onChange={(event) =>
                  setNewLargeButton({ ...newLargeButton, url: event.target.value })
                }
                placeholder="https://..."
              />
            </label>
          </div>

          <div className="admin-grid">
            <label>
              Emoji / Icon
              <input
                value={newLargeButton.icon_text || ""}
                onChange={(event) =>
                  setNewLargeButton({ ...newLargeButton, icon_text: event.target.value })
                }
                placeholder="🌐"
              />
            </label>

            <label>
              排序
              <input
                type="number"
                value={newLargeButton.sort_order}
                onChange={(event) =>
                  setNewLargeButton({
                    ...newLargeButton,
                    sort_order: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>

          <label>
            圖片網址
            <input
              value={newLargeButton.image_url || ""}
              onChange={(event) =>
                setNewLargeButton({ ...newLargeButton, image_url: event.target.value })
              }
              placeholder="先可留空，下一步會做圖片上傳"
            />
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={newLargeButton.is_visible}
              onChange={(event) =>
                setNewLargeButton({
                  ...newLargeButton,
                  is_visible: event.target.checked,
                })
              }
            />
            顯示這個按鈕
          </label>

          <button onClick={() => addButton("large")}>新增大按鈕</button>
        </div>

        <div className="button-list">
          {largeButtons.map((button) => (
            <ButtonEditor
              key={button.id}
              button={button}
              updateButton={updateButton}
              saveButton={saveButton}
              deleteButton={deleteButton}
            />
          ))}
        </div>
      </section>

      <section className="admin-card">
        <h2>小格子按鈕</h2>

        <div className="new-button-box">
          <h3>新增小格子按鈕</h3>

          <div className="admin-grid">
            <label>
              按鈕名稱
              <input
                value={newGridButton.title}
                onChange={(event) =>
                  setNewGridButton({ ...newGridButton, title: event.target.value })
                }
                placeholder="例如：全台情報中心"
              />
            </label>

            <label>
              連結
              <input
                value={newGridButton.url}
                onChange={(event) =>
                  setNewGridButton({ ...newGridButton, url: event.target.value })
                }
                placeholder="https://..."
              />
            </label>
          </div>

          <div className="admin-grid">
            <label>
              Emoji / Icon
              <input
                value={newGridButton.icon_text || ""}
                onChange={(event) =>
                  setNewGridButton({ ...newGridButton, icon_text: event.target.value })
                }
                placeholder="📰"
              />
            </label>

            <label>
              排序
              <input
                type="number"
                value={newGridButton.sort_order}
                onChange={(event) =>
                  setNewGridButton({
                    ...newGridButton,
                    sort_order: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>

          <label>
            圖片網址
            <input
              value={newGridButton.image_url || ""}
              onChange={(event) =>
                setNewGridButton({ ...newGridButton, image_url: event.target.value })
              }
              placeholder="先可留空，下一步會做圖片上傳"
            />
          </label>

          <label className="check-row">
            <input
              type="checkbox"
              checked={newGridButton.is_visible}
              onChange={(event) =>
                setNewGridButton({
                  ...newGridButton,
                  is_visible: event.target.checked,
                })
              }
            />
            顯示這個按鈕
          </label>

          <button onClick={() => addButton("grid")}>新增小格子按鈕</button>
        </div>

        <div className="button-list">
          {gridButtons.map((button) => (
            <ButtonEditor
              key={button.id}
              button={button}
              updateButton={updateButton}
              saveButton={saveButton}
              deleteButton={deleteButton}
            />
          ))}
        </div>
      </section>

      {message && <section className="admin-card admin-message">{message}</section>}
    </main>
  );
}

function ButtonEditor({
  button,
  updateButton,
  saveButton,
  deleteButton,
}: {
  button: LinkButton;
  updateButton: (id: string, field: keyof LinkButton, value: string | number | boolean) => void;
  saveButton: (button: LinkButton) => void;
  deleteButton: (button: LinkButton) => void;
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
            onChange={(event) => updateButton(button.id, "icon_text", event.target.value)}
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
          onChange={(event) => updateButton(button.id, "image_url", event.target.value)}
          placeholder="有圖片網址時，前台會優先顯示圖片"
        />
      </label>

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