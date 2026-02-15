/**
 * @file App.jsx
 * @description Root application component. Wraps the page router with the
 * POCOFieldsProvider context and renders the global toast notification container.
 */

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