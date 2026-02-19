/**
 * @file main.jsx
 * @description Application entry point. Mounts the React root component into the DOM.
 */

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
) 