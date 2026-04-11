import { useState, useEffect, useRef } from 'react'
import { X, Send, RotateCcw, Sparkles } from 'lucide-react'
import { useEmpresa } from '../context/EmpresaContext'
import { detectarModulos, fetchContexto } from '../lib/chatbotData'
import { buildSystemPrompt, llamarClaude } from '../lib/chatbotPrompt'

// Avatar con fallback a círculo con "L"
function LushuAvatar({ className = 'w-9 h-9' }) {
  const [error, setError] = useState(false)
  if (error) {
    return (
      <div className={`${className} rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
        L
      </div>
    )
  }
  return (
    <img
      src="/lushu-avatar.png"
      alt="Luchus"
      className={`${className} rounded-full object-cover flex-shrink-0`}
      onError={() => setError(true)}
    />
  )
}

// Renderiza texto con formato básico: negrita, viñetas, saltos de línea
function MensajeTexto({ texto }) {
  const lines = texto.split('\n')
  return (
    <div className="space-y-0.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />
        const parts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <p key={i}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        )
      })}
    </div>
  )
}

// Dots animados "escribiendo..."
function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center py-1">
      {[0, 150, 300].map(delay => (
        <div key={delay} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: '0.9s' }} />
      ))}
    </div>
  )
}

const SUGERENCIAS = [
  '¿Cuál es el resumen del día?',
  '¿Cuánto vendimos este mes?',
  '¿Qué productos tienen stock bajo?',
  '¿Hay cheques por vencer esta semana?',
  '¿Cuántos servicios se hicieron esta semana?',
  '¿Qué sucursal vendió más este mes?',
]

export default function ChatBot() {
  const { nombreEmpresa, alertas } = useEmpresa()

  const [abierto, setAbierto] = useState(false)
  const [historial, setHistorial] = useState([])       // { role, content }
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [inicializado, setInicializado] = useState(false)
  const [hayAlertasChat, setHayAlertasChat] = useState(false)

  // M9: límite de mensajes por sesión para controlar costos de API
  const LIMITE_MENSAJES = 20   // máx. intercambios usuario→asistente por sesión
  const mensajesUsuario = historial.filter(m => m.role === 'user').length
  const limiteAlcanzado = mensajesUsuario >= LIMITE_MENSAJES

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const drawerRef = useRef(null)

  // Scroll al fondo en cada nuevo mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historial, cargando])

  // Al abrir: focus en input + generar saludo si es la primera vez
  useEffect(() => {
    if (!abierto) return
    setTimeout(() => inputRef.current?.focus(), 300)
    if (!inicializado) generarSaludo()
  }, [abierto])

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setAbierto(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // S4 — Alt+B toggle desde useAtajos
  useEffect(() => {
    const handler = () => setAbierto(v => !v)
    window.addEventListener('bikloud:toggle-chatbot', handler)
    return () => window.removeEventListener('bikloud:toggle-chatbot', handler)
  }, [])

  async function generarSaludo() {
    setInicializado(true)
    setCargando(true)

    try {
      const contexto = await fetchContexto(['base'])
      const base = contexto.base || {}

      const hayAlertas = (
        (base.cheques_por_vencer_7dias?.length > 0) ||
        (base.stock_critico?.length > 0) ||
        (base.cobros_pendientes?.total_clp > 0)
      )
      setHayAlertasChat(hayAlertas)

      const systemPrompt = buildSystemPrompt(nombreEmpresa, contexto)

      const prompt = `Genera un saludo de bienvenida para el equipo de ${nombreEmpresa}. Incluye:
1. Saludo según la hora del día
2. Resumen ejecutivo del día con los datos disponibles (ventas, servicios, alertas)
3. Si hay alertas urgentes (cheques por vencer, stock crítico, cobros pendientes), destácalas claramente
4. Termina con una frase motivadora breve
Máximo 180 palabras. Usa viñetas y emojis para el resumen.`

      const respuesta = await llamarClaude(systemPrompt, [{ role: 'user', content: prompt }])
      setHistorial([{ role: 'assistant', content: respuesta }])
    } catch (e) {
      setHistorial([{
        role: 'assistant',
        content: `No pude conectarme en este momento.\n\nError: ${e.message}\n\nPuedes intentar preguntar directamente o reiniciar el chat con el botón ↺.`,
      }])
    } finally {
      setCargando(false)
    }
  }

  async function enviarMensaje(textoDirecto) {
    const msg = textoDirecto || input.trim()
    if (!msg || cargando || limiteAlcanzado) return
    setInput('')

    const nuevoHistorial = [...historial, { role: 'user', content: msg }]
    setHistorial(nuevoHistorial)
    setCargando(true)

    try {
      const modulos = detectarModulos(msg)
      const contexto = await fetchContexto(modulos)
      const systemPrompt = buildSystemPrompt(nombreEmpresa, contexto)

      // Máximo últimos 12 mensajes para no superar tokens
      const historialAPI = nuevoHistorial.slice(-12)

      const respuesta = await llamarClaude(systemPrompt, historialAPI)
      setHistorial(prev => [...prev, { role: 'assistant', content: respuesta }])
    } catch (e) {
      setHistorial(prev => [...prev, {
        role: 'assistant',
        content: `Ocurrió un error al procesar tu pregunta.\n\nError: ${e.message}`,
      }])
    } finally {
      setCargando(false)
    }
  }

  function reiniciarChat() {
    setHistorial([])
    setInicializado(false)
    setHayAlertasChat(false)
    generarSaludo()
  }

  const totalAlertas = (alertas?.cheques || 0) + (alertas?.stockBajo || 0)

  return (
    <>
      {/* ── Drawer ── */}
      <div
        ref={drawerRef}
        className={`fixed top-0 right-0 h-full z-50 flex flex-col shadow-2xl
          transition-transform duration-300 ease-in-out
          w-full sm:w-[400px] lg:w-[30vw] lg:min-w-[380px] lg:max-w-[520px]
          ${abierto ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ background: 'linear-gradient(160deg, #e8f4fd 0%, #dbeeff 50%, #e4f0fb 100%)' }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <div className="relative">
            <LushuAvatar className="w-10 h-10 border-2 border-blue-400/60" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-white font-semibold text-sm">Luchus</p>
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            </div>
            <p className="text-slate-400 text-xs truncate">Asistente de {nombreEmpresa}</p>
          </div>
          <button
            onClick={reiniciarChat}
            title="Reiniciar chat"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setAbierto(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin relative"
          style={{
            backgroundImage: 'url(/lushu-avatar.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}>
          {/* Overlay que desvanece la imagen */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(160deg, rgba(232,244,253,0.82) 0%, rgba(219,238,255,0.80) 50%, rgba(228,240,251,0.82) 100%)' }} />

          {/* Skeleton inicial */}
          {historial.length === 0 && cargando && (
            <div className="relative z-10 flex items-start gap-2.5">
              <LushuAvatar className="w-8 h-8 mt-0.5" />
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl rounded-tl-sm p-3.5 shadow-lg border border-white/30 space-y-2.5 max-w-[85%]">
                <div className="skeleton h-2.5 w-44 rounded-full" />
                <div className="skeleton h-2.5 w-56 rounded-full" />
                <div className="skeleton h-2.5 w-36 rounded-full" />
                <div className="skeleton h-2.5 w-48 rounded-full" />
                <div className="skeleton h-2.5 w-32 rounded-full" />
              </div>
            </div>
          )}

          {/* Historial de mensajes */}
          {historial.map((msg, i) => (
            <div key={i} className={`relative z-10 flex items-end gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'assistant' && <LushuAvatar className="w-8 h-8 mb-0.5" />}
              <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm font-medium
                ${msg.role === 'user'
                  ? 'bg-blue-600/80 backdrop-blur-sm text-white rounded-br-sm shadow-lg'
                  : 'bg-white/20 backdrop-blur-sm text-slate-900 rounded-bl-sm border border-white/30 shadow-lg'
                }`}
                style={{ textShadow: msg.role === 'assistant' ? '0 1px 3px rgba(255,255,255,0.8)' : 'none' }}>
                {msg.role === 'assistant'
                  ? <MensajeTexto texto={msg.content} />
                  : <p className="leading-relaxed">{msg.content}</p>
                }
              </div>
            </div>
          ))}

          {/* Indicador "escribiendo..." */}
          {cargando && historial.length > 0 && (
            <div className="relative z-10 flex items-end gap-2.5">
              <LushuAvatar className="w-8 h-8 mb-0.5" />
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl rounded-bl-sm px-4 py-3 shadow-lg border border-white/30">
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Sugerencias rápidas (solo al inicio) */}
        {historial.length <= 1 && !cargando && (
          <div className="px-3 py-2.5 flex gap-2 overflow-x-auto flex-shrink-0 border-t border-sky-100/60 scrollbar-thin" style={{ background: 'rgba(232,244,253,0.92)' }}>
            {SUGERENCIAS.map((s, i) => (
              <button key={i} onClick={() => enviarMensaje(s)}
                className="flex-shrink-0 text-xs bg-sky-100/70 hover:bg-sky-200/80 hover:text-sky-800 text-sky-700 border border-sky-200/60 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap font-medium backdrop-blur-sm">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Disclaimer IA */}
        <div className="px-3 py-2 border-t border-sky-100/60 flex-shrink-0 flex items-center gap-2" style={{ background: 'rgba(255,251,235,0.95)' }}>
          <Sparkles className="w-3 h-3 text-amber-500 flex-shrink-0" />
          <p className="text-[11px] text-amber-700 leading-tight">
            <strong>Luchus es una IA</strong> y puede entregar información incorrecta o incompleta. Verifica los datos importantes antes de tomar decisiones.
          </p>
        </div>

        {/* Input */}
        <div className="p-3 border-t border-sky-100/60 flex-shrink-0" style={{ background: 'rgba(232,244,253,0.95)' }}>
          {limiteAlcanzado ? (
            <div className="text-center py-2">
              <p className="text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Límite de {LIMITE_MENSAJES} mensajes por sesión alcanzado.
              </p>
              <button onClick={reiniciarChat}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-semibold underline transition-colors">
                Reiniciar conversación
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      enviarMensaje()
                    }
                  }}
                  rows={1}
                  placeholder="Escribe tu pregunta..."
                  className="flex-1 resize-none border border-sky-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition-shadow text-slate-800 placeholder-sky-400"
                  style={{ background: 'rgba(255,255,255,0.7)', minHeight: '42px', maxHeight: '96px' }}
                />
                <button
                  onClick={() => enviarMensaje()}
                  disabled={!input.trim() || cargando}
                  className="flex-shrink-0 w-[42px] h-[42px] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 text-center">
                Enter para enviar · Shift+Enter para nueva línea
                {mensajesUsuario > 0 && (
                  <span className="ml-2 text-slate-300">· {LIMITE_MENSAJES - mensajesUsuario} restantes</span>
                )}
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Backdrop (solo mobile/tablet) ── */}
      {abierto && (
        <div
          className="fixed inset-0 bg-black/25 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setAbierto(false)}
        />
      )}

      {/* ── Botón flotante ── */}
      <button
        id="chatbot-fab"
        onClick={() => setAbierto(true)}
        title="Abrir Luchus"
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full
          bg-gradient-to-br from-blue-600 to-blue-700
          hover:from-blue-500 hover:to-blue-600
          shadow-lg shadow-blue-600/40
          flex items-center justify-center
          transition-all duration-200 hover:scale-110 active:scale-95
          ${abierto ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
      >
        <LushuAvatar className="w-9 h-9 border-2 border-white/30" />

        {/* Badge de alertas */}
        {totalAlertas > 0 && !abierto && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center px-1">
            <span className="text-white text-[11px] font-bold leading-none">
              {totalAlertas > 9 ? '9+' : totalAlertas}
            </span>
          </span>
        )}

        {/* Pulso animado si hay alertas */}
        {hayAlertasChat && !abierto && (
          <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20" />
        )}
      </button>
    </>
  )
}
