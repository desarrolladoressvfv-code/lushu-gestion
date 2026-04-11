import { useEffect, useRef, useState } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import {
  LayoutDashboard, FilePlus, FileText, ClipboardList,
  DollarSign, CreditCard, CheckSquare, Users, Package,
  ArrowLeftRight, ShoppingCart, Sparkles, PartyPopper,
  ChevronRight,
} from 'lucide-react'

/* ─── Pantalla de cierre del tour ─────────────────────── */
const MODULOS_FIN = [
  { icon: LayoutDashboard, label: 'Dashboard'    },
  { icon: FilePlus,        label: 'Servicios'    },
  { icon: DollarSign,      label: 'Ventas'       },
  { icon: CreditCard,      label: 'Formas Pago'  },
  { icon: Package,         label: 'Inventario'   },
  { icon: ShoppingCart,    label: 'Compras'      },
  { icon: Sparkles,        label: "Luchus"      },
  { icon: Users,           label: 'Fallecidos'   },
]

function PantallaFin({ onDashboard }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-y-auto"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0c1a3a 100%)' }}>

      {/* Círculos decorativos */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)' }} />

      <div className={`relative z-10 flex flex-col items-center text-center px-6 py-10 max-w-xl w-full
        transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

        {/* Ícono de celebración */}
        <div className="w-24 h-24 rounded-3xl bg-emerald-500/15 border border-emerald-500/30
                        flex items-center justify-center mb-6 animate-modal">
          <PartyPopper className="w-12 h-12 text-emerald-400" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
          ¡Ya conoces BiKloud!
        </h1>
        <p className="text-slate-400 text-base mt-3 max-w-sm mx-auto leading-relaxed">
          Estás listo para empezar a gestionar tu empresa de manera inteligente.
        </p>

        {/* Grid de módulos */}
        <div className="mt-8 grid grid-cols-4 gap-3 w-full max-w-sm">
          {MODULOS_FIN.map(m => (
            <div key={m.label}
              className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/10
                         rounded-xl p-2.5 hover:bg-white/8 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <m.icon style={{ width: 16, height: 16 }} className="text-blue-400" />
              </div>
              <span className="text-slate-400 text-[10px] font-medium leading-tight">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Botón ir al dashboard */}
        <button
          onClick={onDashboard}
          className="mt-10 flex items-center gap-3 bg-blue-600 hover:bg-blue-500 active:scale-95
                     text-white px-8 py-4 rounded-2xl font-bold text-base
                     transition-all duration-150 shadow-xl shadow-blue-600/30">
          Ir al Dashboard
          <ChevronRight className="w-5 h-5" />
        </button>

        <p className="mt-6 text-slate-700 text-xs">© 2026 BiKloud · Todos los derechos reservados</p>
      </div>
    </div>
  )
}

/* ─── Pasos del tour ──────────────────────────────────── */
function buildSteps(esPro) {
  const todos = [
    {
      id: 'nav-dashboard',
      title: '📊 Dashboard',
      desc: 'Aquí tienes una visión general de tu negocio en tiempo real: servicios activos, ingresos del mes y alertas importantes.',
    },
    esPro && {
      id: 'chatbot-fab',
      title: '✨ Lushu\'s — Tu asistente IA',
      desc: 'Pregúntale cualquier cosa sobre tus datos: "¿Cuántos servicios tuve este mes?" o "¿Qué productos están por vencer?"',
    },
    {
      id: 'nav-formulario',
      title: '📋 Nuevo Servicio',
      desc: 'Registra cada servicio funerario desde aquí. Datos del fallecido, convenio, productos y responsable del servicio.',
    },
    esPro && {
      id: 'nav-cotizacion',
      title: '📄 Cotización',
      desc: 'Genera cotizaciones profesionales en PDF para tus clientes con todos los detalles del servicio y precios.',
    },
    {
      id: 'nav-servicios',
      title: '🗂️ Servicios',
      desc: 'Consulta y filtra el historial completo de servicios. Busca por fecha, estado, convenio o nombre del fallecido.',
    },
    {
      id: 'nav-fallecidos',
      title: '📁 Fallecidos',
      desc: 'Registro centralizado de fallecidos asociado a cada servicio. Acceso rápido a ficha completa.',
    },
    esPro && {
      id: 'nav-ventas',
      title: '💰 Ventas',
      desc: 'Resumen financiero de todas tus ventas. Filtros por período, convenio y estado de pago.',
    },
    esPro && {
      id: 'nav-formas-pago',
      title: '💳 Formas de Pago',
      desc: 'Controla cómo te están pagando tus clientes. Alertas automáticas de pagos pendientes.',
    },
    esPro && {
      id: 'nav-cheques',
      title: '🔖 Cheques',
      desc: 'Gestiona y monitorea tus cheques vigentes, cobrados y por vencer. Alertas antes del vencimiento.',
    },
    {
      id: 'nav-inventario',
      title: '📦 Stock Actual',
      desc: 'Controla tu inventario por sucursal en tiempo real. Alertas cuando el stock cae bajo el mínimo.',
    },
    esPro && {
      id: 'nav-movimientos',
      title: '↔️ Movimientos',
      desc: 'Historial completo de entradas y salidas de inventario. Trazabilidad total de cada producto.',
    },
    esPro && {
      id: 'nav-compras',
      title: '🛒 Órdenes de Compra',
      desc: 'Gestiona tus compras a proveedores desde aquí. Crea órdenes, recibe mercadería y controla costos.',
    },
  ].filter(Boolean)

  // Convertir a formato Driver.js, filtrando los que no existen en el DOM
  return todos.map(s => ({
    element: `#${s.id}`,
    popover: {
      title: s.title,
      description: s.desc,
      side: 'right',
      align: 'start',
    },
  }))
}

/* ─── Componente principal ────────────────────────────── */
export default function TourBiKloud({ activo, esPro, onFin, onSaltar }) {
  const driverRef  = useRef(null)
  const [mostrando, setMostrando] = useState(false) // completion screen

  useEffect(() => {
    if (!activo) return

    // M6: en pantallas pequeñas el tour de Driver.js no se ve bien → saltar directo al fin
    if (window.innerWidth < 768) {
      onFin()
      return
    }

    // Abrir sidebar en móvil antes de iniciar
    window.dispatchEvent(new CustomEvent('bikloud:open-sidebar'))

    // Pequeño delay para que el sidebar se abra antes de que Driver.js empiece
    const t = setTimeout(() => {
      const steps = buildSteps(esPro)

      driverRef.current = driver({
        animate: true,
        smoothScroll: true,
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Siguiente →',
        prevBtnText: '← Anterior',
        doneBtnText: 'Finalizar',
        allowClose: true,
        steps,
        onDestroyStarted: () => {
          driverRef.current?.destroy()
        },
        onDestroyed: () => {
          setMostrando(true) // Mostrar pantalla de cierre
        },
      })

      driverRef.current.drive()
    }, 400)

    return () => {
      clearTimeout(t)
      driverRef.current?.destroy()
    }
  }, [activo, esPro, onFin])

  function handleDashboard() {
    setMostrando(false)
    onFin() // Marca onboarding completo + setFase(null)
  }

  if (mostrando) {
    return <PantallaFin onDashboard={handleDashboard} />
  }

  return null
}
