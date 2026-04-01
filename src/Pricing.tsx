import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const PLANS = [
  {
    type: 'pro',
    name: 'Escala Pro',
    price: '9,90',
    popular: true,
    description: 'Tudo o que sua empresa precisa para organizar e gerenciar escalas de forma inteligente.',
    features: [
      'Funcionários e escalas ilimitadas',
      'Backup automático em nuvem',
      'Regras avançadas e validações de horário',
      'Compartilhamento fácil via WhatsApp/Link',
      'Assistente mágico de preenchimento (IA)',
      'Suporte prioritário via WhatsApp'
    ],
    link: 'https://www.mercadopago.com.br/subscriptions/checkout?preapproval_plan_id=737e48b353694e2ba4baf461006cfa72'
  }
];

export default function Pricing() {
  const { user, subscription, hasActiveSubscription, inviteStatus, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Estado do formulário de convite
  const [inviteForm, setInviteForm] = useState({
    name: '',
    company: '',
    phone: '',
    reason: ''
  });
  const [inviteSubmitted, setInviteSubmitted] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);

  const handleSubscribe = (link: string) => {
    if (!user) {
      alert('Você precisa criar uma conta primeiro!');
      navigate('/login', { replace: true });
      return;
    }
    setLoading(true);
    // Usamos window.location.replace() para REMOVER /pricing do histórico
    const checkoutUrl = new URL(link);
    if (user.email) {
      checkoutUrl.searchParams.set('payer_email', user.email);
    }
    window.location.replace(checkoutUrl.toString());
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;

    setInviteLoading(true);
    try {
      const { error } = await supabase.from('invites').insert({
        user_id: user.id,
        email: user.email,
        name: inviteForm.name,
        company: inviteForm.company || null,
        phone: inviteForm.phone || null,
        reason: inviteForm.reason || null
      });

      if (error) {
        console.error('Erro ao enviar convite:', error);
        alert('Erro ao enviar solicitação: ' + error.message);
      } else {
        setInviteSubmitted(true);
      }
    } catch (err: any) {
      console.error('Erro ao enviar convite:', err);
      alert('Erro inesperado: ' + (err.message || 'Tente novamente.'));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  // Se o convite já foi enviado OU o status é pending
  const isPending = inviteSubmitted || inviteStatus === 'pending';
  const isRejected = inviteStatus === 'rejected';

  return (
    <div className="pricing-container">
      <header className="pricing-header">
        <h1>Comece a usar o Escala</h1>
        <p>Escolha como deseja acessar o sistema</p>
        <div className="user-info">
          <span>Logado como: {user.email}</span>
          <button onClick={handleLogout} className="logout-btn">Sair</button>
        </div>
      </header>

      <div className="options-grid">
        {/* Card 1: Assinar */}
        {PLANS.map((plan) => (
          <div key={plan.type} className="option-card subscribe-card">
            <div className="card-badge pay-badge">ACESSO IMEDIATO</div>
            <div className="card-icon">💳</div>
            <h3>{plan.name}</h3>
            <div className="price">
              R$ {plan.price}<span>/mês</span>
            </div>
            <p className="card-description">{plan.description}</p>

            <ul className="features">
              {plan.features.map((feature, i) => (
                <li key={i}>✅ {feature}</li>
              ))}
            </ul>

            <button
              className="action-btn subscribe-btn"
              onClick={() => handleSubscribe(plan.link)}
              disabled={loading || (subscription?.status === 'active' || user?.email === 'armandoo.linares@gmail.com')}
            >
              {(subscription?.status === 'active' || user?.email === 'armandoo.linares@gmail.com') ? 'Plano Ativo ✓' : loading ? 'Redirecionando...' : 'Assinar Agora →'}
            </button>
          </div>
        ))}

        {/* Card 2: Solicitar Convite */}
        <div className="option-card invite-card">
          <div className="card-badge invite-badge">GRATUITO</div>
          <div className="card-icon">🎟️</div>
          <h3>Solicitar Convite</h3>
          <p className="card-description">
            Peça um convite de teste. O administrador analisará sua solicitação e definirá o período de acesso.
          </p>

          {isPending ? (
            <div className="invite-status pending-status">
              <div className="status-icon">⏳</div>
              <h4>Convite Enviado!</h4>
              <p>Sua solicitação está em análise. Você receberá uma resposta em breve.</p>
              <div className="pulse-dot"></div>
            </div>
          ) : isRejected ? (
            <div className="invite-status rejected-status">
              <div className="status-icon">😔</div>
              <h4>Convite Não Aprovado</h4>
              <p>Infelizmente sua solicitação não foi aprovada. Mas você pode assinar o plano ao lado para ter acesso completo!</p>
            </div>
          ) : (
            <form onSubmit={handleInviteSubmit} className="invite-form">
              <div className="input-group">
                <label>Seu Nome *</label>
                <input
                  type="text"
                  required
                  placeholder="João Silva"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Nome da Empresa</label>
                <input
                  type="text"
                  placeholder="Empresa XYZ"
                  value={inviteForm.company}
                  onChange={(e) => setInviteForm({ ...inviteForm, company: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Celular (WhatsApp) *</label>
                <input
                  type="tel"
                  required
                  placeholder="(11) 99999-9999"
                  value={inviteForm.phone}
                  onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label>Por que deseja testar? (opcional)</label>
                <textarea
                  placeholder="Conte um pouco sobre sua necessidade..."
                  value={inviteForm.reason}
                  onChange={(e) => setInviteForm({ ...inviteForm, reason: e.target.value })}
                  rows={3}
                />
              </div>
              <button type="submit" className="action-btn invite-submit-btn" disabled={inviteLoading}>
                {inviteLoading ? 'Enviando...' : 'Solicitar Convite →'}
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        .pricing-container {
          font-family: 'Inter', 'Segoe UI', sans-serif;
          background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
          min-height: 100vh;
          padding: 3rem 1.5rem;
          color: #e0e0e0;
        }
        .pricing-header {
          text-align: center;
          margin-bottom: 3rem;
        }
        .pricing-header h1 {
          font-size: 2.2rem;
          margin-bottom: 0.5rem;
          color: #ffffff;
          font-weight: 700;
        }
        .pricing-header p {
          color: #8888aa;
          font-size: 1.05rem;
        }
        .user-info {
          margin-top: 1rem;
          display: flex;
          justify-content: center;
          gap: 1rem;
          align-items: center;
          font-size: 0.85rem;
          color: #7777aa;
        }
        .logout-btn {
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          padding: 0.3rem 0.8rem;
          border-radius: 6px;
          cursor: pointer;
          color: #aaa;
          font-size: 0.8rem;
          transition: all 0.2s;
        }
        .logout-btn:hover {
          background: rgba(255,255,255,0.15);
          color: #fff;
        }

        /* Grid de opções */
        .options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .option-card {
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid rgba(255,255,255,0.08);
          position: relative;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s, border-color 0.2s;
        }
        .option-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.15);
        }

        .card-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .pay-badge {
          background: linear-gradient(135deg, #0070f3, #00c6ff);
          color: white;
        }
        .invite-badge {
          background: linear-gradient(135deg, #10b981, #34d399);
          color: white;
        }

        .card-icon {
          font-size: 2.5rem;
          margin: 0.5rem 0 1rem;
          text-align: center;
        }

        .option-card h3 {
          font-size: 1.4rem;
          color: #fff;
          margin: 0 0 0.5rem;
          text-align: center;
        }

        .price {
          font-size: 2.5rem;
          font-weight: 700;
          color: #fff;
          text-align: center;
          margin: 0.5rem 0 1rem;
        }
        .price span {
          font-size: 0.9rem;
          color: #8888aa;
          font-weight: 400;
        }

        .card-description {
          color: #8888aa;
          font-size: 0.9rem;
          text-align: center;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .features {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem;
          flex-grow: 1;
        }
        .features li {
          margin-bottom: 0.6rem;
          font-size: 0.88rem;
          color: #bbb;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        /* Botões de ação */
        .action-btn {
          width: 100%;
          padding: 0.9rem;
          border-radius: 10px;
          border: none;
          font-weight: 600;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
          margin-top: auto;
        }
        .subscribe-btn {
          background: linear-gradient(135deg, #0070f3, #00c6ff);
          color: white;
        }
        .subscribe-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 112, 243, 0.4);
        }
        .invite-submit-btn {
          background: linear-gradient(135deg, #10b981, #34d399);
          color: white;
        }
        .invite-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }
        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        /* Formulário de convite */
        .invite-form {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          flex-grow: 1;
        }
        .invite-form .input-group label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: #9999bb;
          margin-bottom: 4px;
        }
        .invite-form .input-group input,
        .invite-form .input-group textarea {
          width: 100%;
          padding: 0.6rem 0.8rem;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          font-size: 0.9rem;
          background: rgba(255,255,255,0.06);
          color: #e0e0e0;
          transition: border-color 0.2s;
          box-sizing: border-box;
          font-family: inherit;
        }
        .invite-form .input-group input:focus,
        .invite-form .input-group textarea:focus {
          outline: none;
          border-color: #10b981;
        }
        .invite-form .input-group input::placeholder,
        .invite-form .input-group textarea::placeholder {
          color: #555577;
        }
        .invite-form .input-group textarea {
          resize: vertical;
        }

        /* Status do convite */
        .invite-status {
          text-align: center;
          padding: 2rem 1rem;
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .invite-status .status-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .invite-status h4 {
          color: #fff;
          margin: 0 0 0.5rem;
          font-size: 1.2rem;
        }
        .invite-status p {
          color: #8888aa;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .pending-status {
          position: relative;
        }
        .pulse-dot {
          width: 12px;
          height: 12px;
          background: #10b981;
          border-radius: 50%;
          margin-top: 1rem;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6); }
          70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        @media (max-width: 768px) {
          .pricing-container {
            padding: 2rem 1rem;
          }
          .options-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }
          .pricing-header h1 {
            font-size: 1.6rem;
          }
          .price {
            font-size: 2rem;
          }
        }
      `}</style>
    </div>
  );
}
