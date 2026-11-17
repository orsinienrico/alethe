"""Retire only the previously published Alethe release, after maintenance verification."""
import json, os, urllib.request, urllib.error
from uuid import UUID
account=os.environ["CLOUDFLARE_ACCOUNT_ID"]
token=os.environ["CLOUDFLARE_API_TOKEN"]
base=f"https://api.cloudflare.com/client/v4/accounts/{account}/pages/projects/alethe"
old="https://b2e43f1e.alethe.pages.dev"
def api(method,path):
    request=urllib.request.Request(base+path,method=method,headers={"Authorization":"Bearer "+token})
    try:
        with urllib.request.urlopen(request,timeout=30) as response: data=json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f"Cloudflare retirement API HTTP {error.code}")
    if not data.get("success"): raise SystemExit("Cloudflare retirement API failed")
    return data["result"]
project=api("GET","")
current=project.get("canonical_deployment") or {}
if not current.get("id"): raise SystemExit("Cannot identify current production deployment")
if current.get("url","").rstrip("/") == old: raise SystemExit("Refusing to retire current production")
for page in range(1,101):
    rows=api("GET",f"/deployments?page={page}&per_page=10")
    for row in rows:
        if row.get("url","").rstrip("/") != old: continue
        if row["id"] == current["id"]: raise SystemExit("Refusing to retire current deployment")
        deployment=str(UUID(row["id"]))
        api("DELETE","/deployments/"+deployment)
        print("Previous public game deployment retired; source and D1 preserved.")
        raise SystemExit(0)
    if len(rows)<10:
        print("Previous public game deployment no longer listed.")
        raise SystemExit(0)
raise SystemExit("Could not finish scanning previous deployment list")
