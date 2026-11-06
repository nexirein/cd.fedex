import subprocess, json, requests
r = subprocess.check_output(['az','account','get-access-token','--resource','https://myfedex.sharepoint.com'])
d = json.loads(r)
token = d['accessToken']
headers = {'Authorization': 'Bearer ' + token, 'Accept': 'application/json;odata=verbose'}
resp = requests.get('https://myfedex.sharepoint.com/sites/ClearanceDeskDemo/_api/web', headers=headers)
print(resp.status_code)
