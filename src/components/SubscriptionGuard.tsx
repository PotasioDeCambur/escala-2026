import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
    const isSaasMode = process.env.REACT_APP_MODO_SAAS === 'true';
    const { user, loading, hasActiveSubscription } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isSaasMode) return;

        if (!loading) {
            if (!user) {
                navigate('/login');
            } else if (!hasActiveSubscription) {
                navigate('/pricing');
            }
        }
    }, [user, loading, hasActiveSubscription, navigate, isSaasMode]);

    if (!isSaasMode) {
        return <>{children}</>;
    }

    if (loading) {
        return <div className="loading-screen">Carregando...</div>;
    }

    if (!user || !hasActiveSubscription) {
        return null; // Evita flash de conteúdo antes do redirect
    }

    return <>{children}</>;
}
