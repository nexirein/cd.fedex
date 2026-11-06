# Deploy CustomerPackage.html to SharePoint (Tokenized Link)

This is the minimal customer page for your PPO. No Power Pages needed.

## 1) Where to upload
Upload `CustomerPackage.html` to one of these on your site:
- `https://myfedex.sharepoint.com/sites/ClearanceDeskDemo/SiteAssets/` (Recommended)
- Or `Site Pages/`

## 2) Create the 2 Power Automate HTTP flows
Create these flows in **Power Automate > Create > Instant cloud flow** or **Automated**. Both need **When an HTTP request is received** as trigger.

### Flow 1: `CD-Link-GetPackage`
Trigger: HTTP Request
- Method: POST
- Schema:
```json
{
  "type": "object",
  "properties": {
    "token": { "type": "string" }
  },
  "required": ["token"]
}
```

Steps:
1. `Get items` from `CD_Shipment` list
   - Filter Query: `LinkToken eq '@{triggerBody()?['token']}'`
   - Top Count: 1
2. If no items returned -> Response (Status 404) with `{"error":"Invalid or expired link"}`
3. If found -> Compose/Response (Status 200) return JSON like:
```json
{
  "awb": "@{first(outputs('Get_items')?['body/value'])?['Title']}",
  "company": "@{first(outputs('Get_items')?['body/value'])?['Company']}",
  "consigneeName": "@{first(outputs('Get_items')?['body/value'])?['ConsigneeName']}",
  "location": "@{first(outputs('Get_items')?['body/value'])?['Location']}",
  "clearanceType": "@{first(outputs('Get_items')?['body/value'])?['ClearanceType']}",
  "broker": "@{first(outputs('Get_items')?['body/value'])?['Broker']}",
  "pieces": "@{first(outputs('Get_items')?['body/value'])?['Pieces']}",
  "weight": "@{first(outputs('Get_items')?['body/value'])?['Weight']}",
  "invoiceValue": "@{first(outputs('Get_items')?['body/value'])?['InvoiceValue']}",
  "currency": "@{first(outputs('Get_items')?['body/value'])?['Currency']}",
  "checklist": [
    {"name": "Invoice", "required": true, "status": "REQUIRED"},
    {"name": "Packing List", "required": true, "status": "REQUIRED"},
    {"name": "KYC Documents", "required": true, "status": "REQUIRED"},
    {"name": "IEC/GST Related", "required": true, "status": "REQUIRED"}
  ]
}
```

Save and copy the **HTTP POST URL**.

### Flow 2: `CD-Link-UploadDoc`
Trigger: HTTP Request
- Method: POST
- Schema:
```json
{
  "type": "object",
  "properties": {
    "token": { "type": "string" },
    "fileName": { "type": "string" },
    "contentType": { "type": "string" },
    "contentBytes": { "type": "string" }
  },
  "required": ["token", "fileName", "contentBytes"]
}
```

Steps:
1. `Get items` from `CD_Shipment` where `LinkToken eq @{triggerBody()?['token']}` -> get ID/AWB
2. If not found -> Response 404
3. If found -> `Create file` in a library e.g. `Shared Documents/ClearanceDeskUploads/` using `base64ToBinary(triggerBody()?['contentBytes'])`
4. `Create item` in `CD_Document` list with AWB, FileName, Link to file, Source = PORTAL
5. `Create item` in `CD_ShipmentEvent` list with AWB, EventType = DOC_RECEIVED, Actor = CUSTOMER
6. Response 200 with `{"success": true, "fileName": "..."}`

Save and copy the **HTTP POST URL**.

## 3) Update the HTML with flow URLs
Open `CustomerPackage.html` in a text editor. Replace:
```js
const GET_PACKAGE_URL = "REPLACE_WITH_CD_LINK_GETPACKAGE_HTTP_URL";
const UPLOAD_DOC_URL = "REPLACE_WITH_CD_LINK_UPLOADDOC_HTTP_URL";
```

With your actual flow URLs.

Upload the updated HTML back to SiteAssets.

## 4) Test
1. Get a shipment that has `LinkToken` set (we'll generate this on send)
2. Open: `https://myfedex.sharepoint.com/sites/ClearanceDeskDemo/SiteAssets/CustomerPackage.html?t=YOUR_TOKEN`
3. Should load package details
4. Upload a small PDF/JPG/PNG -> should show success and file should appear

## 5) Generate tokens on send
In the Canvas app send logic, for each shipment to be sent:
- If `LinkToken` is blank -> generate `GUID()` and patch to `CD_Shipment`
- Build link: `"https://myfedex.sharepoint.com/sites/ClearanceDeskDemo/SiteAssets/CustomerPackage.html?t=" & Shipment.LinkToken`
- Add link to the email body
