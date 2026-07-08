# GridWorks IT — Helpdesk & Hardware Asset Tracker

A single-page enterprise IT operations tool that simulates a real helpdesk workflow: employees submit tickets, technicians triage them against live SLA timers, and every resolution automatically updates the company's hardware asset ledger.

**Live demo:** [https://huswas-jpg.github.io/it-helpdesk-tracker/](https://huswas-jpg.github.io/it-helpdesk-tracker/)

Built as a portfolio project for my Computer Information Systems program to demonstrate front-end engineering, IT service management (ITSM) concepts, and data-driven UI design.

![HTML5](https://img.shields.io/badge/HTML5-informational) ![CSS3](https://img.shields.io/badge/CSS3-informational) ![JavaScript](https://img.shields.io/badge/JavaScript%20(ES6+)-informational) ![Chart.js](https://img.shields.io/badge/Chart.js%204-informational)

---

## Features

### Three role-based workspaces
- **Employee Portal** — a simple ticket submission form with category and urgency selection, plus a live feed of the requester's recent tickets.
- **Technician Dashboard** — KPI cards, live charts, and a ticket queue filterable by status (New / In Progress / Resolved) and urgency (Low / Medium / Critical).
- **Asset Management Ledger** — a searchable, filterable table of 16 hardware assets (laptops, servers, network gear, peripherals) mapped to employees, with serial numbers, purchase dates, locations, and health status.

### Business logic
- **Automatic security escalation** — the form scans ticket text in real time for high-risk keywords ("server down", "security breach", "database error", "ransomware", etc.). A match overrides the employee's selected urgency, forces the ticket to CRITICAL, tags it "Auto-escalated," and fires an animated security alert banner on the Technician Dashboard.
- **Live SLA countdowns** — every open ticket displays a per-second countdown based on its priority tier (Critical = 1 h, Medium = 8 h, Low = 24 h), with a color-shifting progress rail (green → amber → red) that flips to **BREACHED** past the deadline.
- **Hardware–ticket correlation** — resolving a ticket linked to a Degraded asset automatically restores that asset's health to Healthy in the ledger, with a visual confirmation.

### Analytics
- Doughnut chart of open tickets by category (Hardware / Software / Network)
- Stacked bar chart of the open queue by urgency and status
- Live metric bars for **Average Time to Resolution** and **SLA Compliance Rate %**, recomputed from ticket history on every state change

### UI/UX
- Enterprise dark/light theme toggle (CSS custom properties; charts restyle live)
- Responsive layout down to mobile, keyboard-focus styles, `prefers-reduced-motion` support
- Toast notifications for every state change

## Try this demo flow

1. Open the **Employee Portal** and submit a ticket containing the phrase "database error" — watch the inline warning appear as you type.
2. Switch to the **Technician Dashboard** — the ticket lands at the top of the queue as CRITICAL with the security alert flashing and a 1-hour SLA counting down.
3. Resolve ticket **TKT-1083** (MacBook battery) — then check the **Asset Ledger**: Marcus Reed's MacBook Pro flips from Degraded to Healthy.
4. Toggle the theme and watch the charts restyle.

## Project structure

```
it-helpdesk-tracker/
├── index.html        # markup and page shell
├── css/
│   └── styles.css    # theme variables, layout, components, media queries
└── js/
    └── app.js        # state, business logic, rendering, and Chart.js setup
```

## Architecture notes

- **Separation of concerns** — markup (`index.html`), styling (`css/styles.css`), and behavior (`js/app.js`) are cleanly separated. The only external dependencies are Chart.js (via cdnjs) and Google Fonts.
- **In-memory state** — this is a front-end simulation with no backend. All tickets, assets, and metrics live in JavaScript state and reset on refresh (by design, so the demo always starts from a clean, populated dataset).
- **Single source of truth** — two arrays (`tickets`, `assets`) drive everything. On any change the app mutates those arrays, then a single `renderAll()` pass recomputes metrics and re-paints the tickets, ledger, and charts. SLA timers update on a 1-second interval without a full re-render.
- **Event delegation** — dynamically created ticket buttons are handled by one listener on the list container rather than per-button listeners, so behavior survives every re-render.

## Running locally

No build step. Clone the repo and open `index.html` in any modern browser, or serve it with:

```bash
python3 -m http.server 8000
```

> Note: because CSS and JS are in separate folders, open the project as a whole (keep `index.html`, `css/`, and `js/` together). Opening a copy of `index.html` on its own, without those folders beside it, will load it unstyled.

## What I'd add for production

- REST API + PostgreSQL for persistent tickets and assets
- Authentication with role-based access (employee vs. technician vs. admin)
- WebSocket push so multiple technicians see queue changes in real time
- Email / Slack notifications on escalation and SLA breach
- An audit log and reporting exports (CSV / PDF)
- Automated tests for the escalation and SLA logic

---

*Built by Nain · Computer Information Systems major*
*Developed with AI assistance; all logic reviewed and understood line-by-line.*
