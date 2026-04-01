import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './contexts/AuthContext';
import { Invite, AdminUser } from './types';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [invites, setInvites] = useState<Invite[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [activeTab, setActiveTab] = useState<'invites' | 'users'>('invites');
    const [loading, setLoading] = useState(true);

    // Modal de aprovação
    const [approveModal, setApproveModal] = useState<{ invite: Invite | null; days: string }>({
        invite: null,
        days: '30'
    });

    const isAdmin = user?.email === 'armandoo.linares@gmail.com';

    useEffect(() => {
        if (!isAdmin) {
            alert('Acesso negado.');
            navigate('/');
            return;
        }
        fetchInvites();
        fetchUsers();
    }, [isAdmin, navigate]);

    const fetchInvites = async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('invites')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao buscar convites:', error);
        } else {
            setInvites(data as Invite[]);
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

    const openApproveModal = (invite: Invite) => {
        setApproveModal({ invite, days: '30' });
    };

    const confirmApprove = async () => {
        const invite = approveModal.invite;
        if (!invite || !supabase) return;

        const days = approveModal.days;
        const isUnlimited = days === 'unlimited';
        const grantedDays = isUnlimited ? null : parseInt(days);

        // Calcula data de expiração
        const endDate = new Date();
        if (!isUnlimited) {
            endDate.setDate(endDate.getDate() + (grantedDays || 30));
        } else {
            endDate.setFullYear(endDate.getFullYear() + 100); // "ilimitado" = 100 anos
        }

        // 1. Atualizar status do convite
        const { error: inviteError } = await supabase
            .from('invites')
            .update({
                status: 'approved',
                granted_days: grantedDays,
                reviewed_at: new Date().toISOString()
            })
            .eq('id', invite.id);

        if (inviteError) {
            alert('Erro ao aprovar convite: ' + inviteError.message);
            return;
        }

        // 2. Criar/atualizar assinatura para o usuário
        // Primeiro verifica se já existe
        const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', invite.user_id)
            .single();

        if (existingSub) {
            // Atualiza a existente
            await supabase
                .from('subscriptions')
                .update({
                    status: 'active',
                    plan_type: 'invited',
                    current_period_end: endDate.toISOString()
                })
                .eq('user_id', invite.user_id);
        } else {
            // Cria nova
            await supabase
                .from('subscriptions')
                .insert({
                    user_id: invite.user_id,
                    status: 'active',
                    plan_type: 'invited',
                    current_period_end: endDate.toISOString()
                });
        }

        const daysText = isUnlimited ? 'acesso ilimitado' : `${grantedDays} dias de acesso`;
        alert(`Convite aprovado! ${invite.name} recebeu ${daysText}.`);

        setApproveModal({ invite: null, days: '30' });
        await fetchInvites();

        // Abre WhatsApp para contato
        if (invite.phone) {
            const phone = invite.phone.replace(/\D/g, '');
            const message = encodeURIComponent(
                `Olá ${invite.name}! 🎉\n\nSeu convite para testar o *Escala de Horários* foi aprovado!\n\nVocê tem ${daysText}.\n\nAcesse agora: ${window.location.origin}\n\nQualquer dúvida, estou à disposição!`
            );
            window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
        }
    };

    const handleReject = async (invite: Invite) => {
        if (!window.confirm(`Tem certeza que deseja negar o convite de ${invite.name}?`)) return;

        const { error } = await supabase!
            .from('invites')
            .update({
                status: 'rejected',
                reviewed_at: new Date().toISOString()
            })
            .eq('id', invite.id);

        if (error) {
            alert('Erro ao negar convite: ' + error.message);
            return;
        }

        alert(`Convite de ${invite.name} foi negado.`);
        await fetchInvites();
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

    const pendingCount = invites.filter(i => i.status === 'pending').length;

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
                    className={`tab-btn ${activeTab === 'invites' ? 'active' : ''}`}
                    onClick={() => setActiveTab('invites')}
                >
                    🎟️ Convites {pendingCount > 0 && <span className="tab-count">{pendingCount}</span>}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    👥 Usuários Cadastrados
                </button>
            </div>

            {activeTab === 'invites' && (
                <div className="leads-list">
                    {invites.length === 0 ? (
                        <p className="empty-state">Nenhum convite recebido ainda.</p>
                    ) : (
                        <table className="leads-table">
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Nome</th>
                                    <th>Empresa</th>
                                    <th>Contato</th>
                                    <th>Motivo</th>
                                    <th>Status</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invites.map((invite) => (
                                    <tr key={invite.id} className={`status-${invite.status}`}>
                                        <td>{new Date(invite.created_at).toLocaleDateString()}</td>
                                        <td><strong>{invite.name}</strong></td>
                                        <td>{invite.company || '-'}</td>
                                        <td>
                                            <div className="contact-info">
                                                <span>📧 {invite.email}</span>
                                                {invite.phone && <span>📱 {invite.phone}</span>}
                                            </div>
                                        </td>
                                        <td className="reason-cell">{invite.reason || '-'}</td>
                                        <td>
                                            <span className={`badge ${invite.status === 'approved' ? 'aprovado' : invite.status === 'rejected' ? 'rejeitado' : 'pendente'}`}>
                                                {invite.status === 'pending' ? 'PENDENTE' : invite.status === 'approved' ? `APROVADO${invite.granted_days ? ` (${invite.granted_days}d)` : ' (∞)'}` : 'NEGADO'}
                                            </span>
                                        </td>
                                        <td>
                                            {invite.status === 'pending' && (
                                                <div className="action-buttons">
                                                    <button
                                                        className="approve-btn"
                                                        onClick={() => openApproveModal(invite)}
                                                    >
                                                        ✅ Aprovar
                                                    </button>
                                                    <button
                                                        className="block-btn"
                                                        onClick={() => handleReject(invite)}
                                                    >
                                                        ❌ Negar
                                                    </button>
                                                </div>
                                            )}
                                            {invite.status !== 'pending' && invite.phone && (
                                                <button
                                                    className="whatsapp-btn"
                                                    onClick={() => {
                                                        const phone = invite.phone!.replace(/\D/g, '');
                                                        window.open(`https://wa.me/55${phone}`, '_blank');
                                                    }}
                                                >
                                                    💬 WhatsApp
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

            {/* Modal de Aprovação — Selecionar Dias */}
            {approveModal.invite && (
                <div className="modal-overlay" onClick={() => setApproveModal({ invite: null, days: '30' })}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Aprovar Convite</h3>
                        <p className="modal-info">
                            <strong>{approveModal.invite.name}</strong>
                            {approveModal.invite.company && ` — ${approveModal.invite.company}`}
                        </p>
                        <p className="modal-subtitle">Por quanto tempo deseja liberar o acesso?</p>

                        <div className="days-options">
                            {[
                                { value: '7', label: '7 dias' },
                                { value: '15', label: '15 dias' },
                                { value: '30', label: '30 dias' },
                                { value: '90', label: '90 dias' },
                                { value: 'unlimited', label: '♾️ Ilimitado' }
                            ].map((option) => (
                                <button
                                    key={option.value}
                                    className={`day-option ${approveModal.days === option.value ? 'selected' : ''}`}
                                    onClick={() => setApproveModal({ ...approveModal, days: option.value })}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>

                        <div className="modal-actions">
                            <button className="modal-cancel" onClick={() => setApproveModal({ invite: null, days: '30' })}>
                                Cancelar
                            </button>
                            <button className="modal-confirm" onClick={confirmApprove}>
                                ✅ Confirmar Aprovação
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .admin-container {
          padding: 2rem;
          font-family: var(--font-family);
          max-width: 1200px;
          margin: 0 auto;
          color: var(--text-main);
        }
        .admin-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }
        .back-btn {
          padding: 0.5rem 1rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text-main);
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.2s;
        }
        .back-btn:hover {
          background: var(--background);
        }
        .tabs {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
        }
        .tab-btn {
            padding: 10px 20px;
            cursor: pointer;
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--text-secondary);
            border-radius: 4px;
            font-weight: 600;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .tab-btn.active {
            background: var(--primary);
            color: white;
            border-color: var(--primary);
        }
        .tab-count {
            background: #ef4444;
            color: white;
            font-size: 0.75rem;
            padding: 2px 8px;
            border-radius: 12px;
            font-weight: 700;
            min-width: 20px;
            text-align: center;
            animation: countPulse 2s infinite;
        }
        @keyframes countPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }
        .leads-list {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }
        .leads-table {
          width: 100%;
          min-width: 700px;
          border-collapse: collapse;
          box-shadow: var(--shadow-sm);
          background: var(--surface);
          border-radius: 8px;
          overflow: hidden;
        }
        .leads-table th, .leads-table td {
          padding: 1rem;
          text-align: left;
          border-bottom: 1px solid var(--border);
        }
        .leads-table th {
          background-color: var(--highlight-bg);
          font-weight: 600;
          color: var(--text-main);
        }
        .contact-info {
          display: flex;
          flex-direction: column;
          font-size: 0.85rem;
          color: var(--text-secondary);
          gap: 2px;
        }
        .reason-cell {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: bold;
          white-space: nowrap;
        }
        .badge.pendente {
          background-color: rgba(245, 158, 11, 0.2);
          color: #d97706;
          border: 1px solid #f59e0b;
        }
        .badge.aprovado {
          background-color: rgba(16, 185, 129, 0.2);
          color: #059669;
          border: 1px solid #10b981;
        }
        .badge.rejeitado {
          background-color: rgba(239, 68, 68, 0.2);
          color: #dc2626;
          border: 1px solid #ef4444;
        }
        .action-buttons {
          display: flex;
          gap: 6px;
        }
        .approve-btn {
          background-color: var(--success);
          color: white;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 0.85rem;
          white-space: nowrap;
        }
        .approve-btn:hover {
          background-color: var(--success-dark);
        }
        .block-btn {
          background-color: var(--danger);
          color: white;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
          font-size: 0.85rem;
          white-space: nowrap;
        }
        .block-btn:hover {
          background-color: #be123c;
        }
        .whatsapp-btn {
          background-color: #25d366;
          color: white;
          border: none;
          padding: 0.4rem 0.8rem;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
        }
        .whatsapp-btn:hover {
          background-color: #1da851;
        }
        .status-blocked {
            opacity: 0.7;
            background-color: var(--table-stripe);
        }
        .empty-state {
          text-align: center;
          color: var(--text-secondary);
          padding: 3rem;
          font-size: 1.1rem;
        }

        /* Modal de Aprovação */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: var(--surface, white);
          border-radius: 16px;
          padding: 2rem;
          max-width: 420px;
          width: 90%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .modal-content h3 {
          margin: 0 0 0.5rem;
          font-size: 1.3rem;
          color: var(--text-main);
        }
        .modal-info {
          color: var(--text-secondary);
          margin-bottom: 0.25rem;
          font-size: 0.95rem;
        }
        .modal-subtitle {
          color: var(--text-secondary);
          margin-bottom: 1.25rem;
          font-size: 0.9rem;
        }
        .days-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-bottom: 1.5rem;
        }
        .day-option {
          padding: 0.7rem;
          border: 2px solid var(--border, #ddd);
          border-radius: 10px;
          background: var(--background, #f5f5f5);
          color: var(--text-main);
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.2s;
        }
        .day-option:hover {
          border-color: var(--primary, #0070f3);
        }
        .day-option.selected {
          border-color: var(--primary, #0070f3);
          background: var(--primary, #0070f3);
          color: white;
        }
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .modal-cancel {
          padding: 0.6rem 1.2rem;
          border: 1px solid var(--border, #ddd);
          border-radius: 8px;
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.9rem;
        }
        .modal-confirm {
          padding: 0.6rem 1.2rem;
          border: none;
          border-radius: 8px;
          background: var(--success, #10b981);
          color: white;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: background 0.2s;
        }
        .modal-confirm:hover {
          background: var(--success-dark, #059669);
        }
      `}</style>
        </div>
    );
}
