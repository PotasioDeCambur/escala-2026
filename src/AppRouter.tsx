// React Router e Componentes
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import App from './App';
import EscalaParcial from './EscalaParcial';
import MobileEscala from './MobileEscala';
import Login from './Login';
import Pricing from './Pricing';
import AdminDashboard from './AdminDashboard'; // Importando o Admin
import { SubscriptionGuard } from './components/SubscriptionGuard';

function AppRouter() {
  return (
    <Router>
      <Routes>
        {/* Rotas Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/parcial" element={<EscalaParcial />} />
        <Route path="/mobile" element={<MobileEscala />} />
        <Route path="/mobile/:linkId" element={<MobileEscala />} />

        {/* Rota semi-protegida (apenas exige login, tratado no componente) */}
        <Route path="/pricing" element={<Pricing />} />

        {/* Rota Protegida do Admin (Proteção adicional dentro do componente) */}
        <Route
          path="/admin"
          element={
            <SubscriptionGuard>
              <AdminDashboard />
            </SubscriptionGuard>
          }
        />

        {/* Rota Protegida (Login + Assinatura Ativa) */}
        <Route
          path="/"
          element={
            <SubscriptionGuard>
              <App />
            </SubscriptionGuard>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default AppRouter;