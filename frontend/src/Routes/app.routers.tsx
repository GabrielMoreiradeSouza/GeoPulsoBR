import { Navigate, Route, Routes } from "react-router-dom"
import HomePages from "../Pages/HomePages"
import EstadoPage from "../Pages/Estados/EstadoPage"

export const AppRouters = () => {
  return (
    <Routes>
         <Route path="/" element={<Navigate to="/home" />} />
         <Route path="/home" element={<HomePages />} />
         <Route path="/estado/:slug" element={<EstadoPage />} />
    </Routes>
  )
}