"""Read GitHub back and verify every approved body, label, parent, and edge."""

import concurrent.futures
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPO = "groneman7/ccru-start"
PLAN = json.loads((ROOT / "ticket-plan.json").read_text())
STATE = json.loads((ROOT / "publication.json").read_text())


def gh_json(*args):
    result = subprocess.run(["gh", *args], capture_output=True, text=True, check=True)
    return json.loads(result.stdout)


def api(endpoint):
    return gh_json("api", endpoint)


def read_dependencies(ticket):
    entry = STATE["tickets"][str(ticket["id"])]
    return ticket["id"], api(
        f"repos/{REPO}/issues/{entry['number']}/dependencies/blocked_by?per_page=100"
    )


def main():
    assert STATE.get("publication_complete"), "Publication has not completed"
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        issues_future = pool.submit(api, f"repos/{REPO}/issues?state=all&per_page=100")
        children_future = pool.submit(api, f"repos/{REPO}/issues/2/sub_issues?per_page=100")
        parent_future = pool.submit(
            gh_json, "issue", "view", "2", "--repo", REPO,
            "--json", "number,title,body,state",
        )
        edge_futures = [pool.submit(read_dependencies, t) for t in PLAN["tickets"]]
        issues = {issue["number"]: issue for issue in issues_future.result()}
        children = children_future.result()
        parent = parent_future.result()
        edges = dict(f.result() for f in edge_futures)

    before = json.loads(Path("/tmp/ccru-start-parent-before-publish.json").read_text())
    for field in ["number", "title", "body", "state"]:
        assert parent[field] == before[field], f"Parent {field} changed"

    expected_child_ids = [STATE["tickets"][str(t["id"])]["id"] for t in PLAN["tickets"]]
    actual_child_ids = [child["id"] for child in children]
    assert set(expected_child_ids).issubset(actual_child_ids), "Missing native sub-issues"
    assert [n for n in actual_child_ids if n in set(expected_child_ids)] == expected_child_ids, "Sub-issue order differs"

    edge_count = 0
    for ticket in PLAN["tickets"]:
        n = ticket["id"]
        entry = STATE["tickets"][str(n)]
        remote = issues[entry["number"]]
        assert remote["title"] == ticket["title"], (n, "title")
        assert remote["state"] == "open", (n, "state")
        assert "ready-for-agent" in {label["name"] for label in remote["labels"]}, (n, "label")
        body_paths = list((ROOT / "published-bodies").glob(f"{n:02}-*.md"))
        assert len(body_paths) == 1
        assert remote["body"].replace("\r\n", "\n").rstrip() == body_paths[0].read_text().rstrip(), (n, "body")
        expected = {STATE["tickets"][str(d)]["id"] for d in ticket["blocked_by"]}
        actual = {blocker["id"] for blocker in edges[n]}
        assert actual == expected, (n, "blocking edges", actual, expected)
        edge_count += len(actual)

    summary = {
        "parent": PLAN["parent"],
        "tickets_verified": len(PLAN["tickets"]),
        "native_blocking_edges_verified": edge_count,
        "parent_title_body_state_unchanged": True,
        "sub_issue_order_verified": True,
        "all_open_with_ready_for_agent": True,
        "all_bodies_match_approved_drafts": True,
    }
    (ROOT / "verification.json").write_text(json.dumps(summary, indent=2) + "\n")
    STATE["verified"] = True
    (ROOT / "publication.json").write_text(json.dumps(STATE, indent=2) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
