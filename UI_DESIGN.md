# UI_DESIGN.md — FactFlow Design System

## Design Philosophy

Factory floor app. Used one-handed. Bright sunlight. Dusty hands. Urgency.
Every UI decision should serve speed and clarity over aesthetics.
No decorative elements. No animations that delay. No hover-only interactions.

---

## Color Palette

```css
/* Primary */
--color-primary:     #4C2D8F;   /* Deep purple — brand */
--color-primary-mid: #6B46C1;   /* Medium purple — accents */
--color-primary-lite:#EDE9FB;   /* Light purple — backgrounds */
--color-primary-dark:#3A1F72;   /* Dark purple — headers */

/* Status Colors */
--color-pending:     #B45309;   /* Amber — pending status */
--color-pending-bg:  #FEF3C7;
--color-partial:     #1D4ED8;   /* Blue — partially paid */
--color-partial-bg:  #DBEAFE;
--color-paid:        #15803D;   /* Green — paid */
--color-paid-bg:     #DCFCE7;

/* Neutral */
--color-dark:        #1A1A2E;   /* Near black — body text */
--color-mid:         #374151;   /* Dark grey — secondary text */
--color-grey:        #6B7280;   /* Medium grey — labels */
--color-line:        #E5E7EB;   /* Light grey — borders */
--color-bg:          #F9FAFB;   /* Off white — page background */
--color-white:       #FFFFFF;

/* Semantic */
--color-error:       #DC2626;
--color-error-bg:    #FEF2F2;
--color-success:     #16A34A;
--color-success-bg:  #F0FDF4;
--color-warning:     #D97706;
--color-warning-bg:  #FFFBEB;
```

---

## Typography

```css
/* Font: System font stack — no Google Fonts, no external dependency */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Type Scale */
--text-xs:   12px / 1.4  /* Labels, captions */
--text-sm:   14px / 1.5  /* Secondary text, timestamps */
--text-base: 16px / 1.5  /* Body text, list items */
--text-lg:   18px / 1.4  /* Section titles */
--text-xl:   20px / 1.3  /* Page headers */
--text-2xl:  24px / 1.2  /* Dashboard numbers */
--text-3xl:  30px / 1.1  /* Large amounts */
```

---

## Spacing & Layout

```
Page max-width: 480px (centered on tablet/desktop)
Page padding: 16px horizontal
Bottom nav height: 64px (accounts for iPhone safe area)
Top header height: 56px
Card border-radius: 12px
Button border-radius: 10px
Input border-radius: 8px
Minimum tap target: 44x44px (Apple HIG standard)
```

---

## Component Specifications

### Bottom Navigation
```
4 tabs: Home | Invoices | Purchases | Expenses
Reports tab: Admin only (hidden for Member)
Active tab: primary purple icon + label
Inactive: grey icon + label
Fixed at bottom, above safe area
Shadow: 0 -1px 0 #E5E7EB
```

### Status Badge
```jsx
// pending
<span class="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
  Pending
</span>

// partially_paid
<span class="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
  Partial
</span>

// paid
<span class="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
  Paid
</span>
```

### Invoice / Purchase List Card
```
White card, 12px radius, 1px border (#E5E7EB), 16px padding
Row 1: Bill No (bold, dark) + Status badge (right-aligned)
Row 2: Customer/Supplier name (medium grey)
Row 3: Amount (bold, large) + Date (grey, right-aligned)
         [Amount hidden if Member role — replaced with "—"]
Tap entire card → detail view
Chevron icon on right edge
```

### Capture Button (Primary CTA)
```
Full width, 52px height, primary purple background
White text, 18px bold
Camera icon on left
"Capture Bill" / "Capture Receipt" label
Border radius 10px
Tap animation: scale(0.97) on active
```

### Amount Display Component
```jsx
// Admin sees: ₹ 15,000
// Member sees: nothing (component returns null)

const AmountDisplay = ({ amount, className }) => {
  const { isAdmin } = useAuth();
  if (!isAdmin) return null;
  return <span className={className}>₹ {amount.toLocaleString('en-IN')}</span>;
};
```

### OCR Confirm Screen
```
Full page modal / new page
Top: Image thumbnail (tap to expand)
Below: Extracted fields form
  - Bill No (text input, keyboard: default)
  - Customer/Supplier Name (text input)
  - Amount (number input, keyboard: numeric)
Each field shows what OCR extracted (pre-filled)
Staff edits if wrong
Bottom: "Save" button (primary) + "Cancel" (secondary)
Loading state during OCR: spinner overlay on image
```

### Empty State
```
Centered in content area
Icon (grey, 48px)
Heading: "No invoices yet"
Sub: "Tap the camera button below to add your first invoice"
No buttons in empty state (FAB handles the action)
```

