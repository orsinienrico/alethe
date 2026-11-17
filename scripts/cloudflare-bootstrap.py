"""Provision only the Alethe Pages project and D1 database in the supplied account."""
import json
import os
import re
import sys
import urllib.request
import urllib.error
from pathlib import Path
from uuid import UUID

account = os.environ.get("CLOUDFLARE_ACCOUNT_ID", "")
token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
if not token or not re.fullmatch(r"[0-9a-fA-F]{32}", account):
    sys.exit("Missing or invalid Alethe repository Cloudflare secrets.")
base = f"https://api.cloudflare.com/client/v4/accounts/{account}"
def api(method, path, data=None):
    request = urllib.request.Request(base + path, method=method,
        headers={"Authorization": "Bearer " + token, "Content-Type":"application/json"},
        data=json.dumps(data).encode() if data is not None else None)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        sys.exit(f"Cloudflare {method} {path.split('?')[0]} returned HTTP {error.code}; check token permissions and account.")
    if not result.get("success"):
        sys.exit("Cloudflare rejected " + method + " " + path.split("?")[0])
    return result

def named(path, name):
    for page in range(1, 101):
        payload = api("GET", f"{path}?page={page}&per_page=50")
        rows = payload["result"]
        found = [r for r in rows if r.get("name") == name]
        if found:
            return found[0]
        info = payload.get("result_info") or {}
        if len(rows)<50 or page >= info.get("total_pages", 101):
            return None
    sys.exit("Cloudflare pagination exceeded safety limit")

project = named("/pages/projects", "alethe")
if project and (project.get("source") or project.get("production_branch") != "main"):
    sys.exit("Existing Alethe project has different deployment configuration; refusing to overwrite.")
db = named("/d1/database", "alethe-db")
if not db:
    db = api("POST", "/d1/database", {"name":"alethe-db","jurisdiction":"eu"})["result"]
db_id = str(UUID(db["uuid"]))
if not project:
    project = api("POST", "/pages/projects", {"name":"alethe","production_branch":"main"})["result"]
domain = project.get("subdomain","")
if not re.fullmatch(r"[a-z0-9-]+\.pages\.dev", domain):
    sys.exit("Unexpected Pages subdomain")
config = Path("wrangler.toml")
text = config.read_text()
if text.count("DA_SOSTITUIRE_CON_ID_REALE") != 1:
    sys.exit("Expected exactly one D1 configuration placeholder")
config.write_text(text.replace("DA_SOSTITUIRE_CON_ID_REALE", db_id))
Path(os.environ["RUNNER_TEMP"], "alethe-url").write_text("https://" + domain)
print("Alethe Pages and D1 provisioned; configuration resolved in CI only.")
