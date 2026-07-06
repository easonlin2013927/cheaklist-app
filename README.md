# 清單製作器

一個簡潔美觀的清單管理工具，基於 React + Vite 打造。支援多分類管理、優先級、即時搜尋、統計圖表、主題切換，以及匯出與分享功能。雲端同步，隨時隨地存取你的清單。

[![Live Demo](https://img.shields.io/badge/%F0%9F%9A%80%E7%94%9F%E5%91%BD%E9%A9%83%E7%89%88-brightgreen)](https://checklist-app.easonlin2013927.workers.dev/)

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 功能

- 🔐 **帳號系統** — 電子郵件註冊/登入，JWT 認證
- ☁️ **雲端同步** — 所有數據自動儲存至 Cloudflare KV，跨裝置同步
- 📂 **多分類管理** — 建立、重命名、刪除分類
- 🔴 **三級優先標記** — 高 / 中 / 低，視覺化區分
- 🔍 **即時搜尋篩選**
- 🌙 **手動切換淺色 / 深色 / 跟隨系統**
- 📊 **統計圖表** — 整體完成率 + 各分類詳細數據
- 🔗 **分享連結** — Base64 編碼，無需後端即可查看
- 📤 **匯出 TXT / Markdown**
- 📊 **即時進度條與完成計數**
- 📱 **響應式設計**，手機平板皆適用
- ♿ **無障礙支援**（ARIA 標籤）

## 技術棧

| 技術 | 用途 |
|------|------|
| React 19 | UI 框架 |
| Vite 8 | 建構工具 |
| Cloudflare Pages Functions | 認證 API + KV 儲存 |
| Cloudflare KV | 雲端資料持久化 |
| Oxlint | 程式碼檢查 |
| CSS 變數 | 主題系統 |

## 快速開始

1. 前往 [線上示範](https://checklist-app.easonlin2013927.workers.dev/)
2. 點擊「註冊」建立帳號
3. 開始管理你的清單！

## 開發

`ash
# 安裝依賴
npm install

# 啟動開發伺服器（需搭配 wrangler 本地模擬）
npm run dev

# 建構生產版本
npm run build

# 預覽建構結果
npm run preview

# 執行 linter
npm run lint
`

## 本地開發

`ash
# 1. 安裝 Wrangler 並登入
npm install -g wrangler
wrangler login

# 2. 建立 KV namespace
wrangler kv:namespace create CHECKLIST_KV

# 3. 在 wrangler.toml 中填入 namespace ID

# 4. 設定 JWT Secret
echo "WRANGLER_JWT_SECRET=your-secret-here" > .dev.vars

# 5. 啟動開發伺服器
npx wrangler pages dev dist --port 8788
`

## 部署

### Cloudflare Pages（推薦）

1. 將此倉庫推送到 GitHub

2. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**

3. 選擇此倉庫，設定：
   - **Framework preset**: Vite
   - **Build command**: 
pm run build
   - **Output directory**: dist
   - **Functions**: unctions/*

4. 新增 KV namespace 綁定：
   - **Variable name**: CHECKLIST_KV
   - **KV Namespace**: 選擇你建立的 namespace

5. 新增 Secret：
   - **Name**: JWT_SECRET
   - **Value**: 一個隨機字串（用於 JWT 簽發）

6. 點擊 **Save and Deploy** 即可自動部署。

### 其他平台

此專案輸出純靜態檔案（HTML / CSS / JS），可部署至任何靜態網站託管服務。但認證和雲端同步功能需要 Cloudflare Pages Functions。

## 授權

[MIT License](LICENSE)
