import type { CategorizedSKU } from './pricingEngine'

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const RATE_LIMIT_DELAY_MS = 500

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PricingRecommendation {
  sku: string
  recommendedPrice: number
  reasoning: string
  marginImpact: string
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

function buildNoActionPrompt(data: CategorizedSKU['data']): string {
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

function buildImmediateActionPrompt(item: CategorizedSKU): string {
  const { data, competitorBelowFloor } = item
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
2. Analyze the competitive situation and recommend the optimal price
3. Balance competitiveness with margin preservation intelligently
4. Be specific with the exact price

Return a JSON object with these exact keys:
{
  "recommendedPrice": number (must be >= ${data.marginFloor}),
  "reasoning": string (1-2 sentence specific explanation with actual numbers),
  "marginImpact": string (1 sentence about margin trade-off with numbers)
}`
}

function buildOptimizationPrompt(data: CategorizedSKU['data']): string {
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
2. Analyze the competitive situation and recommend the optimal price
3. Maximize margin while keeping competitive edge
4. Be specific with the exact price

Return a JSON object with these exact keys:
{
  "recommendedPrice": number (must be >= ${data.marginFloor}),
  "reasoning": string (1-2 sentence specific explanation with actual numbers),
  "marginImpact": string (1 sentence about margin improvement with numbers)
}`
}

function buildPrompt(item: CategorizedSKU): string {
  switch (item.category) {
    case 'no-action':
      return buildNoActionPrompt(item.data)
    case 'immediate':
      return buildImmediateActionPrompt(item)
    case 'optimization':
      return buildOptimizationPrompt(item.data)
  }
}

// ============================================================================
// RESPONSE PARSING & VALIDATION
// ============================================================================

function parseJSONResponse(text: string): { recommendedPrice: number; reasoning: string; marginImpact: string } | null {
  try {
    const parsed = JSON.parse(text)
    if (typeof parsed.recommendedPrice === 'number') {
      return {
        recommendedPrice: parsed.recommendedPrice,
        reasoning: parsed.reasoning || text,
        marginImpact: parsed.marginImpact || 'N/A',
      }
    }
  } catch {
    // JSON parsing failed
  }
  return null
}

function extractPriceFromText(text: string, marginFloor: number): number {
  const priceMatches = text.match(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/g)
  if (!priceMatches || priceMatches.length === 0) {
    return 0
  }

  const validPrices = priceMatches
    .map((match: string) => parseFloat(match.replace(/₹|,|\s/g, '')))
    .filter((p: number) => !isNaN(p) && p >= marginFloor)

  return validPrices.length > 0 ? validPrices[validPrices.length - 1] : 0
}

function calculateMarginImpact(recommendedPrice: number, currentPrice: number): string {
  const priceDiff = recommendedPrice - currentPrice
  if (priceDiff > 0) {
    return `Margin increase: ₹${priceDiff}`
  } else if (priceDiff < 0) {
    return `Margin decrease: ₹${Math.abs(priceDiff)}`
  }
  return 'No change'
}

function applySafetyOverride(
  recommendedPrice: number,
  marginFloor: number,
  reasoning: string
): { price: number; reasoning: string } {
  if (recommendedPrice < marginFloor) {
    return {
      price: marginFloor,
      reasoning: `[Safety Override] Set to margin floor ₹${marginFloor}. ${reasoning}`,
    }
  }
  return { price: recommendedPrice, reasoning }
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

async function callGroqAPI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1000,
      response_format: { type: 'json_object' },
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

  return text
}

export async function getRecommendation(
  item: CategorizedSKU,
  apiKey: string
): Promise<PricingRecommendation> {
  // Build prompt
  const prompt = buildPrompt(item)

  // Call Groq API
  const text = await callGroqAPI(prompt, apiKey)

  // Parse response
  const jsonResult = parseJSONResponse(text)
  let recommendedPrice: number
  let reasoning: string
  let marginImpact: string

  if (jsonResult) {
    recommendedPrice = jsonResult.recommendedPrice
    reasoning = jsonResult.reasoning
    marginImpact = jsonResult.marginImpact
  } else {
    // Fallback: extract price from text
    recommendedPrice = extractPriceFromText(text, item.data.marginFloor) || item.data.ourPrice
    reasoning = text
    marginImpact = 'N/A'
  }

  // Calculate margin impact if not provided
  if (marginImpact === 'N/A') {
    marginImpact = calculateMarginImpact(recommendedPrice, item.data.ourPrice)
  }

  // Apply safety override
  const safetyResult = applySafetyOverride(recommendedPrice, item.data.marginFloor, reasoning)

  return {
    sku: item.data.sku,
    recommendedPrice: safetyResult.price,
    reasoning: safetyResult.reasoning,
    marginImpact,
  }
}

export async function getAllRecommendations(
  items: CategorizedSKU[],
  apiKey: string,
  onProgress?: (sku: string) => void
): Promise<Map<string, PricingRecommendation>> {
  const results = new Map<string, PricingRecommendation>()

  // Process sequentially to respect rate limits
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
        reasoning: 'Unable to generate AI recommendation. Please review manually.',
        marginImpact: 'N/A',
      })
    }
    // Rate limiting delay
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS))
  }

  return results
}
