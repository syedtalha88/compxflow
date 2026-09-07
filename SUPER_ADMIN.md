# SUPER_ADMIN.md — FactFlow Super Admin Specification

## What This Is and What It Is Not

The Super Admin is a completely separate internal tool built exclusively for the developer (Talha) to monitor and manage the entire FactFlow platform. It has zero relation to the Admin role that Kaleem uses inside his tenant dashboard. Those are two entirely different things.

Kaleem is an "Admin" within his own tenant — he can see his factory's invoices, reports, and data. That is an in-app role.

The Super Admin is a developer-level control panel that sits above all tenants. It sees across every factory on the platform. Kaleem does not know it exists and has no access to it.

---

## How Authentication Works

There is no user account for the super admin. There is no login with email and password. There is no JWT token involved.

Instead, there is a single secret key stored only in the backend environment variables. This key is long, random, and known only to the developer. Every request made to any super admin API endpoint must include this key in a custom request header. If the key is missing or wrong, the server immediately returns 403 Forbidden. No further processing happens.

On the frontend, when the developer opens the super admin panel, they see a simple key entry screen. They type the secret key once. The frontend immediately tries to call the dashboard stats endpoint using that key. If the call succeeds, the key is valid and the developer is taken to the dashboard. If it fails, an "invalid key" error is shown.

The key is held in the browser's session storage — not localStorage. This means it disappears automatically when the browser tab is closed. The developer must re-enter the key each time they open a new session. This is intentional for security.

The super admin frontend pages live at a separate URL path that is completely disconnected from the main app routing. Regular users navigating the main app will never encounter or be redirected to these pages. There is no link to the super admin panel from anywhere in the customer-facing application.

---

## What the Super Admin Can See and Do

### Dashboard — Platform Overview

The first thing the developer sees after entering the key is a high-level platform overview. This page shows:

The total number of tenants registered on the platform broken down into: total, currently active, and currently suspended. It also shows how many are on the free plan versus a paid plan.

The total number of records across the entire platform: total invoices created, total purchases, total expenses. These are platform-wide counts, not per-tenant.

A short list of the most recently registered tenants — just their factory name, slug, plan, and status — so the developer can quickly see who signed up lately.

This page is read-only. No actions can be taken from here.

### Tenant List — All Factories

This page shows every tenant that has ever registered on the platform in a paginated table. The developer can see each tenant's factory name, their slug (subdomain), their plan, their current status (active or suspended), how many invoices they have created, and when they joined.

The list can be filtered by status (active or suspended) and by plan. There is a search input that lets the developer search by factory name or slug.

Clicking on any tenant in the list takes the developer to that tenant's detail page.

### Tenant Detail — One Factory In Depth

This is the most information-dense page. It shows everything about a single tenant.

The top section shows the tenant's core information: their MongoDB ID, factory name, slug, current plan, current status, and the date they registered.

Below that is a list of all users associated with this tenant — their email address, their role (admin or member), and when they were created. Sensitive fields like password hashes and PIN hashes are never shown anywhere in the super admin UI.

Next is a counts section showing exactly how many invoices, purchases, expenses, and OCR jobs this tenant has accumulated. These are quick numbers at a glance.

Below counts is a monthly activity section showing the last six months of invoice activity for this tenant — how many invoices they created each month and the total value. This gives the developer a sense of whether the tenant is actively using the platform or has gone dormant.

Finally, there is a recent invoices section showing the last five invoices this tenant created — bill number, customer name, total amount, and status. This gives a quick health check on whether data is flowing correctly.

At the very bottom of the page is the danger zone, described below.

### Actions the Developer Can Take

From the tenant detail page, the developer has three possible actions:

**Suspend a tenant.** This immediately blocks all access for that tenant's staff. The moment a suspended tenant's staff tries to use the app, every API call returns an error telling them the account is suspended. Their data is not deleted — it is just inaccessible until the account is reactivated. To trigger this action, the developer clicks a Suspend button which opens a confirmation modal asking them to confirm. The button in the modal should be distinctly red to signal danger.

**Activate a suspended tenant.** The reverse of suspension. Clicking Activate immediately restores full access for that tenant. No data is lost during suspension and reactivation.

**Change a tenant's plan.** A simple dropdown or button to move a tenant between free and pro plan. This is how the developer manually upgrades a tenant.

**Permanently delete a tenant.** This is the most dangerous action and has the most friction before it can be executed. The developer clicks a Delete button in the danger zone. A modal appears explaining that this will permanently delete the tenant, all their invoices, purchases, expenses, payments, OCR jobs, and all images stored in Cloudinary for this tenant. This cannot be undone. To confirm, the developer must type the tenant's exact slug into a text input inside the modal. Only when the typed text matches the slug exactly does the final delete button become enabled. When the delete executes, it removes everything associated with that tenant from every collection in the database and deletes all their images from Cloudinary. The user document in the users collection is not deleted because a user's email might be reused across tenants in the future.

