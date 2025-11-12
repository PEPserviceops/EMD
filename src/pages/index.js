import dynamic from 'next/dynamic'

const Dashboard = dynamic(() => import('../components/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Loading Dashboard...</h2>
        <p className="text-slate-600">Initializing real-time monitoring system</p>
      </div>
    </div>
  )
})

export default function Home() {
  return <Dashboard />
}