### Toast Notifications
```
Bottom of screen, above bottom nav
Success: green background, white text, checkmark icon
Error: red background, white text, X icon
Warning: amber background, dark text, warning icon
Auto-dismiss: 3 seconds
Max 2 toasts at once (stack)
```

### Loading States
- Skeleton screens (grey animated bars) for list pages
- Spinner overlay for submit actions
- "Uploading..." progress bar for image upload
- Never show blank white screen — always loading state

---

## Page Layouts

### Home Dashboard (Admin view)
```
Header: "Good morning" + factory name
Today's summary cards (2x2 grid):
  [Total Invoiced]  [Total Received]
  [Total Pending]   [Total Expenses]
Each card: label (grey small), amount (large bold purple)

Quick actions (2 large buttons):
  [📷 New Invoice]    [📷 New Payment]

Recent activity list (last 5 records)
  Shows invoices + purchases + expenses mixed, sorted by time
```

### Home Dashboard (Member view)
```
Header: "Welcome" + factory name
Two large capture buttons only:
  [📷 New Invoice]
  [📷 New Payment Receipt]
  [📷 New Purchase]
  [📷 New Expense]
No amounts visible anywhere
```

### Invoice List
```
Header: "Invoices" + count
Search bar (sticky below header)
Filter chips: All | Pending | Partial | Paid
List of invoice cards (infinite scroll or pagination)
FAB: + button (fixed bottom right, above bottom nav)
  → triggers AddInvoice flow
```

### Invoice Detail
```
Header: Bill No + Back button
Status badge (large)
Section: Bill Details
  Customer Name, Total Amount (admin), Date
Section: Bill Photo
  Thumbnail → tap to expand full screen
Section: Payments (admin) or "Payments" hidden (member)
  Each payment: amount, date, receipt thumbnail
"Add Payment" button (admin only, full width at bottom)
```

### Capture Flow (shared)
```
Step 1 — Camera
  Full screen viewfinder simulation
  Instruction text: "Point camera at the bill"
  Large round capture button (centre bottom)
  OR file picker for uploading from gallery

Step 2 — Processing
  Image preview
  "Reading bill..." with spinner
  Cannot cancel during OCR (prevents partial saves)

Step 3 — Confirm
  Image thumbnail
  Editable form fields (pre-filled by OCR)
  "Save Bill" / "Cancel"

Step 4 — Success
  Green checkmark animation
  "Invoice saved!"
  "View Invoice" link
  Auto-return to list after 2 seconds
```

### Reports (Admin only)
```
Header: "Reports"
Date selector: Today | This Month | Custom
Summary cards (vertical list):
  Total Invoiced: ₹ X
  Total Received: ₹ X
  Total Pending:  ₹ X
  Raw Materials:  ₹ X
  Expenses:       ₹ X
  ─────────────────
  Net Position:   ₹ X (color coded: green if positive)

Tap any card → drill-down list appears below

Export buttons: [↓ PDF]  [↓ Excel]

Monthly view: horizontal table / chart
  Date | Invoiced | Received | Pending
```

---

## Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4C2D8F',
          mid: '#6B46C1',
          lite: '#EDE9FB',
          dark: '#3A1F72',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      screens: {
        'xs': '375px',    // iPhone SE
        'sm': '390px',    // iPhone 14
        'md': '768px',    // Tablet
      }
    },
  },
  plugins: [],
}
```

---

## Mobile-Specific Rules

1. **No hover states for primary interactions** — use `:active` instead
2. **Touch targets minimum 44x44px** — pad small elements generously
3. **Bottom sheet patterns** — use bottom-anchored modals, not centered ones
4. **No horizontal scroll** — all content fits in viewport width
5. **Input zoom prevention** — font-size on inputs must be 16px or larger
6. **Safe area handling** — use `pb-safe` / `env(safe-area-inset-bottom)` for bottom nav
7. **Keyboard handling** — page should scroll up when keyboard appears (iOS quirk)
8. **Image capture** — always use `capture="environment"` (rear camera) on file inputs

---

## PWA Requirements

```json
// public/manifest.json
{
  "name": "FactFlow",
  "short_name": "FactFlow",
  "description": "Digital invoice & expense tracking for factories",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#4C2D8F",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## Modal & In-App Dialog Guidelines

1. **In-App Deletion Confirmations (`ConfirmDialog.jsx`)**:
   - Replaces browser-native `window.confirm` dialogs across all modules.
   - Styled with `backdrop-blur-md`, warning badge, and explicit red "Delete" action button.
   - Single-tap cancel button & overlay dismiss.

2. **In-App Image Lightbox Modal Overlay (`previewImage`)**:
   - Replaces external `target="_blank"` browser links for payment and expense receipts.
   - High-contrast black backdrop overlay (`bg-black/90 z-60`).
   - Single-tap anywhere on overlay or close button (`✕`) to dismiss.
