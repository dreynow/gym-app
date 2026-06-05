import type { ReactNode } from 'react'
import { navigate, type Route } from '../lib/router'
import { IconBack } from './Icons'
import { IconButton } from './ui'

/** Sticky page header. Pass `back` for detail screens, `action` for a trailing
 * control (e.g. add / settings). */
export function Header({
  title,
  subtitle,
  back,
  action,
}: {
  title: string
  subtitle?: string
  back?: Route
  action?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 bg-bg/90 backdrop-blur border-b border-line-1 safe-top">
      <div className="mx-auto max-w-md flex items-center gap-2 px-4 h-14">
        {back && (
          <IconButton label="Back" onClick={() => navigate(back)} className="-ml-2">
            <IconBack size={22} />
          </IconButton>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-tight truncate">{title}</h1>
          {subtitle && <p className="text-xs text-fg-2 truncate">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  )
}
