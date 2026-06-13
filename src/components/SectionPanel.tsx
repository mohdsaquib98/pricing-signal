import type { ReactNode } from 'react'

interface SectionPanelProps {
  title: string
  description: string
  count: number
  icon: ReactNode
  color: 'red' | 'amber' | 'gray'
  children: ReactNode
  defaultOpen?: boolean
}

export function SectionPanel({
  title,
  description,
  count,
  icon,
  color,
  children,
  defaultOpen = true,
}: SectionPanelProps) {
  const colorMap = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      badge: 'bg-red-100 text-red-700',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      badge: 'bg-amber-100 text-amber-700',
    },
    gray: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      badge: 'bg-gray-100 text-gray-600',
    },
  }

  const c = colorMap[color]

  if (count === 0) return null

  return (
    <details open={defaultOpen} className="group">
      <summary
        className={`flex items-center gap-3 p-4 rounded-t-xl ${c.bg} border ${c.border} cursor-pointer select-none list-none`}
      >
        <span className="shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <h2 className={`text-base font-semibold ${c.text}`}>{title}</h2>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${c.badge}`}>
          {count}
        </span>
        <span className="text-muted-foreground text-sm group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="space-y-3 p-3 border-x border-b border-border rounded-b-xl bg-gray-50/50">
        {children}
      </div>
    </details>
  )
}
