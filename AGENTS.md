# Agent Instructions

This service is the scheduler service for projects, project users, tasks, calendar, WBS, dashboard, and schedule UI.

Follow these rules when editing this repository.

## Encoding

- Treat all source, SQL, Markdown, JSP, HTML, CSS, and JS files as UTF-8.
- Preserve Korean UI text as Korean text when editing UTF-8 files.
- Do not replace Korean strings with English just to avoid encoding issues.
- Do not write mojibake text back into files.
- If Korean text appears corrupted in terminal output, verify with an encoding-aware read before editing.
- Use Unicode escapes in JavaScript only as a fallback when direct UTF-8 editing is unsafe or the file already has known encoding corruption.
- Respect `.editorconfig`: UTF-8, CRLF, final newline, and no trailing whitespace except Markdown and SQL.

## Git

- Write commit messages in Korean by default.
- Keep commit messages short and concrete, describing the user-visible change or operational fix.
- Preserve Korean text in commit messages and do not transliterate Korean to English unless the user asks.

## Backend Style

- Use the existing Spring Boot + MyBatis structure.
- Keep controllers thin: request validation, permission checks, and delegation to services.
- Put business rules in service classes.
- Put SQL in MyBatis mapper XML files, not inline Java strings.
- Use `Map<String, Object>` consistently where the surrounding module already does.
- Keep API responses wrapped with the existing `ApiResponse`.
- Enforce write operations through `ServicePermissionSupport.ensurePermission(..., WRITE)` or the matching existing permission helper.
- Preserve non-admin access filters using `viewer_user_id`, `viewer_is_admin`, and project membership checks where relevant.

## Frontend Style

- Static schedule UI lives in `src/main/resources/static`.
- Use the existing `UX` helper functions from `js/ux.js`.
- Use the existing IIFE module pattern:
  `(function (global) { "use strict"; ... })(window);`
- Prefer event delegation for dynamic repeated lists.
- Keep UI controls consistent with existing pages: `.btn`, `.input`, `.panel`, `.status-chip`, `.modal-backdrop`, `.modal-panel`.
- Do not add new frontend frameworks.
- Keep text and controls compact; this is an operational tool, not a landing page.

## Database

- PostgreSQL is the primary database.
- Add deployable SQL under the matching `docs/sql.../postgres` path.
- Make deploy SQL idempotent with `IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, or guarded constraint blocks.
- Keep schema reference files updated when adding persistent tables or columns.
- Add Flyway migrations under `src/main/resources/db/migration` for schema changes that should run automatically before service startup completes.

## Verification

- Run `.\gradlew.bat test`.
- If JavaScript syntax checking is needed but `node` is unavailable, inspect nearby existing JS patterns and verify through Gradle resource processing at minimum.
- Mention any verification that could not be run.
