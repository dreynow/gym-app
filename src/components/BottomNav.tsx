import { navigate, type Route, useRoute } from '../lib/router'
import {
  IconBody,
  IconChart,
  IconDumbbell,
  IconHistory,
  IconLibrary,
} from './Icons'
import { cx } from './ui'

const ITEMS: { route: Route['name']; label: string; Icon: typeof IconDumbbell }[] = [
  { route: 'routines', label: 'Train', Icon: IconDumbbell },
  { route: 'history', label: 'History', Icon: IconHistory },
  { route: 'progress', label: 'Progress', Icon: IconChart },
  { route: 'body', label: 'Body', Icon: IconBody },
  { route: 'exercises', label: 'Library', Icon: IconLibrary },
]

export function BottomNav() {
  const route = useRoute()
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-ink-900/95 backdrop-blur border-t border-ink-700 safe-bottom">
      <div className="mx-auto max-w-md flex">
        {ITEMS.map(({ route: name, label, Icon }) => {
          const active = route.name === name
          return (
            <button
              key={name}
              onClick={() => navigate({ name } as Route)}
              className={cx(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors',
                active ? 'text-volt-400' : 'text-faint',
              )}
            >
              <Icon size={22} />
              <span className="text-[10px] font-medium tracking-wide">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
