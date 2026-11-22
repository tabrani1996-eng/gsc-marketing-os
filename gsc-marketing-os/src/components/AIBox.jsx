import { useEffect, useState } from 'react'
import { Sparkles, Loader2, Copy, ClipboardCheck, AlertTriangle } from 'lucide-react'
import { aiStatus, askAI, buildPortablePrompt } from '../lib/ai'
import { copyText } from '../lib/utils'

export function useAIStatus() {
  const [s, setS] = useState(null)
  useEffect(() => { aiStatus().then(setS) }, [])
  return s
}

/**
 * Runs a prompt through the server-side AI when configured; otherwise offers a
 * ready-to-paste prompt (so nothing pretends to be AI-generated when it isn't).
 */
export default function AIBox({ task, buildPrompt, context, onResult, label = 'Buat dengan AI', compact }) {
  const status = useAIStatus()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [copied, setCopied] = useState(false)

  const run = async () => {
    setBusy(true); setErr(null)
    try {
      const text = await askAI({ task, prompt: buildPrompt(), context: typeof context === 'function' ? context() : context })
      onResult(text)
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  const copy = async () => {
    const ok = await copyText(buildPortablePrompt({ task, prompt: buildPrompt(), context: typeof context === 'function' ? context() : context }))
    setCopied(ok); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={compact ? 'flex flex-wrap items-center gap-2' : 'space-y-2'}>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn-dark btn-sm py-1.5" disabled={!status?.configured || busy} onClick={run} title={status?.configured ? '' : status?.reason || 'Memeriksa…'}>
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} {label}
        </button>
        <button className="btn-outline btn-sm py-1.5" onClick={copy}>{copied ? <ClipboardCheck size={13} /> : <Copy size={13} />} {copied ? 'Prompt tersalin' : 'Salin prompt'}</button>
        {status && !status.configured && <span className="text-[11px] text-slate-400">AI server belum aktif — salin prompt untuk dipakai di Claude.</span>}
      </div>
      {err && <div className="flex items-start gap-1.5 rounded bg-red-50 px-2 py-1.5 text-xs text-red-700"><AlertTriangle size={13} className="mt-0.5" />{err}</div>}
    </div>
  )
}
