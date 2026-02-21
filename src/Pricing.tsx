import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    type: 'pro',
    name: 'Escala Pro',
    price: '49,90',
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
  const { user, hasActiveSubscription, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = (link: string) => {
    if (!user) {
      alert('Você precisa criar uma conta primeiro!');
      navigate('/login');
      return;
    }
    setLoading(true);
    // Redireciona para o checkout do Mercado Pago
    // Passamos o email do usuario junto ao link para sabermos quem pagou dps
    const checkoutUrl = new URL(link);
    if (user.email) {
      checkoutUrl.searchParams.set('payer_email', user.email);
    }
    window.location.href = checkoutUrl.toString();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="pricing-container">
      <header className="pricing-header">
        <h1>Escolha o plano ideal para sua empresa</h1>
        <p>Comece com 7 dias grátis. Cancele quando quiser.</p>
        <div className="user-info">
          <span>Logado como: {user.email}</span>
          <button onClick={handleLogout} className="logout-btn">Sair</button>
        </div>
      </header>

      <div className="plans-grid">
        {PLANS.map((plan) => (
          <div key={plan.type} className={`plan-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="badge">MAIS POPULAR</div>}
            <h3>{plan.name}</h3>
            <div className="price">
              R$ {plan.price}<span>/mês</span>
            </div>
            <p className="description">{plan.description}</p>

            <ul className="features">
              {plan.features.map((feature, i) => (
                <li key={i}>✅ {feature}</li>
              ))}
            </ul>

            <button
              className={`subscribe-btn ${plan.popular ? 'primary' : 'secondary'}`}
              onClick={() => handleSubscribe(plan.link)}
              disabled={loading || hasActiveSubscription}
            >
              {hasActiveSubscription ? 'Plano Ativo' : 'Começar Agora'}
            </button>
          </div>
        ))}
      </div>

      <style>{`
        .pricing-container {
          font-family: 'Inter', sans-serif;
          background: #f8f9fa;
          min-height: 100vh;
          padding: 4rem 2rem;
          color: #333;
        }
        .pricing-header {
          text-align: center;
          margin-bottom: 4rem;
        }
        .pricing-header h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        .pricing-header p {
          color: #666;
          font-size: 1.1rem;
        }
        .user-info {
          margin-top: 1rem;
          display: flex;
          justify-content: center;
          gap: 1rem;
          align-items: center;
          font-size: 0.9rem;
          color: #555;
        }
        .logout-btn {
          background: none;
          border: 1px solid #ddd;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          cursor: pointer;
        }
        .logout-btn:hover {
          background: #eee;
        }
        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }
        .plan-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 4px 6px rgba(0,0,0,0.05);
          position: relative;
          border: 1px solid #eee;
          display: flex;
          flex-direction: column;
        }
        .plan-card.popular {
          border: 2px solid #0070f3;
          transform: scale(1.05);
          z-index: 10;
          box-shadow: 0 8px 30px rgba(0,112,243,0.12);
        }
        .badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: #0070f3;
          color: white;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: bold;
          text-transform: uppercase;
        }
        .price {
          font-size: 2.5rem;
          font-weight: bold;
          margin: 1rem 0;
          color: #111;
        }
        .price span {
          font-size: 1rem;
          color: #666;
          font-weight: normal;
        }
        .description {
          color: #666;
          margin-bottom: 2rem;
          min-height: 40px;
        }
        .features {
          list-style: none;
          padding: 0;
          margin: 0 0 2rem;
          flex-grow: 1;
        }
        .features li {
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #444;
        }
        .subscribe-btn {
          width: 100%;
          padding: 1rem;
          border-radius: 8px;
          border: none;
          font-weight: bold;
          cursor: pointer;
          font-size: 1rem;
          transition: transform 0.1s;
        }
        .subscribe-btn.primary {
          background: #0070f3;
          color: white;
        }
        .subscribe-btn.primary:hover {
          background: #0060df;
        }
        .subscribe-btn.secondary {
          background: #f0f0f0;
          color: #333;
        }
        .subscribe-btn.secondary:hover {
          background: #e0e0e0;
        }
        .subscribe-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @media (max-width: 768px) {
           .plan-card.popular {
              transform: none;
           }
        }
      `}</style>
    </div>
  );
}
