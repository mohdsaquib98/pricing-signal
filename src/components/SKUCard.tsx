import { useState } from 'react'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  ShieldAlert,
  TrendingUp,
  Sparkles,
  Check,
  Loader2,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { CategorizedSKU } from '@/lib/pricingEngine'
import type { PricingRecommendation } from '@/lib/groq'

interface SKUCardProps {
  item: CategorizedSKU
  recommendation?: PricingRecommendation
  isLoadingRec: boolean
  onApply: (sku: string, newPrice: number) => void
  isApplied: boolean
}

export function SKUCard({ item, recommendation, isLoadingRec, onApply, isApplied }: SKUCardProps) {
  const [showDetails, setShowDetails] = useState(false)
  const { data, category, priceDelta } = item

  const categoryConfig = {
    immediate: {
      border: 'border-l-red-500',
      badge: 'bg-red-50 text-red-700',
      badgeLabel: 'Immediate Action',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
    },
    optimization: {
      border: 'border-l-amber-400',
      badge: 'bg-amber-50 text-amber-700',
      badgeLabel: 'Optimization',
      icon: TrendingUp,
      iconColor: 'text-amber-500',
    },
    'no-action': {
      border: 'border-l-gray-400',
      badge: 'bg-gray-100 text-gray-600',
      badgeLabel: 'No Action Possible',
      icon: ShieldAlert,
      iconColor: 'text-gray-500',
    },
  }

  const config = categoryConfig[category]
  const Icon = config.icon

  return (
    <div
      className={`bg-white rounded-xl border border-border border-l-4 ${config.border} shadow-sm hover:shadow-md transition-all duration-200 ${isApplied ? 'opacity-60' : ''}`}
    >
      <div className="p-4 sm:p-5">
        {/* Top Row: SKU info + Badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Icon className={`w-5 h-5 ${config.iconColor} shrink-0`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{data.sku}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${config.badge}`}>
                  {config.badgeLabel}
                </span>
                {isApplied && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-700 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Repriced
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{data.brand}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {data.lastChanged}
            </div>
          </div>
        </div>

        {/* Price Comparison Bar */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <PriceBlock
            label="Our Price"
            value={data.ourPrice}
            highlight={false}
          />
          <PriceBlock
            label="Competitor"
            value={data.competitorPrice}
            highlight={false}
            delta={priceDelta}
          />
          <PriceBlock
            label="Margin Floor"
            value={data.marginFloor}
            highlight={item.competitorBelowFloor}
            isFloor
          />
        </div>

        {/* Competitor Below Floor Warning */}
        {item.competitorBelowFloor && (
          <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              <strong>Margin protection active.</strong> Competitor price ₹{data.competitorPrice} is below margin floor ₹{data.marginFloor}. Cannot match.
            </span>
          </div>
        )}

        {/* AI Recommendation */}
        {isLoadingRec && (
          <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating AI recommendation...
          </div>
        )}

        {recommendation && !isLoadingRec && (
          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 mb-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-800">AI Recommendation</span>
            </div>

            {category !== 'no-action' && (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl font-bold text-foreground">
                  {formatCurrency(recommendation.recommendedPrice)}
                </span>
                {recommendation.recommendedPrice < data.ourPrice ? (
                  <span className="flex items-center gap-0.5 text-sm text-red-600 font-medium">
                    <ArrowDown className="w-3.5 h-3.5" />
                    {formatCurrency(data.ourPrice - recommendation.recommendedPrice)} reduction
                  </span>
                ) : recommendation.recommendedPrice > data.ourPrice ? (
                  <span className="flex items-center gap-0.5 text-sm text-green-600 font-medium">
                    <ArrowUp className="w-3.5 h-3.5" />
                    {formatCurrency(recommendation.recommendedPrice - data.ourPrice)} increase
                  </span>
                ) : null}
              </div>
            )}

            <p className="text-sm text-gray-700 leading-relaxed mb-1">{recommendation.reasoning}</p>
            <p className="text-xs text-gray-500 italic">{recommendation.marginImpact}</p>

            {/* Apply Button */}
            {!isApplied && category !== 'no-action' && (
              <button
                onClick={() => onApply(data.sku, recommendation.recommendedPrice)}
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 active:scale-[0.98] transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                Apply ₹{recommendation.recommendedPrice}
              </button>
            )}

            {isApplied && (
              <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 text-green-700 text-sm font-medium w-fit">
                <Check className="w-4 h-4" />
                Price updated to {formatCurrency(recommendation.recommendedPrice)}
              </div>
            )}
          </div>
        )}

        {/* Expand Details Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showDetails ? 'Hide details ▲' : 'Show details ▼'}
        </button>

        {showDetails && (
          <div className="mt-2 text-xs text-muted-foreground space-y-1 border-t border-border pt-2">
            <p><strong>Category Logic:</strong> {item.reason}</p>
            <p><strong>Price Delta:</strong> {formatCurrency(Math.abs(priceDelta))} {priceDelta > 0 ? 'above' : 'below'} competitor</p>
            <p><strong>Margin Headroom:</strong> {formatCurrency(item.marginHeadroom)} above floor</p>
          </div>
        )}
      </div>
    </div>
  )
}

function PriceBlock({
  label,
  value,
  highlight,
  delta,
  isFloor,
}: {
  label: string
  value: number
  highlight: boolean
  delta?: number
  isFloor?: boolean
}) {
  return (
    <div
      className={`rounded-lg px-3 py-2 ${
        highlight && isFloor
          ? 'bg-red-50 border border-red-200'
          : 'bg-gray-50 border border-gray-100'
      }`}
    >
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-base font-semibold ${highlight && isFloor ? 'text-red-600' : 'text-foreground'}`}>
        {formatCurrency(value)}
      </p>
      {delta !== undefined && delta !== 0 && (
        <p className={`text-xs font-medium ${delta > 0 ? 'text-red-500' : 'text-green-600'}`}>
          {delta > 0 ? `We're ₹${delta} higher` : `We're ₹${Math.abs(delta)} lower`}
        </p>
      )}
      {isFloor && highlight && (
        <p className="text-xs text-red-500 font-medium">⚠ Below floor</p>
      )}
    </div>
  )
}
