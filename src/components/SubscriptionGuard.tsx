import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
    const isSaasMode = process.env.REACT_APP_MODO_SAAS === 'true';
    const { user, loading, hasActiveSubscription, isBlocked, signOut } = useAuth();
    const navigate = useNavigate();

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
            } else if (!hasActiveSubscription) {
                navigate('/pricing', { replace: true });
            }
        }
    }, [user, loading, hasActiveSubscription, navigate, isSaasMode, isBlocked, signOut]);

    if (!isSaasMode) {
        return <>{children}</>;
    }

    if (loading) {
        return <div className="loading-screen">Carregando...</div>;
    }

    if (!user || !hasActiveSubscription || isBlocked) {
        return null; // Evita flash de conteúdo antes do redirect
    }

    return <>{children}</>;
}
