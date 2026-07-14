# 別信這一關

純 HTML、CSS 與 JavaScript 製作的瀏覽器遊戲。

## 本機預覽

在專案資料夾執行：

```bash
ruby -run -e httpd . -p 4173 -b 127.0.0.1
```

然後開啟 <http://127.0.0.1:4173/>。修改程式並儲存後，重新整理瀏覽器即可看到結果。要停止伺服器時，在終端機按 `Ctrl+C`。

## 主要檔案

- `index.html`：遊戲頁面與選單
- `styles.css`：畫面樣式與手機版配置
- `chapter-one.js`：目前第一章的關卡內容
- `game.js`：角色操作、碰撞、繪圖與遊戲流程
- `levels.js`：尚未接入頁面的後續關卡草稿

`cookie.txt` 是本機資料，不可上傳或發布。它已列入 `.gitignore`。

## GitHub Pages

把專案推送到 GitHub 後，在 repository 的 `Settings > Pages` 選擇 `Deploy from a branch`，分支選 `main`，資料夾選 `/(root)`。之後每次推送到 `main` 都會更新網站。
