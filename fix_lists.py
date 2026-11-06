import subprocess, json, requests
from office365.sharepoint.client_context import ClientContext
from office365.runtime.auth.client_credential import ClientCredential

r = subprocess.check_output(['az','account','get-access-token','--resource','https://myfedex.sharepoint.com'])
d = json.loads(r)
token = d['accessToken']

headers = {'Authorization': 'Bearer ' + token, 'Accept': 'application/json;odata=verbose'}
# get lists
resp = requests.get('https://myfedex.sharepoint.com/sites/ClearanceDeskDemo/_api/web/lists', headers=headers)
print(resp.status_code)
