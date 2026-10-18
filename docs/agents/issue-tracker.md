# Issue tracker: GitHub

Issues and specs live in GitHub Issues for `groneman7/ccru-start`.
Use the `gh` CLI from this repo.

## Operations

- Create: `gh issue create --title "..." --body-file <file>`.
- Read: `gh issue view <number> --json number,title,body,labels,comments`.
- List: `gh issue list --state open --json number,title,body,labels,comments`.
  Add label and state filters as needed.
- Comment: `gh issue comment <number> --body-file <file>`.
- Apply or remove labels: `gh issue edit <number> --add-label "..."`
  or `--remove-label "..."`.
- Close: `gh issue close <number> --comment "..."`.

Use files containing actual newlines for multiline bodies.

“Publish to the issue tracker” means create a GitHub issue.
“Fetch the relevant ticket” means read the GitHub issue.

## Pull requests as a triage surface

**PRs as a request surface: no.**

## Wayfinding

The map is an issue labelled `wayfinder:map`, containing Notes,
Decisions-so-far, and Fog. Link child tickets through GitHub sub-issues.
If unavailable, use a task list in the map and `Part of #<map>` in each child.

Child labels are `wayfinder:research`, `wayfinder:prototype`,
`wayfinder:grilling`, or `wayfinder:task`.

Record blockers with native GitHub issue dependencies. If unavailable,
use `Blocked by: #<number>` lines. A ticket is unblocked when all blockers
are closed.

Choose the first open, unassigned, unblocked child in map order.
Claim with `gh issue edit <number> --add-assignee @me`.
Resolve by commenting with the result, closing the ticket, and adding
a result summary and link to the map’s Decisions-so-far.
