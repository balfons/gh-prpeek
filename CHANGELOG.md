# Changelog
## v5.1.4 - 2026-05-21

### Added
- Add `typecheck` script (`tsc --noEmit`) to `package.json`

### Fixed
- Fixed long PR title overflow
- Selected tab was shoing a border that should not have been shown.
- Dynamic foreground color for PR titles, comments count, and UI chrome — adapts to light or dark terminal background automatically

### Maintenance
- Pin all dependency versions (remove `^` range specifiers)
- Bump `@opentui/core` from `0.1.97` to `0.2.15`
- Upgrade TypeScript peer dependency to `6.0.3`
- Enable `verbatimModuleSyntax` in `tsconfig.json` — all type-only imports now use `import type`
- Enable `noUncheckedIndexedAccess` and `noImplicitOverride` in `tsconfig.json`; fix resulting type errors across the codebase

## v5.1.3 - 2026-05-06

### Added
- `--team` flag — also shows PRs reviewed by a team member (`ORG/TEAM`), useful when multiple people share review duties on the same PRs
- Show check counts in status line (e.g. `2/5 Checks passing`, `1/5 Checks pending`)
- Approval indicator now appends `(You)` when you are one of the approvers (e.g. `✓ 2 Approved (You)`)

### Fixed
- Handle `CANCELLED` and empty-string check conclusions in `StatusCheckRollup`
- Fix pending check detection to require `conclusion === ""` (avoids treating cancelled checks as pending)

## v5.1.2 - 2026-04-25

### Fixed
- Fix backgrounds for transparent terminal
- Fix error message
- Fix broken parallelism when fetching PRs
- Fix variable shadowing in `notify.ts`

### Performance
- Evaluate color keys before loop instead of on every iteration in `color.util.ts`

### Maintenance
- Remove unnecessary loop in `TabMenuRenderable`
- Fix release title in CI workflow

## v5.1.1 - 2026-04-18

### Added
- Keyboard navigation — use ↑/↓ to move between PRs and ↵ to open the selected PR in the browser
- Validate `--repos` flag format early — exits with a clear error message if any repo does not match `OWNER/REPO`
- Display current version number

### Fixed
- Fix `getPrNumberIndent` returning `-Infinity` when PR list is empty
- Fix memory leak in `CommandsRenderable` — keypress handler now unregistered on destroy
- Fix O(n²) comment lookup in `getNewComments` — replaced `.find()` inside `.filter()` with a `Set`
- Fix typo: renamed exported `notifyFailingePrs` to `notifyFailingPrs`
- Fix `commaSeparatedList` not trimming whitespace around repo names
- Fix `isLoading` lock set too late in `runProgram`, allowing re-entrant calls
- Fix error in `makeGhJsonRequest` catch block — use `String()` instead of `.toString()` on stderr
- Fix PR title alignment — apply left margin based on PR number digit width

### Changed
- Pending checks indicator changed from `-` to `◌`
- Review requested indicator changed from `•` to `⊙`
- Conflicts indicator changed from `×` to `⊘`
- Comments indicator changed from `◆` to `✎`

## v5.1.0 - 2026-04-11

### Fixed
- Pointer cursor when hovering links
- Console is now hidden again after successful data fetches following previous errors

### Added
- Splash screen shown during initial load

### Changed
- New loading spinner
- Updated tab labels to support optional counts and cleaner initial rendering
- Updated default CLI options:
  - `--interval` now defaults to `60`
  - `--notify` now defaults to enabled
  - `--reviewed` now defaults to enabled
  - `--mentioned` now defaults to enabled
- Improved label rendering style in pull request cards

### Maintenance
- Bumped `@opentui/core` to `^0.1.97`
- Bumped `bun-types` to `1.3.10`
- Updated release workflow to use Bun `1.3.10`
- Switched lockfile from `bun.lockb` to `bun.lock`

## v5.0.2 - 2025-12-16

### Fixed
- Fix for the program stalling when exiting
- Fix for notifications showing up when the initial PR fetch fails and the next one is successful
- Fix for TextBuffer error when exiting while spinner is active


## v5.0.1 - 2025-12-16

### Added
- Executable for windows x64

## v5.0.0 - 2025-12-16

### Changed
- Use opentui to implement a totally new design

## 4.2.0 - 2025-02-03

### Added
- Added `--hide-checks` flag to conserve space when there is a lot of individual checks.
- Make the checks summary linkable when failing.

### Fixed
- Pull request text layout on smaller screens

## 4.1.0 - 2024-12-07

### Added 
- Added `--mentioned` flag

## 4.0.0 - 2024-10-12

### Added 
- Notification when new version of prpeek is available.
- Responsive two column layout
- Reviewed by you section

### Fixed
- Don't wait for async operations before exiting program.

### Removed
- Remove `--involved` flag in favour of `--reviewed`.
- Remove "Involves you" section in favour of "Reviewed by you" 

## 3.0.0 - 2024-09-20

### Changed

- Convert project into a GitHub CLI extension.

### Added

- Support for notifications (`-n` or `--notify`).
  - Notification when new PR is added.
  - Notification when one of your PRs becomes mergable.
  - Notification when one of your PRs fails CI/CD.
  - Notification when one of your PRs gets a new comment.

### Fixed

- Don't block main thread to make exiting the script easier.

### Removed

- Remove `--sound` flag in favour of `--notify`.

## 2.0.0 - 2024-03-28

### Added

- Show number of comments.
- Show when PR has conflicts.
- Show when PR is mergable.
- Show number of approved.
- Show when changes are requested.
- Version flag (`-V` or `--version`)
- Support for multiple repositories (`--repos` replaces `--repo`).

### Fixed

- Don't play sound on first run.
- Stop waiting for beeper to resolve causing tiny lag.

### Removed

- Remove `--repo` flag in favour of `--repos`.

## 1.0.4 - 2024-01-12

### Added

- Added `--involved` flag.

### Changed

- Print output in alternate buffer.

## 1.0.3 - 2023-12-13

### Fixed

- Fix formatting when review decision is missing.

## 1.0.2 - 2023-12-01

### Fixed

- Fallback to username for authors missing name.

## 1.0.1 - 2023-11-17

### Added

- `--labels` flag for only showing pull requests that needs review from you with any of the specified labels.
- Show failing checks with links.
- Show additions and deletions.
- Show author.
- Loading indicator while updating pull requests.

### Fixed

- Error handling when not authenticated to github.
