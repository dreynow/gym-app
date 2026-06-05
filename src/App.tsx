import { lazy, Suspense, useEffect } from 'react'
import { WorkoutProvider, useWorkout } from './context/WorkoutContext'
import { useRoute } from './lib/router'
import { BottomNav } from './components/BottomNav'
import { ResumeBanner } from './components/ResumeBanner'
import { Spinner } from './components/ui'
import { RoutinesScreen } from './screens/RoutinesScreen'
import { RoutineEditScreen } from './screens/RoutineEditScreen'
import { WorkoutScreen } from './screens/WorkoutScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { SessionDetailScreen } from './screens/SessionDetailScreen'
import { ExercisesScreen } from './screens/ExercisesScreen'
import { SettingsScreen } from './screens/SettingsScreen'

// Chart screens pull in Recharts; load them on demand to keep first paint fast.
const ProgressScreen = lazy(() =>
  import('./screens/ProgressScreen').then((m) => ({ default: m.ProgressScreen })),
)
const BodyScreen = lazy(() =>
  import('./screens/BodyScreen').then((m) => ({ default: m.BodyScreen })),
)

function Router() {
  const route = useRoute()
  const { resumeIfAny } = useWorkout()

  // On cold start, pick up any workout that was in progress before a reload.
  useEffect(() => {
    void resumeIfAny()
  }, [resumeIfAny])

  switch (route.name) {
    case 'routines':
      return <RoutinesScreen />
    case 'routine':
      return <RoutineEditScreen id={route.id} />
    case 'workout':
      return <WorkoutScreen />
    case 'history':
      return <HistoryScreen />
    case 'session':
      return <SessionDetailScreen id={route.id} />
    case 'progress':
      return (
        <Suspense fallback={<Spinner />}>
          <ProgressScreen />
        </Suspense>
      )
    case 'body':
      return (
        <Suspense fallback={<Spinner />}>
          <BodyScreen />
        </Suspense>
      )
    case 'exercises':
      return <ExercisesScreen />
    case 'settings':
      return <SettingsScreen />
  }
}

function Shell() {
  const route = useRoute()
  // The active-workout screen is full-bleed: no bottom nav, no resume banner.
  const isWorkout = route.name === 'workout'
  return (
    <div className="min-h-full">
      <main className={isWorkout ? '' : 'pb-28'}>
        <div className="mx-auto max-w-md">
          <Router />
        </div>
      </main>
      {!isWorkout && (
        <>
          <ResumeBanner />
          <BottomNav />
        </>
      )}
    </div>
  )
}

export function App() {
  return (
    <WorkoutProvider>
      <Shell />
    </WorkoutProvider>
  )
}
