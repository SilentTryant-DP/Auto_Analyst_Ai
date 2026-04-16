import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
})

export const datasetsApi = {
  upload: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/datasets/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  list: () => api.get('/datasets/'),
  get: (id) => api.get(`/datasets/${id}`),
  preview: (id, rows = 10) => api.get(`/datasets/${id}/preview?rows=${rows}`),
  delete: (id) => api.delete(`/datasets/${id}`),
}

export const analysisApi = {
  run: (id) => api.get(`/analysis/${id}`),
}

export const mlApi = {
  train: (id, data) => api.post(`/ml/${id}/train`, data),
  results: (id) => api.get(`/ml/${id}/results`),
}

export const insightsApi = {
  auto: (id) => api.get(`/insights/${id}/auto`),
  mlExplain: (id) => api.get(`/insights/${id}/ml-explanation`),
}

export const chatApi = {
  send: (message, dataset_id) => api.post('/chat/', { message, dataset_id }),
  history: (id) => api.get(`/chat/${id}/history`),
  clear: (id) => api.delete(`/chat/${id}/history`),
}

export default api
