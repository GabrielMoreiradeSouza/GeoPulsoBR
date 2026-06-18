import { Navigate, Route, Routes } from "react-router-dom"
import HomePages from "../Pages/HomePages"

export const AppRouters = () => {
  return (
    <Routes>
         <Route path="/" element={<Navigate to="/home" />} />
         <Route path="/home" element={<HomePages />} />
    </Routes>
  )
}