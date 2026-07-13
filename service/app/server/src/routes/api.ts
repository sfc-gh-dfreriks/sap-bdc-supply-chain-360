import { Router, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { runQuery } from "../services/snowflake.js";
import { callCortexAnalyst } from "../services/analyst.js";

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse comma-separated plant names from query string. */
function parsePlants(raw: unknown): string[] {
  if (typeof raw !== "string" || raw.trim() === "") return [];
  return raw.split(",").map((p) => p.trim()).filter(Boolean);
}

/**
 * Build a SQL IN clause with positional bind placeholders.
 * Returns { clause: "IN (?, ?, ?)", binds: [...values] }
 */
function inClause(values: string[]): { clause: string; binds: string[] } {
  const placeholders = values.map(() => "?").join(", ");
  return { clause: `IN (${placeholders})`, binds: values };
}

// ---------------------------------------------------------------------------
// GET /api/plants
// ---------------------------------------------------------------------------
router.get("/api/plants", async (_req: Request, res: Response) => {
  try {
    const rows = await runQuery(
      `SELECT DISTINCT PLANT_NAME
         FROM APP_DATA.DT_MANUFACTURING_KPI
        ORDER BY 1`
    );
    res.json(rows.map((r) => r.plant_name));
  } catch (err) {
    console.error("GET /api/plants error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/overview?plants=...
// ---------------------------------------------------------------------------
router.get("/api/overview", async (req: Request, res: Response) => {
  try {
    const plants = parsePlants(req.query.plants);
    if (plants.length === 0) return res.json({});

    const { clause, binds } = inClause(plants);

    const [kpis, oeeTrend, ordersByPlant, scrapRate, otdTrend] =
      await Promise.all([
        // KPI summary
        runQuery(
          `SELECT
             COUNT(DISTINCT o.PRODUCTION_ORDER)                          AS total_orders,
             SUM(o.CONFIRMED_QTY)                                       AS total_confirmed,
             ROUND(AVG(o.CYCLE_TIME_DAYS), 1)                           AS avg_cycle_time,
             ROUND(100.0 * SUM(o.YIELD_QTY) / NULLIF(SUM(o.PLANNED_QTY), 0), 1) AS yield_pct,
             ROUND(AVG(m.OEE_PCT), 1)                                   AS avg_oee,
             ROUND(AVG(m.ON_TIME_DELIVERY_PCT), 1)                      AS avg_otd,
             ROUND(AVG(m.SCRAP_RATE_PCT), 2)                            AS avg_scrap_rate,
             ROUND(AVG(m.INVENTORY_TURNOVER), 1)                        AS avg_inv_turn
           FROM APP_DATA.DT_PRODUCTION_ORDER_360 o
           JOIN APP_DATA.DT_MANUFACTURING_KPI m
             ON o.PLANT = m.PLANT
          WHERE o.PLANT_NAME ${clause}`,
          binds
        ),
        // OEE trend
        runQuery(
          `SELECT PERIOD_DATE, PLANT_NAME, ROUND(OEE_PCT, 1) AS oee
             FROM APP_DATA.DT_MANUFACTURING_KPI
            WHERE PLANT_NAME ${clause}
            ORDER BY PERIOD_DATE`,
          binds
        ),
        // Orders by plant
        runQuery(
          `SELECT PLANT_NAME, COUNT(*) AS orders
             FROM APP_DATA.DT_PRODUCTION_ORDER_360
            WHERE PLANT_NAME ${clause}
            GROUP BY PLANT_NAME
            ORDER BY orders DESC`,
          binds
        ),
        // Scrap rate by plant
        runQuery(
          `SELECT PLANT_NAME, ROUND(AVG(SCRAP_RATE_PCT), 2) AS scrap_rate
             FROM APP_DATA.DT_MANUFACTURING_KPI
            WHERE PLANT_NAME ${clause}
            GROUP BY PLANT_NAME
            ORDER BY PLANT_NAME`,
          binds
        ),
        // OTD trend
        runQuery(
          `SELECT PERIOD_DATE, PLANT_NAME, ROUND(ON_TIME_DELIVERY_PCT, 1) AS otd
             FROM APP_DATA.DT_MANUFACTURING_KPI
            WHERE PLANT_NAME ${clause}
            ORDER BY PERIOD_DATE`,
          binds
        ),
      ]);

    res.json({ kpis: kpis[0] ?? {}, oeeTrend, ordersByPlant, scrapRate, otdTrend });
  } catch (err) {
    console.error("GET /api/overview error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/production?plants=...
// ---------------------------------------------------------------------------
router.get("/api/production", async (req: Request, res: Response) => {
  try {
    const plants = parsePlants(req.query.plants);
    if (plants.length === 0) return res.json({});

    const { clause, binds } = inClause(plants);

    const [orders, kpis] = await Promise.all([
      runQuery(
        `SELECT *
           FROM APP_DATA.DT_PRODUCTION_ORDER_360
          WHERE PLANT_NAME ${clause}
          ORDER BY BASIC_START_DATE DESC`,
        binds
      ),
      runQuery(
        `SELECT *
           FROM APP_DATA.DT_MANUFACTURING_KPI
          WHERE PLANT_NAME ${clause}
          ORDER BY PERIOD_DATE`,
        binds
      ),
    ]);

    res.json({ orders, kpis });
  } catch (err) {
    console.error("GET /api/production error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/bom
// ---------------------------------------------------------------------------
router.get("/api/bom", async (_req: Request, res: Response) => {
  try {
    const rows = await runQuery(
      `SELECT * FROM APP_DATA.DT_BOM_EXPLOSION`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/bom error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/inventory?plants=...
// ---------------------------------------------------------------------------
router.get("/api/inventory", async (req: Request, res: Response) => {
  try {
    const plants = parsePlants(req.query.plants);
    if (plants.length === 0) return res.json([]);

    const { clause, binds } = inClause(plants);
    const rows = await runQuery(
      `SELECT *
         FROM APP_DATA.DT_INVENTORY_OVERVIEW
        WHERE PLANT_NAME ${clause}`,
      binds
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/inventory error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/logistics
// ---------------------------------------------------------------------------
router.get("/api/logistics", async (_req: Request, res: Response) => {
  try {
    const rows = await runQuery(
      `SELECT * FROM APP_DATA.DT_DELIVERY_PERFORMANCE`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/logistics error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/workcenter?plants=...
// ---------------------------------------------------------------------------
router.get("/api/workcenter", async (req: Request, res: Response) => {
  try {
    const plants = parsePlants(req.query.plants);
    if (plants.length === 0) return res.json([]);

    const { clause, binds } = inClause(plants);
    const rows = await runQuery(
      `SELECT *
         FROM APP_DATA.DT_WORK_CENTER_UTILIZATION
        WHERE PLANT_NAME ${clause}`,
      binds
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/workcenter error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/projects
// ---------------------------------------------------------------------------
router.get("/api/projects", async (_req: Request, res: Response) => {
  try {
    const rows = await runQuery(
      `SELECT * FROM APP_DATA.DT_PROJECT_STATUS`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/projects error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/geography?plants=...
// ---------------------------------------------------------------------------
router.get("/api/geography", async (req: Request, res: Response) => {
  try {
    const plants = parsePlants(req.query.plants);
    if (plants.length === 0) return res.json({});

    const { clause, binds } = inClause(plants);

    const [flows, nodes, plantCodesRows] = await Promise.all([
      runQuery(
        `SELECT *
           FROM APP_DATA.DT_SUPPLY_CHAIN_GEO`
      ),
      runQuery(
        `SELECT *
           FROM APP_DATA.A_SUPPLY_CHAIN_NODES`
      ),
      runQuery(
        `SELECT PLANT
           FROM APP_DATA.A_PLANT
          WHERE PLANT_NAME ${clause}`,
        binds
      ),
    ]);

    const plantCodes = plantCodesRows.map((r) => String(r.plant));
    res.json({ flows, nodes, plantCodes });
  } catch (err) {
    console.error("GET /api/geography error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/data-products
// ---------------------------------------------------------------------------

// Bundled in the image (see Dockerfile); overridable via env for local dev.
const DATA_PRODUCTS_PATH =
  process.env.DATA_PRODUCTS_PATH ??
  "/Users/dfreriks/Documents/SAP/SAP Skills/sap_data_products_full.json";
// CSN enrichment is optional — if the directory is absent, entities are null.
const CSN_DIR =
  process.env.CSN_DIR ?? "/Users/dfreriks/Documents/SAP/SAP Skills/csn_files";

interface DataProduct {
  TechnicalName: string;
  DisplayName: string;
  LineOfBusiness?: string | null;
  [key: string]: unknown;
}

router.get("/api/data-products", async (_req: Request, res: Response) => {
  try {
    const raw = fs.readFileSync(DATA_PRODUCTS_PATH, "utf-8");
    const data = JSON.parse(raw) as {
      metadata: unknown;
      data_products: DataProduct[];
      business_objects: unknown;
    };

    // Filter to Supply Chain LOB
    const products = data.data_products.filter(
      (dp) => dp.LineOfBusiness === "Supply Chain"
    );

    // Attempt to attach CSN entity details for each product
    const enriched = products.map((dp) => {
      const techName = dp.TechnicalName; // e.g. "sap-bdc-s4-pp-ManufacturingOrder-v1"
      const csnFileName = `${techName}.csn.json`;
      const csnPath = path.join(CSN_DIR, csnFileName);

      let entities: unknown = null;
      if (fs.existsSync(csnPath)) {
        try {
          const csnRaw = fs.readFileSync(csnPath, "utf-8");
          entities = JSON.parse(csnRaw);
        } catch {
          // skip malformed files
        }
      }

      return { ...dp, _csn: entities };
    });

    res.json(enriched);
  } catch (err) {
    console.error("GET /api/data-products error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/ontology
// ---------------------------------------------------------------------------
router.get("/api/ontology", async (_req: Request, res: Response) => {
  try {
    const [nodes, flows, bom, suppliers, production] = await Promise.all([
      runQuery(`SELECT * FROM APP_DATA.A_SUPPLY_CHAIN_NODES`),
      runQuery(`SELECT * FROM APP_DATA.DT_SUPPLY_CHAIN_GEO`),
      runQuery(`SELECT * FROM APP_DATA.DT_BOM_EXPLOSION`),
      runQuery(`SELECT * FROM APP_DATA.DT_SUPPLIER_QUALITY`),
      runQuery(`SELECT DISTINCT PLANT_NAME, MATERIAL_DESC FROM APP_DATA.DT_PRODUCTION_ORDER_360`),
    ]);
    res.json({ nodes, flows, bom, suppliers, production });
  } catch (err) {
    console.error("GET /api/ontology error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/optimization?plants=...
// ---------------------------------------------------------------------------
router.get("/api/optimization", async (req: Request, res: Response) => {
  try {
    const plants = parsePlants(req.query.plants);
    if (plants.length === 0) return res.json({});

    const { clause, binds } = inClause(plants);

    const [kpiTrends, supplierQuality, deliveryPerf, productionEff] = await Promise.all([
      runQuery(
        `SELECT PLANT_NAME, PERIOD_DATE,
                ROUND(OEE_PCT, 1) AS oee,
                ROUND(SCRAP_RATE_PCT, 2) AS scrap_rate,
                ROUND(ON_TIME_DELIVERY_PCT, 1) AS otd,
                ROUND(INVENTORY_TURNOVER, 1) AS inv_turnover
           FROM APP_DATA.DT_MANUFACTURING_KPI
          WHERE PLANT_NAME ${clause}
          ORDER BY PERIOD_DATE`,
        binds
      ),
      runQuery(
        `SELECT SUPPLIER_NAME, MATERIAL_DESC,
                ROUND(AVG(DEFECT_RATE_PCT), 2) AS avg_defect_rate,
                ROUND(AVG(ON_TIME_DELIVERY_PCT), 1) AS avg_otd,
                ROUND(AVG(QUALITY_SCORE), 1) AS avg_quality_score
           FROM APP_DATA.DT_SUPPLIER_QUALITY
          GROUP BY SUPPLIER_NAME, MATERIAL_DESC
          ORDER BY avg_quality_score`
      ),
      runQuery(
        `SELECT SHIPPING_POINT_DESC,
                COUNT(*) AS total_deliveries,
                SUM(CASE WHEN ON_TIME_FLAG = 'Y' THEN 1 ELSE 0 END) AS on_time_count,
                ROUND(100.0 * SUM(CASE WHEN ON_TIME_FLAG = 'Y' THEN 1 ELSE 0 END) / COUNT(*), 1) AS otd_pct,
                ROUND(AVG(DELAY_DAYS), 1) AS avg_delay
           FROM APP_DATA.DT_DELIVERY_PERFORMANCE
          GROUP BY SHIPPING_POINT_DESC
          ORDER BY otd_pct DESC`
      ),
      runQuery(
        `SELECT PLANT_NAME, MATERIAL_DESC,
                COUNT(*) AS order_count,
                ROUND(AVG(CYCLE_TIME_DAYS), 1) AS avg_cycle_time,
                ROUND(100.0 * SUM(YIELD_QTY) / NULLIF(SUM(PLANNED_QTY), 0), 1) AS yield_pct,
                ROUND(100.0 * SUM(SCRAP_QTY) / NULLIF(SUM(PLANNED_QTY), 0), 2) AS scrap_pct
           FROM APP_DATA.DT_PRODUCTION_ORDER_360
          WHERE PLANT_NAME ${clause}
          GROUP BY PLANT_NAME, MATERIAL_DESC
          ORDER BY yield_pct`,
        binds
      ),
    ]);

    res.json({ kpiTrends, supplierQuality, deliveryPerf, productionEff });
  } catch (err) {
    console.error("GET /api/optimization error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// GET /api/forecasting?plants=...
// ---------------------------------------------------------------------------
router.get("/api/forecasting", async (req: Request, res: Response) => {
  try {
    const plants = parsePlants(req.query.plants);
    if (plants.length === 0) return res.json({});

    const { clause, binds } = inClause(plants);

    const [demandHistory, kpiTrends, supplierTrends] = await Promise.all([
      runQuery(
        `SELECT PLANT_NAME, MATERIAL_DESC, BASIC_START_DATE, PLANNED_QTY, CONFIRMED_QTY, ORDER_STATUS
           FROM APP_DATA.DT_PRODUCTION_ORDER_360
          WHERE PLANT_NAME ${clause}
          ORDER BY BASIC_START_DATE`,
        binds
      ),
      runQuery(
        `SELECT PLANT_NAME, PERIOD_DATE, OEE_PCT, ON_TIME_DELIVERY_PCT, SCRAP_RATE_PCT, INVENTORY_TURNOVER
           FROM APP_DATA.DT_MANUFACTURING_KPI
          WHERE PLANT_NAME ${clause}
          ORDER BY PLANT_NAME, PERIOD_DATE`,
        binds
      ),
      runQuery(
        `SELECT SUPPLIER_NAME, MATERIAL_DESC, PERIOD_DATE, QUALITY_SCORE, ON_TIME_DELIVERY_PCT, DEFECT_RATE_PCT
           FROM APP_DATA.DT_SUPPLIER_QUALITY
          ORDER BY SUPPLIER_NAME, PERIOD_DATE`
      ),
    ]);

    res.json({ demandHistory, kpiTrends, supplierTrends });
  } catch (err) {
    console.error("GET /api/forecasting error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// POST /api/analyst
// ---------------------------------------------------------------------------
router.post("/api/analyst", async (req: Request, res: Response) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }
    const result = await callCortexAnalyst(messages);
    res.json(result);
  } catch (err) {
    console.error("POST /api/analyst error:", err);
    res.status(500).json({ error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// POST /api/analyst/run-sql — execute SQL generated by Cortex Analyst
// Safety: only allows SELECT or WITH ... SELECT statements
// ---------------------------------------------------------------------------
router.post("/api/analyst/run-sql", async (req: Request, res: Response) => {
  try {
    const { sql } = req.body;
    if (typeof sql !== "string" || !sql.trim()) {
      return res.status(400).json({ error: "sql string is required" });
    }
    // Strip leading comments and whitespace, then check first keyword
    const stripped = sql
      .replace(/--[^\n]*\n/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim();
    const firstWord = stripped.split(/\s+/)[0]?.toUpperCase();
    if (firstWord !== "SELECT" && firstWord !== "WITH") {
      return res
        .status(400)
        .json({ error: "Only SELECT or WITH queries are allowed" });
    }
    const rows = await runQuery(sql);
    res.json({ rows });
  } catch (err) {
    console.error("POST /api/analyst/run-sql error:", err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
