# Parish Ledger Finance ERP

Frontend-only Catholic Church finance management ERP prototype built with React, Vite, JavaScript, React Router, Recharts, Lucide, React Hook Form, Zod, and React Hot Toast.

## Run locally

```powershell
cd "D:\Finance ERP"
npm install
npm run dev
```

Quality checks:

```powershell
npm test
npm run lint
npm run build
```

## Demo accounts

| Role | Email | Password |
|---|---|---|
| ERP Owner | `owner@parishledger.org` | `owner-demo` |
| Parish Administrator | `admin.stmary@parishledger.org` | `parish-demo` |
| Centre Administrator | `admin.central@parishledger.org` | `centre-demo` |
| Group Treasurer | `treasurer.stpeter@parishledger.org` | `group-demo` |

Use the role-specific account buttons on the login screen to fill credentials quickly.

## Architecture

- `src/data/mockData.js` contains related parish, centre, group, member, contribution, and demo-account records.
- `src/services/storageService.js` persists mock records under `finance-erp-mock-data` in `localStorage`.
- `src/services/dataService.js` provides scoped list/read/create/update/delete operations and cascades child records when a parent is deleted.
- `src/services/scopeService.js` enforces tenant and hierarchy permissions.
- `src/hooks/useRecords.js` connects scoped service records to React components.
- Role dashboards and routes are split by hierarchy level while sharing the same design system.

The ERP Owner sidebar includes **Reset demo data**, which restores the original records after a confirmation prompt.

## Scope and limitations

This prototype has no backend, database server, authentication server, payment gateway, M-Pesa integration, banking integration, or automated reconciliation. Authentication and data persistence are simulated in the browser with mock accounts and `localStorage`.

Reports are simulated frontend downloads: plain-text summaries, CSV exports, and browser print layouts. Production integration should replace the service implementation with Node.js/Express APIs and tenant-specific database repositories without changing the dashboard contracts.
