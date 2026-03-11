import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'login' | 'signup'>('login');

  // Estado para login com email
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Erro no login:', error);
      alert('Falha ao autenticar com Google. Tente novamente.');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } catch (error: any) {
      console.error('Erro no login:', error);
      alert('Erro ao entrar: ' + (error.message || 'Verifique seus dados'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUpWithEmail(formData.email, formData.password);
      // Após criação, tentar fazer o login do usuário silenciosamente
      try {
        await signInWithEmail(formData.email, formData.password);
      } catch (err) {
        // Ignora erro se for preciso confirmar e-mail
      }
    } catch (error: any) {
      console.error('Erro ao criar conta:', error);
      alert('Erro ao criar conta: ' + (error.message || 'Tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">

        {/* Lado Esquerdo (Visual/Info) - Oculto em mobile se quiser simplificar, mas vamos deixar simples */}
        <div className="brand-section">
          <div className="icon-calendar">📅</div>
          <h1>Escala de Horários</h1>
          <p>Organize sua equipe de forma simples, rápida e profissional.</p>
        </div>

        {/* Lado Direito (Ações) */}
        <div className="action-section">

          {/* Seletor de Modo (Abas) */}
          <div className="mode-selector">
            <button
              className={`mode-btn ${view === 'login' ? 'active' : ''}`}
              onClick={() => setView('login')}
            >
              Já sou Cliente
            </button>
            <button
              className={`mode-btn ${view === 'signup' ? 'active' : ''}`}
              onClick={() => setView('signup')}
            >
              Novo Usuário
            </button>
          </div>

          <div className="form-content">
            {view === 'login' ? (
              <div className="login-view fade-in">
                <h2>Bem-vindo de volta! 👋</h2>
                <p className="instruction">Entre com seu e-mail e senha ou use o Google.</p>

                <form onSubmit={handleEmailLogin} className="email-login-form">
                  <div className="input-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="input-group">
                    <label>Senha</label>
                    <input
                      type="password"
                      placeholder="******"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>

                  <button type="submit" className="primary-btn" disabled={loading}>
                    {loading ? 'Entrando...' : 'Entrar'}
                  </button>
                </form>

                <div className="divider">
                  <span>OU</span>
                </div>

                <button className="google-btn" onClick={handleLogin}>
                  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Entrar com Google
                </button>

                <div className="help-text">
                  <p>Problemas para entrar? <br /> Chame no suporte: (xx) 9xxxx-xxxx</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSignUp} className="signup-form fade-in">
                <h2>Crie sua Conta 🚀</h2>
                <p className="instruction">Crie seu usuário para começar 7 dias grátis.</p>

                <div className="input-group">
                  <label>Email Profissional</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="voce@empresa.com"
                  />
                </div>

                <div className="input-group">
                  <label>Mínimo de 6 letras ou números</label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Sua senha secreta"
                  />
                </div>

                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? 'Criando Conta...' : 'Criar minha Conta'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .login-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          padding: 20px;
          font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .login-card {
          display: flex;
          flex-direction: column;
          background: white;
          border-radius: 20px;
          box-shadow: 0 15px 35px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 450px;
          overflow: hidden;
        }

        .brand-section {
          background: #1a1a1a;
          color: white;
          padding: 30px 20px;
          text-align: center;
        }

        .icon-calendar {
          font-size: 40px;
          margin-bottom: 10px;
        }

        .brand-section h1 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .brand-section p {
          margin: 10px 0 0;
          font-size: 0.9rem;
          opacity: 0.8;
          line-height: 1.4;
        }

        .action-section {
          padding: 0;
          background: #fff;
        }

        .mode-selector {
          display: flex;
          background: #f0f0f0;
          border-bottom: 1px solid #e0e0e0;
        }

        .mode-btn {
          flex: 1;
          padding: 15px;
          border: none;
          background: transparent;
          font-weight: 600;
          color: #666;
          cursor: pointer;
          transition: all 0.3s;
          border-bottom: 3px solid transparent;
        }

        .mode-btn.active {
          color: #1a1a1a;
          background: white;
          border-bottom: 3px solid #1a1a1a;
        }

        .form-content {
          padding: 30px;
          min-height: 300px; /* Garante altura fixa para evitar pulos */
        }

        h2 {
          margin: 0 0 10px;
          font-size: 1.4rem;
          color: #333;
        }

        .instruction {
          color: #666;
          margin-bottom: 25px;
          font-size: 0.95rem;
        }

        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: white;
          border: 1px solid #ddd;
          padding: 12px 20px;
          border-radius: 8px;
          width: 100%;
          font-size: 1rem;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .google-btn:hover {
          background: #f8f9fa;
          border-color: #bbb;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }

        .help-text {
          margin-top: 30px;
          font-size: 0.85rem;
          color: #999;
          text-align: center;
          line-height: 1.5;
        }

        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .input-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 600;
          color: #444;
          margin-bottom: 5px;
        }

        .input-group input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.95rem;
          transition: border 0.2s;
          box-sizing: border-box; /* Importante para padding não estourar */
        }

        .input-group input:focus {
          outline: none;
          border-color: #1a1a1a;
        }

        .primary-btn {
          background: #1a1a1a;
          color: white;
          border: none;
          padding: 12px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          margin-top: 10px;
          transition: opacity 0.2s;
        }

        .primary-btn:hover {
          opacity: 0.9;
        }
        
        .fade-in {
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

      `}</style>
    </div>
  );
}
