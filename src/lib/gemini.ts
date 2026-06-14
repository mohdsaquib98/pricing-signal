import type { CategorizedSKU } from './pricingEngine'

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent'

export interface PricingRecommendation {
  sku: string
  recommendedPrice: number
  reasoning: string
  marginImpact: string
}

function buildPrompt(item: CategorizedSKU): string {
  const { data, category, competitorBelowFloor } = item

  if (category === 'no-action') {
    return `You are a pricing strategist for an e-commerce company.

SKU: ${data.sku} (${data.brand})
Current Price: ₹${data.ourPrice}
Competitor Price: ₹${data.competitorPrice}
Buy Box Status: ${data.buyBoxStatus}
Margin Floor (minimum allowed price): ₹${data.marginFloor}
Last Price Change: ${data.lastChanged}
CRITICAL: Competitor price is BELOW our margin floor.

The competitor is pricing at ₹${data.competitorPrice}, which is below our margin floor of ₹${data.marginFloor}. We CANNOT price below ₹${data.marginFloor}.

Provide a brief strategic recommendation for this situation. Do NOT recommend pricing below ₹${data.marginFloor}.
Suggest alternative strategies (e.g., bundle offers, value positioning, wait for competitor price increase).

If you recommend a price change, clearly state the new price with the ₹ symbol (e.g., "Recommend ₹1200").`
  }

  if (category === 'immediate') {
    return `You are a pricing strategist for an e-commerce company. Your goal is to maximize Buy Box competitiveness while protecting margins.

SKU: ${data.sku} (${data.brand})
Current Price: ₹${data.ourPrice}
Competitor Price: ₹${data.competitorPrice}
Buy Box Status: LOST
Margin Floor (minimum allowed price): ₹${data.marginFloor}
Last Price Change: ${data.lastChanged}
Competitor below margin floor: ${competitorBelowFloor}

RULES:
1. NEVER recommend a price below ₹${data.marginFloor}
2. To win Buy Box, price should ideally be ₹5-15 below competitor
3. Balance competitiveness with margin preservation
4. Be specific with the exact price

Recommend a specific price with the ₹ symbol (e.g., "Recommend ₹1185").`
  }

  // Optimization
  return `You are a pricing strategist for an e-commerce company. This SKU currently holds the Buy Box.

SKU: ${data.sku} (${data.brand})
Current Price: ₹${data.ourPrice}
Competitor Price: ₹${data.competitorPrice}
Buy Box Status: WON
Margin Floor (minimum allowed price): ₹${data.marginFloor}
Last Price Change: ${data.lastChanged}

The competitor price is ₹${data.competitorPrice}, which is above our current price of ₹${data.ourPrice}. There may be room to increase our price closer to the competitor while maintaining Buy Box advantage.

RULES:
1. NEVER recommend a price below ₹${data.marginFloor}
2. Price should stay below competitor to maintain Buy Box
3. Maximize margin while keeping competitive edge
4. Be specific with the exact price

Recommend a specific price with the ₹ symbol (e.g., "Recommend ₹1350").`
}

export async function getRecommendation(
  item: CategorizedSKU,
  apiKey: string
): Promise<PricingRecommendation> {
  const prompt = buildPrompt(item)

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 300,
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text

  if (!text) {
    throw new Error('No response from Gemini API')
  }

  // Extract price from text - look for numbers after ₹ symbol or standalone numbers
  let recommendedPrice = item.data.ourPrice // default to current price
  
  // Try to find price in format ₹1,234 or ₹1234
  const priceMatches = text.match(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/g)
  if (priceMatches && priceMatches.length > 0) {
    // Take the first price mentioned
    const firstPrice = parseFloat(priceMatches[0].replace(/₹|,|\s/g, ''))
    if (!isNaN(firstPrice) && firstPrice >= item.data.marginFloor) {
      recommendedPrice = firstPrice
    }
  }

  // Calculate margin impact
  const priceDiff = recommendedPrice - item.data.ourPrice
  let marginImpact = 'No change'
  if (priceDiff > 0) {
    marginImpact = `Margin increase: ₹${priceDiff}`
  } else if (priceDiff < 0) {
    marginImpact = `Margin decrease: ₹${Math.abs(priceDiff)}`
  }

  // Safety check: never allow recommendation below margin floor
  if (recommendedPrice < item.data.marginFloor) {
    recommendedPrice = item.data.marginFloor
  }

  return {
    sku: item.data.sku,
    recommendedPrice,
    reasoning: text,
    marginImpact,
  }
}

export async function getAllRecommendations(
  items: CategorizedSKU[],
  apiKey: string,
  onProgress?: (sku: string) => void
): Promise<Map<string, PricingRecommendation>> {
  const results = new Map<string, PricingRecommendation>()

  // Process sequentially to respect rate limits on free tier
  for (const item of items) {
    try {
      onProgress?.(item.data.sku)
      const rec = await getRecommendation(item, apiKey)
      results.set(item.data.sku, rec)
    } catch (err) {
      console.error(`Failed to get recommendation for ${item.data.sku}:`, err)
      results.set(item.data.sku, {
        sku: item.data.sku,
        recommendedPrice: item.data.ourPrice,
        reasoning: `Unable to generate AI recommendation. Please review manually.`,
        marginImpact: 'N/A',
      })
    }
    // Small delay for rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  return results
}
