import { Activity, Zap } from 'lucide-react'

interface HeaderProps {
  immediateCount: number
  optimizationCount: number
  noActionCount: number
  total: number
  onAnalyze: () => void
  isAnalyzing: boolean
  hasRecommendations: boolean
}

export function Header({
  immediateCount,
  optimizationCount,
  noActionCount,
  total,
  onAnalyze,
  isAnalyzing,
  hasRecommendations,
}: HeaderProps) {
  return (
    <header className="border-b border-border bg-white sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                Pricing Signal
              </h1>
              <p className="text-sm text-muted-foreground">
                Decision tool · {total} SKUs loaded
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 text-sm">
              <StatusPill count={immediateCount} label="Action Needed" color="red" />
              <StatusPill count={optimizationCount} label="Optimize" color="amber" />
              <StatusPill count={noActionCount} label="Blocked" color="gray" />
            </div>

            <button
              onClick={onAnalyze}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4" />
              {isAnalyzing
                ? 'Analyzing...'
                : hasRecommendations
                  ? 'Re-Analyze'
                  : 'Get AI Recommendations'}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

function StatusPill({ count, label, color }: { count: number; label: string; color: string }) {
  const colors: Record<string, string> = {
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${colors[color]}`}>
      <span className="font-bold">{count}</span> {label}
    </span>
  )
}
