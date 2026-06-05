import { useCallback, useEffect, useState } from 'react'

/**
 * A tiny hash-based router. We roll our own instead of pulling in react-router
 * to keep the dependency list lean: the app is a handful of screens reached via
 * a bottom nav, plus a couple of detail routes with a single id param.
 */

export type Route =
  | { name: 'routines' }
  | { name: 'history' }
  | { name: 'progress' }
  | { name: 'body' }
  | { name: 'exercises' }
  | { name: 'settings' }
  | { name: 'workout' }
  | { name: 'routine'; id: string }
  | { name: 'session'; id: string }

function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  const seg = path.split('/').filter(Boolean)
  switch (seg[0]) {
    case undefined:
      return { name: 'routines' }
    case 'history':
      return { name: 'history' }
    case 'progress':
      return { name: 'progress' }
    case 'body':
      return { name: 'body' }
    case 'exercises':
      return { name: 'exercises' }
    case 'settings':
      return { name: 'settings' }
    case 'workout':
      return { name: 'workout' }
    case 'routine':
      return seg[1] ? { name: 'routine', id: seg[1] } : { name: 'routines' }
    case 'session':
      return seg[1] ? { name: 'session', id: seg[1] } : { name: 'history' }
    default:
      return { name: 'routines' }
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'routines':
      return '#/'
    case 'routine':
      return `#/routine/${route.id}`
    case 'session':
      return `#/session/${route.id}`
    default:
      return `#/${route.name}`
  }
}

export function navigate(route: Route): void {
  window.location.hash = routeToHash(route)
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

/** Stable navigate callback for components that prefer a hook. */
export function useNavigate(): (route: Route) => void {
  return useCallback((route: Route) => navigate(route), [])
}
