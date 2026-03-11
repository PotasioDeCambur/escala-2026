import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './contexts/AuthContext';
import { Lead, AdminUser } from './types';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [activeTab, setActiveTab] = useState<'leads' | 'users'>('leads');
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
        fetchUsers();
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

    const fetchUsers = async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar usuários:', error);
        } else {
            setUsers(data as AdminUser[]);
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

        alert(`Lead aprovado com sucesso! Agora envie o convite para ${leadEmail}.`);

        // Recarregar lista
        await fetchLeads();

        // Abrir cliente de email
        const subject = encodeURIComponent("Seu acesso ao Escala foi aprovado! 🚀");
        const body = encodeURIComponent(`Olá!\n\nSua solicitação para testar o Escala foi aprovada.\n\nAcesse agora e faça login no nosso site:\n${window.location.origin}\n\nQualquer dúvida, estou à disposição!\n\nAtt,\nEquipe Escala`);
        window.open(`mailto:${leadEmail}?subject=${subject}&body=${body}`, '_blank');
    };

    const toggleUserStatus = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
        const actionName = currentStatus === 'active' ? 'bloquear' : 'desbloquear';

        if (!window.confirm(`Tem certeza que deseja ${actionName} este usuário?`)) return;

        const { error } = await supabase!
            .from('user_profiles')
            .update({ access_status: newStatus })
            .eq('id', userId);

        if (error) {
            alert(`Erro ao ${actionName} usuário: ` + error.message);
            return;
        }

        alert(`Usuário alterado para ${newStatus} com sucesso!`);
        fetchUsers();
    };


    if (loading) return <div>Carregando painel administrativo...</div>;

    return (
        <div className="admin-container">
            <header className="admin-header">
                <h1>Painel Administrativo</h1>
                <div>
                    <button onClick={() => navigate('/')} className="back-btn">Voltar ao App</button>
                    <button onClick={async () => { await signOut(); navigate('/login', { replace: true }); }} className="back-btn" style={{ marginLeft: '10px', color: 'red', borderColor: 'red' }}>Sair</button>
                </div>
            </header>

            <div className="tabs">
                <button 
                    className={`tab-btn ${activeTab === 'leads' ? 'active' : ''}`}
                    onClick={() => setActiveTab('leads')}
                >
                    Solicitações de Acesso (Leads)
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    Usuários Cadastrados
                </button>
            </div>

            {activeTab === 'leads' && (
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
            )}

            {activeTab === 'users' && (
                <div className="leads-list">
                    {users.length === 0 ? (
                        <p className="empty-state">Nenhum usuário cadastrado.</p>
                    ) : (
                        <table className="leads-table">
                            <thead>
                                <tr>
                                    <th>Data de Cadastro</th>
                                    <th>Email</th>
                                    <th>Status de Acesso</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr key={u.id} className={`status-${u.access_status}`}>
                                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                                        <td>{u.email}</td>
                                        <td>
                                            <span className={`badge ${u.access_status === 'active' ? 'aprovado' : 'rejeitado'}`}>
                                                {u.access_status === 'active' ? 'ATIVO' : 'BLOQUEADO'}
                                            </span>
                                        </td>
                                        <td>
                                            {u.access_status === 'active' ? (
                                                <button
                                                    className="block-btn"
                                                    onClick={() => toggleUserStatus(u.id, u.access_status)}
                                                >
                                                    ⛔ Suspender Acesso
                                                </button>
                                            ) : (
                                                <button
                                                    className="approve-btn"
                                                    onClick={() => toggleUserStatus(u.id, u.access_status)}
                                                >
                                                    ✅ Restaurar Acesso
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

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
        .tabs {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
        }
        .tab-btn {
            padding: 10px 20px;
            cursor: pointer;
            border: none;
            background: #eee;
            border-radius: 4px;
            font-weight: 600;
        }
        .tab-btn.active {
            background: #1a1a1a;
            color: #fff;
        }
        .leads-table {
          width: 100%;
          border-collapse: collapse;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          background: white;
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
        .badge.rejeitado {
          background-color: #f8d7da;
          color: #721c24;
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
        .block-btn {
          background-color: #dc3545;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .block-btn:hover {
          background-color: #c82333;
        }
        .approved-text {
            color: #28a745;
            font-weight: bold;
        }
        .status-blocked {
            opacity: 0.7;
            background-color: #fcfcfc;
        }
      `}</style>
        </div>
    );
}
