import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import AppRouter from './AppRouter';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

// Importa o provedor de autenticação
import { AuthProvider } from './contexts/AuthContext';
// Importação de estilos globais
import './index.css';

root.render(
  <React.StrictMode>
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  </React.StrictMode>
); 