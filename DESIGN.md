# DESIGN.md — FactFlow Visual Redesign Specification

## Purpose of This Document

This document instructs the AI to redesign the visual appearance of the FactFlow application without touching any logic, routing, state management, API calls, or component structure. Every component already exists and works correctly. The only thing changing is how things look — colors, typography, spacing, shadows, borders, and icons.

If it is not a visual property, do not touch it.

---

## The One Rule Before Starting

Go file by file, component by component. Do not refactor. Do not reorganize. Do not rename anything. Do not move files. Do not change props. Do not change event handlers. Do not change any conditional logic. The only lines you are allowed to modify are Tailwind class names and any inline style values. If you find yourself changing a function, a variable name, an import path, or a JSX structure — stop. You are going beyond the scope of this task.

---

## Font

Replace whatever font is currently in use with Inter from Google Fonts.

Inter is the standard professional font for SaaS dashboards and mobile apps. It is highly legible at small sizes, renders cleanly on low-resolution screens (common on factory floor Android phones), and has excellent support for numeric characters which matters a lot for an app displaying amounts and bill numbers constantly.

Import Inter in the index.html file using the Google Fonts link tag. Import the weights 400, 500, 600, and 700. Apply it as the base font family in the root CSS and in the Tailwind font family configuration so it cascades everywhere automatically. No component should need to specify the font individually.

### Font Size Scale

Use this scale consistently throughout the entire app. Do not deviate.

The smallest text in the app — timestamps, secondary labels, helper text — uses 12px. Status badges and metadata use 13px. All body text, list item descriptions, and form labels use 14px. Primary list item content like customer names and bill numbers use 15px. Section headings and card titles use 16px. Page titles in headers use 18px. Dashboard summary numbers — the big amounts shown on stat cards — use 24px. The largest numbers shown anywhere, such as the total pending amount on the invoice detail screen, use 28px.

Do not use font sizes outside of this scale. If you are unsure which size to use, go one size smaller rather than one size larger. The app is used on small phone screens and density matters more than impact.

---

## Color Palette

This is the complete and only color palette for the entire application. Do not use any color not in this list.

### Brand Colors
The primary brand color is a deep professional indigo: #3D52A0. This is used for primary buttons, active navigation items, links, and any element that represents a primary action or current state.

The secondary brand color, used for hover states and pressed states on primary elements, is a darker indigo: #2D3E7A.

The light brand tint, used for selected backgrounds, highlighted rows, and tag backgrounds where brand color is needed but subtle, is: #EEF1FB.

### Neutral Colors
The page background across the entire app is #F5F6FA. This is a very slightly cool off-white — not pure white, not grey. It gives depth to cards without being harsh.

Card backgrounds and any elevated surface use pure white: #FFFFFF.

The primary text color for all headings, important values, and primary content is: #1A1D23.

The secondary text color for labels, descriptions, and supporting text is: #4A5568.

The tertiary text color for placeholders, timestamps, and the least important content is: #8A94A6.

Borders throughout the app — card borders, input borders, dividers — use: #E8EBF0.

The divider color for horizontal rules and section separators is: #F0F2F6.

### Status Colors
These are used for status badges, status text, and status-related UI elements only.

Pending status: text color #92400E, background color #FEF3C7. This is a warm amber.

Partially paid status: text color #1E40AF, background color #DBEAFE. This is a calm blue.

Paid status: text color #065F46, background color #D1FAE5. This is a confident green.

### Semantic Colors
Error states, destructive actions, and error messages: #DC2626 for text and icons, #FEF2F2 for backgrounds.

Success confirmations and positive indicators: #16A34A for text and icons, #F0FDF4 for backgrounds.

Warning states: #D97706 for text and icons, #FFFBEB for backgrounds.

---

## Elevation and Shadow System

The app uses a three-level elevation system. Consistency here is what makes the app feel polished rather than amateur.

Level 0 — no shadow. Used for elements sitting directly on the page background. List items that are separated by borders rather than cards use this.

Level 1 — the standard card shadow. Every card, every panel, every bottom sheet uses this. The value is: 0px 1px 3px rgba(0, 0, 0, 0.06), 0px 1px 2px rgba(0, 0, 0, 0.04). It is subtle. You should barely notice it. Its job is to lift the card off the background slightly, not to make a dramatic statement.

Level 2 — used for floating elements like the bottom navigation bar and dropdown menus. The value is: 0px 4px 12px rgba(0, 0, 0, 0.08), 0px 2px 4px rgba(0, 0, 0, 0.06). Slightly more presence but still refined.

Level 3 — used for modals and confirmation dialogs only. The value is: 0px 20px 40px rgba(0, 0, 0, 0.12), 0px 8px 16px rgba(0, 0, 0, 0.08).

---

