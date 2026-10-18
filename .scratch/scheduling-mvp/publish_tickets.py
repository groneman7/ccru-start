"""Publish the approved ticket drafts, recording each successful remote mutation."""

import json
import re
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPO = "groneman7/ccru-start"
PLAN = json.loads((ROOT / "ticket-plan.json").read_text())
STATE_PATH = ROOT / "publication.json"
STATE = json.loads(STATE_PATH.read_text()) if STATE_PATH.exists() else {
    "parent": PLAN["parent"],
    "approved": True,
    "tickets": {},
}
BODY_DIR = ROOT / "published-bodies"
BODY_DIR.mkdir(exist_ok=True)


def save():
    STATE_PATH.write_text(json.dumps(STATE, indent=2) + "\n")


def gh(*args):
    result = subprocess.run(["gh", *args], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"gh {' '.join(args[:5])}: {result.stderr.strip()}")
    return result.stdout.strip()


def api(endpoint, *args):
    return json.loads(gh(
        "api", endpoint,
        "-H", "Accept: application/vnd.github+json",
        "-H", "X-GitHub-Api-Version: 2026-03-10",
        *args,
    ))


def mutate(endpoint, *args):
    result = api(endpoint, "--method", "POST", *args)
    time.sleep(1)
    return result


def main():
    existing = json.loads(gh(
        "issue", "list", "--repo", REPO, "--state", "all", "--limit", "100",
        "--json", "number,title,body,url",
    ))
    titles = {}
    for issue in existing:
        titles.setdefault(issue["title"], []).append(issue)

    for ticket in PLAN["tickets"]:
        key = str(ticket["id"])
        draft_paths = list((ROOT / "issues").glob(f"{ticket['id']:02}-*.md"))
        if len(draft_paths) != 1:
            raise RuntimeError(f"Expected exactly one draft for T{ticket['id']:02}")
        body = draft_paths[0].read_text().split("\n## Blocked by\n", 1)[0].rstrip() + "\n"
        body_path = BODY_DIR / draft_paths[0].name
        body_path.write_text(body)
        entry = STATE["tickets"].get(key)

        if entry is None:
            matches = titles.get(ticket["title"], [])
            if len(matches) > 1:
                raise RuntimeError(f"Multiple existing issues match T{ticket['id']:02}")
            if matches:
                match = matches[0]
                if match["body"].replace("\r\n", "\n").rstrip() != body.rstrip():
                    raise RuntimeError(f"Existing issue body differs for T{ticket['id']:02}")
                number = match["number"]
                url = match["url"]
            else:
                url = gh(
                    "issue", "create", "--repo", REPO,
                    "--title", ticket["title"], "--body-file", str(body_path),
                    "--label", "ready-for-agent",
                )
                match = re.fullmatch(r"https://github.com/groneman7/ccru-start/issues/(\d+)", url)
                if match is None:
                    raise RuntimeError(f"Unexpected create result: {url}")
                number = int(match[1])
                time.sleep(1)
            entry = {"number": number, "url": url, "parent_linked": False, "blockers_linked": []}
            STATE["tickets"][key] = entry
            save()

        if "id" not in entry:
            remote = api(f"repos/{REPO}/issues/{entry['number']}")
            entry["id"] = remote["id"]
            save()

        if not entry["parent_linked"]:
            # Check first so a resumed run never repeats an already completed edge.
            children = api(f"repos/{REPO}/issues/2/sub_issues?per_page=100")
            if entry["id"] not in {child["id"] for child in children}:
                mutate(f"repos/{REPO}/issues/2/sub_issues", "-F", f"sub_issue_id={entry['id']}")
            entry["parent_linked"] = True
            save()

        if ticket["blocked_by"]:
            current = api(f"repos/{REPO}/issues/{entry['number']}/dependencies/blocked_by?per_page=100")
            current_ids = {blocker["id"] for blocker in current}
            for blocker in ticket["blocked_by"]:
                target = STATE["tickets"][str(blocker)]
                if target["id"] not in current_ids:
                    mutate(
                        f"repos/{REPO}/issues/{entry['number']}/dependencies/blocked_by",
                        "-F", f"issue_id={target['id']}",
                    )
                    current_ids.add(target["id"])
                if blocker not in entry["blockers_linked"]:
                    entry["blockers_linked"].append(blocker)
                    save()

        print(f"T{ticket['id']:02} -> #{entry['number']}: parent + {len(ticket['blocked_by'])} blockers linked", flush=True)

    STATE["publication_complete"] = True
    save()
    print("Published all 32 approved tickets. Ready for independent verification.", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr, flush=True)
        sys.exit(1)
