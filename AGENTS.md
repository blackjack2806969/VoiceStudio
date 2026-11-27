# Cantonese offline fork — user requirements (2026-11-27)

These fork requirements override conflicting upstream instructions below and in CLAUDE.md:
- macOS ARM64 desktop MVP only; English and Traditional Chinese UI are required.
- Strict local inference and processing. No analytics, cloud, paid services, RVC or singing.
- Online provisioning is allowed when the user explicitly confirms CosyVoice setup. The separate installer downloads only software and model assets.
- Reuse existing Electron UI, profiles, TTS engines and packaging.
- Prioritize working TTS, lexical-tone editing and deployment by 2026-11-30.
- Keep DEVELOPMENT_STATUS.md truthful; never claim physical Mac testing without evidence.
- Review major changes with the official Ponytail review instructions before committing.
- Do not trigger upstream's unrelated mobile/cloud publishing workflows for this fork.

## Active desktop: Electron only

Electron (`electron/`) is the only desktop and web UI. The Tauri shell and legacy
UI entrypoints are removed; do not restore build, runtime, release, or CI paths for
them. Triage reports from final Tauri installations toward the migration guide and
preserve their immutable updater feeds. Some modules under `electron/src/shared/` remain
temporarily shared by Electron; they are not a runnable app. New UI, IPC, setup
instructions, tests, and browser assets belong in Electron; validate Electron on
macOS, Windows and Linux.

## Mobile: native iOS and Android (owner-set 2026-10-17)

Every release builds desktop, iOS, Android and Docker from the same release tag
and version (owner-set 2026-10-26). Phone downloads belong on the same GitHub
Release; a missing channel is a release bug.

`mobile/ios/` (Swift/SwiftUI) and `mobile/android/` (Kotlin/Compose) are native
apps that run models **on the phone** (TTS, dictation, voice cloning, dub
translation; owner-set 2026-10-18) and can also drive a user's own VoiceStudio
computer. Phone first: once models are downloaded they work offline with no
computer; pairing adds the heavy engines, chosen per task. The companion-only
build is the base, not the product. They implement one shared contract,
`mobile/contract/SPEC.md`: a mobile feature ships on both or neither.
Theme, API and strings are generated, never hand-copied: `bun
scripts/export-mobile-tokens.ts` (from the Electron theme), `uv run python
scripts/export_openapi.py` (from the backend) and the Electron locale catalogs;
`tests/test_mobile_contract.py` fails on drift. Desktop/web UI still belongs in
Electron only.

# Agent Rules — VoiceStudio

Binding for every AI agent (Claude, Codex, Cursor, review bots, …). CLAUDE.md is the full constitution; this is the operating contract. When they conflict, CLAUDE.md wins.

## Token economy (owner directive, 2026-07-20; tightened 2026-07-28)
- **Default to the shortest response that fully answers.** Outlines and tables over prose; no preamble, no recap of what you just did, no re-explaining a fix the diff already shows. Applies to every response, not just status updates.
- Lead with the outcome. No narration, no restating diffs, no filler praise, no plans you're about to execute anyway.
- Status updates: one line. Final reports: only what changes the reader's next action.
- Don't re-derive what CI, linters, or review bots already computed — read their output first (`gh pr checks`, bot comments via `gh api .../pulls/N/comments`).
- Mechanical rules live in deterministic tests, never in agent effort: changelog style (`tests/test_changelog_style.py`), locale parity (`tests/test_locale_parity.py`), version lockstep (`tests/test_app_version.py`), CJK (`tests/test_no_hardcoded_cjk.py`).
- Run targeted tests while iterating; full suites only before landing.
- Tests and CI simulate CI honestly: `HF_HUB_OFFLINE=1` + empty `HF_HUB_CACHE` — a populated dev cache masks real failures.

## Cross-platform parity: behaviour, not performance
- The parity rule covers user-visible BEHAVIOUR. Hardware acceleration varies by host by design (CUDA/MPS/DirectML, Triton availability, `torch.compile`); skipping an optimization where it physically cannot work is not a parity violation.
- Do not "fix" a parity finding by disabling a working optimization everywhere. That trades a real regression for a semantic one.
- A feature the user can see and use on one OS but not another IS a violation. Judge by what the user can do, not by how fast it runs.

