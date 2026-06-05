import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { addCoachMessage, clearCoachMessages, newMeal, saveMeal } from '../db/repo'
import { useSettings } from '../hooks/useSettings'
import { navigate } from '../lib/router'
import { dayKey } from '../lib/streaks'
import {
  assembleCoachContext,
  DEFAULT_COACH_MODEL,
  streamCoachReply,
  toApiMessages,
  type ApiMessage,
  type ToolUse,
} from '../lib/coach'
import { Header } from '../components/Header'
import { Button, cx, EmptyState, IconButton } from '../components/ui'
import { useConfirm } from '../components/ConfirmDialog'
import { IconSend, IconSparkles, IconTrash } from '../components/Icons'

const SUGGESTIONS = [
  'How is my training volume this week?',
  'What should I add weight on next?',
  'Am I balanced across muscle groups?',
]

export function CoachScreen() {
  const settings = useSettings()
  const confirm = useConfirm()
  const messages = useLiveQuery(() => db.coachMessages.orderBy('createdAt').toArray(), [], [])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const hasKey = !!settings.anthropicApiKey

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function runTool(tu: ToolUse): Promise<string> {
    if (tu.name === 'log_meal') {
      const name = String(tu.input.name ?? 'Meal').trim() || 'Meal'
      const calories = Math.max(0, Math.round(Number(tu.input.calories) || 0))
      const proteinG = Math.max(0, Math.round(Number(tu.input.proteinG) || 0))
      const today = dayKey(new Date())
      const day = typeof tu.input.day === 'string' && tu.input.day ? tu.input.day : today
      const when = day === today ? 'today' : day
      const ok = await confirm({
        title: 'Log this meal?',
        message: `${name}\n${calories} kcal · ${proteinG}g protein · ${when}`,
        confirmLabel: 'Log meal',
      })
      if (!ok) return 'The user declined to log this meal.'
      await saveMeal(newMeal({ day, name, calories, proteinG }))
      return `Logged "${name}": ${calories} kcal, ${proteinG}g protein for ${when}.`
    }
    return `Unknown tool: ${tu.name}`
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || busy || !settings.anthropicApiKey) return
    setError(null)
    setInput('')
    await addCoachMessage('user', content)
    setBusy(true)
    setStreaming('')
    try {
      const context = await assembleCoachContext()
      const history = await db.coachMessages.orderBy('createdAt').toArray()
      const apiMessages: ApiMessage[] = toApiMessages(history)
      let display = ''
      // Agentic loop: stream a turn, run any tools (with confirmation), repeat
      // until the model is done. Capped so a misbehaving model can't loop.
      for (let i = 0; i < 4; i++) {
        const turn = await streamCoachReply({
          apiKey: settings.anthropicApiKey,
          model: settings.coachModel || DEFAULT_COACH_MODEL,
          context,
          messages: apiMessages,
          onText: (d) => {
            display += d
            setStreaming(display)
          },
        })
        if (turn.toolUses.length === 0) break

        const assistantContent: unknown[] = []
        if (turn.text) assistantContent.push({ type: 'text', text: turn.text })
        for (const tu of turn.toolUses) {
          assistantContent.push({ type: 'tool_use', id: tu.id, name: tu.name, input: tu.input })
        }
        apiMessages.push({ role: 'assistant', content: assistantContent })

        const results: unknown[] = []
        for (const tu of turn.toolUses) {
          const out = await runTool(tu)
          results.push({ type: 'tool_result', tool_use_id: tu.id, content: out })
        }
        apiMessages.push({ role: 'user', content: results })
        if (display) display += '\n\n'
      }
      if (display.trim()) await addCoachMessage('assistant', display.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong talking to the coach.')
    } finally {
      setStreaming(null)
      setBusy(false)
    }
  }

  async function clear() {
    if (!(await confirm({ message: 'Clear this conversation?', confirmLabel: 'Clear', danger: true })))
      return
    await clearCoachMessages()
    setError(null)
  }

  const list = messages ?? []

  return (
    <div className="flex flex-col h-[100dvh]">
      <Header
        title="Coach"
        subtitle="Knows your training"
        back={{ name: 'routines' }}
        action={
          list.length > 0 ? (
            <IconButton label="Clear conversation" variant="danger" onClick={clear}>
              <IconTrash size={20} />
            </IconButton>
          ) : undefined
        }
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {!hasKey ? (
          <EmptyState
            icon={<IconSparkles size={40} className="text-volt" />}
            title="Connect your AI coach"
            subtitle="Add your Anthropic API key in Settings to chat with a coach that knows your sessions, PRs, and weekly volume."
          />
        ) : list.length === 0 && streaming === null ? (
          <div className="pt-6">
            <EmptyState
              icon={<IconSparkles size={40} className="text-volt" />}
              title="Ask your coach"
              subtitle="It can see your recent sessions, PRs, weekly muscle volume, and bodyweight."
            />
            <div className="mt-4 space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="w-full text-left rounded-md border border-line-2 bg-surface-1 px-3.5 py-2.5 text-sm active:bg-surface-2"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {list.map((m) => (
              <Bubble key={m.id} role={m.role} text={m.content} />
            ))}
            {streaming !== null && (
              <Bubble role="assistant" text={streaming || '…'} pending />
            )}
          </>
        )}
        {error && <p className="text-sm text-danger px-1">{error}</p>}
        <div ref={endRef} />
      </div>

      {hasKey ? (
        <div className="border-t border-line-2 bg-bg/90 backdrop-blur px-3 py-3 safe-bottom">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              void send(input)
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send(input)
                }
              }}
              rows={1}
              placeholder="Ask your coach…"
              className="flex-1 resize-none max-h-32 rounded-md bg-surface-2 border border-line-2 px-3 py-2.5 text-sm outline-none focus:border-line-3"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className={cx(
                'h-11 w-11 shrink-0 rounded-md flex items-center justify-center',
                busy || !input.trim()
                  ? 'bg-surface-2 text-fg-3'
                  : 'bg-volt text-on-volt active:scale-[.97]',
              )}
            >
              <IconSend size={18} />
            </button>
          </form>
        </div>
      ) : (
        <div className="border-t border-line-2 px-4 py-3 safe-bottom">
          <Button variant="primary" full onClick={() => navigate({ name: 'settings' })}>
            Add API key in Settings
          </Button>
        </div>
      )}
    </div>
  )
}

function Bubble({
  role,
  text,
  pending,
}: {
  role: 'user' | 'assistant'
  text: string
  pending?: boolean
}) {
  const isUser = role === 'user'
  return (
    <div className={cx('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cx(
          'max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words',
          isUser
            ? 'bg-volt-ghost text-fg-1 border border-volt-line'
            : 'bg-surface-1 border border-line-2 text-fg-1',
          pending && 'opacity-90',
        )}
      >
        {text}
      </div>
    </div>
  )
}
