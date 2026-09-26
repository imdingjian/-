# 社會勞動時數 PWA

## 部署
將整個資料夾內容放到任何支援 HTTPS 的靜態網站主機即可。

可用 GitHub Pages、Cloudflare Pages、Netlify、Vercel 等。

## iPhone
用 Safari 開啟網站 → 分享 → 加入主畫面。

## 注意
- PWA Service Worker 必須在 HTTPS（localhost 例外）環境才能完整運作。
- 資料預設儲存在瀏覽器 localStorage。
- 建議定期使用「備份資料」下載 JSON。
- 「匯出 Excel」會產生 UTF-8 CSV，Excel 可直接開啟。
- 「PDF 報表」使用瀏覽器列印功能，可選擇另存為 PDF。