## Merge protocol (hard rules)
1. Never merge without review. Harvest CodeRabbit + Greptile comments first; never merge with an unread Critical/P1.
2. Never accept a PR as-is: fix findings ON the PR branch pre-merge (maintainer commits fine; credit contributors in the changelog fragment). No merge-then-fix, no comment-and-walk-away.
3. Merge current `main` into stale branches before judging their CI — PR-green under an old workflow ≠ main-green.
4. Gate: "Tests (backend + frontend)" green + MERGEABLE.
5. After EVERY merge: watch `main`'s own post-merge runs to green (`gh run list --branch main`). Red main = drop everything and fix.
6. Start every PR, fix and feature from freshly fetched `origin/main` (owner rule, 2026-10-26): `git fetch origin`, confirm local `main` has no incoming or outgoing commits (resolve first if it does), branch from `origin/main`, and merge the latest `main` again right before pushing. `main` requires branches to be up to date before merging; that setting stays on.

Documentation/test-only CI policy (owner-set 2026-10-31): skip runtime tests and
product builds for documentation-only or test-only changes. Keep the required
check green through an explicit detected skip; run changed tests locally. Mixed
runtime/config/dependency changes still run CI, as do bundled app assets and
licence/catalog data. CLA, identity and secret checks remain enabled.

## Change rules (see CLAUDE.md for full text)
- Root-cause the class, not the instance; fail-before/pass-after regression test; smallest correct change.
- Default behavior identical on macOS/Windows/Linux; platform-only features go behind explicit opt-in. Divergent default = P0.
- Local-first: no new required network calls; any HF download gated on installed-ness or explicit user action; all synthetic audio through the `mark_synthetic` chokepoint. Sanctioned calls are listed in `.github/CONTRIBUTING.md` → Quality gates: user-started first-run setup (ffmpeg from GitHub `zackees/ffmpeg_bins`, the huggingface.co/hf-mirror.com reachability probe, `uv.lock`-pinned package downloads from their locked URLs or the chosen/auto-selected regional mirror incl. the parallel wheel prefetch, the Auto region's one-wheel PyPI vs Aliyun speed check, a user-clicked setup connection check (256 KiB from the affected pinned package URL, 15-second limit, no uploads), HF model downloads), opening/enabling the galleries (jsDelivr manifest, GitHub Releases), the dubbing demo videos only when the user clicks Download (sha256-pinned `omnivoice-gallery` GitHub Release assets, owner-approved 2026-11-21, `backend/services/demo_assets.py`), packaged update checks, user-clicked yt-dlp updates from PyPI, user-selected Windows ROCm setup (owner-approved 2026-10-26, hash-pinned: `repo.radeon.com` and `stable.repo.amd.com/rocm/whl-next/` wheels, the OpenNMT/CTranslate2 GitHub release, and this repository's own HIP CTranslate2 release (2026-11-09)), user-clicked optional engine installs/repairs (owner-approved 2026-11-07: GitHub source (branch clone, then the reviewed commit or its archive, plus pinned helper-source archives), a uv-managed python-build-standalone Python when missing, PyPI or mirror packages, the matching `download.pytorch.org` CUDA/CPU/ROCm PyTorch build, HF weights at install or first use), consent-gated analytics, separately opted-in automatic failure reports to the Supermetry public events endpoint (owner-approved 2026-11-14; off by default, closed content-free `config/diagnostics.json` policy, withdrawal stops delivery and invalidates queued reports; no messages/logs/raw stacks/dumps), prefilled-URL bug reports, phone content reports sent from a result's Report sheet, the Pro licence check after a key is entered, and VoiceStudio Cloud sign-in/account calls (and settings sync once cloud sync is on) only after the user turns them on (off by default; switching off stops them at once). Owner-approved exception (2026-09-28): the public GitHub star count may refresh automatically every 20 minutes, without credentials/referrer or user content; offline use remains unaffected.
- Every user-facing string via i18n, present in ALL 21 `electron/src/renderer/src/i18n/locales/*.json` files (the catalog the app loads) with real translations; `tests/test_locale_parity.py` and Electron `locale:check` enforce it.
- Docs-sync in the same PR. Changelog: one quiet one-liner per PR in `changelog.d/<PR#>.<type>.md` (not `CHANGELOG.md`), ending `(#N)` + `— thanks @user!` for community work; the release script folds fragments into Unreleased.
- Tagged release announcements lead with the biggest user-visible change; redesigns need real UI screenshots and migrations need installer links and steps. Verify all contributor credits from the tag comparison and included PRs; list authors and bug reporters separately (see `docs/RELEASING.md`).
- Versioning: root `package.json` is the single source of truth; never bump without the owner asking.
- JavaScript dependency changes require regenerating root `bun.lock` (Docker runs `--frozen-lockfile`).
- Attribution: commits, PR descriptions and comments carry only the submitter's git identity. Never credit an agent (no agent `Co-authored-by:`, "Generated with …", session links) and never add other names/emails. Human co-authors are fine. Enforced by the `commit-identity` check.
- Issues: absorb or decline — never defer to a future version. Check the open-PR queue before implementing community-reported fixes.

