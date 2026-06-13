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

Reply in this exact JSON format:
{"recommendedPrice": <number - must be >= ${data.marginFloor}>, "reasoning": "<1-2 sentence explanation>", "marginImpact": "<1 sentence about margin trade-off>"}`
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

Reply in this exact JSON format:
{"recommendedPrice": <number - must be >= ${data.marginFloor} and ideally < ${data.competitorPrice}>, "reasoning": "<1-2 sentence specific explanation with actual numbers>", "marginImpact": "<1 sentence about margin trade-off with numbers>"}`
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

Reply in this exact JSON format:
{"recommendedPrice": <number - must be >= ${data.marginFloor} and < ${data.competitorPrice}>, "reasoning": "<1-2 sentence specific explanation with actual numbers>", "marginImpact": "<1 sentence about margin improvement with numbers>"}`
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

  // Try to parse as JSON first
  let parsed: any = null
  
  try {
    // Try direct JSON parse
    parsed = JSON.parse(text)
  } catch {
    // Try to extract JSON from markdown code blocks or text
    const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/) || text.match(/\{[\s\S]*"recommendedPrice"[\s\S]*?\}/)
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[1] || jsonMatch[0])
      } catch {
        // JSON extraction failed, will fall back to text parsing
      }
    }
  }

  let recommendedPrice: number
  let reasoning: string
  let marginImpact: string

  if (parsed && typeof parsed.recommendedPrice === 'number') {
    // Successfully parsed JSON
    recommendedPrice = parsed.recommendedPrice
    reasoning = parsed.reasoning || 'No reasoning provided'
    marginImpact = parsed.marginImpact || 'N/A'
  } else {
    // Fallback: extract from text
    recommendedPrice = item.data.ourPrice
    reasoning = text.substring(0, 200)
    marginImpact = 'N/A'
    
    // Try to extract price from text (supports decimals)
    const priceMatch = text.match(/₹(\d+(?:,\d+)*(?:\.\d+)?)/g)
    if (priceMatch && priceMatch.length > 0) {
      const price = parseFloat(priceMatch[0].replace('₹', '').replace(/,/g, ''))
      if (!isNaN(price) && price >= item.data.marginFloor) {
        recommendedPrice = price
      }
    }
  }

  // Safety check: never allow recommendation below margin floor
  if (recommendedPrice < item.data.marginFloor) {
    recommendedPrice = item.data.marginFloor
    reasoning = `[Safety Override] Set to margin floor ₹${item.data.marginFloor}. ${reasoning}`
  }

  return {
    sku: item.data.sku,
    recommendedPrice,
    reasoning,
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
