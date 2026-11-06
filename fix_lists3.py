import subprocess, json, requests
r = subprocess.check_output(['az','account','get-access-token','--resource','https://graph.microsoft.com'])
d = json.loads(r)
print(d.keys())
