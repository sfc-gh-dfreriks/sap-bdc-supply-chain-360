# SAP Supply Chain 360 (Native App)

An interactive Supply Chain 360 dashboard — a React (Vite) + Express application
hosted in **Snowpark Container Services** — with an **Ask the Agent** page backed
by Cortex Analyst. Covers production, inventory, logistics, work centers, projects,
supplier quality, a supply-chain map, and BDC data products.

**Self-contained:** the Supply Chain dataset and the Cortex Analyst semantic view
are **bundled inside the app** — no data setup or reference binding is required.

## Getting started (consumer)

1. **Install the app** and grant the requested privileges (Create Compute Pool,
   Bind Service Endpoint, Create Warehouse) — auto-granted with manifest v2.
2. The app auto-provisions a compute pool, an XS warehouse, and the web service.
   Check status:
   ```sql
   CALL core.get_service_status();
   ```
3. **Open the dashboard:**
   ```sql
   CALL core.app_url();
   ```

## Enabling "Ask the Agent" (Cortex Analyst)

The semantic view ships with the app; you only need to grant it Cortex access
(run as ACCOUNTADMIN):

```sql
GRANT DATABASE ROLE SNOWFLAKE.CORTEX_USER TO APPLICATION SUPPLY_CHAIN_360_APP;
```

## Lifecycle controls

```sql
CALL core.suspend_service();   -- save compute
CALL core.resume_service();
CALL core.get_service_status();
CALL core.get_service_logs('0', 'sc360');
CALL core.selftest();          -- verify bundled data resolves
```
