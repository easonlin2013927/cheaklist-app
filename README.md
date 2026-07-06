# 清單製作器

一個簡潔美觀的清單管理工具，基於 React + Vite 打造。支援多分類管理、優先級、即時搜尋、統計圖表、主題切換，以及匯出與分享功能。

[![點我觀看](https://img.shields.io/badge/%F0%9F%9A%80%E7%94%9F%E5%91%BD%E9%A9%83%E7%89%88-brightgreen)](https://checklist-app.easonlin2013927.workers.dev/)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 功能

- ✅ 新增 / 刪除 / 編輯清單項目
- 📂 多分類管理（建立、重命名、刪除分類）
- 🔴 三級優先標記（高 / 中 / 低）
- 🔍 即時搜尋篩選
- 🌙 手動切換淺色 / 深色 / 跟隨系統
- 📊 統計圖表（整體完成率 + 各分類詳細數據）
- 🔗 分享連結（Base64 編碼，無需後端）
- 📤 匯出為 TXT / Markdown
- 📊 即時進度條與完成計數
- 💾 自動儲存至 localStorage
- 📱 響應式設計，手機平板皆適用
- ♿ 無障礙支援（ARIA 標籤）

## 技術棧

| 技術 | 用途 |
|------|------|
| React 19 | UI 框架 |
| Vite 8 | 建構工具 |
| Oxlint | 程式碼檢查 |
| CSS 變數 | 主題系統 |
| localStorage | 資料持久化 |

## 開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 建構生產版本
npm run build

# 預覽建構結果
npm run preview

# 執行 linter
npm run lint
```

## 部署

### Cloudflare Pages（推薦）

1. 將此倉庫推送到 GitHub

2. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**

3. 選擇此倉庫，設定：
   - **Framework preset**: None
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
   - **Base directory**: （留空）

4. 點擊 **Save and Deploy** 即可自動部署。

### 手動部署

```bash
npm install
npm run build

# 前往 Cloudflare Dashboard → Pages → Deploy manually
# 將 dist 資料夾上傳
```

### 其他平台

此專案輸出純靜態檔案（HTML / CSS / JS），可部署至任何靜態網站託管服務：

- **GitHub Pages**: 安裝 `gh-pages`，執行 `npx gh-pages -d dist`
- **Vercel**: 執行 `vercel` 並遵循指示
- **Netlify**: 執行 `netlify deploy --prod --dir=dist`

## 授權

[MIT License](LICENSE)
