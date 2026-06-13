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

  const handleParseJSON = () => {
    try {
      setError('')
      const parsed = JSON.parse(rawInput)
      if (!Array.isArray(parsed)) {
        setError('Input must be a JSON array of SKU objects.')
        return
      }
      const validated: SKUData[] = parsed.map((item: Record<string, unknown>) => {
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
      onDataLoaded(validated)
      setShowInput(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON input.')
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
        <h2 className="text-lg font-semibold text-foreground">Paste JSON Data</h2>
        <button onClick={() => setShowInput(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>
      <textarea
        value={rawInput}
        onChange={e => setRawInput(e.target.value)}
        placeholder={`Paste a JSON array, e.g.:\n${sampleJSON.slice(0, 300)}...`}
        className="w-full h-64 p-4 rounded-xl border border-border bg-white font-mono text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 mt-4">
        <button
          onClick={handleParseJSON}
          className="px-5 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Parse & Load
        </button>
        <button
          onClick={() => { setRawInput(sampleJSON) }}
          className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Fill Sample Data
        </button>
      </div>
    </div>
  )
}
