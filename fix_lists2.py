import subprocess, json, requests
r = subprocess.check_output(['az','account','get-access-token','--resource','https://myfedex.sharepoint.com'])
d = json.loads(r)
token = d['accessToken']
headers = {'Authorization': 'Bearer ' + token, 'Accept': 'application/json;odata=nometadata'}
resp = requests.get('https://myfedex.sharepoint.com/sites/ClearanceDeskDemo/_api/web/lists?$filter=startswith(Title,%27CD_%27)', headers=headers)
print(resp.status_code)
data = resp.json()
for l in data.get('value',[]):
    print(l['Title'])
