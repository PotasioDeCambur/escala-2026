import React, { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle?.();
    } catch (error) {
      console.error('Erro no login com Google:', error);
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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signUpWithEmail(formData.email, formData.password);
      try {
        await signInWithEmail(formData.email, formData.password);
      } catch {
        /* ignore silent login failure (e.g. email confirmation required) */
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
        <div className="brand-section">
          <div className="icon-calendar">📅</div>
          <h1>Escala de Horários</h1>
          <p>Organize sua equipe de forma simples, rápida e profissional.</p>
        </div>

        <div className="action-section">
          <div className="mode-selector">
            <button className={`mode-btn ${view === 'login' ? 'active' : ''}`} onClick={() => setView('login')}>
              Já sou Cliente
            </button>
            <button className={`mode-btn ${view === 'signup' ? 'active' : ''}`} onClick={() => setView('signup')}>
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

                {signInWithGoogle && (
                  <>
                    <div className="divider">
                      <span>OU</span>
                    </div>
                    <button className="google-btn" onClick={handleGoogleLogin} disabled={loading}>
                      <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Entrar com Google
                    </button>
                  </>
                )}

                <div className="help-text">
                  <p>
                    Problemas para entrar? <br /> Chame no suporte: (xx) 9xxxx-xxxx
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSignUp} className="signup-form fade-in">
                <h2>Crie sua Conta 🚀</h2>
                <p className="instruction">Crie seu usuário para iniciar seu período de teste grátis.</p>

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
    </div>
  );
}
