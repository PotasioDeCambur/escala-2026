import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
    // Forçando o Modo SaaS ser sempre ativo para não depender da variável no Vercel
    const isSaasMode = false;
    const { user, loading, hasActiveSubscription, inviteStatus, isBlocked, signOut } = useAuth();
    const navigate = useNavigate();

    // Acesso válido = assinatura ativa OU convite aprovado
    const hasAccess = hasActiveSubscription || inviteStatus === 'approved';

    useEffect(() => {
        if (!isSaasMode) return;

        if (!loading) {
            if (isBlocked && user) {
                alert('Sua conta foi suspensa. Entre em contato com o administrador.');
                signOut().then(() => {
                    navigate('/login', { replace: true });
                });
                return;
            }

            if (!user) {
                navigate('/login', { replace: true });
            } else if (!hasAccess) {
                navigate('/pricing', { replace: true });
            }
        }
    }, [user, loading, hasAccess, navigate, isSaasMode, isBlocked, signOut]);

    if (!isSaasMode) {
        return <>{children}</>;
    }

    if (loading) {
        return <div className="loading-screen">Carregando...</div>;
    }

    if (!user || !hasAccess || isBlocked) {
        return null; // Evita flash de conteúdo antes do redirect
    }

    return <>{children}</>;
}
