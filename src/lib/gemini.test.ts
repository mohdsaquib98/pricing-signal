import { describe, it, expect } from 'vitest'

// Test the price extraction logic
function extractPrice(text: string, marginFloor: number, currentPrice: number): number {
  let recommendedPrice = currentPrice
  
  const priceMatches = text.match(/₹\s*(\d+(?:,\d+)*(?:\.\d+)?)/g)
  if (priceMatches && priceMatches.length > 0) {
    const firstPrice = parseFloat(priceMatches[0].replace(/₹|,|\s/g, ''))
    if (!isNaN(firstPrice) && firstPrice >= marginFloor) {
      recommendedPrice = firstPrice
    }
  }
  
  return recommendedPrice
}

describe('Price Extraction', () => {
  it('extracts price from plain text', () => {
    const text = 'Recommend ₹1185 to win the Buy Box'
    const result = extractPrice(text, 1000, 1200)
    expect(result).toBe(1185)
  })

  it('extracts price with commas', () => {
    const text = 'Recommend ₹1,185 for better positioning'
    const result = extractPrice(text, 1000, 1200)
    expect(result).toBe(1185)
  })

  it('extracts price with decimal', () => {
    const text = 'Recommend ₹1185.50 for optimal pricing'
    const result = extractPrice(text, 1000, 1200)
    expect(result).toBe(1185.5)
  })

  it('rejects price below margin floor', () => {
    const text = 'Recommend ₹950 to be competitive'
    const result = extractPrice(text, 1000, 1200)
    expect(result).toBe(1200) // defaults to current price
  })

  it('defaults to current price when no price found', () => {
    const text = 'Keep the current price, no change needed'
    const result = extractPrice(text, 1000, 1200)
    expect(result).toBe(1200)
  })

  it('extracts first price when multiple mentioned', () => {
    const text = 'Reduce from ₹1200 to ₹1185, saving ₹15'
    const result = extractPrice(text, 1000, 1200)
    expect(result).toBe(1200) // first price is 1200
  })

  it('handles price with spaces after symbol', () => {
    const text = 'Recommend ₹ 1185 for the Buy Box'
    const result = extractPrice(text, 1000, 1200)
    expect(result).toBe(1185)
  })

  it('handles multi-line text', () => {
    const text = `Based on the analysis:
The competitor is at ₹1199
I recommend ₹1185
This gives us a ₹14 advantage`
    const result = extractPrice(text, 1000, 1200)
    expect(result).toBe(1185)
  })

  it('handles text without rupee symbol', () => {
    const text = 'Recommend 1185 for better positioning'
    const result = extractPrice(text, 1000, 1200)
    expect(result).toBe(1200) // no rupee symbol, defaults to current
  })
})
