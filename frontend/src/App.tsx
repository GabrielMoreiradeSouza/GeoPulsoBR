import { BrowserRouter } from "react-router-dom"
import { AppRouters } from "./Routes/app.routers"

function App() {
  return (
    <BrowserRouter>
      <AppRouters />
    </BrowserRouter>
  )
}

export default App