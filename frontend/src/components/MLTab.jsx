import { useEffect, useState } from 'react'
import { mlApi } from '../utils/api'
import { Brain, Play, Trophy, Target, BarChart2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell } from 'recharts'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

export default function MLTab({ datasetId, dataset }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [target, setTarget] = useState('')
  const [problemType, setProblemType] = useState('auto')
  const [hasResult, setHasResult] = useState(false)

  useEffect(() => {
    mlApi.results(datasetId)
      .then(r => { setResult(r.data); setHasResult(true) })
      .catch(() => {})
  }, [datasetId])

  const handleTrain = async () => {
    if (!target) return toast.error('Please select a target column')
    setLoading(true)
    try {
      const res = await mlApi.train(datasetId, { target_column: target, problem_type: problemType })
      setResult(res.data)
      setHasResult(true)
      toast.success(`Training complete! Best model: ${res.data.best_model}`)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Training failed')
    } finally {
      setLoading(false)
    }
  }

  const columns = dataset.column_names || []

  // Prepare model comparison chart
  const modelChart = result?.all_models
    ? Object.entries(result.all_models)
        .filter(([, v]) => !v.error)
        .map(([name, metrics]) => ({
          name: name.replace(' ', '\n'),
          shortName: name.split(' ').map(w => w[0]).join(''),
          value: result.problem_type === 'classification'
            ? (metrics.accuracy || 0) * 100
            : Math.max(0, (metrics.r2 || 0) * 100),
          metric: result.problem_type === 'classification' ? 'Accuracy %' : 'R² %',
          ...metrics
        }))
    : []

  // Feature importance chart
  const featureChart = result?.feature_importance
    ? Object.entries(result.feature_importance)
        .slice(0, 10)
        .map(([name, val]) => ({ name: name.slice(0, 20), value: (val * 100).toFixed(1) }))
    : []

  const MetricBadge = ({ label, value, color = 'text-primary-400' }) => (
    <div className="bg-dark-700 rounded-xl p-4 text-center">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>
        {typeof value === 'number' ? (value > 1 ? value.toFixed(1) : (value * 100).toFixed(1) + '%') : value || '—'}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Training Form */}
      <div className="card">
        <h3 className="font-semibold text-white flex items-center gap-2 mb-5">
          <Brain size={15} className="text-primary-400" />
          Configure & Train ML Models
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Target Column *</label>
            <select value={target} onChange={e => setTarget(e.target.value)} className="select text-sm">
              <option value="">Select target column...</option>
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Problem Type</label>
            <select value={problemType} onChange={e => setProblemType(e.target.value)} className="select text-sm">
              <option value="auto">Auto Detect</option>
              <option value="classification">Classification</option>
              <option value="regression">Regression</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleTrain}
              disabled={loading || !target}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Training Models...
                </>
              ) : (
                <>
                  <Play size={14} />
                  {hasResult ? 'Retrain' : 'Train Models'}
                </>
              )}
            </button>
          </div>
        </div>
        <div className="bg-dark-700/50 rounded-lg p-3 text-xs text-gray-400">
          Models trained: <span className="text-gray-200">Linear/Logistic Regression · Decision Tree · Random Forest · Gradient Boosting · XGBoost</span>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Best Model Banner */}
          <div className="card border-primary-600/30 bg-primary-600/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-600/20 rounded-xl">
                  <Trophy size={20} className="text-primary-400" />
                </div>
                <div>
                  <div className="text-xs text-gray-400">Best Performing Model</div>
                  <div className="text-xl font-bold text-white">{result.best_model}</div>
                  <div className="text-xs text-primary-400 capitalize">{result.problem_type} · Target: {result.target_column}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 mb-1">
                  {result.problem_type === 'classification' ? 'Accuracy' : 'R² Score'}
                </div>
                <div className="text-3xl font-bold text-primary-400">
                  {result.problem_type === 'classification'
                    ? `${((result.best_metrics?.accuracy || 0) * 100).toFixed(1)}%`
                    : `${((result.best_metrics?.r2 || 0) * 100).toFixed(1)}%`}
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="card">
            <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
              <Target size={15} className="text-primary-400" />
              Performance Metrics — {result.best_model}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {result.problem_type === 'classification' ? (
                <>
                  <MetricBadge label="Accuracy" value={result.best_metrics?.accuracy} color="text-primary-400" />
                  <MetricBadge label="Precision" value={result.best_metrics?.precision} color="text-green-400" />
                  <MetricBadge label="Recall" value={result.best_metrics?.recall} color="text-yellow-400" />
                  <MetricBadge label="F1 Score" value={result.best_metrics?.f1} color="text-cyan-400" />
                </>
              ) : (
                <>
                  <MetricBadge label="R² Score" value={result.best_metrics?.r2} color="text-primary-400" />
                  <MetricBadge label="RMSE" value={result.best_metrics?.rmse?.toFixed(3)} color="text-red-400" />
                  <MetricBadge label="MAE" value={result.best_metrics?.mae?.toFixed(3)} color="text-yellow-400" />
                  <div className="bg-dark-700 rounded-xl p-4 text-center">
                    <div className="text-xs text-gray-400 mb-1">Train Samples</div>
                    <div className="text-2xl font-bold text-gray-200">{result.train_samples || '—'}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Model Comparison Chart */}
          {modelChart.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-primary-400" />
                Model Comparison
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={modelChart} margin={{ top: 0, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a5c" />
                  <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-15} textAnchor="end" />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #2a3a5c', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                    formatter={(val) => [`${val.toFixed(1)}%`, result.problem_type === 'classification' ? 'Accuracy' : 'R²']}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {modelChart.map((entry, i) => (
                      <Cell key={i} fill={entry.name === result.best_model ? '#6366f1' : '#374151'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Feature Importance */}
          {featureChart.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
                <BarChart2 size={15} className="text-primary-400" />
                Feature Importance (Top {featureChart.length})
              </h3>
              <ResponsiveContainer width="100%" height={Math.max(180, featureChart.length * 28)}>
                <BarChart data={featureChart} layout="vertical" margin={{ top: 0, right: 30, left: 80, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a3a5c" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 10 }} unit="%" />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={75} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid #2a3a5c', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                    formatter={(val) => [`${val}%`, 'Importance']}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {featureChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* All Models Table */}
          <div className="card">
            <h3 className="font-semibold text-white mb-4">All Model Results</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-600">
                    <th className="px-3 py-2 text-left text-gray-400 font-medium">Model</th>
                    {result.problem_type === 'classification'
                      ? ['Accuracy', 'Precision', 'Recall', 'F1'].map(h => <th key={h} className="px-3 py-2 text-left text-gray-400 font-medium">{h}</th>)
                      : ['R²', 'RMSE', 'MAE'].map(h => <th key={h} className="px-3 py-2 text-left text-gray-400 font-medium">{h}</th>)
                    }
                    <th className="px-3 py-2 text-left text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(result.all_models || {}).map(([name, metrics]) => (
                    <tr key={name} className={`border-b border-dark-700 hover:bg-dark-700 transition-colors ${name === result.best_model ? 'bg-primary-600/5' : ''}`}>
                      <td className="px-3 py-2.5">
                        <span className="font-medium text-gray-200">{name}</span>
                        {name === result.best_model && <span className="ml-2 badge bg-primary-600/20 text-primary-400">Best</span>}
                      </td>
                      {metrics.error ? (
                        <td colSpan={4} className="px-3 py-2.5 text-red-400 text-xs">{metrics.error}</td>
                      ) : result.problem_type === 'classification' ? (
                        <>
                          <td className="px-3 py-2.5 text-gray-300">{((metrics.accuracy || 0) * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2.5 text-gray-300">{((metrics.precision || 0) * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2.5 text-gray-300">{((metrics.recall || 0) * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2.5 text-gray-300">{((metrics.f1 || 0) * 100).toFixed(1)}%</td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2.5 text-gray-300">{(metrics.r2 || 0).toFixed(4)}</td>
                          <td className="px-3 py-2.5 text-gray-300">{(metrics.rmse || 0).toFixed(4)}</td>
                          <td className="px-3 py-2.5 text-gray-300">{(metrics.mae || 0).toFixed(4)}</td>
                        </>
                      )}
                      <td className="px-3 py-2.5">
                        <span className={`badge ${metrics.error ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {metrics.error ? 'Error' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
