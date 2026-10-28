# Standlist — ISC West exhibitor directory

Standlist turns the ISC West exhibitor directory into a searchable company list with profile details and an Excel export. It is built around the ISC West 2025 directory and includes a dated snapshot of **813 unique exhibitors**, collected on **8 October 2026**. This dataset is a snapshot, not a live directory feed.

**Live demo:** [standlist-upwork.onrender.com](https://standlist-upwork.onrender.com/)

## What it does

- Searches exhibitor records across all exported fields and paginates results.
- Collects exhibitor profile pages from the ISC West directory, following directory pagination and deduplicating records by their source exhibitor ID.
- Expands product categories and waits until the complete list is available before extracting it.
- Exports matching results to an XLSX workbook with 11 fields: Company Name, Website, email, LinkedIn URL, Why visit our stand, Description, Brands we will feature, Product Categories, Address, Stand(s) #, and Source url.
- Includes source URLs so profile data can be traced back to the directory.

The collected snapshot includes 813 unique exhibitors. Public profile details may be absent; missing values remain blank rather than being inferred. Collection is available through the local development API only. The deployed demo serves the bundled snapshot and returns `403` for collection requests.

## Run locally

Requirements: Node.js and npm.

```sh
npm ci
npx playwright install chromium
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

```sh
npm run build
npm test
```

## Deployment

The repository includes a root-level `Dockerfile` and `render.yaml` for a Render Docker web service. The current configuration uses Render's free plan, which may sleep while idle. Runtime records are stored under `.data` locally (the directory is ignored by Git); on an ephemeral service filesystem they may be lost after a restart or redeploy. The checked-in exhibitor snapshot is loaded at startup to provide the baseline dataset.
