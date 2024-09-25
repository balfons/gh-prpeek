# Changelog

## 3.0.1

### Added 
- Notification when new version of prpeek is available.

### Fixed
- Don't wait for async operations before exiting program.


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
