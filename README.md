# Pixel Eye Blog Admin

Next.js App Router and TypeScript administration foundation for Pixel Eye Blog CMS.

## Prerequisites

- Node.js 22+
- npm 10+
- The backend API running on its configured port
- MySQL 8+ available to the backend for authentication and readiness

## Installation and environment

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_API_BASE_URL` to the backend API prefix, for example `http://localhost:5000/api/v1`.
4. Make sure the backend `CORS_ORIGINS` includes the admin frontend origin, for example `http://localhost:3000`.
5. Run `npm run dev`.
6. Open `http://localhost:3000/login`.

Only the public backend base URL belongs in a `NEXT_PUBLIC_` variable. Never copy database, Cloudflare, SMTP, JWT, refresh-token, or admin credentials into this project.

## Commands

```text
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm start
npm audit
```

## Authentication flow

- The frontend uses the canonical backend auth prefix: `/api/v1/auth`.
- Login sends email and password to `POST /auth/login`.
- The backend sets the refresh token in an HttpOnly cookie.
- The frontend stores the access token in memory only; it is not written to localStorage, sessionStorage, IndexedDB, or JavaScript-readable cookies.
- Requests use `credentials: include` so the refresh cookie is sent to the backend.
- On startup the admin app calls `POST /auth/refresh`, then `GET /auth/me`.
- On a 401 response the API client performs one shared refresh request, retries the failed request once, and redirects to `/login` if refresh fails.
- Logout calls `POST /auth/logout`, clears frontend auth state, and redirects to `/login`.

The dashboard and future admin routes are guarded on the frontend for user experience only. Backend authorization remains the source of truth.

## Backend integration

- The dashboard calls `GET /api/v1/health/ready` through the centralized API client.
- Auth calls use `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`, and `POST /api/v1/auth/logout`.
- Requests time out after eight seconds.
- Network, timeout, configuration, and backend response errors are normalized.

## Troubleshooting

- **Login redirects back to `/login`:** confirm the backend is running and the refresh cookie is being accepted by the browser.
- **CORS error:** ensure the frontend origin is present in backend `CORS_ORIGINS`; do not use wildcard CORS with credentials.
- **Cookie missing in local HTTP:** local development uses an HttpOnly cookie with `secure: false`; production requires HTTPS and `secure: true`.
- **Dashboard shows backend unavailable:** start the backend and confirm MySQL readiness.
- **Request times out:** confirm the backend host and port are reachable.
- **Invalid API URL:** verify that `NEXT_PUBLIC_API_BASE_URL` is an absolute HTTP or HTTPS URL.
- **Changes to environment variables are ignored:** restart the Next.js development server.

## Production security reminder

Rotate the initial Super Admin password before production. Do not share or commit the value from backend .env.




## Blog admin foundation UI

The admin Blog UI is mounted under `/blogs` and uses the centralized authenticated API client against the canonical backend `/api/v1/blogs` routes.

Implemented foundation workflow:

- Create draft blogs.
- List active blogs and Blog Trash.
- Edit draft metadata, SEO fields and basic content.
- Select a featured image from existing active media assets.
- Publish, publish updates, unpublish, move to Trash and restore according to backend role permissions.

The frontend does not upload blog images directly in this workflow. Featured images are selected from the existing Media Library, and media deletion remains managed by the Media APIs.
## Media library trash UI

The Media Library has two tabs:

- Active Media: shows reusable active assets only.
- Trash: shows trashed and delete-failed assets with `trashed by`, trash date, purge date, days remaining, restore, retry delete, and permanent-delete actions.

Normal delete from Active Media means “Move to Trash.” R2 files remain available so the asset can be restored during the retention window. Permanent delete is available only to roles allowed by the backend and removes the R2 original plus variants while retaining the database audit record.

The frontend calls:

```text
GET /media/assets
GET /media/assets/trash
DELETE /media/assets/:id
POST /media/assets/:id/restore
DELETE /media/assets/:id/permanent
```

The frontend does not store Cloudflare credentials and does not delete R2 objects directly.


## Advanced Blog Editor

The create/edit experience uses a structured TipTap editor with explicit Save Draft actions (no autosave), a reusable ACTIVE-only featured-media picker, SEO counters and search-result preview, and the Backend publish checklist. Publish saves current dirty content first; published Blogs expose Publish Updates and a confirmation-based Unpublish action.

Admin Preview includes the current in-memory editor state where practical and is clearly marked as an administrative approximation; it is not a public route or an exact website template. Dirty-state protection includes a Saved/Unsaved indicator, tab-close warning, and confirmation when using the editor's Back action.

## Blog template foundation

The Blog Create/Edit form contains an accessible Article Template selector backed by `GET /api/v1/blogs/templates`. Template 1 is selected by default for new Drafts. Existing Draft selections are restored from the Blog detail response, included as `template_key` in create/update payloads, and participate in unsaved-change tracking.

Supported Admin Preview layouts:

- Template 1: centered single-column article.
- Template 2: article plus a desktop sidebar. On smaller screens the sidebar follows the article.

Template 2 generates its table of contents from current TipTap H2, H3, and H4 nodes. Heading levels determine indentation, duplicate headings receive deterministic suffixes, and preview links target generated local heading IDs. Template 1 does not display a TOC. The Preview uses current local editor state and remains Admin-only; no public Blog route is added.

When Draft and Published template selections differ, the editor explains that the Draft change becomes public only after Publish Updates. Published template snapshots remain backend-owned and immutable.

### Future work — not implemented

The Custom Template Builder, arbitrary template configuration, public Blog pages/APIs, and custom template styling controls are intentionally not implemented.

## Templates workspace

The protected `/templates` route is available from the dashboard sidebar to all Admin roles. It displays the two read-only system templates as responsive cards with CSS layout diagrams, current usage, details drawers, and full previews powered by the same Template 1 and Template 2 renderers used by Blog Admin Preview.

Super Admins, Editors, and Authors can use **Create Blog with this Template**, which opens `/blogs/create?template=template_1` or `/blogs/create?template=template_2` and preselects that validated template in the existing Blog form. Invalid values safely fall back to Template 1. Viewers can inspect details and previews but do not receive a create action.

The Custom Templates section is an informational empty state only. The Custom Template Builder, custom-template CRUD, editing, deletion, duplication, and styling controls are not implemented in this phase.

## Template 1 Article Sections

Template 1 version 2 adds a fixed-order Article Sections editor below TipTap. Hero Details and Medical Disclaimer are required. Key Takeaways, Image Comparison, Numbered List, Expert Quote, Medical CTA, FAQ, Helpful Feedback, and Share Controls can be configured without changing the system template layout.

Repeaters support add, remove, move up, and move down with section limits. Comparison cards and Expert Quote avatars reuse the active Media Library picker and persist MediaAsset IDs only. Structured section state participates in dirty-state detection, navigation protection, Save Draft, Publish Updates, reload persistence, and field-error display.

Admin Preview renders the current unsaved block state immediately. It does not inject Templates Library sample data. Disabled or incomplete optional sections are hidden visually; Backend publish readiness reports incomplete enabled sections. The mandatory disclaimer cannot be disabled.

Saved Template 1 v1 Blogs retain the legacy renderer. New Template 1 Blogs resolve to version 2. Template 2 does not show the Article Sections editor and its layout is unchanged; switching templates preserves entered Template 1 block state.
