import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
// import App from './stare/AppOLD.jsx'
// testowy stary App, z kafelkami i geolokalizacją

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