## Border Radius System

Like shadows, border radius needs a consistent system.

Small elements — badges, tags, chips, small buttons — use 6px.

Standard elements — inputs, cards, standard buttons, list items — use 10px.

Large elements — modals, bottom sheets, large cards like the dashboard stat cards — use 14px.

The floating action button (camera/add button) and any circular element uses 50%.

The bottom navigation bar uses 0px radius on the bottom and 16px on the top two corners only, since it sits flush with the screen bottom.

---

## Spacing System

All spacing uses multiples of 4px. The standard values to use are 4, 8, 12, 16, 20, 24, 32, 40, 48. Do not use arbitrary spacing values like 7px, 11px, or 18px. Tailwind's default spacing scale already follows this — use it as intended.

The page-level horizontal padding on all screens is 16px on each side. Nothing should touch the screen edges.

The vertical gap between sections on any page is 24px.

The internal padding of a standard card is 16px on all sides.

The internal padding of a compact list item is 12px vertical, 16px horizontal.

The gap between a label and its value within a card is 4px.

The gap between separate fields in a form is 16px.

The gap between a section heading and the content below it is 12px.

---

## Typography Application Rules

Heading that appears at the top of a page inside the header bar: 18px, weight 600, color #1A1D23.

Section headings within a page (like "Recent Invoices" or "Payment History"): 15px, weight 600, color #1A1D23, with a small left border accent using the primary brand color at 3px wide.

Card titles and primary list item text (bill numbers, customer names): 15px, weight 500, color #1A1D23.

Supporting list item text (supplier names in secondary position, descriptions): 13px, weight 400, color #4A5568.

Labels above form inputs: 13px, weight 500, color #4A5568. Always rendered above the input, never as placeholder text only.

Dashboard stat card label (like "Total Invoiced"): 12px, weight 500, color #8A94A6, uppercase, letter-spacing 0.5px.

Dashboard stat card value (the big number): 24px, weight 700, color #1A1D23.

Timestamps and secondary metadata: 12px, weight 400, color #8A94A6.

Amount values in list items: 15px, weight 600, color #1A1D23. When the amount is pending, use the pending status color for the text.

---

## Component-by-Component Specifications

### Page Header / Top Bar

The header sits at the top of every page. It has a white background, not transparent. It has a very subtle bottom border using the border color #E8EBF0 at 1px. No shadow on the header — the border is enough separation.

