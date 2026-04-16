import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { datasetsApi } from '../utils/api'
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const navigate = useNavigate()

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setFile(accepted[0])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxFiles: 1,
  })

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const res = await datasetsApi.upload(file)
      setResult(res.data)
      toast.success('Dataset uploaded successfully!')
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Upload Dataset</h1>
        <p className="text-gray-400 text-sm">Supported formats: CSV, Excel (.xlsx, .xls)</p>
      </div>

      {!result ? (
        <div className="space-y-5">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
              isDragActive
                ? 'border-primary-500 bg-primary-600/10'
                : file
                ? 'border-green-500/50 bg-green-500/5'
                : 'border-dark-500 hover:border-primary-600/50 hover:bg-dark-700/50'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              {file ? (
                <>
                  <CheckCircle size={40} className="text-green-400" />
                  <div>
                    <p className="font-medium text-white">{file.name}</p>
                    <p className="text-sm text-gray-400">{formatBytes(file.size)}</p>
                  </div>
                  <p className="text-xs text-gray-500">Click or drag to replace</p>
                </>
              ) : (
                <>
                  <Upload size={40} className="text-gray-500" />
                  <div>
                    <p className="font-medium text-gray-300">
                      {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">or click to browse</p>
                  </div>
                  <p className="text-xs text-gray-600">CSV, XLSX, XLS supported</p>
                </>
              )}
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading & Processing...
              </>
            ) : (
              <>
                <Upload size={16} />
                Upload Dataset
              </>
            )}
          </button>

          {/* Tips */}
          <div className="card">
            <h3 className="font-medium text-gray-300 mb-3 text-sm">What happens after upload?</h3>
            <div className="space-y-2">
              {[
                'AutoAnalyst reads and validates your file',
                'Run EDA to explore distributions, missing values, correlations',
                'Train ML models automatically on any target column',
                'Get AI-powered insights and explanations from Llama3',
                'Chat with AI about your data in natural language',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-gray-400">
                  <span className="text-primary-400 font-bold shrink-0">{i + 1}.</span>
                  {tip}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Success State */
        <div className="space-y-5">
          <div className="card border-green-500/30 bg-green-500/5">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={24} className="text-green-400" />
              <div>
                <div className="font-semibold text-white">Upload Successful!</div>
                <div className="text-sm text-gray-400">{result.filename}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Rows', value: result.rows?.toLocaleString() },
                { label: 'Columns', value: result.columns },
                { label: 'File Size', value: formatBytes(result.file_size) },
                { label: 'Status', value: result.status || 'ready' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-dark-700 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-0.5">{label}</div>
                  <div className="font-semibold text-white">{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <p className="text-sm text-gray-400 mb-1 font-medium">Columns detected:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {result.column_names?.map(col => (
                <span key={col} className="badge bg-dark-600 text-gray-300 border border-dark-500">{col}</span>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => navigate(`/dataset/${result.id}`)} className="btn-primary flex-1 flex items-center justify-center gap-2">
              Analyze Dataset <ArrowRight size={16} />
            </button>
            <button onClick={() => { setFile(null); setResult(null) }} className="btn-secondary">
              Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
