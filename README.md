# 數位皮夾卡片發行介接流程說明

## 前置作業流程

1. 註冊帳號 (https://www.wallet.gov.tw/applyAccount.html)
   - 需完成手機及email驗證
   - 系統會寄送開通信件(約需等待數分鐘)
   - 目前測試階段一般帳號即可，進階帳號功能暫時未知
   - 完成後可取得 access token
   - 若註冊時未取得 access token，可從以下位置重新取得：
     - 登入發行或驗證後台
     - 點選右上角頭像選單
     - 選擇「換發 access token」功能
   ![取得 access token 位置](./guide/access_token.jpg)



2. 建立 VC 樣板
   - 登入發行後台(https://issuer-sandbox.wallet.gov.tw/)建立卡片樣板
     ![建立 VC 樣板](./guide/vc_create.png)

   - 設定欄位清單及卡面圖片
   - 取得卡片序號(vcId)及樣板代號(vcCid)
     ![點及詳細資料](./guide/apply-vc1.png)
     ![取得序號跟樣板代號](./guide/apply-vc2.png)


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



## 線上展示

您可以透過以下網址體驗本專案的線上展示版本:

http://mashbeanvc.tonyq.org/

此展示網站提供完整的數位豆泥卡申請流程示範，包含:
- 填寫基本資料
- 產生專屬 QR Code
- 掃描 QR Code 取得數位卡片

請注意此為測試環境,僅供功能展示使用。



## 作者

本範例專案由 tonyq (tonylovejava@gmail.com) 賺寫。


## License

本專案採用 MIT License 授權。

您可以自由地：
- 使用、複製及散布本軟體
- 修改本軟體並散布修改後的版本
- 將本軟體或其修改後的版本用於商業用途

詳細授權內容請參閱 [MIT License](https://opensource.org/licenses/MIT)。




## 免責聲明

本專案僅供概念測試使用，請勿使用在正式環境。使用本專案時請注意：

- 此為概念驗證(Proof of Concept)專案，不建議用於生產環境
- 不保證系統安全性及資料隱私保護
- 所有測試資料僅供展示用途，不具任何法律效力
- 開發者不對使用本系統造成的任何損失負責

若需要在正式環境中實作類似功能，建議：
- 諮詢資安專家進行完整的安全性評估
- 遵循相關法規要求進行開發
- 建置適當的資料保護機制
- 進行完整的系統測試與驗證

