import { useEffect, useRef, useState } from 'react'
import { chatApi } from '../utils/api'
import { MessageSquare, Send, Trash2, Bot, User } from 'lucide-react'
import toast from 'react-hot-toast'

const SUGGESTIONS = [
  'Summarize this dataset for me',
  'What are the most important features?',
  'Are there any data quality issues?',
  'What patterns do you see in the data?',
  'What would you recommend analyzing next?',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
        isUser ? 'bg-primary-600' : 'bg-dark-600 border border-dark-500'
      }`}>
        {isUser ? <User size={13} className="text-white" /> : <Bot size={13} className="text-primary-400" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-primary-600 text-white rounded-tr-sm'
          : 'bg-dark-700 border border-dark-600 text-gray-200 rounded-tl-sm'
      }`}>
        <div className="whitespace-pre-wrap break-words">{msg.message || msg.content}</div>
        {msg.created_at && (
          <div className={`text-xs mt-1.5 ${isUser ? 'text-primary-200' : 'text-gray-500'}`}>
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatTab({ datasetId, dataset }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })

  useEffect(() => {
    chatApi.history(datasetId)
      .then(r => {
        setMessages(r.data)
        setTimeout(scrollToBottom, 100)
      })
      .catch(() => {})
  }, [datasetId])

  useEffect(() => { scrollToBottom() }, [messages])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return

    const userMsg = { role: 'user', message: msg, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await chatApi.send(msg, Number(datasetId))
      const aiMsg = { role: 'assistant', message: res.data.reply, created_at: new Date().toISOString() }
      setMessages(prev => [...prev, aiMsg])
    } catch (e) {
      toast.error('Failed to get response')
      setMessages(prev => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  const clearHistory = async () => {
    if (!confirm('Clear chat history?')) return
    try {
      await chatApi.clear(datasetId)
      setMessages([])
      toast.success('Chat cleared')
    } catch {
      toast.error('Failed to clear')
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  // Improved scroll strategy
  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 50)
    return () => clearTimeout(timer)
  }, [messages, loading])

  return (
    <div className="flex flex-col h-full w-full mx-auto max-w-6xl" style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <MessageSquare size={15} className="text-primary-400" />
            Chat with Your Data
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Ask anything about <span className="text-gray-300">{dataset.filename}</span></p>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors">
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-2 pb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
            <div className="p-4 bg-primary-600/10 rounded-2xl">
              <Bot size={32} className="text-primary-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-300 mb-1">AutoAnalyst AI is ready</p>
              <p className="text-xs text-gray-500">Ask questions about your dataset in plain English</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-md">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-left text-sm px-4 py-2.5 bg-dark-700 hover:bg-dark-600 border border-dark-500 hover:border-primary-600/40 rounded-xl text-gray-400 hover:text-gray-200 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && (
              <div className="flex gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full bg-dark-600 border border-dark-500 flex items-center justify-center">
                  <Bot size={13} className="text-primary-400" />
                </div>
                <div className="bg-dark-700 border border-dark-600 rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} className="h-1" />
          </>
        )}
      </div>

      {/* Input */}
      <div className="mt-4 flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask about your data... (Enter to send, Shift+Enter for new line)"
          disabled={loading}
          rows={2}
          className="input flex-1 resize-none text-sm py-2.5"
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="btn-primary px-4 self-end h-10 flex items-center gap-1.5"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  )
}
