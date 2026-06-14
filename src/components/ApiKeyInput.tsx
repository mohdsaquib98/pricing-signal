import { useState } from 'react'
import { Key, Eye, EyeOff } from 'lucide-react'

interface ApiKeyInputProps {
  apiKey: string
  onApiKeyChange: (key: string) => void
}

export function ApiKeyInput({ apiKey, onApiKeyChange }: ApiKeyInputProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="flex items-center gap-2 bg-white border border-border rounded-lg px-3 py-2">
      <Key className="w-4 h-4 text-muted-foreground shrink-0" />
      <input
        type={show ? 'text' : 'password'}
        placeholder="Enter Groq API Key..."
        value={apiKey}
        onChange={e => onApiKeyChange(e.target.value)}
        className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
      />
      <button
        onClick={() => setShow(!show)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  )
}
