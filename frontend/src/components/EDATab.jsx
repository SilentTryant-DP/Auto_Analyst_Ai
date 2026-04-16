import { useEffect, useState } from 'react'
import { analysisApi } from '../utils/api'
import { BarChart3, AlertTriangle, TrendingUp, Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, Rectangle
} from 'recharts'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6']

function StatCard({ label, value, sub, color = 'text-primary-400' }) {
  return (
    <div className="bg-dark-700 rounded-xl px-4 py-3">
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className={`text-lg font-bold ${color}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
      <Icon size={15} className="text-primary-400" />
      {title}
    </h3>
  )
}

export default function EDATab({ datasetId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [ran, setRan] = useState(false)
  const [selCol, setSelCol] = useState(null)

  const run = async () => {
    setLoading(true)
    try {
      const res = await analysisApi.run(datasetId)
      setData(res.data)
      setRan(true)
      const numCols = res.data.numeric_columns || []
      if (numCols.length > 0) setSelCol(numCols[0])
    } catch {
      toast.error('EDA failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { run() }, [datasetId])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">Running Exploratory Data Analysis...</p>
    </div>
  )

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <BarChart3 size={48} className="text-gray-600" />
      <p className="text-gray-400">Click to run EDA on this dataset</p>
      <button onClick={run} className="btn-primary">Run EDA</button>
    </div>
  )

  const numCols = data.numeric_columns || []
  const catCols = data.categorical_columns || []
  const missing = data.missing_values?.percentages || {}
  const missingCols = Object.entries(missing).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])

  // Histogram data for selected column
  const histData = selCol && data.distributions?.[selCol]
    ? data.distributions[selCol].bins.slice(0, -1).map((bin, i) => ({
        bin: bin.toFixed(2),
        count: data.distributions[selCol].hist[i]
      }))
    : []

  // Correlation heatmap data
  const corrCols = Object.keys(data.correlations || {}).slice(0, 8)
  const corrData = corrCols.flatMap(r =>
    corrCols.map(c => ({
      x: c, y: r,
      value: data.correlations[r]?.[c] ?? 0
    }))
  )

  // Category bar data
  const catData = {}
  for (const col of catCols) {
    if (data.categorical_counts?.[col]) {
      catData[col] = data.categorical_counts[col].labels.map((l, i) => ({
        name: String(l).slice(0, 15),
        count: data.categorical_counts[col].values[i]
      }))
    }
  }

  const corrColor = (val) => {
    if (val > 0.7) return '#6366f1'
    if (val > 0.3) return '#8b5cf6'
    if (val < -0.3) return '#ef4444'
    if (val < -0.7) return '#dc2626'
    return '#374151'
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Overview */}
      <div className="card">
        <SectionHeader icon={Activity} title="Dataset Overview" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Rows" value={data.shape?.rows?.toLocaleString()} />
          <StatCard label="Total Columns" value={data.shape?.columns} />
          <StatCard label="Numeric Columns" value={numCols.length} color="text-blue-400" />
          <StatCard label="Categorical Columns" value={catCols.length} color="text-yellow-400" />
          <StatCard label="Duplicate Rows" value={data.duplicate_rows} color={data.duplicate_rows > 0 ? 'text-red-400' : 'text-green-400'} />
          <StatCard label="Memory Usage" value={`${data.memory_usage_mb} MB`} color="text-cyan-400" />
          <StatCard label="Missing Values" value={missingCols.length > 0 ? `${missingCols.length} cols` : 'None'} color={missingCols.length > 0 ? 'text-orange-400' : 'text-green-400'} />
          <StatCard label="Columns w/ Outliers" value={Object.values(data.outliers || {}).filter(o => o.pct > 5).length} color="text-purple-400" />
        </div>
      </div>

      {/* Missing Values */}
      {missingCols.length > 0 && (
        <div className="card">
          <SectionHeader icon={AlertTriangle} title="Missing Values" />
          <div className="space-y-2">
            {missingCols.map(([col, pct]) => (
              <div key={col} className="flex items-center gap-3">
                <div className="w-32 text-sm text-gray-300 truncate shrink-0">{col}</div>
                <div className="flex-1 bg-dark-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct > 50 ? 'bg-red-500' : pct > 20 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="text-sm text-gray-400 w-16 text-right shrink-0">{pct}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Distribution Histogram */}
      {numCols.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <SectionHeader icon={BarChart3} title="Distribution" />
            <select
              value={selCol || ''}
              onChange={e => setSelCol(e.target.value)}
              className="select w-44 text-sm"
            >
              {numCols.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {histData.length > 0 && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={histData} margin={{ top: 0, right: 10, left: -20, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3a5c" />
                <XAxis dataKey="bin" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a3a5c', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} />
                <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Categorical Counts */}
      {catCols.length > 0 && (
        <div className="card">
          <SectionHeader icon={BarChart3} title="Categorical Distributions" />
          <div className="grid grid-cols-1 gap-6">
            {catCols.slice(0, 3).map(col => (
              catData[col] && (
                <div key={col}>
                  <p className="text-sm font-medium text-gray-300 mb-2">{col}</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={catData[col]} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3a5c" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 10 }} width={55} />
                      <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid #2a3a5c', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }} />
                      <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                        {catData[col].map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Correlation Heatmap */}
      {corrCols.length > 1 && (
        <div className="card">
          <SectionHeader icon={TrendingUp} title="Correlation Heatmap" />
          <div className="overflow-x-auto">
            <div
              className="grid gap-0.5"
              style={{ gridTemplateColumns: `80px repeat(${corrCols.length}, 1fr)`, minWidth: corrCols.length * 60 + 80 }}
            >
              {/* Header row */}
              <div />
              {corrCols.map(c => (
                <div key={c} className="text-xs text-gray-400 text-center py-1 px-0.5 truncate" title={c}>{c.slice(0, 8)}</div>
              ))}
              {/* Data rows */}
              {corrCols.map(row => (
                <>
                  <div key={row + '_label'} className="text-xs text-gray-400 flex items-center pr-2 truncate" title={row}>{row.slice(0, 10)}</div>
                  {corrCols.map(col => {
                    const val = data.correlations?.[row]?.[col] ?? 0
                    return (
                      <div
                        key={col}
                        title={`${row} × ${col}: ${val.toFixed(3)}`}
                        className="rounded text-xs flex items-center justify-center h-8 font-medium transition-all"
                        style={{ background: corrColor(val), color: Math.abs(val) > 0.3 ? '#fff' : '#9ca3af' }}
                      >
                        {val.toFixed(2)}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Outliers Summary */}
      {Object.keys(data.outliers || {}).length > 0 && (
        <div className="card">
          <SectionHeader icon={AlertTriangle} title="Outliers Detected (IQR Method)" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(data.outliers).map(([col, info]) => (
              <div key={col} className={`rounded-xl p-3 ${info.pct > 5 ? 'bg-orange-500/10 border border-orange-500/30' : 'bg-dark-700'}`}>
                <div className="text-sm font-medium text-gray-200 truncate">{col}</div>
                <div className="text-lg font-bold text-white mt-0.5">{info.count}</div>
                <div className={`text-xs ${info.pct > 5 ? 'text-orange-400' : 'text-gray-400'}`}>
                  {info.pct}% of data
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Column Stats Table */}
      <div className="card">
        <SectionHeader icon={Activity} title="Numeric Column Statistics" />
        {numCols.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-dark-600">
                  {['Column', 'Mean', 'Median', 'Std', 'Min', 'Max', 'Nulls'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {numCols.map(col => {
                  const s = data.summary_stats?.[col] || {}
                  return (
                    <tr key={col} className="border-b border-dark-700 hover:bg-dark-700 transition-colors">
                      <td className="px-3 py-2 font-medium text-gray-200">{col}</td>
                      <td className="px-3 py-2 text-gray-300">{s.mean?.toFixed(3) ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-300">{s.median?.toFixed(3) ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-300">{s.std?.toFixed(3) ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-300">{s.min?.toFixed(3) ?? '—'}</td>
                      <td className="px-3 py-2 text-gray-300">{s.max?.toFixed(3) ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className={s.nulls > 0 ? 'text-orange-400' : 'text-green-400'}>{s.nulls ?? 0}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <p className="text-gray-400 text-sm">No numeric columns found.</p>}
      </div>
    </div>
  )
}
