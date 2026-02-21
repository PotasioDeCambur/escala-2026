import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PLANS = [
    {
        type: 'basic',
        name: 'Starter',
        price: 29,
        description: 'Para pequenas equipes e comércios locais.',
        features: [
            'Até 10 funcionários',
            'Escala mensal automática',
            'Exportação para PDF/Excel',
            'Link público para funcionários',
            'Suporte por email'
        ],
        link: '#LINK_MERCADO_PAGO_BASIC' // Substituir pelo link real
    },
    {
        type: 'pro',
        name: 'Business',
        price: 49,
        popular: true,
        description: 'Para empresas em crescimento que precisam de organização total.',
        features: [
            'Funcionários ilimitados',
            'Regras avançadas de horário',
            'Suporte prioritário via WhatsApp',
            'Backup automático na nuvem',
            'Gestão de folgas e atestados'
        ],
        link: '#LINK_MERCADO_PAGO_PRO' // Substituir pelo link real
    },
    {
        type: 'enterprise',
        name: 'Enterprise',
        price: 99,
        description: 'Para redes de lojas e grandes operações com múltiplos gerentes.',
        features: [
            'Tudo do plano Business',
            'Múltiplos administradores (em breve)',
            'Relatórios avançados de horas',
            'Integração com folha de ponto',
            'Treinamento de uso'
        ],
        link: '#LINK_MERCADO_PAGO_ENTERPRISE' // Substituir pelo link real
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
        window.location.href = link;
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
