import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { User } from '@supabase/supabase-js';
import { Subscription, Invite } from '../types';

interface AuthContextType {
    user: User | null;
    subscription: Subscription | null;
    loading: boolean;
    hasActiveSubscription: boolean;
    inviteStatus: 'pending' | 'approved' | 'rejected' | null;
    inviteDetails: Invite | null;

    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    refreshSubscription: () => Promise<void>;
    isBlocked: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [inviteStatus, setInviteStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
    const [inviteDetails, setInviteDetails] = useState<Invite | null>(null);
    const [loading, setLoading] = useState(true);

    const checkSubscription = async (userId: string) => {
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Erro ao buscar assinatura:', error);
            }

            if (data) {
                setSubscription(data as Subscription);
            } else {
                setSubscription(null);
            }
        } catch (error) {
            console.error('Erro ao verificar assinatura:', error);
        }
    };

    const checkUserProfile = async (userId: string) => {
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('access_status')
                .eq('id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Erro ao buscar perfil do usuário:', error);
            }

            if (data) {
                setIsBlocked(data.access_status === 'blocked');
            } else {
                setIsBlocked(false);
            }
        } catch (error) {
            console.error('Erro ao verificar perfil do usuário:', error);
        }
    };

    const checkInviteStatus = async (userId: string) => {
        if (!supabase) return;

        try {
            const { data, error } = await supabase
                .from('invites')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Erro ao buscar convite:', error);
            }

            if (data) {
                setInviteStatus(data.status as 'pending' | 'approved' | 'rejected');
                setInviteDetails(data as Invite);
            } else {
                setInviteStatus(null);
                setInviteDetails(null);
            }
        } catch (error) {
            console.error('Erro ao verificar convite:', error);
        }
    };

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            return;
        }

        // Verifica sessão atual
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                setLoading(true);
                Promise.all([
                    checkSubscription(session.user.id),
                    checkUserProfile(session.user.id),
                    checkInviteStatus(session.user.id)
                ]).finally(() => setLoading(false));
            } else {
                setLoading(false);
            }
        });

        // Escuta mudanças na autenticação
        const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                setLoading(true);
                Promise.all([
                    checkSubscription(session.user.id),
                    checkUserProfile(session.user.id),
                    checkInviteStatus(session.user.id)
                ]).finally(() => setLoading(false));
            } else {
                setSubscription(null);
                setIsBlocked(false);
                setInviteStatus(null);
                setInviteDetails(null);
                setLoading(false);
            }
        });

        return () => {
            authListener.unsubscribe();
        };
    }, []);



    const signInWithEmail = async (email: string, password: string) => {
        if (!supabase) return;
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
    };

    const signUpWithEmail = async (email: string, password: string) => {
        if (!supabase) return;
        const { error } = await supabase.auth.signUp({
            email,
            password
        });
        if (error) throw error;
    };

    const signOut = async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
        setUser(null);
        setSubscription(null);
        setIsBlocked(false);
        setInviteStatus(null);
        setInviteDetails(null);
    };

    // Helper para verificar se a assinatura é válida
    const hasActiveSubscription = React.useMemo(() => {
        // Se for admin/debug (bypass temporário para dev)
        if (user?.email === 'armandoo.linares@gmail.com') return true;

        if (!subscription) return false;

        const isValidStatus = ['active'].includes(subscription.status);
        const isNotExpired = new Date(subscription.current_period_end) > new Date();

        return isValidStatus && isNotExpired;
    }, [subscription, user]);

    const refreshSubscription = async () => {
        if (user) {
            await checkSubscription(user.id);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            subscription,
            loading,
            hasActiveSubscription,
            inviteStatus,
            inviteDetails,

            signInWithEmail,
            signUpWithEmail,
            signOut,
            refreshSubscription,
            isBlocked
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