Left side: back arrow icon (SVG, 20px, color #4A5568) for inner pages, or the FactFlow wordmark for the home screen.

Center: page title at 18px weight 600.

Right side: any contextual action icon (filter, search, export). Icons are 20px, color #4A5568.

The header height is 56px on mobile. Content is vertically centered within it.

There is no gradient, no colored background on the header. It stays white throughout.

### Bottom Navigation Bar

White background. Top border 1px #E8EBF0. Height 64px plus the device safe area inset at the bottom (the app must respect iPhone home indicator space and Android navigation bar space).

Four or five tabs depending on user role. Each tab has an SVG icon at 22px and a label at 11px weight 500 below it. The gap between icon and label is 4px.

Inactive tab: icon color #8A94A6, label color #8A94A6.

Active tab: icon color #3D52A0, label color #3D52A0. No background highlight, no pill, no underline. Just the color change. Clean and minimal.

The tab touch target covers the full height and equal width division of the bar regardless of label length.

### Cards

White background. Border 1px #E8EBF0. Border radius 10px. Shadow at Level 1. Padding 16px.

Cards should never be flush against other cards with no gap. The gap between cards in a list or grid is 10px.

Cards on the dashboard (stat cards) are arranged in a 2x2 grid with 10px gap. Each stat card has a top section with the label in small uppercase text and a bottom section with the large value. No icons on stat cards — numbers speak for themselves.

### List Items (Invoice, Purchase, Expense rows)

Each list item is a card with 10px border radius, white background, Level 1 shadow, 12px vertical padding, 16px horizontal padding.

The layout within a list item is two rows:

First row: bill number on the left (15px, weight 600, color #1A1D23) and the status badge on the right.

Second row: customer or supplier name on the left (13px, weight 400, color #4A5568) and the amount on the right (15px, weight 600, color #1A1D23 for admin, hidden entirely for member).

Below the second row, flush right: date in 12px weight 400 color #8A94A6.

There is a very subtle right-pointing chevron SVG (16px, color #8A94A6) on the far right, vertically centered across both rows. This communicates tappability.

The entire card is the tap target. There is no separate tap button.

### Status Badges

Pill shape. Border radius 6px. Padding 3px horizontal 8px, 2px vertical. Font size 12px, weight 500.

Pending: background #FEF3C7, text #92400E.
Partially Paid: background #DBEAFE, text #1E40AF.
Paid: background #D1FAE5, text #065F46.

The badge text should be "Pending", "Partial", and "Paid" — short enough to not wrap on small screens.

### Buttons

Primary button: background #3D52A0, text white, border radius 10px, height 48px, font size 15px weight 600. Full width within its container unless it is a secondary action alongside another button. On press, background darkens to #2D3E7A.

Secondary button: background white, border 1.5px #3D52A0, text #3D52A0, same radius and height as primary. On press, background becomes #EEF1FB.

Destructive button: background #DC2626, text white, same dimensions. Used only for delete and suspend actions.

Ghost button: no background, no border, text #3D52A0, used for less important actions like "Skip" or "View all".

All buttons have a minimum tap target of 44px height even if visually shorter due to padding.

Disabled state for any button: opacity 0.4, no press animation.

### Form Inputs

Label above the input: 13px weight 500 color #4A5568. Margin bottom 6px.

Input field: white background, border 1.5px #E8EBF0, border radius 8px, height 48px, padding 12px horizontal, font size 15px color #1A1D23.

On focus: border color changes to #3D52A0. No glow, no shadow on focus — just the border color change.

On error: border color #DC2626. Error message below the input in 12px weight 400 color #DC2626.

Placeholder text: color #8A94A6, same size as input text.

Numeric inputs (amount fields) should show a numeric keyboard on mobile. The INR symbol (₹) should appear as a prefix inside the input field on the left side, in color #4A5568, not editable.

### Capture Button / Floating Action Button

The primary capture action on list pages is a floating button anchored to the bottom right of the screen, sitting 16px from the right edge and 80px from the bottom of the screen (above the bottom nav).

The button is circular, 56px diameter, background #3D52A0, elevation Level 2 shadow. Inside it is a camera SVG icon in white at 24px.

This button should have a subtle scale animation on press — it scales down to 0.93 and back. This is the only animation in the entire app.

### OCR Confirm Screen

This is one of the most important screens in the app as it is used constantly throughout the day.

At the top is a thumbnail of the captured bill image. The image occupies the full width of the screen minus 32px horizontal padding. It has a 10px border radius and a 1px border in #E8EBF0. The height of the image is fixed at 180px and the image covers the area with object-fit cover so it does not distort regardless of photo orientation.

Below the image, there is a small confidence indicator. If OCR extracted all three fields with high confidence, this shows a green indicator with text "Fields extracted". If extraction was partial, it shows amber with "Some fields need review". If extraction failed, it shows red with "Could not read — please enter manually". This is 12px text with a small colored dot beside it.

Below the confidence indicator are the form fields: Bill Number, Customer Name, and Amount as three separate input fields following the input specification above.

At the bottom, fixed above the keyboard when the keyboard is open, are two buttons side by side: Cancel (secondary button, left) and Save (primary button, right). Each takes up roughly half the width with 10px gap between them.

### Dashboard Home Screen

No greeting text with the user's name. Keep it professional and impersonal. The header shows the FactFlow wordmark on the left and the factory name in small text on the right.

Below the header is a date display showing today's date in the format "Thursday, 24 July" at 13px weight 500 color #8A94A6. This orients the user without taking up space.

Below the date are the four stat cards in a 2x2 grid. The labels use the small uppercase style. The values use the large 24px bold style.

Below the stat cards is a section heading "Recent Activity" followed by the last five records across invoices and purchases combined, shown as compact list items.

For the member role home screen, the stat cards are not shown at all. Instead, the screen shows four large capture action cards arranged in a 2x2 grid. Each capture card is white, 10px border radius, Level 1 shadow, with a centered SVG icon at 32px in color #3D52A0, and below it the action label at 14px weight 600 color #1A1D23. The four actions are: New Invoice, Add Payment, New Purchase, and New Expense.

### Empty States

When a list has no items, display an empty state centered in the content area.

The empty state has: an SVG illustration at 80px in color #E8EBF0 (very light so it recedes), below it a heading at 15px weight 600 color #1A1D23 ("No invoices yet"), and below that a description at 13px color #8A94A6 explaining the next action ("Tap the camera button to capture your first invoice").

No button in the empty state. The floating action button already handles the action.

### Loading States

List pages show skeleton loading cards. A skeleton card matches the height and layout of a real list item but all text is replaced with rounded rectangular grey bars in color #F0F2F6. There is no animation on the skeletons — static is fine and avoids performance issues on low-end Android phones.

Full-page loading (initial app load, auth check) shows a centered FactFlow wordmark on a white background. Nothing else.

Button loading state: the button text is replaced with a small spinner (SVG, 18px, white) and the button is disabled. No text alongside the spinner.

### Toast Notifications

Toasts appear at the bottom of the screen, 16px above the bottom navigation bar. They slide up from the bottom when they appear and slide back down when they dismiss.

Width is the screen width minus 32px horizontal margin. Border radius 10px. Padding 12px horizontal, 14px vertical. Level 2 shadow.

Success toast: background #1A1D23 (dark), text white, a small checkmark SVG on the left in green #16A34A.

Error toast: background #1A1D23 (dark), text white, a small X SVG on the left in red #DC2626.

All toasts use dark background regardless of type — color only appears on the icon. This keeps them visually consistent and readable.

Auto-dismiss after 3 seconds. Maximum one toast visible at a time. If a second toast fires before the first dismisses, replace the first.

### Modals and Confirmation Dialogs

Modals appear as bottom sheets on mobile — they slide up from the bottom of the screen and overlay the page content. The overlay background is black at 50% opacity.

The bottom sheet has white background, border radius 16px on the top two corners only, and Level 3 shadow. It should never cover more than 75% of the screen height.

Inside the bottom sheet: a handle bar at the very top center — a 36px wide, 4px tall, #E8EBF0 rounded pill — indicating it can be dragged down to dismiss. Below the handle is the modal title at 16px weight 600. Below the title is the content. At the bottom are the action buttons.

Destructive confirmation modals (suspend, delete) have the confirm button as a full-width destructive red button. The cancel option is a ghost button above it or a text link.

The typed-confirmation input for tenant deletion follows the standard input style but with a note below it in 12px color #8A94A6 explaining exactly what text to type.

---

## SVG Icons

No emojis anywhere in the application. Every icon is an SVG.

Use a single consistent icon set throughout the entire application. The recommended set is Heroicons (outline style, not solid). Heroicons is free, has no licensing restrictions, and can be used directly as inline SVGs or imported as React components. Every icon in the app should come from this set.

The standard icon size for navigation and action icons is 20px. Icons inside buttons are 18px. The floating action button icon is 24px. Empty state illustrations are 80px. Status icons alongside text are 16px.

Icon color follows the context — inside primary buttons they are white, in navigation they follow the active/inactive rules above, standalone action icons use #4A5568.

Do not mix icon styles. If using Heroicons outline, every single icon must be Heroicons outline. No switching to filled variants except for the active navigation state where the active icon uses the filled (solid) variant of the same icon.

---

## Mobile-Specific Rules

The app is used in portrait orientation on phones. Never assume landscape.

Every interactive element has a minimum tap target of 44px by 44px even if the visual element is smaller. Add invisible padding around small icons to meet this requirement.

Input font sizes must be at least 16px to prevent iOS Safari from zooming in automatically when an input is focused. Note: labels can be 13px, but the text inside the input itself must be 15-16px.

The bottom navigation bar and any fixed bottom elements must account for the safe area inset on iPhones with home indicators. Use the CSS environment variable for safe-area-inset-bottom to add padding.

Scrollable content areas must account for the combined height of the top header and bottom navigation so content is not hidden behind either.

Long text — customer names, descriptions — must be truncated with an ellipsis after one line in list items. It must never wrap and push other content down in a list row.

Amount numbers should never truncate. If an amount is large, the font size should remain the same and the layout should accommodate it. Test with amounts like ₹99,99,999 to ensure nothing breaks.

---

## What the AI Must Not Do During This Redesign

Do not change any component names, file names, or folder names.

Do not change any props passed to components.

Do not change any event handlers, onClick functions, onChange functions, or form submit handlers.

Do not change any API calls, axios calls, or fetch calls.

Do not change any conditional rendering logic — if a condition shows or hides something, that condition stays exactly as it is.

Do not change any React Router routes or navigation logic.

Do not change any context values, state management, or hook implementations.

Do not add new components. Do not remove existing components.

Do not change the AuthContext or TenantContext.

Do not change any utility functions.

Do not install any new dependencies. Tailwind CSS is already installed and is the only styling tool to use.

Do not add any animation libraries. The only animation in the app is the floating action button scale on press, implemented with a simple Tailwind active scale class.

If implementing a change requires touching any of the above, stop and flag it as a conflict rather than proceeding.

---

## How to Approach the Redesign Systematically

Start with the global styles and Tailwind configuration: font family, color palette extension, and the base CSS file. This sets the foundation that every component inherits.

Then move to the shared layout components first: the page header, the bottom navigation bar, and any wrapper components. Getting these right sets the visual tone for everything else.

Then move to the shared UI components: buttons, inputs, status badges, cards, toast notifications, and the loading skeleton. These are reused everywhere and fixing them once fixes them everywhere they appear.

Then move page by page starting with the Home dashboard, then Invoice list, Invoice detail, OCR confirm screen, and so on through every page in the app.

After each file is updated, state which file was changed and what visual changes were made. Do not change multiple files at once without reporting what changed.
