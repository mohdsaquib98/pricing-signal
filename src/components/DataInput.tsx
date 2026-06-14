import { useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import type { SKUData } from '@/data/sampleData'
import { sampleData } from '@/data/sampleData'

interface DataInputProps {
  onDataLoaded: (data: SKUData[]) => void
  hasData: boolean
}

const sampleJSON = JSON.stringify(sampleData, null, 2)

export function DataInput({ onDataLoaded, hasData }: DataInputProps) {
  const [showInput, setShowInput] = useState(false)
  const [rawInput, setRawInput] = useState('')
  const [error, setError] = useState('')

  const handleLoadSample = () => {
    onDataLoaded(sampleData)
  }

  const parseCSV = (csv: string): SKUData[] => {
    const lines = csv.trim().split('\n')
    if (lines.length < 2) throw new Error('CSV must have header and at least one data row')
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const skuIdx = headers.indexOf('sku')
    const brandIdx = headers.indexOf('brand')
    const ourPriceIdx = headers.indexOf('ourprice')
    const compPriceIdx = headers.indexOf('competitorprice')
    const buyBoxIdx = headers.indexOf('buyboxstatus')
    const marginIdx = headers.indexOf('marginfloor')
    const changedIdx = headers.indexOf('lastchanged')
    
    if (skuIdx === -1 || ourPriceIdx === -1 || compPriceIdx === -1 || marginIdx === -1) {
      throw new Error('CSV must have columns: sku, ourPrice, competitorPrice, marginFloor')
    }
    
    return lines.slice(1).map((line, i) => {
      const cols = line.split(',').map(c => c.trim())
      return {
        sku: cols[skuIdx] || `SKU-${i + 1}`,
        brand: brandIdx !== -1 ? cols[brandIdx] : 'Unknown',
        ourPrice: Number(cols[ourPriceIdx]),
        competitorPrice: Number(cols[compPriceIdx]),
        buyBoxStatus: (buyBoxIdx !== -1 && cols[buyBoxIdx] === 'Won' ? 'Won' : 'Lost') as 'Won' | 'Lost',
        marginFloor: Number(cols[marginIdx]),
        lastChanged: changedIdx !== -1 ? cols[changedIdx] : 'Unknown',
      }
    })
  }

  const handleParseData = () => {
    try {
      setError('')
      let parsed: SKUData[]
      
      // Try CSV first (if contains comma-separated values)
      if (rawInput.includes(',') && rawInput.split('\n').length > 1) {
        parsed = parseCSV(rawInput)
      } else {
        // Try JSON
        const jsonData = JSON.parse(rawInput)
        if (!Array.isArray(jsonData)) {
          setError('Input must be a JSON array or CSV with headers.')
          return
        }
        parsed = jsonData.map((item: Record<string, unknown>) => {
          if (!item.sku || item.ourPrice === undefined || item.competitorPrice === undefined || item.marginFloor === undefined) {
            throw new Error(`Missing required fields in item: ${JSON.stringify(item).slice(0, 80)}`)
          }
          return {
            sku: String(item.sku),
            brand: String(item.brand || 'Unknown'),
            ourPrice: Number(item.ourPrice),
            competitorPrice: Number(item.competitorPrice),
            buyBoxStatus: (item.buyBoxStatus === 'Won' ? 'Won' : 'Lost') as 'Won' | 'Lost',
            marginFloor: Number(item.marginFloor),
            lastChanged: String(item.lastChanged || 'Unknown'),
          }
        })
      }
      
      onDataLoaded(parsed)
      setShowInput(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid input format.')
    }
  }

  if (hasData && !showInput) {
    return (
      <button
        onClick={() => setShowInput(true)}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
      >
        Load different data
      </button>
    )
  }

  if (!showInput && !hasData) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 px-6">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-6">
          <FileText className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">Load Pricing Data</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Start by loading your SKU pricing data. Use the sample dataset to explore the tool, or paste your own JSON.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleLoadSample}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-blue-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Load Sample Data (8 SKUs)
          </button>
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-gray-50 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Paste Custom JSON
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Paste JSON or CSV Data</h2>
        <button onClick={() => setShowInput(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>
      <textarea
        value={rawInput}
        onChange={e => setRawInput(e.target.value)}
        placeholder={`Paste JSON array or CSV with headers:\nsku,brand,ourPrice,competitorPrice,buyBoxStatus,marginFloor,lastChanged\nSKU-001,Brand A,1299,1199,Lost,1050,3 days ago`}
        className="w-full h-64 p-4 rounded-xl border border-border bg-white font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleParseData}
          className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Parse & Load
        </button>
        <button
          onClick={() => { setRawInput(sampleJSON) }}
          className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Fill Sample JSON
        </button>
      </div>
    </div>
  )
}
