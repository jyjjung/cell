# Design System: Cell Dates (Cell Master)

A comprehensive design guideline for a simple, clean, and highly usable interface that maintains all the powerful functionalities of the Cell Dates application (small groups, Bible checklist, worship setlists, chat, admin dashboards).

---

## 1. Visual Theme & Color Palette

The visual style should be **minimalist, modern, and deeply premium**. It supports both Light and Dark modes with curated palettes, using high contrast and subtle depths rather than generic solid colors.

### A. Dark Mode (Midnight Obsidian)
An ultra-sleek, distraction-free environment that reduces eye strain during evening Bible readings.

- **Background:** `hsl(224 45% 3%)` (Deep Midnight Black)
- **Foreground / Primary Text:** `hsl(210 30% 96%)` (Warm Off-White)
- **Primary Accent / Luminous:** `hsl(214 100% 65%)` (Electric Azure Blue - for main call-to-actions, active state)
- **Secondary Background:** `hsl(224 35% 8%)` (Dark Charcoal-Blue for cards/sections)
- **Muted Text:** `hsl(215 20% 60%)` (Cool Slate Gray)
- **Destructive:** `hsl(350 80% 60%)` (Soft Ruby Crimson)
- **Success / Positive:** `hsl(142 65% 48%)` (Vibrant Emerald Green)
- **Borders / Ring:** `hsl(224 35% 14%)` / `hsl(214 100% 65%)`

### B. Light Mode (Crisp Alabaster)
A clean, paper-like reading interface with clear boundaries and deep typographical contrast.

- **Background:** `hsl(216 33% 97%)` (Soft Alabaster Gray-White)
- **Foreground / Primary Text:** `hsl(222 47% 9%)` (Deep Ink Blue)
- **Primary Accent:** `hsl(214 90% 52%)` (Classic Royal Blue)
- **Secondary Background:** `hsl(0 0% 100%)` (Pure White Card Background)
- **Muted Text:** `hsl(215 18% 38%)` (Deep Slate Gray)
- **Destructive:** `hsl(350 82% 55%)` (Ruby Red)
- **Success / Positive:** `hsl(142 72% 34%)` (Deep Grass Green)
- **Borders / Ring:** `hsl(214 22% 82%)` / `hsl(214 90% 52%)`

---

## 2. Typography

Clean, highly readable sans-serif typography that optimizes both glanceable lists (schedules, rosters) and long-form prose (Bible passages).

- **Primary Font Family:** `Geist Sans`, `Inter`, system-ui, sans-serif
- **Code/Micro-label Font Family:** `Geist Mono`, `SFMono-Regular`, monospace
- **Scale and Weight Guidelines:**
  - **Hero Text (`h1`):** `text-4xl md:text-6xl font-black tracking-tighter uppercase italic` (Gives a premium athletic or active editorial feel)
  - **Section Titles (`h2`/`h3`):** `text-xl md:text-2xl font-black tracking-tighter uppercase italic`
  - **Body Copy:** `text-sm md:text-base font-medium leading-relaxed`
  - **Micro-labels / Subtitles:** `text-[10px] font-black uppercase tracking-[0.4em]` (Adds sophisticated, structural dividers)

---

## 3. Layout & Structure

The interface prioritizes **content hierarchy, clean white space, and modular layout**.

### A. Navigation
- **Navigation Bar:** A sticky, translucent top-bar with a glass-morphism blur (`backdrop-blur-md`) that floats over content. Includes small, clear icons and clean text.
- **Responsive Drawer:** A clean side navigation menu for mobile devices containing all sub-features (Bible Checklist, Roster, Worship, Leaderboard, Chat, Admin Panel) structured into logical groups.

### B. Grid & Containers
- **Content Max-Width:** Limit main pages to a readable `max-w-6xl` (approx. 1152px) for structured dashboards, and `max-w-3xl` (approx. 768px) for Bible reading view to keep line length readable.
- **Spacing:** Use a consistent scale based on `4px` increments (`gap-4`, `p-4`, `m-4`, `rounded-2xl` / `1.25rem` for major cards).

---

## 4. Components & Glassmorphism Design

To feel premium and state of the art, components use layered styling rather than basic borders or solid blocks.

### A. The "Glass-Card" Pattern
Cards should appear as translucent plates layered on top of the dark/light canvas with soft shadows and thin, luminous borders.
- **CSS Implementation:**
  - Light: `background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(32px); border: 1px solid rgba(214, 30, 78, 0.15); box-shadow: 0 4px 20px rgba(0,0,0,0.03);`
  - Dark: `background: linear-gradient(135deg, rgba(226, 50, 12, 0.45), rgba(226, 50, 6, 0.75)); backdrop-filter: blur(32px); border: 1px solid rgba(255, 255, 255, 0.05); box-shadow: 0 16px 40px rgba(0,0,0,0.4);`

### B. Controls & Form Inputs
- **Text Inputs:** Simple, high-contrast outline inputs with subtle background tint. Focus states transition smoothly to the primary accent color with a soft outer ring.
- **Switches & Checkboxes:** Custom rounded selectors that highlight with a rich blue background on check. Large touch targets (`min-h-[44px]` on mobile) for accessibility.

### C. Buttons
- **Primary Button:** Solid azure background with crisp white text. Includes a dynamic, soft gradient background.
- **Secondary / Ghost Button:** Sleek transparent background with thin border and clean hover scale animation.

---

## 5. Micro-Animations & Feedback

Dynamic interfaces feel alive. Keep transitions fast but organic:
- **Card Hover:** Subtle translate-up (`hover:-translate-y-0.5`) and smooth border glow transition (`transition-all duration-300`).
- **Lists / Checkbox Clicks:** Micro-scale bouncing using Framer Motion (`scale: 0.95` on tap, `scale: 1` on release).
- **Background Ambiance:** Soft, slow-moving radial background gradients in the corner (`animate-ambient-drift`) to elevate the dark-mode premium look without distracting from text.

---

## 6. Functional Page Layouts

To keep the system highly clean and usable while keeping every feature:

### A. Bible Reading Checklist
- **Heatmap:** Clean, grid-based layout with interactive tooltips showing daily completed chapters. Color shades scale smoothly from transparent to vibrant azure.
- **Passage List:** Grouped by days, each passage displayed with a large checklist item, clear typography, and a "Mark All Read" action button.
- **Inline Bible Reader:** Clean sheet overlay that slides from the bottom/right. Pure typography focus with adjustable font sizes, wide margins, and comfortable reading contrast.

### B. Group Chat
- **Message Bubbles:** Rounded bubbles with distinct left/right alignment. Sent messages use primary accent blue; received messages use secondary gray card.
- **Threads Panel:** Nesting threads neatly to side-drawers or sub-panes to keep the main chat clean.

### C. Admin Panel
- **Access Screen:** Simple password protection overlay, styled as a premium lock screen.
- **Roster & Content Grid:** Interactive tables with inline "Quick Edit" states rather than complex modal wizard trees, ensuring speed of entry.
