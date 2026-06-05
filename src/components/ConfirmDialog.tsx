import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { Button, Sheet } from './ui'

/**
 * App-styled confirm dialog to replace native window.confirm(). Provides a
 * `useConfirm()` that returns a promise<boolean>, so call sites stay terse:
 *   if (!(await confirm({ message: '...', confirmLabel: 'Delete', danger: true }))) return
 */

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn>(async () => false)

export function useConfirm(): ConfirmFn {
  return useContext(ConfirmContext)
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback<ConfirmFn>(
    (options) => new Promise<boolean>((resolve) => setPending({ ...options, resolve })),
    [],
  )

  function settle(value: boolean) {
    pending?.resolve(value)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Sheet
        open={pending !== null}
        onClose={() => settle(false)}
        title={pending?.title ?? 'Are you sure?'}
        footer={
          <div className="flex gap-2">
            <Button variant="subtle" full onClick={() => settle(false)}>
              {pending?.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={pending?.danger ? 'danger' : 'primary'}
              full
              onClick={() => settle(true)}
            >
              {pending?.confirmLabel ?? 'Confirm'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-2">{pending?.message}</p>
      </Sheet>
    </ConfirmContext.Provider>
  )
}
