export interface Lead {
    id: string;
    nome: string;
    empresa: string;
    whatsapp: string;
    email: string;
    mensagem: string;
    status: 'pendente' | 'aprovado' | 'rejeitado';
    created_at: string;
}

export interface Funcionario {
    id: number;
    nome: string;
    cor: string;
}

export interface Horario {
    funcionarioId: number;
    horario: string;
}

export interface DiaEscala {
    dia: number;
    horarios: Horario[];
}

export interface EscalaData {
    funcionarios: Funcionario[];
    dias: DiaEscala[];
    vencedorId?: number;
    isParcial?: boolean;
}

export interface Subscription {
    id: string;
    user_id: string;
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
    plan_type: 'basic' | 'pro' | 'enterprise';
    current_period_end: string;
    mp_preapproval_id?: string;
    created_at: string;
}

export interface UserProfile {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
    access_status?: 'active' | 'blocked';
    subscription?: Subscription | null;
}

export interface AdminUser {
    id: string;
    email: string;
    access_status: 'active' | 'blocked';
    created_at: string;
}