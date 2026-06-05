import { db } from '../db/db'
import type { CoachMessage } from '../db/types'
import { epley1RM, kgToLb } from './calc'
import { muscleBreakdown, weekStart } from './muscleVolume'
import { dayFromKey, mealTotals } from './meals'
import { dayKey } from './streaks'
import { MUSCLE_LABEL } from './labels'

/** Models the coach can use. Default is the most capable. */
export const COACH_MODELS = [
  { id: 'claude-opus-4-8', label: 'Opus 4.8 (best)' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6 (faster, cheaper)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (fastest)' },
] as const

export const DEFAULT_COACH_MODEL = 'claude-opus-4-8'

const SYSTEM_PROMPT = `You are Rack's built-in strength coach. You advise one lifter using their own training and nutrition data, which is provided below as context.

Be concise, specific, and practical. Reference the user's actual numbers (weights, reps, sets, muscle volume, bodyweight, calories, protein) when relevant. Use kg or lb to match their setting. Sets read like "80kg x 7". Ranges read "5 to 7". No em dashes, sentence case, no emoji.

When asked for programming advice, ground it in progressive overload, sensible weekly set volume per muscle (roughly 10 to 20 hard sets), and the user's recent trend. If data is missing, say so rather than inventing it. Keep answers short unless asked to go deep.

You can log meals to the user's food diary with the log_meal tool when they tell you what they ate. Estimate calories and protein from the description using typical values, combining everything they mention into one entry. The app shows the user a confirmation before anything is saved, so propose your best estimate. Default the day to today unless they say otherwise.`

/** Tool: log a meal. The app confirms with the user before it actually saves. */
export const LOG_MEAL_TOOL = {
  name: 'log_meal',
  description:
    "Log a meal to the user's food diary. Estimate calories (kcal) and protein (grams) from a natural-language description if exact numbers are not given. Combine all foods the user mentions into a single entry.",
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Short description of the meal, e.g. "Chicken wrap and a banana".',
      },
      calories: { type: 'number', description: 'Total calories for the meal, in kcal.' },
      proteinG: { type: 'number', description: 'Total protein for the meal, in grams.' },
      day: {
        type: 'string',
        description: 'Local day as YYYY-MM-DD. Omit for today.',
      },
    },
    required: ['name', 'calories', 'proteinG'],
  },
} as const

/** Build a compact text snapshot of the user's training + nutrition. */
export async function assembleCoachContext(): Promise<string> {
  const [settings, sessions, exercises, body, routines, meals] = await Promise.all([
    db.settings.get('singleton'),
    db.sessions.toArray(),
    db.exercises.toArray(),
    db.bodyMetrics.toArray(),
    db.routines.toArray(),
    db.meals.toArray(),
  ])
  const units = settings?.units ?? 'kg'
  const w = (kg: number) => `${Math.round((units === 'lb' ? kgToLb(kg) : kg) * 10) / 10}${units}`
  const exMap = new Map(exercises.map((e) => [e.id, e]))
  const finished = sessions.filter((s) => s.finished)

  const lines: string[] = []
  lines.push(`Today is ${new Date().toLocaleDateString()}. Units: ${units}.`)

  // Body: latest weight (+30-day change), waist, body fat.
  const weights = body
    .filter((b) => b.weightKg != null)
    .sort((a, b) => a.dateISO.localeCompare(b.dateISO))
  if (weights.length) {
    const latest = weights[weights.length - 1]
    const monthAgo = Date.now() - 30 * 86_400_000
    const prior = weights.find((b) => new Date(b.dateISO).getTime() >= monthAgo)
    const change =
      prior && prior !== latest
        ? ` (${w((latest.weightKg ?? 0) - (prior.weightKg ?? 0))} over ~30 days)`
        : ''
    lines.push(`Bodyweight: ${w(latest.weightKg ?? 0)}${change}.`)
  }
  const waists = body.filter((b) => b.waistCm != null).sort((a, b) => a.dateISO.localeCompare(b.dateISO))
  if (waists.length) lines.push(`Waist: ${waists[waists.length - 1].waistCm}cm.`)
  const bodyFats = body.filter((b) => b.bodyFatPct != null).sort((a, b) => a.dateISO.localeCompare(b.dateISO))
  if (bodyFats.length) lines.push(`Body fat: ${bodyFats[bodyFats.length - 1].bodyFatPct}%.`)

  // Nutrition: today's totals and a 7-day average.
  const todayKey = dayKey(new Date())
  const todayMeals = meals.filter((m) => m.day === todayKey)
  if (todayMeals.length) {
    const t = mealTotals(todayMeals)
    lines.push(
      `Today's food so far: ${t.calories} kcal, ${t.proteinG}g protein across ${todayMeals.length} ${todayMeals.length === 1 ? 'meal' : 'meals'}.`,
    )
  } else {
    lines.push('No meals logged yet today.')
  }
  const sevenAgo = Date.now() - 7 * 86_400_000
  const recentMeals = meals.filter((m) => dayFromKey(m.day).getTime() >= sevenAgo)
  if (recentMeals.length) {
    const days = new Set(recentMeals.map((m) => m.day)).size
    const t = mealTotals(recentMeals)
    lines.push(
      `Last 7 days food: averaging ~${Math.round(t.calories / days)} kcal and ${Math.round(t.proteinG / days)}g protein per logged day (${days} days logged).`,
    )
  }

  // This week's hard sets per muscle.
  const muscleByEx = new Map(exercises.map((e) => [e.id, e.muscleGroup]))
  const ws = weekStart(new Date())
  const rows = muscleBreakdown(finished, muscleByEx, ws.getTime())
  if (rows.length) {
    lines.push(
      `This week, hard sets per muscle: ${rows.map((r) => `${MUSCLE_LABEL[r.muscle]} ${r.sets}`).join(', ')}.`,
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

  // Recent sessions (last 15), with the top working set per exercise.
  const recent = [...finished].sort((a, b) => b.dateISO.localeCompare(a.dateISO)).slice(0, 15)
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
        .map(
          (it) =>
            `${exMap.get(it.exerciseId)?.name ?? it.exerciseId} ${it.targetSets}x${it.repLow}-${it.repHigh}`,
        )
        .join(', ')
      lines.push(`- ${r.name}: ${items}`)
    }
  }

  return lines.join('\n')
}

