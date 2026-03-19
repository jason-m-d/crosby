import type { SpecialistDefinition } from '../types'

export const salesSpecialist: SpecialistDefinition = {
  id: 'sales',
  name: 'Sales',
  description: 'Handles store performance, revenue, and forecasts',
  tools: ['query_sales'],
  dataNeeded: ['sales'],
  triggerRules: {
    trigger_tools: ['query_sales'],
    trigger_data: ['sales'],
  },
  source: 'built_in',
  systemPromptSection: `SALES DATA:
- Use query_sales when Jason asks how stores are doing, about sales, revenue, or performance for any store or time period.
- Do not go to Gmail for sales data - it lives in the database.
- Compare net_sales to forecast_sales and budget_sales when available. Call out stores that are significantly under or over.
- If asked about a specific store, filter by store_number. If asked about a brand, filter by brand.`,
}
