import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import EstadoPage from "../Pages/Estados/EstadoPage"

const HomePages = lazy(() => import("../Pages/HomePages"))

export const AppRouters = () => {
  return (
    <Routes>
         <Route path="/" element={<Navigate to="/home" replace />} />
         <Route path="/home" element={<Suspense fallback={<p role="status">Carregando mapa…</p>}><HomePages /></Suspense>} />
         <Route path="/estado/:slug" element={<EstadoPage />} />
         <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  )
}
