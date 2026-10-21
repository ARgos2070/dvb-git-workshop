# Host guide — publish and run the repo

This guide is for you, the host. Participants read the `README.md`.
Account used: **alibenyezza** (never `aliby00`). Check before any commit:

```bash
git config user.name    # → alibenyezza
git config user.email   # → 149864846+alibenyezza@users.noreply.github.com
```

---

## 1. Create the repo on GitHub (3 or 2 days before)

### With the GitHub CLI (recommended)

From this folder (`kit/en/repo-template/`):

```bash
gh auth status                       # logged in as alibenyezza?
git init -b main
git add .
git commit -m "chore: initial Builders Wall"
gh repo create alibenyezza/dvb-git-workshop --public --source=. --remote=origin --push \
  --description "Builders Wall — Git & GitHub Workshop by DeVinci Blockchain"
```

### Without the CLI

1. https://github.com/new → name `dvb-git-workshop`, **Public**, no README, no .gitignore, no licence.
2. Then:
   ```bash
   git init -b main
   git add .
   git commit -m "chore: initial Builders Wall"
   git remote add origin https://github.com/alibenyezza/dvb-git-workshop.git
   git push -u origin main
   ```

---

## 2. Turn on GitHub Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions.**

Then **Actions → deploy → Run workflow** (or push a commit to `main`).
After ≈ 1 min the wall is online: https://alibenyezza.github.io/dvb-git-workshop/

Check that your `alibenyezza` card shows up.

---

## 3. Protect `main`

**Settings → Branches → Add branch ruleset** (or *Add classic branch protection rule*) on `main`:

- ✅ **Require a pull request before merging** — *Required approvals: 0* (you merge yourself, no extra review needed during the event)
- ✅ **Require status checks to pass** → add the **`validate`** check
  *(it only shows up in the list after it has run once: open a test PR first, see § 5)*
- ✅ **Block force pushes**
- Leave "Do not allow bypassing" **unticked** so you can still fix things in an emergency.

This is also a live demo for the "Protecting `main`" slide: show this screen.

---

## 4. Actions on PRs coming from forks

By default, GitHub asks a maintainer to **approve** workflows started by a new contributor.
With 30 participants, that is 30 "Approve and run" clicks during the event.

**Settings → Actions → General → Approval for running fork pull request workflows from contributors**
→ pick **"Require approval for first-time contributors who are new to GitHub"** (the least strict option).

Why it is safe here: the `check` workflow only has `contents: read`, receives no secrets
(GitHub never passes secrets to fork PRs) and only reads JSON files. GitHub accounts
created on the day itself will still need approval: keep the **Actions** tab open.

Put the default option back after the event (§ 7).

---

## 5. Dry run (2 days before)

With a second account or a friend:

1. Fork, add a card, open a PR → the `validate` check passes ✅.
2. Open a 2nd PR with an invalid card (`"role": "Developer"`) → the check fails ❌ with a clear message.
3. Merge the good one → the `deploy` action runs → the card appears on the wall.
4. Close the invalid PR.

---

## 6. During the event: merge fast

Keep open: the **Pull requests** tab, the **Actions** tab and the wall full screen on the projector.

**The wall on the projector:** open `https://alibenyezza.github.io/dvb-git-workshop/?tv` full screen (`F11`).
The `?tv` parameter turns on projector mode: compact header, and every new card arrives **at the top**
with a blue glow (the wall refreshes every 20 s). Beyond about forty cards, zoom the browser
out (`Ctrl -`) so everything fits on screen.

```bash
# List open PRs and the state of their checks
gh pr list --repo alibenyezza/dvb-git-workshop --state open
gh pr checks <number> --repo alibenyezza/dvb-git-workshop

# Merge one PR (squash = 1 clean commit per participant) and delete the branch
gh pr merge <number> --repo alibenyezza/dvb-git-workshop --squash --delete-branch

# Merge every PR whose checks are all green, in one go (Git Bash / macOS / Linux)
gh pr list --repo alibenyezza/dvb-git-workshop --state open --json number,statusCheckRollup \
  --jq '.[] | select((.statusCheckRollup | length) > 0 and all(.statusCheckRollup[]; .conclusion == "SUCCESS")) | .number' |
while read n; do gh pr merge "$n" --repo alibenyezza/dvb-git-workshop --squash --delete-branch; done
```

Tips:
- Merge **in waves** (every 2–3 min) rather than one by one: each merge restarts `deploy`,
  and the `pages` concurrency group queues them cleanly.
- A PR with a red check: do not merge it, show it on the projector — it is a great teaching moment.
- A PR that changes anything other than `builders/<username>.json`: ask for a fix in a comment.
- `--delete-branch` only deletes the branch on the fork if you have access to it; otherwise ignore the warning.

---

## 7. After the event

- **Settings → Actions → General**: set approval back to *"Require approval for first-time contributors"*.
- Close the remaining PRs with a short note:
  ```bash
  gh pr list --repo alibenyezza/dvb-git-workshop --state open --json number --jq '.[].number' |
  while read n; do gh pr close "$n" --repo alibenyezza/dvb-git-workshop --comment "Thanks for joining the DVB workshop! 💙"; done
  ```
- Keep the wall online: it is a nice memory to share (LinkedIn post, Telegram).

### Reset the wall (for a future edition)

```bash
git switch main && git pull
git rm builders/*.json
git checkout HEAD -- builders/_template.json builders/alibenyezza.json
git commit -m "chore: reset the wall for the next workshop"
git push   # main protected? go through a PR, or temporarily allow yourself to bypass
```

Or simply archive the repo (**Settings → Archive this repository**) and create a new one from this folder.
