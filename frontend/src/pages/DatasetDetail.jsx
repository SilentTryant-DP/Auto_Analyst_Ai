import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { datasetsApi, analysisApi, mlApi, insightsApi } from '../utils/api'
import toast from 'react-hot-toast'
import { ArrowLeft, Database, BarChart3, Brain, MessageSquare, Lightbulb, Table } from 'lucide-react'
import EDATab from '../components/EDATab'
import MLTab from '../components/MLTab'
import InsightsTab from '../components/InsightsTab'
import ChatTab from '../components/ChatTab'
import PreviewTab from '../components/PreviewTab'

const TABS = [
  { id: 'preview', label: 'Preview', icon: Table },
  { id: 'eda', label: 'EDA', icon: BarChart3 },
  { id: 'ml', label: 'ML Models', icon: Brain },
  { id: 'insights', label: 'AI Insights', icon: Lightbulb },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
]

export default function DatasetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('preview')
  const [dataset, setDataset] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    datasetsApi.get(id)
      .then(r => setDataset(r.data))
      .catch(() => toast.error('Dataset not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!dataset) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <p className="text-gray-400">Dataset not found</p>
      <button onClick={() => navigate('/')} className="btn-secondary text-sm">← Back</button>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-0 border-b border-dark-600 bg-dark-800/50">
        <button onClick={() => navigate('/')} className="flex items-center gap-1.5 text-gray-400 hover:text-gray-200 text-sm mb-4 transition-colors">
          <ArrowLeft size={14} /> Back to Dashboard
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary-600/20 rounded-lg">
            <Database size={18} className="text-primary-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">{dataset.filename}</h1>
            <p className="text-xs text-gray-400">
              {dataset.rows?.toLocaleString()} rows · {dataset.columns} columns · ID #{id}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(({ id: tid, label, icon: Icon }) => (
            <button
              key={tid}
              onClick={() => setTab(tid)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-all ${
                tab === tid
                  ? 'border-primary-500 text-primary-400 bg-dark-700/50'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:bg-dark-700/30'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'preview' && <PreviewTab datasetId={id} dataset={dataset} />}
        {tab === 'eda' && <EDATab datasetId={id} dataset={dataset} />}
        {tab === 'ml' && <MLTab datasetId={id} dataset={dataset} />}
        {tab === 'insights' && <InsightsTab datasetId={id} dataset={dataset} />}
        {tab === 'chat' && <ChatTab datasetId={id} dataset={dataset} />}
      </div>
    </div>
  )
}
