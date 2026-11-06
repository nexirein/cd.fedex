from office365.sharepoint.client_context import ClientContext
from office365.runtime.auth.user_credential import UserCredential
import sys

site_url = "https://myfedex.sharepoint.com/sites/ClearanceDeskDemo"
# Try with current user context
ctx = ClientContext(site_url).with_user_credentials("bipul.sikder@fedex.com", "")
# This won't work without password, need interactive
print("need auth")
