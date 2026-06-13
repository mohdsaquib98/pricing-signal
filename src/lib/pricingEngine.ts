import type { SKUData } from '@/data/sampleData'

export type ActionCategory = 'immediate' | 'optimization' | 'no-action'

export interface CategorizedSKU {
  data: SKUData
  category: ActionCategory
  reason: string
  priceDelta: number // our price - competitor price
  marginHeadroom: number // our price - margin floor
  competitorBelowFloor: boolean
}

export function categorizeSKUs(skus: SKUData[]): CategorizedSKU[] {
  return skus.map(categorizeSKU)
}

function categorizeSKU(data: SKUData): CategorizedSKU {
  const priceDelta = data.ourPrice - data.competitorPrice
  const marginHeadroom = data.ourPrice - data.marginFloor
  const competitorBelowFloor = data.competitorPrice < data.marginFloor

  if (data.buyBoxStatus === 'Lost' && competitorBelowFloor) {
    return {
      data,
      category: 'no-action',
      reason: `Competitor price (₹${data.competitorPrice}) is below our margin floor (₹${data.marginFloor}). Cannot match without losing money.`,
      priceDelta,
      marginHeadroom,
      competitorBelowFloor,
    }
  }

  if (data.buyBoxStatus === 'Lost' && !competitorBelowFloor) {
    return {
      data,
      category: 'immediate',
      reason: `Buy Box lost. We are ₹${priceDelta} above competitor. Room to reprice with ₹${data.competitorPrice - data.marginFloor} margin protection.`,
      priceDelta,
      marginHeadroom,
      competitorBelowFloor,
    }
  }

  // Buy Box Won - check for optimization opportunity
  if (data.buyBoxStatus === 'Won') {
    const headroomAboveCompetitor = data.competitorPrice - data.ourPrice
    const headroomAboveFloor = data.ourPrice - data.marginFloor
    const canIncreasePrice = headroomAboveCompetitor > 0 && headroomAboveFloor > 50

    if (canIncreasePrice) {
      return {
        data,
        category: 'optimization',
        reason: `Buy Box held. Competitor is ₹${headroomAboveCompetitor} higher. Potential to increase price and improve margin.`,
        priceDelta,
        marginHeadroom,
        competitorBelowFloor,
      }
    }
  }

  return {
    data,
    category: 'optimization',
    reason: `Currently competitive. Monitoring recommended.`,
    priceDelta,
    marginHeadroom,
    competitorBelowFloor,
  }
}

export function getSummaryStats(categorized: CategorizedSKU[]) {
  const immediate = categorized.filter(s => s.category === 'immediate')
  const optimization = categorized.filter(s => s.category === 'optimization')
  const noAction = categorized.filter(s => s.category === 'no-action')

  const potentialRevenueSaved = immediate.reduce((sum, s) => sum + s.priceDelta, 0)

  return {
    total: categorized.length,
    immediateCount: immediate.length,
    optimizationCount: optimization.length,
    noActionCount: noAction.length,
    potentialRevenueSaved,
    immediate,
    optimization,
    noAction,
  }
}
