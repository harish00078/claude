import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Preload font
const fontLink = document.createElement('link')
fontLink.href = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap'
fontLink.rel = 'stylesheet'
document.head.appendChild(fontLink)

// Create root and render
const container = document.getElementById('root')
const root = createRoot(container)

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)