import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { datasetsApi } from '../utils/api'
import { Database, Upload, Trash2, Eye, FileText, TrendingUp, Brain } from 'lucide-react'
import toast from 'react-hot-toast'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(str) {
  return new Date(str).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function Dashboard() {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = async () => {
    try {
      const res = await datasetsApi.list()
      setDatasets(res.data)
    } catch {
      toast.error('Failed to load datasets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this dataset?')) return
    try {
      await datasetsApi.delete(id)
      toast.success('Dataset deleted')
      load()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const totalRows = datasets.reduce((s, d) => s + (d.rows || 0), 0)
  const totalSize = datasets.reduce((s, d) => s + (d.file_size || 0), 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
        <p className="text-gray-400 text-sm">Your uploaded datasets and analyses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Datasets', value: datasets.length, icon: Database, color: 'text-primary-400' },
          { label: 'Total Rows', value: totalRows.toLocaleString(), icon: FileText, color: 'text-green-400' },
          { label: 'Storage Used', value: formatBytes(totalSize), icon: TrendingUp, color: 'text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-dark-700 ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Datasets List */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Database size={16} className="text-primary-400" />
            Datasets
          </h2>
          <button onClick={() => navigate('/upload')} className="btn-primary flex items-center gap-2 text-sm">
            <Upload size={14} />
            Upload New
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : datasets.length === 0 ? (
          <div className="text-center py-16">
            <Database size={40} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-1">No datasets yet</p>
            <p className="text-gray-500 text-sm mb-4">Upload a CSV or Excel file to get started</p>
            <button onClick={() => navigate('/upload')} className="btn-primary text-sm">
              Upload Your First Dataset
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {datasets.map(d => (
              <div
                key={d.id}
                onClick={() => navigate(`/dataset/${d.id}`)}
                className="flex items-center justify-between p-4 bg-dark-700 rounded-xl border border-dark-500 hover:border-primary-600/50 cursor-pointer transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary-600/20 rounded-lg">
                    <FileText size={18} className="text-primary-400" />
                  </div>
                  <div>
                    <div className="font-medium text-white group-hover:text-primary-300 transition-colors">
                      {d.filename}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {d.rows?.toLocaleString()} rows · {d.columns} columns · {formatBytes(d.file_size)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{formatDate(d.uploaded_at)}</span>
                  <span className={`badge ${d.status === 'ready' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {d.status}
                  </span>
                  <button
                    onClick={(e) => handleDelete(e, d.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
