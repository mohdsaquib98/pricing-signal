import { useState, useCallback } from 'react'
import { AlertTriangle, TrendingUp, ShieldAlert } from 'lucide-react'
import type { SKUData } from '@/data/sampleData'
import { categorizeSKUs, getSummaryStats } from '@/lib/pricingEngine'
import type { CategorizedSKU } from '@/lib/pricingEngine'
import { getAllRecommendations } from '@/lib/gemini'
import type { PricingRecommendation } from '@/lib/gemini'
import { Header } from '@/components/Header'
import { SKUCard } from '@/components/SKUCard'
import { SectionPanel } from '@/components/SectionPanel'
import { ApiKeyInput } from '@/components/ApiKeyInput'
import { DataInput } from '@/components/DataInput'
import { Toast } from '@/components/Toast'

function App() {
  const [skuData, setSkuData] = useState<SKUData[]>([])
  const [categorized, setCategorized] = useState<CategorizedSKU[]>([])
  const [recommendations, setRecommendations] = useState<Map<string, PricingRecommendation>>(new Map())
  const [appliedSKUs, setAppliedSKUs] = useState<Set<string>>(new Set())
  const [apiKey, setApiKey] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [loadingSKU, setLoadingSKU] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '' })

  const handleDataLoaded = useCallback((data: SKUData[]) => {
    setSkuData(data)
    const result = categorizeSKUs(data)
    setCategorized(result)
    setRecommendations(new Map())
    setAppliedSKUs(new Set())
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!apiKey.trim()) {
      setToast({ visible: true, message: '⚠️ Please enter your Gemini API key first.' })
      return
    }
    if (categorized.length === 0) return

    setIsAnalyzing(true)
    setRecommendations(new Map())

    try {
      const recs = await getAllRecommendations(categorized, apiKey, (sku) => {
        setLoadingSKU(sku)
      })
      setRecommendations(recs)
      setToast({ visible: true, message: `✓ Generated recommendations for ${recs.size} SKUs` })
    } catch (err) {
      console.error('Analysis failed:', err)
      setToast({ visible: true, message: '⚠️ Analysis failed. Check your API key and try again.' })
    } finally {
      setIsAnalyzing(false)
      setLoadingSKU(null)
    }
  }, [apiKey, categorized])

  const handleApply = useCallback((sku: string, newPrice: number) => {
    setAppliedSKUs(prev => new Set(prev).add(sku))
    setToast({
      visible: true,
      message: `✓ ${sku} repriced to ₹${newPrice.toLocaleString('en-IN')}. Update queued for marketplace sync.`,
    })
  }, [])

  const stats = categorized.length > 0 ? getSummaryStats(categorized) : null

  return (
    <div className="min-h-screen bg-gray-50/80">
      <Header
        immediateCount={stats?.immediateCount ?? 0}
        optimizationCount={stats?.optimizationCount ?? 0}
        noActionCount={stats?.noActionCount ?? 0}
        total={skuData.length}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        hasRecommendations={recommendations.size > 0}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Data Input / Load */}
        <DataInput onDataLoaded={handleDataLoaded} hasData={skuData.length > 0} />

        {/* API Key Input — shown once data is loaded */}
        {skuData.length > 0 && (
          <div className="max-w-md">
            <ApiKeyInput apiKey={apiKey} onApiKeyChange={setApiKey} />
            <p className="text-xs text-muted-foreground mt-1.5">
              Get a free key at{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground"
              >
                Google AI Studio
              </a>
            </p>
          </div>
        )}

        {/* Triage Sections */}
        {stats && (
          <>
            {/* Section A: Immediate Action */}
            <SectionPanel
              title="Immediate Action Required"
              description="Buy Box lost — can reprice competitively above margin floor"
              count={stats.immediateCount}
              icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
              color="red"
              defaultOpen={true}
            >
              {stats.immediate.map(item => (
                <SKUCard
                  key={item.data.sku}
                  item={item}
                  recommendation={recommendations.get(item.data.sku)}
                  isLoadingRec={isAnalyzing && loadingSKU === item.data.sku}
                  onApply={handleApply}
                  isApplied={appliedSKUs.has(item.data.sku)}
                />
              ))}
            </SectionPanel>

            {/* Section B: Optimization */}
            <SectionPanel
              title="Optimization Opportunities"
              description="Buy Box held — room to increase price and improve margins"
              count={stats.optimizationCount}
              icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
              color="amber"
              defaultOpen={true}
            >
              {stats.optimization.map(item => (
                <SKUCard
                  key={item.data.sku}
                  item={item}
                  recommendation={recommendations.get(item.data.sku)}
                  isLoadingRec={isAnalyzing && loadingSKU === item.data.sku}
                  onApply={handleApply}
                  isApplied={appliedSKUs.has(item.data.sku)}
                />
              ))}
            </SectionPanel>

            {/* Section C: No Action */}
            <SectionPanel
              title="No Action Possible"
              description="Competitor pricing below margin floor — cannot match without losing money"
              count={stats.noActionCount}
              icon={<ShieldAlert className="w-5 h-5 text-gray-500" />}
              color="gray"
              defaultOpen={false}
            >
              {stats.noAction.map(item => (
                <SKUCard
                  key={item.data.sku}
                  item={item}
                  recommendation={recommendations.get(item.data.sku)}
                  isLoadingRec={isAnalyzing && loadingSKU === item.data.sku}
                  onApply={handleApply}
                  isApplied={appliedSKUs.has(item.data.sku)}
                />
              ))}
            </SectionPanel>
          </>
        )}
      </main>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onClose={() => setToast({ ...toast, visible: false })}
      />
    </div>
  )
}

export default App
