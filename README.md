# SAP BDC Supply Chain 360

A reference implementation showing how to turn **SAP Business Data Cloud (BDC)
Standard Data Products** into a live, AI-powered supply-chain analytics app on
Snowflake — using a **medallion architecture**, a governed **semantic view**, a
**Cortex Agent**, and a self-contained **Snowflake Native App** (React + Express
on Snowpark Container Services), deployable across multiple regions.

Zero ETL. Zero copy. Full SAP business context preserved.

---

## What's in here

```
sap-bdc-supply-chain-360/
├── sql/                 Medallion + semantic + agent
│   ├── 01_l0_sources.md            L0 bronze — SAP BDC Standard Data Products (21)
│   ├── 02_appref_serving_views.sql Serving — APP_REF app-facing views
│   ├── 03_l2_analytics_dynamic_tables.sql  L2 gold — ANALYTICS dynamic tables
│   ├── 04_semantic_view.sql        SAP_SUPPLY_CHAIN_360 semantic view
│   └── 05_cortex_agent.sql         SAP_SC360_ANALYST_AGENT
├── app/                 Native App package (manifest, setup.sql, spec, snowflake.yml)
├── service/app/         React (Vite) client + Express server + Dockerfile
├── scripts/             build_and_push · migrate_data · deploy_native_app · create_org_listing
└── docs/                ARCHITECTURE.md · INSTALL.md · DEMO_GUIDE.md · demo deck (.pptx)
```

## Architecture at a glance

`SAP BDC Standard Data Products (L0)` → `ANALYTICS dynamic tables (L2)` →
`APP_REF serving views` → `SAP_SUPPLY_CHAIN_360 semantic view` →
`SAP_SC360_ANALYST_AGENT` + Native App "Ask the Agent".

Full detail (diagram + per-table content): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Quick start

- **Build the data platform + agent:** run `sql/02` → `sql/05` as
  `ACCOUNTADMIN`, then chat with `SAP_SC360_ANALYST_AGENT` in Snowflake
  Intelligence.
- **Deploy the Native App:** `build_and_push.sh` → `migrate_data.py` →
  `deploy_native_app.py` → `create_org_listing.py`.

Step-by-step runbook: [`docs/INSTALL.md`](docs/INSTALL.md).

## The app

A React dashboard covering **production, inventory, logistics, work centers,
projects, supplier quality and a live supply-chain map**, plus an **Ask the
Agent** page (Cortex Analyst over the bundled `SAP_SUPPLY_CHAIN_360` semantic
view).

## Live reference deployment

Deployed as a region-scoped organization listing
(`ORGDATACLOUD$INTERNAL$SUPPLY_CHAIN_360_ORG`) in three regions:

| Region | App URL |
|--------|---------|
| North America | https://arzht4-sfsenorthamerica-dfreriks-aws1-w2.snowflakecomputing.app |
| EMEA | https://ea3ite-sfseeurope-dfreriks-eu-demo.snowflakecomputing.app |
| APAC | https://eahbbd-sfseapac-sap-data-product-demo.snowflakecomputing.app |

> URLs are for the internal reference deployment; consumers get their own URL
> on install.

## Demo

See [`docs/DEMO_GUIDE.md`](docs/DEMO_GUIDE.md) and the slide deck
[`docs/SAP_Supply_Chain_360_Demo_Guide.pptx`](docs/SAP_Supply_Chain_360_Demo_Guide.pptx)
(15 slides + presenter notes).

## Security notes

- No credentials are committed. Scripts read key-pair connections from
  `~/.snowflake/connections.toml` by connection name; `.gitignore` excludes
  `*.p8`, `.env`, and `connections.toml`.
- L0 SAP BDC products are read-only zero-copy shares; the medallion only reads
  from them.

## Sibling project

Finance edition, same pattern: **sap-bdc-finance-360**.
