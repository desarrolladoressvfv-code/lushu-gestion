import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * S4 — Atajos de teclado globales
 *
 * Alt+N → Nuevo servicio
 * Alt+D → Dashboard
 * Alt+I → Inventario
 * Alt+S → Servicios
 * Alt+B → Abrir/cerrar chatbot (dispara evento personalizado)
 */
export function useAtajos() {
  const navigate = useNavigate()

  useEffect(() => {
    function handler(e) {
      // Ignorar si el foco está en un input, textarea o select
      const tag = document.activeElement?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      // Ignorar si está presionado Ctrl o Meta (para no conflictuar con Ctrl+K)
      if (e.ctrlKey || e.metaKey) return

      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'n':
            e.preventDefault()
            navigate('/formulario')
            break
          case 'd':
            e.preventDefault()
            navigate('/dashboard')
            break
          case 'i':
            e.preventDefault()
            navigate('/inventario')
            break
          case 's':
            e.preventDefault()
            navigate('/servicios')
            break
          case 'b':
            e.preventDefault()
            window.dispatchEvent(new CustomEvent('bikloud:toggle-chatbot'))
            break
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [navigate])
}
