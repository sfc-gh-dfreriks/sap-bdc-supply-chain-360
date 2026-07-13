# L0 — SAP BDC Standard Data Products (raw / bronze)

The **L0 (bronze)** layer is the set of **SAP Business Data Cloud Standard Data
Products** for supply chain, shared into Snowflake with **zero copy, no ETL**.
Each product lands in its own domain schema as an `A_*` object.

| L0 Schema | Object | Rows | SAP Meaning |
|-----------|--------|------|-------------|
| `BILL_OF_MATERIAL` | `A_BOM_ITEM` | 30 | Bill of material items |
| `BOM_GROUP` | `A_BOM_GROUP` | 5 | BOM group headers |
| `CHANGE_MASTER` | `A_CHANGE_MASTER` | 4 | Engineering change master |
| `CHANGE_RECORD` | `A_CHANGE_RECORD` | 4 | Engineering change records |
| `DELIVERY_MGMT_CONFIG` | `A_DELIVERY` | 25 | Outbound delivery documents |
| `MANUFACTURING_CODES` | `A_MANUFACTURING_KPI` | 45 | Plant manufacturing KPIs (OEE, scrap, throughput) |
| `MANUFACTURING_CODES` | `A_MATERIAL_STOCK` | 23 | Material stock / inventory positions |
| `MANUFACTURING_CODES` | `A_SUPPLIER_QUALITY` | 18 | Supplier quality scores & defects |
| `MANUFACTURING_CODES` | `A_SUPPLY_CHAIN_FLOWS` | 27 | Supply-chain material flows (geo) |
| `MANUFACTURING_CODES` | `A_SUPPLY_CHAIN_NODES` | 19 | Supply-chain nodes (plants, DCs, suppliers) |
| `PLANT` | `A_PLANT` | 5 | Plant master |
| `PRODUCTION_ORDER_CONFIRM` | `A_PROD_ORD_CONFIRMATION` | 20 | Production order confirmations |
| `PRODUCTION_VERSION` | `A_PRODUCTION_VERSION` | 8 | Production versions |
| `PROJECT` | `A_PROJECT` | 8 | Project master (PS) |
| `PROJECT_CONFIG_DATA` | `A_PROJECT_CONFIG` | 6 | Project configuration |
| `PROJECT_NETWORK` | `A_PROJECT_WBS` | 18 | WBS elements / project network |
| `SALES_BOM` | `A_SALES_BOM` | 9 | Sales bills of material |
| `SHIPPING_POINT` | `A_SHIPPING_POINT` | 6 | Shipping point master |
| `STORAGE_LOCATION` | `A_STORAGE_LOCATION` | 13 | Storage location master |
| `WORK_CENTER` | `A_WORK_CENTER` | 15 | Work center master |
| `WORK_CENTER` | `A_WORK_CENTER_CAPACITY` | 90 | Work center capacity |

## How L0 is provisioned

These objects are populated by **mounting the SAP BDC data-product shares**
(or Marketplace / internal listings). L0 is treated as **read-only bronze** —
all shaping happens in L2 (`ANALYTICS` dynamic tables, see
`03_l2_analytics_dynamic_tables.sql`) and the `APP_REF` serving views
(`02_appref_serving_views.sql`).
