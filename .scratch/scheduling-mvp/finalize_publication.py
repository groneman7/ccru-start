"""Update the local review artifacts only after remote publication is verified."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PLAN_PATH = ROOT / "ticket-plan.json"
PLAN = json.loads(PLAN_PATH.read_text())
STATE = json.loads((ROOT / "publication.json").read_text())
VERIFIED = json.loads((ROOT / "verification.json").read_text())
assert STATE.get("verified")
assert VERIFIED["tickets_verified"] == 32
assert VERIFIED["native_blocking_edges_verified"] == 43

PLAN["status"] = "Published and verified: 32 ready-for-agent sub-issues and 43 native blocking relationships"
lines = [
    "# Scheduling MVP implementation tickets",
    "",
    f"Status: {PLAN['status']}.",
    "",
    f"Parent spec: [issue #2]({PLAN['parent']}). Its title, body, and state were preserved.",
    "",
    "All published titles and bodies match the approved breakdown. Every ticket is open, labelled `ready-for-agent`, and attached to the parent in dependency order. Native blocking relationships exactly match the approved graph.",
    "",
    "T01–T32 retain the approved plan identifiers; GitHub issue numbers are linked below. Each feature slice includes its UI, authoritative server behavior, data changes, and meaningful verification. T01 is the read-only retained-data prerequisite. Work any ticket whose blockers are complete.",
    "",
    "Incomplete retained data requires an explicit repair decision only for the affected migration or enforcement. The audit does not impose a global hold on unrelated authorization or catalog work, and no repair policy has been invented.",
    "",
    "## Initially unblocked tickets",
    "",
]
for t in PLAN["tickets"]:
    entry = STATE["tickets"][str(t["id"])]
    t["issue_number"] = entry["number"]
    t["issue_url"] = entry["url"]
    if not t["blocked_by"]:
        lines.append(f"- [#{entry['number']}: {t['title']}]({entry['url']})")

lines += ["", "## Published tickets", ""]
for t in PLAN["tickets"]:
    n = t["id"]
    entry = STATE["tickets"][str(n)]
    paths = list((ROOT / "issues").glob(f"{n:02}-*.md"))
    assert len(paths) == 1
    blockers = ", ".join(
        f"[#{STATE['tickets'][str(d)]['number']}]({STATE['tickets'][str(d)]['url']})"
        for d in t["blocked_by"]
    ) or "None (can start immediately)"
    blocker_lines = "\n".join(
        f"- [#{STATE['tickets'][str(d)]['number']}]({STATE['tickets'][str(d)]['url']})"
        for d in t["blocked_by"]
    ) or "None (can start immediately)."
    draft = paths[0].read_text().split("\n## Blocked by\n", 1)[0].rstrip()
    paths[0].write_text(draft + "\n\n## Blocked by\n\n" + blocker_lines + "\n")
    lines += [
        f"{n}. **[T{n:02} / #{entry['number']}: {t['title']}]({entry['url']})**",
        "",
        f"    **Blocked by:** {blockers}. **What it delivers:** {t['delivers']} [Local acceptance criteria]({paths[0].relative_to(ROOT)}).",
        "",
    ]

lines += ["## Coverage map", "", "| Parent user story | Tickets |", "| --- | --- |"]
for story in range(1, 116):
    owners = [f"T{t['id']:02} / #{t['issue_number']}" for t in PLAN["tickets"] if story in t["stories"]]
    assert owners
    lines.append(f"| {story} | {', '.join(owners)} |")

PLAN_PATH.write_text(json.dumps(PLAN, indent=2) + "\n")
(ROOT / "README.md").write_text("\n".join(lines) + "\n")
print("Updated the local overview, issue mapping, and acceptance drafts with verified GitHub links.")
