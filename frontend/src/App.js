import React from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import Dashboard from '@/pages/Dashboard';
import PrintPageInternal from '@/pages/PrintPageInternal';
import PrintPageCliente from '@/pages/PrintPageCliente';
import ColaboradoresPage from '@/pages/ColaboradoresPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/print-interno/:orderId" element={<PrintPageInternal />} />
          <Route path="/print-cliente/:orderId" element={<PrintPageCliente />} />
          <Route path="/colaboradores" element={<ColaboradoresPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;