---

## How Suspension Affects the Main App

When a tenant is suspended via the super admin panel, the tenant resolution middleware in the backend must check the tenant's status on every incoming request. If the status is suspended, it returns a 403 response immediately with a message like "This account has been suspended." This check must happen before any other processing — before auth, before business logic, before anything. The tenant middleware already runs on every request, so this is simply an additional check added to the existing middleware.

This means suspension takes effect instantly. The next API call the suspended tenant's staff makes — whether login, loading invoices, anything — will be blocked.

---

## Backend Structure

The super admin functionality lives in its own module folder inside the backend modules directory, named superAdmin. It contains a routes file and a controller file, following the same pattern as every other module in the project.

The routes file registers all the super admin endpoints and applies the super admin key verification middleware to all of them before any controller function runs. The key verification middleware is its own separate file in the middleware directory.

The super admin routes are registered in the main app file under the path prefix `/api/super-admin`. The key verification middleware must be the first thing that runs on every request to this prefix — before any other middleware.

The super admin controller imports models from across the entire application — Tenant, User, TenantUser, Invoice, Purchase, Expense, OcrJob, Payment, PurchasePayment, RefreshToken. This is the only place in the codebase that queries across all tenants without a tenantId filter. That is intentional and acceptable because this is an internal tool for the developer.

The five controller functions correspond to: fetching platform dashboard stats, listing all tenants with counts, fetching a single tenant's full detail, updating a tenant's status or plan, and deleting a tenant with full cascading cleanup.

---

## Frontend Structure

The super admin frontend is physically separate from the main customer-facing React application. It lives in its own pages directory under a superAdmin folder. It uses its own API utility file that is separate from the main API index file — because it authenticates differently (key in header versus JWT in header).

The layout of the super admin UI uses a sidebar navigation pattern rather than the bottom navigation used in the main app. This is because the super admin is used on a desktop browser by the developer, not on a phone by factory staff. The sidebar contains links to Dashboard and Tenants. At the bottom of the sidebar is a logout link that clears the key from session storage and returns to the key entry screen.

The super admin UI should use a visually distinct color scheme from the main FactFlow app — dark sidebar, white content area — so it is immediately obvious to the developer that they are in the internal panel and not the customer-facing app. Keep the FactFlow purple as an accent color for consistency but make the overall feel clearly different.

There is no loading of tenantId context, no AuthContext from the main app, and no ProtectedRoute component from the main app used on these pages. The super admin has its own simple auth check: if the session storage key is present and the last API call succeeded, show the page. If not, redirect to the key entry screen.

---

## The API Calls Each Page Makes

The key entry screen makes one API call: the dashboard stats endpoint. If it returns 200, the key is valid. If it returns 403, the key is wrong.

The dashboard page makes one API call on load: the dashboard stats endpoint. It displays the result and does not refresh automatically.

The tenant list page makes one API call on load and additional calls when the developer changes the search input, applies a filter, or navigates to a different page number.

The tenant detail page makes one API call on load to fetch that tenant's full detail. It makes additional calls only when the developer takes an action (suspend, activate, change plan, or delete).

After a successful suspend, activate, or plan change, the page should refresh the tenant detail data automatically so the developer sees the updated status without manually reloading.

After a successful delete, the developer is redirected back to the tenant list page.

---

## What Not to Build

Do not build user management within the super admin (like the ability to create or delete individual user accounts). That is out of scope.

Do not build an OCR job viewer or a system logs viewer. Out of scope for now.

Do not build any analytics charts or graphs beyond the simple monthly activity table on the tenant detail page. Out of scope.

Do not add any link, button, or navigation item anywhere in the main customer-facing app that points to the super admin panel.

Do not use the main app's AuthContext, TenantContext, or ProtectedRoute components inside the super admin pages.

---

## Security Rules for Implementation

The super admin key must never appear in any API response, error message, or log output. It is checked once and then forgotten within the request lifecycle.

The super admin routes must never have the tenant middleware applied to them. Super admin operates across all tenants by design.

The key verification middleware must be the absolute first middleware on the super admin route prefix. Nothing else runs if the key is wrong.

Deleting a tenant requires the confirmation header on the API request in addition to the UI confirmation flow. This means even if someone finds the delete endpoint, they cannot trigger it without also knowing and sending the correct confirmation header value. This is a second layer of protection beyond the key.

Rate limiting applies to the key entry attempts the same way it applies to login attempts — to prevent brute forcing the key. The existing rate limiter configuration should cover the super admin routes.