### Diagnostic app intake (owner task, 2026-11-15)

Separately opted-in automatic failure reports may replace the public events
request with `/api/public/v1/app-events` on the sanctioned Supermetry hosts
`https://app.supermetry.com` (unconfigured host default) or
`https://app.voicestudio.sh` (the owner-configured packaged app intake, owner-set
2026-11-16). App ID and write-only ingest key come only from
runtime environment or git-ignored build metadata. Release CI must use GitHub
Actions Secrets for the app ID and ingest key, never public repository variables,
and must not log their values; fork builds receive no upstream credentials.
`SUPERMETRY_APP_HOST` is an
explicit operator override, unset by default; any other production host must
be recorded and approved by the owner. This changes no product analytics or
collection permission. `diagnostics.sessionPings` is default off, requires the
same separate consent, and is never enabled in release workflow defaults.

## Shared select controls

- Use `electron/src/shared/components/SearchableSelect.jsx` for all new or redesigned select boxes. Reuse `VoiceSelector` for voice choices. Do not introduce native `<select>` controls.
- Provide a localized `ariaLabel`; use `menuPortal` inside scrolling or clipping containers. Preserve keyboard selection and disabled states.

## Agent skills

Project development skills are pinned in `skills-lock.json` and installed under
`.agents/skills/`: Vite and FastAPI.
Repository rules and tracker mappings override generic skill guidance.

### Issue tracker

GitHub Issues on `debpalash/VoiceStudio`, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical roles, each label string equal to its name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `docs/adr/` plus a root `CONTEXT.md` that is created lazily and does not exist yet — skip it when absent. See `docs/agents/domain.md`.


## Official Ponytail instructions

Source: https://github.com/DietrichGebert/ponytail at ebd8654c2c627f721eb8f9c0d1bd4090a29f9e10

# Ponytail, lazy senior dev mode

You are a lazy senior developer. The best code is the code never written. You solve the whole problem with the least new code. End your reply with one or two lines: what you skipped or did not check, and any risk the user must know.

## Before you write

Read the task and the code it touches. List every place your change must reach: callers, tests, fixtures, config, exports. Check what your change could break for users: data it would destroy or expose, callers that stop working. That is scope. Extra features are not.

## The smallest complete change

Take the first option that fully works:

1. Does it need to exist? Skip features, options and flexibility nobody asked for, and name them in one line. A vague request ("build me X") gets the smallest version that does the core job.
2. Already in this codebase (a helper, component, service, pattern)? Use it the way the surrounding code does.
3. Standard library or a platform feature? Use it, unless the project has its own. A house component beats a native widget.
4. An installed dependency? Use it. Never add a dependency for a few lines.
5. Can it be one line a reader gets at a glance? One line.
6. Otherwise: the minimum code that works.

- Be lazy about the solution, never about the change itself: finish every part the task needs, including the callers, tests and fixtures your change breaks.
- No abstraction, wrapper, type conversion, option, config, boilerplate or "for later" code nobody asked for. Keep values in the form the platform already gives you. Deletion beats addition. Keep the structure the codebase already has: its layers, interfaces and conventions.
- The shortest working diff wins, once you know everything it must touch. A one-liner that needs decoding is not short.
- Comment only the why the code cannot show, in one line.
- Bug fix: before you edit, grep every caller of the function you touch, then fix the root cause once in the shared code.
- Code you move or merge keeps its error handling and validation.
- Between options of equal size, take the one that is correct on edge cases.
- Lazy code without its check is unfinished: new non-trivial logic (a branch, a loop, a parser, money or security, or a whole new script or app) leaves one small test or an assert-based self-check. Trivial changes need none.
- A shortcut with a known limit gets a code comment in this form: `shortcut: <the limit>, <when to upgrade>`.

Never cut: validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs, anything the user asked for.

(Yes, this file also applies to agents working on the ponytail repo itself. Especially to them.)
