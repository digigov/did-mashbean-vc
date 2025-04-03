# 數位皮夾卡片發行介接流程說明

## 前置作業流程

1. 註冊帳號 (https://www.wallet.gov.tw/applyAccount.html)
   - 需完成手機及email驗證
   - 系統會寄送開通信件(約需等待數分鐘)
   - 目前測試階段一般帳號即可，進階帳號功能暫時未知
   - 完成後可取得 access token

2. 建立 VC 樣板
   - 登入發行後台(https://issuer-sandbox.wallet.gov.tw/)建立卡片樣板
   - 設定欄位清單及卡面圖片
   - 取得卡片序號(vcId)及樣板代號(vcCid)

3. 系統整合
   - 在自有系統中設定檢驗規則
   - 通過檢查後呼叫 API 發行卡片
   - 需帶入卡片序號、樣板代號及使用者欄位資料

## API 發行範例

## 設定檔說明

請參考 config.sample.js 建立 config.js 檔案，並填入以下資訊:

- vcId: 卡片序號，從發行後台取得
- vcCid: 卡片樣板代號，從發行後台取得  
- apiKey: API 存取金鑰，從發行後台取得


## 啟動服務

1. 安裝相依套件
   ```bash
   npm install
   ```

2. 啟動服務
   ```bash
   ./bin/www
   ```

3. 開啟瀏覽器訪問
   ```
   http://localhost:3000
   ```

服務啟動後即可開始測試發行卡片功能。

