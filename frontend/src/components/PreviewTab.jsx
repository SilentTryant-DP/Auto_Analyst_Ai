import { useEffect, useState } from 'react'
import { datasetsApi } from '../utils/api'
import { Table, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PreviewTab({ datasetId, dataset }) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState(20)

  const load = async () => {
    setLoading(true)
    try {
      const res = await datasetsApi.preview(datasetId, rows)
      setPreview(res.data)
    } catch {
      toast.error('Failed to load preview')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [datasetId, rows])

  const dtypes = dataset.dtypes || {}

  const typeColor = (col) => {
    const t = dtypes[col] || ''
    if (t.includes('int') || t.includes('float')) return 'text-blue-400'
    if (t.includes('object')) return 'text-yellow-400'
    if (t.includes('bool')) return 'text-green-400'
    return 'text-gray-400'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Table size={16} className="text-primary-400" />
            Data Preview
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Showing {rows} of {dataset.rows?.toLocaleString()} rows
          </p>
        </div>
        <select
          value={rows}
          onChange={e => setRows(Number(e.target.value))}
          className="select w-32 text-sm"
        >
          {[10, 20, 50, 100].map(n => (
            <option key={n} value={n}>Show {n}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : preview ? (
        <div className="rounded-xl border border-dark-600 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-dark-700 border-b border-dark-600">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs text-gray-500 font-medium w-10">#</th>
                  {preview.columns.map(col => (
                    <th key={col} className="px-3 py-2.5 text-left whitespace-nowrap">
                      <div className="font-semibold text-gray-200 text-xs">{col}</div>
                      <div className={`text-xs font-normal mt-0.5 ${typeColor(col)}`}>
                        {dtypes[col] || 'unknown'}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.data.map((row, i) => (
                  <tr key={i} className={`border-b border-dark-700 ${i % 2 === 0 ? 'bg-dark-800' : 'bg-dark-750'} hover:bg-dark-700 transition-colors`}>
                    <td className="px-3 py-2 text-gray-500 text-xs">{i + 1}</td>
                    {preview.columns.map(col => (
                      <td key={col} className="px-3 py-2 text-gray-300 whitespace-nowrap max-w-48 truncate text-xs">
                        {row[col] === null || row[col] === undefined ? (
                          <span className="text-red-400/60 italic">null</span>
                        ) : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Column info */}
      <div className="mt-5 card">
        <h3 className="font-medium text-gray-300 mb-3 text-sm">Column Summary</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {(dataset.column_names || []).map(col => {
            let eg = 'unknown'
            if (preview?.data) {
              const row = preview.data.find(r => r[col] !== null && r[col] !== undefined && r[col] !== '')
              if (row) {
                eg = String(row[col])
                if (eg.length > 30) eg = eg.substring(0, 30) + '...'
              } else {
                eg = 'null'
              }
            }
            return (
              <div key={col} className="bg-dark-700 rounded-lg px-3 py-2 flex flex-col justify-center">
                <div className="font-medium text-gray-200 text-xs truncate">{col}</div>
                <div className={`text-xs mt-0.5 truncate ${typeColor(col)}`} title={eg}>
                  <span className="opacity-60">e.g.,</span> {eg}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
