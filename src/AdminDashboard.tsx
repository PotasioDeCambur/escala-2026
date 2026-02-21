import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './contexts/AuthContext';
import { Lead } from './types';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    // Verificação de segurança (Temporária: Email Hardcoded)
    // Em produção, use Roles do Supabase para bloquear acesso
    const isAdmin = user?.email === 'armandoo.linares@gmail.com';

    useEffect(() => {
        if (!isAdmin) {
            alert('Acesso negado.');
            navigate('/');
            return;
        }
        fetchLeads();
    }, [isAdmin, navigate]);

    const fetchLeads = async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar leads:', error);
        } else {
            setLeads(data as unknown as Lead[]);
        }
        setLoading(false);
    };

    const handleApprove = async (leadId: string, leadEmail: string) => {
        if (!window.confirm(`Tem certeza que deseja aprovar ${leadEmail}?`)) return;

        // 1. Atualizar status no banco
        const { error } = await supabase!
            .from('leads')
            .update({ status: 'aprovado' })
            .eq('id', leadId);

        if (error) {
            alert('Erro ao aprovar lead: ' + error.message);
            return;
        }

        // 2. Enviar Magic Link (Convite)
        // Usando a API de Admin do Supabase Client (requer service_role key no front, O QUE NÃO É SEGURO)
        // Como estamos no Client Side seguro apenas para o Admin logado (com RLS):

        // A melhor forma segura é enviar um email manual ou usar Edge Function.
        // Como simplificação: Vamos apenas marcar como aprovado e gerar um link mailto para você enviar o convite manual.

        alert(`Lead aprovado com sucesso! Agora envie o convite para ${leadEmail}.`);

        // Recarregar lista
        fetchLeads();

        // Abrir cliente de email
        const subject = encodeURIComponent("Seu acesso ao Escala foi aprovado! 🚀");
        const body = encodeURIComponent(`Olá!\n\nSua solicitação para testar o Escala foi aprovada.\n\nAcesse agora e faça login com seu Google: ${window.location.origin}/login\n\nQualquer dúvida, estou à disposição!\n\nAtt,\nEquipe Escala`);
        window.open(`mailto:${leadEmail}?subject=${subject}&body=${body}`);
    };

    if (loading) return <div>Carregando painel administrativo...</div>;

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1>Painel de Aprovação de Leads</h1>
                <div>
                    <button onClick={() => navigate('/')} className="back-btn">Voltar ao App</button>
                    <button onClick={async () => { await signOut(); navigate('/login'); }} className="back-btn" style={{ marginLeft: '10px', color: 'red', borderColor: 'red' }}>Sair</button>
                </div>
            </header>

            <div className="leads-list">
                {leads.length === 0 ? (
                    <p className="empty-state">Nenhum lead pendente.</p>
                ) : (
                    <table className="leads-table">
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Nome</th>
                                <th>Empresa</th>
                                <th>Contato</th>
                                <th>Status</th>
                                <th>Ação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leads.map((lead) => (
                                <tr key={lead.id} className={`status-${lead.status}`}>
                                    <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                                    <td>{lead.nome}</td>
                                    <td>{lead.empresa || '-'}</td>
                                    <td>
                                        <div className="contact-info">
                                            <span>📧 {lead.email}</span>
                                            <span>📱 {lead.whatsapp}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${lead.status}`}>{lead.status.toUpperCase()}</span>
                                    </td>
                                    <td>
                                        {lead.status === 'pendente' && (
                                            <button
                                                className="approve-btn"
                                                onClick={() => handleApprove(lead.id, lead.email)}
                                            >
                                                ✅ Aprovar
                                            </button>
                                        )}
                                        {lead.status === 'aprovado' && (
                                            <span className="approved-text">Já Aprovado</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
        .admin-container {
          padding: 2rem;
          font-family: sans-serif;
          max-width: 1200px;
          margin: 0 auto;
        }
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .back-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #ccc;
          background: white;
          cursor: pointer;
          border-radius: 4px;
        }
        .leads-table {
          width: 100%;
          border-collapse: collapse;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .leads-table th, .leads-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid #eee;
        }
        .leads-table th {
          background-color: #f8f9fa;
          font-weight: 600;
        }
        .contact-info {
          display: flex;
          flex-direction: column;
          font-size: 0.9rem;
          color: #555;
        }
        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .badge.pendente {
          background-color: #fff3cd;
          color: #856404;
        }
        .badge.aprovado {
          background-color: #d4edda;
          color: #155724;
        }
        .approve-btn {
          background-color: #28a745;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .approve-btn:hover {
          background-color: #218838;
        }
        .approved-text {
            color: #28a745;
            font-weight: bold;
        }
      `}</style>
        </div>
    );
}
