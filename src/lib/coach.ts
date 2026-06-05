import { db } from '../db/db'
import type { CoachMessage } from '../db/types'
import { epley1RM } from './calc'
import { muscleBreakdown, weekStart } from './muscleVolume'
import { MUSCLE_LABEL } from './labels'
import { kgToLb } from './calc'

/** Models the coach can use. Default is the most capable. */
export const COACH_MODELS = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8 (best)' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 (faster, cheaper)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (fastest)' },
] as const

export const DEFAULT_COACH_MODEL = 'claude-opus-4-8'

const SYSTEM_PROMPT = `You are Rack's built-in strength coach. You advise one lifter using their own training data, which is provided below as context.

Be concise, specific, and practical. Reference the user's actual numbers (weights, reps, sets, muscle volume, bodyweight) when relevant. Use kg or lb to match their setting. Sets read like "80kg x 7". Ranges read "5 to 7". No em dashes, sentence case, no emoji.

When asked for programming advice, ground it in progressive overload, sensible weekly set volume per muscle (roughly 10 to 20 hard sets), and the user's recent trend. If data is missing, say so rather than inventing it. Keep answers short unless asked to go deep.`

/** Build a compact text snapshot of the user's training for the model. */
export async function assembleCoachContext(): Promise<string> {
  const [settings, sessions, exercises, body, routines] = await Promise.all([
    db.settings.get('singleton'),
    db.sessions.toArray(),
    db.exercises.toArray(),
    db.bodyMetrics.toArray(),
    db.routines.toArray(),
  ])
  const units = settings?.units ?? 'kg'
  const w = (kg: number) => `${Math.round((units === 'lb' ? kgToLb(kg) : kg) * 10) / 10}${units}`
  const exMap = new Map(exercises.map((e) => [e.id, e]))
  const finished = sessions.filter((s) => s.finished)

  const lines: string[] = []
  lines.push(`Units: ${units}.`)

  // Bodyweight: latest and 30-day change.
  const weights = body
    .filter((b) => b.weightKg != null)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
  if (weights.length) {
    const latest = weights[weights.length - 1]
    const monthAgo = Date.now() - 30 * 86_400_000
    const prior = weights.find((b) => new Date(b.dateISO).getTime() >= monthAgo)
    const change =
      prior && prior !== latest ? ` (${w((latest.weightKg ?? 0) - (prior.weightKg ?? 0))} over ~30 days)` : ''
    lines.push(`Bodyweight: ${w(latest.weightKg ?? 0)}${change}.`)
  }

  // This week's hard sets per muscle.
  const muscleByEx = new Map(exercises.map((e) => [e.id, e.muscleGroup]))
  const ws = weekStart(new Date())
  const rows = muscleBreakdown(finished, muscleByEx, ws.getTime())
  if (rows.length) {
    lines.push(
      `This week, hard sets per muscle: ${rows
        .map((r) => `${MUSCLE_LABEL[r.muscle]} ${r.sets}`)
        .join(', ')}.`,
    )
  }

  // Best estimated 1RM per exercise (top lifts only), from history.
  const bestE1rm = new Map<string, number>()
  for (const s of finished) {
    for (const e of s.entries) {
      for (const set of e.sets) {
        if (set.weightKg == null || set.reps == null) continue
        const v = epley1RM(set.weightKg, set.reps)
        if (v > (bestE1rm.get(e.exerciseId) ?? 0)) bestE1rm.set(e.exerciseId, v)
      }
    }
  }
  const topLifts = [...bestE1rm.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id, v]) => `${exMap.get(id)?.name ?? id} ~${w(v)} est 1RM`)
  if (topLifts.length) lines.push(`Best estimated 1RMs: ${topLifts.join(', ')}.`)

  // Recent sessions (last 10), with the top working set per exercise.
  const recent = [...finished]
    .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
    .slice(0, 10)
  if (recent.length) {
    lines.push('Recent sessions (newest first):')
    for (const s of recent) {
      const date = new Date(s.dateISO).toLocaleDateString()
      const parts = s.entries
        .map((e) => {
          const top = e.sets
            .filter((x) => x.weightKg != null && x.reps != null)
            .sort((x, y) => (y.weightKg ?? 0) - (x.weightKg ?? 0))[0]
          const name = exMap.get(e.exerciseId)?.name ?? e.exerciseId
          return top ? `${name} ${w(top.weightKg!)} x ${top.reps}` : null
        })
        .filter(Boolean)
      const label = s.routineName ?? 'Workout'
      lines.push(`- ${date} ${label}: ${parts.length ? parts.join('; ') : 'no lifts logged'}`)
    }
  }

  // Active routines and their rep ranges.
  const active = routines.filter((r) => !r.archived)
  if (active.length) {
    lines.push('Routines:')
    for (const r of active) {
      const items = r.items
        .map((it) => `${exMap.get(it.exerciseId)?.name ?? it.exerciseId} ${it.targetSets}x${it.repLow}-${it.repHigh}`)
        .join(', ')
      lines.push(`- ${r.name}: ${items}`)
    }
  }

  return lines.join('\n')
}

export interface StreamCoachArgs {
  apiKey: string
  model: string
  context: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  onText: (delta: string) => void
  signal?: AbortSignal
}

/**
 * Call the Anthropic Messages API directly from the browser and stream text.
 * The data context goes in the system block with cache_control, so follow-up
 * turns reuse it cheaply (prompt caching).
 */
export async function streamCoachReply(args: StreamCoachArgs): Promise<void> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': args.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    signal: args.signal,
    body: JSON.stringify({
      model: args.model,
      max_tokens: 1024,
      system: [
        { type: 'text', text: SYSTEM_PROMPT },
        {
          type: 'text',
          text: `Here is the user's current training data:\n\n${args.context}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: args.messages,
      stream: true,
    }),
  })

  if (!res.ok || !res.body) {
    let detail = `${res.status}`
    try {
      const err = await res.json()
      detail = err?.error?.message ?? detail
    } catch {
      /* ignore */
    }
    if (res.status === 401) throw new Error('That API key was rejected. Check it in Settings.')
    throw new Error(`Coach request failed: ${detail}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const evt of events) {
      const dataLine = evt.split('\n').find((l) => l.startsWith('data:'))
      if (!dataLine) continue
      const json = dataLine.slice(5).trim()
      if (!json || json === '[DONE]') continue
      let data: {
        type?: string
        delta?: { type?: string; text?: string }
        error?: { message?: string }
      }
      try {
        data = JSON.parse(json)
      } catch {
        continue
      }
      if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
        args.onText(data.delta.text ?? '')
      } else if (data.type === 'error') {
        throw new Error(data.error?.message ?? 'The coach stream errored.')
      }
    }
  }
}

export function toApiMessages(
  msgs: CoachMessage[],
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return msgs.map((m) => ({ role: m.role, content: m.content }))
}
