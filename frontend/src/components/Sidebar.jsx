import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Upload, Database, Brain, MessageSquare, BarChart3, Zap } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/upload', icon: Upload, label: 'Upload Dataset' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 bg-dark-800 border-r border-dark-600 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-dark-600">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">AutoAnalyst</div>
            <div className="text-xs text-primary-400 font-medium">AI Platform</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-3">Navigation</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-dark-700'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-dark-600">
        <div className="text-xs text-gray-500 text-center">
          Powered by <span className="text-primary-400 font-medium">Llama3 + FastAPI</span>
        </div>
      </div>
    </aside>
  )
}
