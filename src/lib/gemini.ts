import type { CategorizedSKU } from './pricingEngine'

// Use Groq API endpoint
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

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

Return a JSON object with these exact keys:
{
  "recommendedPrice": number (must be >= ${data.marginFloor}),
  "reasoning": string (1-2 sentence explanation),
  "marginImpact": string (1 sentence about margin trade-off)
}`
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

Return a JSON object with these exact keys:
{
  "recommendedPrice": number (must be >= ${data.marginFloor} and ideally < ${data.competitorPrice}),
  "reasoning": string (1-2 sentence specific explanation with actual numbers),
  "marginImpact": string (1 sentence about margin trade-off with numbers)
}`
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

Return a JSON object with these exact keys:
{
  "recommendedPrice": number (must be >= ${data.marginFloor} and < ${data.competitorPrice}),
  "reasoning": string (1-2 sentence specific explanation with actual numbers),
  "marginImpact": string (1 sentence about margin improvement with numbers)
}`
}

export async function getRecommendation(
  item: CategorizedSKU,
  apiKey: string
): Promise<PricingRecommendation> {
  const prompt = buildPrompt(item)

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: 'json_object' }
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Groq API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()
  const text = result.choices?.[0]?.message?.content

  if (!text) {
    throw new Error('No response from Groq API')
  }

  let recommendedPrice: number
  let reasoning: string
  let marginImpact: string

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed.recommendedPrice === 'number') {
      recommendedPrice = parsed.recommendedPrice
      reasoning = parsed.reasoning || text
      marginImpact = parsed.marginImpact || 'N/A'
    } else {
      throw new Error('Invalid JSON structure')
    }
  } catch {
    // Fallback to text extraction
    recommendedPrice = item.data.ourPrice
    
    // Find all prices in the text
    const priceMatches = text.match(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/g)
    if (priceMatches && priceMatches.length > 0) {
      // Convert to numbers and filter valid ones (above margin floor)
      const validPrices = priceMatches
        .map((match: string) => parseFloat(match.replace(/₹|,|\s/g, '')))
        .filter((p: number) => !isNaN(p) && p >= item.data.marginFloor)
      
      // Take the last valid price (recommendations typically come at end)
      if (validPrices.length > 0) {
        recommendedPrice = validPrices[validPrices.length - 1]
      }
    }
    
    reasoning = text
    marginImpact = 'N/A'
  }

  // Calculate margin impact if not provided
  if (marginImpact === 'N/A') {
    const priceDiff = recommendedPrice - item.data.ourPrice
    if (priceDiff > 0) {
      marginImpact = `Margin increase: ₹${priceDiff}`
    } else if (priceDiff < 0) {
      marginImpact = `Margin decrease: ₹${Math.abs(priceDiff)}`
    } else {
      marginImpact = 'No change'
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
