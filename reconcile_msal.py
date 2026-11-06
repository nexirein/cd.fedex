from office365.sharepoint.client_context import ClientContext
from office365.runtime.auth.authentication_context import AuthenticationContext
from msal import PublicClientApplication
import json

site_url = "https://myfedex.sharepoint.com/sites/ClearanceDeskDemo"
app_id = "9bc3ab49-b65d-410a-95ad-36e0bbe70c4b"
scopes = ["https://myfedex.sharepoint.com/.default"]

app = PublicClientApplication(app_id)
# Try to get token silently or interactively
accounts = app.get_accounts()
if accounts:
    result = app.acquire_token_silent(scopes, account=accounts[0])
else:
    result = app.acquire_token_interactive(scopes)

if "access_token" in result:
    ctx = ClientContext(site_url).with_access_token(result['access_token'])
    web = ctx.web
    ctx.load(web)
    ctx.execute_query()
    print(web.properties['Title'])
else:
    print(result)
