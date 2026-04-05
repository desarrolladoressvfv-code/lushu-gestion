import { createContext, useContext, useState } from 'react'

const TourContext = createContext(null)

/**
 * fase:
 *  null        → app normal
 *  'bienvenida'→ pantalla de bienvenida visible
 *  'tour'      → Driver.js corriendo
 *  'fin'       → pantalla de cierre visible
 */
export function TourProvider({ children }) {
  const [fase, setFase] = useState(null)

  return (
    <TourContext.Provider value={{ fase, setFase }}>
      {children}
    </TourContext.Provider>
  )
}

export const useTour = () => useContext(TourContext)
