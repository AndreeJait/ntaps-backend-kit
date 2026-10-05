# NTAPS Backend Kit

This repository contains two independent Node.js packages and their shared documentation:

- `ntaps/`: the reusable `ntaps` scaffolding CLI.
- `template-be/`: the runnable TypeScript service template.
- `docs/`: documentation for both packages.

Install and validate each package independently:

```bash
cd ntaps && npm install && npm run check
cd ../template-be && npm install && npm run check
```

Run the template:

```bash
cd template-be
cp .env.example .env
npm run dev:api
```

Generate code from inside `template-be`:

```bash
npm run generate -- feature --module invoices --name list-invoices
```

Install NTAPS globally and initialize another backend:

```bash
npm install -g ./ntaps
ntaps init cron-shop
ntaps init scheduled-jobs --type=cron
```
