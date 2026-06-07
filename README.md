# SAAKO HOLY CHILD ACADEMY — Daily Fee Ledger & Auditing Portal (FEETRACK)

An advanced, highly-polished, and fully audit-compliant school fee ledger management system designed custom for **SAAKO HOLY CHILD ACADEMY** (Sawla). FEETRACK guarantees pristine compliance, prevents unverified entries, enforces cryptographic-lock multi-factor authentication, and manages daily checkout operations.

---

## 🎨 Visual Preview & Custom Shield

The application is themed around Saako Holy Child Academy's premium corporate identity, featuring the deep forest pine green, gold amber accents, and high-contrast dark slates. 

The interactive login page and header render the meticulously crafted school crest featuring:
* **The Book and Quill**: Promoting excellence and core scholarly development.
* **The Crossed Hoe & Cutlass**: Commemorating local agricultural heritages and hardworking discipline.
* **The Straw hearth-broom**: Symbolizing cleaning, service, and tidy presentation.
* **The Motto**: *"Holiness Is Our Key"* (Sawla, founded 2003).

---

## 🚀 Key Core Capabilities

### 1. Multi-Perspective Admin Dashboard
Switch dynamically between three custom-designed layouts:
* **Sleek Bento Grid Layout**: Rich overview depicting total collected fees (GHC), target expected collections, collections rate indicators, paid cohort numbers, pending warning counters, and interactive interactive SVG Weekly Cash-Flow trends with GHC vs. Volume transaction analysis.
* **Classrooms Gates Tracker**: Granular progress bars listing teacher names, cleared student percentages, total gathered sums per class, and direct indicators warning about low completion.
* **High-Priority Alerts Deck**: Real-time listing of students carrying unpaid daily records. Features a simulated **One-Touch dialing system** to notify parents or guardians instantly.

### 2. Multi-Factor Authentication (MFA Hub)
Includes actual security simulation representing enterprise-tier cryptography:
* **Administrative Locks**: Enforceable over high-level accounts from the dashboard.
* **TOTP Keys**: Generates individual Base32 cryptographic secret keys on-the-fly.
* **Interactive Dynamic OTP checks**: Secures sessions with 6-digit verification code entries.

### 3. Comprehensive Database Queries & Historical Auditing
* **Flexible Target Date Picker**: Allows back-testing and loading ledger inputs representing any previous days.
* **Advanced Multi-Filter Search**: Search pupils instantaneously by class category, specific text profiles, grade range levels (Nursery through JHS), or fee verification levels.

### 4. Interactive Report Export Center
* **Single-Click Document Exports**: Outputs formatted data sheets reflecting targeted filters.
* **Full Spreadsheet Simulation**: Prepares records perfectly suited for financial accounting desks and academic board reviews.

---

## 🛠️ Software Stack & Technologies

* **Framework**: React 19 (TypeScript Template)
* **Build System**: Vite 6.x
* **Animations**: Motion (formally Framer Motion - `motion/react`)
* **Styling**: Tailwind CSS (Native utility system)
* **Iconography**: Lucide React
* **Type Safety**: Strictly enforced, compiling green under `tsc --noEmit` linting checks.

---

## 💻 Developer Quickstart Directions

Follow these simple procedures to deploy or run the repository locally on your machine:

### 1. Clone & Set Up Directory
```bash
# Clone the repository
git clone https://github.com/your-username/saako-holy-child-feetrack.git

# Enter the root directory
cd saako-holy-child-feetrack
```

### 2. Install Package Dependencies
```bash
npm install
```

### 3. Run Development Server
Launches the hot-reloading development environment bound to port `3000`:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) inside your favorite web browser to preview the live portal.

### 4. Code Quality & Formatting
Launches rigorous TypeScript compiler tests to verify pristine structural properties:
```bash
npm run lint
```

### 5. Build for Production Compilation
Bundles static assets cleanly inside the `/dist` directory for lightning-fast edge CDN servers:
```bash
npm run build
```

---

## 🔒 Security & Safe Commit Audits

This repository complies with the highest standards of secure Git practices:
* **No hardcoded secrets**: All configuration is initialized standard or loaded from the template environment.
* **Ignore standards**: Key environment patterns (`.env*`), compilation logs (`*.log`), and large dependency caches (`node_modules/`, `dist/`) are safely listed inside `.gitignore` preventing accidental check-ins.

---

&copy; 2026 **SAAKO HOLY CHILD ACADEMY** &bull; Saako Holy Child Ledger Authority. All Rights Reserved.
