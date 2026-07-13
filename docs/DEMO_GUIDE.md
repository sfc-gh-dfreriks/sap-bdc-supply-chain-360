# Demo Guide — SAP BDC Supply Chain 360

A ~10-minute flow showing how the Snowflake × SAP Business Data Cloud
partnership turns locked-up SAP supply-chain data into a live, AI-powered app.
The full slide deck (with presenter notes) is in
[`SAP_Supply_Chain_360_Demo_Guide.pptx`](SAP_Supply_Chain_360_Demo_Guide.pptx).

## The story in one line
Two platforms, one governed data foundation: SAP BDC shares governed
supply-chain data products into Snowflake with **zero copy**; Snowflake adds AI,
apps and global reach on top — no pipelines, full SAP context preserved.

## 10-minute flow

1. **Open the app** — no setup; the data is already inside (bundled Native App).
2. **Overview** — plant KPIs, OEE and on-time delivery.
3. **Production / Inventory / Logistics** — drill into orders, stock, deliveries.
4. **Global supply-chain map** — supplier→plant→customer flows (deck.gl).
5. **Projects & Quality** — budget variance and supplier-quality scorecards.
6. **Ask the Agent** — type a question live into the `SAP_SC360_ANALYST_AGENT`:
   - "What is the monthly OEE trend by plant?"
   - "Which work centers are bottlenecks?"
   - "How do suppliers rank by quality score?"
7. **Show the generated SQL** — prove it's governed and explainable.
8. **Recap** — zero-ETL, governed, AI-ready, one-click distribution.

## Key points to land
- The data is **already inside Snowflake** — no ETL, no waiting.
- SAP **business context is preserved** (OEE, yield, on-time delivery, turns).
- The `SAP_SC360_ANALYST_AGENT` answers live, in plain English, with governed SQL.
- One definition → **three regions** (US, EMEA, APAC), each its own governed install.

## Do / Don't
- **Do** ask the agent a real question live; finish on the supply-chain map.
- **Don't** pre-load canned answers or drown the audience in architecture/SQL.
- **Don't** promise cross-region magic — each region is its own governed install.
