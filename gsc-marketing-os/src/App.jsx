import { useEffect, useState, lazy, Suspense } from 'react'
import { supabase, supabaseConfigured } from './lib/supabase'
import { DataProvider, useData } from './lib/data'
import Auth from './pages/Auth'
import Onboarding from './pages/Onboarding'
import Layout from './components/Layout'
import { Loading, Toasts } from './components/ui'

const pages = {
  dashboard: lazy(() => import('./pages/Dashboard')),
  research: lazy(() => import('./pages/Research')),
  strategy: lazy(() => import('./pages/Strategy')),
  ideas: lazy(() => import('./pages/Ideas')),
  calendar: lazy(() => import('./pages/Calendar')),
  studio: lazy(() => import('./pages/Studio')),
  production: lazy(() => import('./pages/Production')),
  social: lazy(() => import('./pages/Social')),
  seo: lazy(() => import('./pages/SEO')),
  leads: lazy(() => import('./pages/Leads')),
  campaigns: lazy(() => import('./pages/Campaigns')),
  analytics: lazy(() => import('./pages/Analytics')),
  learning: lazy(() => import('./pages/Learning')),
  assistant: lazy(() => import('./pages/Assistant')),
  settings: lazy(() => import('./pages/Settings')),
}

function useHashRoute() {
  const read = () => {
    const h = window.location.hash.replace(/^#\/?/, '')
    const [page, ...rest] = h.split('/')
    return { page: pages[page] ? page : 'dashboard', param: rest.join('/') || null }
  }
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const on = () => setRoute(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}


function Shell() {
  const { workspaces, workspace, loading } = useData()
  const route = useHashRoute()
  if (!workspace && loading) return <div className="flex h-full items-center justify-center"><Loading label="Menyiapkan workspace…" /></div>
  if (!workspaces.length) return <Onboarding />
  const Page = pages[route.page]
  return (
    <Layout current={route.page}>
      <Suspense fallback={<Loading />}>
        <Page param={route.param} />
      </Suspense>
    </Layout>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)
  useEffect(() => {
    if (!supabaseConfigured) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!supabaseConfigured) {
    return <div className="p-8 text-sm">Konfigurasi Supabase belum diisi. Set <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>.</div>
  }
  if (session === undefined) return <div className="flex h-full items-center justify-center"><Loading label="Memeriksa sesi…" /></div>
  if (!session) return <Auth />
  return (
    <DataProvider session={session}>
      <Shell />
      <Toasts />
    </DataProvider>
  )
}
