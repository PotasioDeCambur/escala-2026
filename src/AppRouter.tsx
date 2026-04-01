// React Router e Componentes
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import EscalaParcial from './EscalaParcial';
import MobileEscala from './MobileEscala';
import Pricing from './Pricing';
import AdminDashboard from './AdminDashboard'; // Mantém rota direta opcional

function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/parcial" element={<EscalaParcial />} />
        <Route path="/mobile" element={<MobileEscala />} />
        <Route path="/mobile/:linkId" element={<MobileEscala />} />

        {/* Rota pública de preços (mantida para quem quiser assinar) */}
        <Route path="/pricing" element={<Pricing />} />

        {/* Admin público opcional (sem guard) */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Rota principal aberta */}
        <Route path="/" element={<App />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default AppRouter;