export type ApiMessage = { role: 'user' | 'assistant'; content: string | unknown[] }

export interface ToolUse {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface CoachTurn {
  /** Assistant text produced this turn. */
  text: string
  /** Any tool calls the model wants run before continuing. */
  toolUses: ToolUse[]
  stopReason: string | null
}

export interface StreamCoachArgs {
  apiKey: string
  model: string
  context: string
  messages: ApiMessage[]
  onText: (delta: string) => void
  signal?: AbortSignal
}

/**
 * Call the Anthropic Messages API directly from the browser and stream one turn.
 * The data context goes in the system block with cache_control (prompt caching).
 * Returns the turn's text plus any tool calls, so the caller can run them and
 * continue the conversation (the agentic loop lives in the screen).
 */
export async function streamCoachReply(args: StreamCoachArgs): Promise<CoachTurn> {
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
      tools: [LOG_MEAL_TOOL],
      system: [
        { type: 'text', text: SYSTEM_PROMPT },
        {
          type: 'text',
          text: `Here is the user's current data:\n\n${args.context}`,
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
      detail = (err as { error?: { message?: string } })?.error?.message ?? detail
    } catch {
      /* ignore */
    }
    if (res.status === 401) throw new Error('That API key was rejected. Check it in Settings.')
    throw new Error(`Coach request failed: ${detail}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let stopReason: string | null = null
  const toolUses: ToolUse[] = []
  let current: { id: string; name: string; json: string } | null = null

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const evt of events) {
      const dataLine = evt.split('\n').find((l) => l.startsWith('data:'))
      if (!dataLine) continue
      const raw = dataLine.slice(5).trim()
      if (!raw || raw === '[DONE]') continue
      let data: {
        type?: string
        content_block?: { type?: string; id?: string; name?: string }
        delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string }
        error?: { message?: string }
      }
      try {
        data = JSON.parse(raw)
      } catch {
        continue
      }
      switch (data.type) {
        case 'content_block_start':
          if (data.content_block?.type === 'tool_use') {
            current = {
              id: data.content_block.id ?? '',
              name: data.content_block.name ?? '',
              json: '',
            }
          } else {
            current = null
          }
          break
        case 'content_block_delta':
          if (data.delta?.type === 'text_delta') {
            text += data.delta.text ?? ''
            args.onText(data.delta.text ?? '')
          } else if (data.delta?.type === 'input_json_delta' && current) {
            current.json += data.delta.partial_json ?? ''
          }
          break
        case 'content_block_stop':
          if (current) {
            let input: Record<string, unknown> = {}
            try {
              input = current.json ? JSON.parse(current.json) : {}
            } catch {
              input = {}
            }
            toolUses.push({ id: current.id, name: current.name, input })
            current = null
          }
          break
        case 'message_delta':
          if (data.delta?.stop_reason) stopReason = data.delta.stop_reason
          break
        case 'error':
          throw new Error(data.error?.message ?? 'The coach stream errored.')
      }
    }
  }

  return { text, toolUses, stopReason }
}

export function toApiMessages(msgs: CoachMessage[]): ApiMessage[] {
  return msgs.map((m) => ({ role: m.role, content: m.content }))
}
