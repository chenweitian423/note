# Online Notepad Design

Date: 2026-05-28

## Goal

Build a personal, self-hosted online notepad inspired by `jocksliu/web-notepad-enhanced`, but with a safer default deployment model, a more comfortable Markdown editing experience, and a first-class export path for migration.

The first release is for personal use. It will not include public registration, multi-user collaboration, public share links, or real-time collaborative editing.

## Chosen Approach

Use a single Next.js application with SQLite persistence and Docker Compose deployment.

This keeps the frontend, API routes, authentication, Markdown preview, attachment handling, and export/import workflows in one repository. SQLite keeps deployment simple, while Docker volumes make persistence and migration predictable.

## Deployment

The application runs in Docker Compose.

The container listens on port `3000`. The host port defaults to a non-standard high port to reduce conflicts:

```yaml
ports:
  - "${APP_PORT:-38080}:3000"
```

Required environment variables:

```text
APP_PASSWORD=change-me
AUTH_SECRET=replace-with-random-secret
APP_PORT=38080
```

Persistent data lives in a mounted data volume:

```text
/data/app.db
/data/uploads/
/data/exports/
```

Migration can be done either by copying the Docker volume or by using the ZIP export feature.

## Product Scope

The app should open directly into the notepad experience after login. It should prioritize fast writing, simple organization, reliable autosave, and easy migration.

Core features:

- Password login for personal access.
- Create, rename, edit, delete, and archive notes.
- Markdown editing with preview.
- Autosave with debounce.
- Search by title and content.
- Tags for organization.
- Attachment upload per note.
- Export all notes and attachments as a ZIP.
- Import a previously exported ZIP.
- Basic theme preference.

Out of scope for the first release:

- Public account registration.
- Multiple users.
- Public note sharing.
- Collaborative editing.
- End-to-end encryption.
- Version history.

## User Interface

Desktop uses a three-pane workspace:

- Left pane: note list, search, tag filters, create note action.
- Center pane: Markdown editor.
- Right pane: preview and note details.

Mobile uses tabbed navigation for list, editor, and preview.

The toolbar should use icon buttons where appropriate, including actions for creating notes, exporting, importing, uploading attachments, toggling preview, and changing theme. The first screen is the actual app experience, not a marketing page.

The editor defaults to Markdown. A small formatting toolbar can insert common Markdown patterns such as headings, bold text, lists, links, and image references.

## Data Model

SQLite tables:

```text
notes
  id
  title
  slug
  content
  createdAt
  updatedAt
  archivedAt

tags
  id
  name
  color

note_tags
  noteId
  tagId

attachments
  id
  noteId
  filename
  storedName
  mimeType
  size
  createdAt

settings
  key
  value
```

Notes own their attachments. Tags use a join table so a note can have multiple tags.

## Authentication

The first version uses a single app password from `APP_PASSWORD`.

After successful login, the server sets an HTTP-only session cookie signed with `AUTH_SECRET`. API routes require a valid session. This is intentionally simple because the app is scoped to personal use.

## Export Format

Export creates a ZIP with both machine-readable and human-readable content:

```text
manifest.json
notes.json
notes/
  my-note.md
attachments/
  <note-id>/
    image.png
```

`manifest.json` includes export version, app version, export time, note count, attachment count, and attachment mappings.

`notes.json` preserves the full note structure, including tags and attachment references.

The Markdown files make the export useful even outside this app.

## Import Behavior

Import accepts ZIP files produced by this app.

The import flow validates `manifest.json`, reads `notes.json`, copies attachments into the upload directory, and inserts notes into SQLite.

If imported IDs or slugs conflict with existing notes, the app generates new IDs and unique slugs. Import should not overwrite existing notes in the first release.

## Error Handling

Important failure cases should return clear messages:

- Invalid password.
- Missing or invalid session.
- Failed autosave.
- Attachment too large or unsupported.
- Invalid export ZIP.
- Import conflict or partial import failure.

For import, the implementation should avoid leaving orphaned files when validation fails.

## Testing

Minimum verification for the first implementation:

- Authentication API.
- Note CRUD API.
- Tag creation and assignment.
- Attachment upload and metadata persistence.
- ZIP export structure and required files.
- ZIP import into an empty database.
- Conflict-safe ZIP import into a non-empty database.
- Docker Compose startup on the default host port `38080`.
- Basic browser verification for login, creating a note, editing Markdown, previewing, and exporting.

## Open Decisions

None. The current design assumes a personal-use app, ZIP export, Markdown editor with preview, and Docker Compose default host port `38080`.
