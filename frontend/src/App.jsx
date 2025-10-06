import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import { POCOFieldsProvider } from "@/contexts/POCOFieldsContext"

function App() {
  return (
    <POCOFieldsProvider>
      <Pages />
      <Toaster />
    </POCOFieldsProvider>
  )
}

export default App 