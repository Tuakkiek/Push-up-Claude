// FILE: src/main.jsx
// ============================================
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

import { ProductTypeProvider } from './contexts/ProductTypeContext.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ProductTypeProvider>
      <App />
    </ProductTypeProvider>
  </React.StrictMode>,
)