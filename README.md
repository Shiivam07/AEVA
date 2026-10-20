# AEVA | Multi-Brand Business Operations & Financial Management Platform

A high-performance, full-stack enterprise platform designed for managing multi-brand business workflows, team assignments, ordering accounts, custom tax receipts, daily task pipelines, financial tracking, and partner profit distributions.

---

## 🌟 Key Highlights

- **Multi-Brand Operations**: Centralized control for multiple independent brands with dedicated ordering accounts, product catalogs, and custom brand configurations.
- **Official Commercial Tax Invoices & Receipt Engine**:
  - Full GST/CIN/PAN legal compliance for corporate operations.
  - 4 professional design presets: *Corporate Tax Invoice*, *Modern Minimal*, *Thermal POS Slip*, and *Commercial Boutique*.
  - Live auto-calculation for Order Quantity × Price per Order.
  - Support for **Estimated Pricing** and **Price Not Yet Decided** (proforma/quote pending).
  - Explicit `N/A` handling for unassigned SKUs/Product Codes.
  - Printable and downloadable (HTML / PDF export).
- **Automated Workflow & Task Engine**:
  - 9-state task lifecycle with role-based transitions.
  - Daily tasks management with kanban and timeline views.
  - Collaborator invites, permission gates, and activity tracking.
- **Financial Architecture**:
  - Real-time revenue, expense, and net profit ledger.
  - Automated partner profit distributions and settlement histories.
  - Rupee (`₹`) native currency formatting with Indian numbering format.
- **Enterprise Security**:
  - JWT token authentication with secure refresh mechanics.
  - Role-Based Access Control (RBAC) for Business Owners and Collaborators.
  - Anti-autofill credential leak protection on registration workflows.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Query, React Hook Form, Zod.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL.
- **Infrastructure**: Docker & Docker Compose.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Docker & Docker Compose (or local PostgreSQL)

### 1. Clone the repository
```bash
git clone <YOUR_REPOSITORY_URL>
cd CHARCHIT
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Start Database
```bash
docker compose up -d
```

### 4. Setup Backend
```bash
cd server
npm install
npx prisma db push
npx prisma db seed
npm run dev
```

### 5. Setup Frontend
```bash
cd ../client
npm install
npm run dev
```

Access the frontend at `http://localhost:5173` and backend API at `http://localhost:4000`.

---

## 👤 Author & Ownership

Crafted with ❤️ by **Shivam Chaurasia** (`chaurasiashivam400@gmail.com`).
