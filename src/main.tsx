import React from 'react';
import ReactDOM from 'react-dom/client';
import { PancakeDashboard } from './components/PancakeDashboard'; // Ajusta la ruta si tu componente está en otra subcarpeta dentro de src

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PancakeDashboard />
  </React.StrictMode>
);
