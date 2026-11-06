# Power Automate Flows to Create

Create these 3 flows in Power Automate (make.powerautomate.com) in environment MyFedEx (Upgrade)

## 1) CD_ImportExcel_FileUpload (Instant flow from Power Apps)
Trigger: Power Apps (V2)
Parameters:
- fileName (string)
- fileContent (string) - base64
- pipeline (string)

Actions:
1. Create file in SharePoint: Site = ClearanceDeskDemo, Folder = Shared Documents/ClearanceDeskTemp, File name = concat('imp_', utcNow(), '_', triggerBody()['fileName']), File Content = base64ToBinary(triggerBody()['fileContent'])
2. Respond to Power App or flow - return fileId, status

## 2) CD_Link_GetPackage (HTTP Request)
Trigger: When an HTTP request is received
Schema:
{"type":"object","properties":{"token":{"type":"string"}},"required":["token"]}

Actions:
1. Get items from CD_Shipment where LinkToken eq token
2. Get items from CD_ShipmentEvent where AWB eq shipment.Title and EventType eq 'LINK_OPENED'
3. If no LINK_OPENED -> Create item in CD_ShipmentEvent (Title=LINK_OPENED, AWB, EventType=LINK_OPENED, Actor=CUSTOMER, EventDate=utcNow())
4. Response 200 with shipment data + checklist

## 3) CD_Link_UploadDoc (HTTP Request)
Trigger: When an HTTP request is received
Schema:
{"type":"object","properties":{"token":{"type":"string"},"fileName":{"type":"string"},"contentType":{"type":"string"},"contentBytes":{"type":"string"}},"required":["token","fileName","contentBytes"]}

Actions:
1. Get items CD_Shipment where LinkToken eq token
2. Create file in Shared Documents/ClearanceDeskUploads
3. Create item in CD_Document (AWB, FileName, Source=PORTAL, FileLink)
4. Create item in CD_ShipmentEvent (Title=DOC_RECEIVED, AWB, EventType=DOC_RECEIVED, Actor=CUSTOMER)
5. Response 200
