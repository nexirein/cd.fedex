import subprocess, json, requests
# try sharepoint resource differently
r = subprocess.check_output(['az','account','get-access-token','--resource-type','ms-graph'])
