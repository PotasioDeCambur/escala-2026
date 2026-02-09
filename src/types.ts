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