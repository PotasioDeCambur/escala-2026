
// Tipos para regras de validação
export interface RegrasEmpresa {
    minimoAbertura: number;
    minimoFechamento: number;
    horarios: {
        semana: { abertura: string; fechamento: string; ativo: boolean };
        sabado: { abertura: string; fechamento: string; ativo: boolean };
        domingo: { abertura: string; fechamento: string; ativo: boolean };
    };
}

// Valores padrão
export const regrasPadrao: RegrasEmpresa = {
    minimoAbertura: 1,
    minimoFechamento: 1,
    horarios: {
        semana: { abertura: "10:00", fechamento: "22:00", ativo: false },
        sabado: { abertura: "10:00", fechamento: "22:00", ativo: false },
        domingo: { abertura: "13:00", fechamento: "21:00", ativo: false },
    }
};

/**
 * Converte uma string de horário/turno em minutos a partir da meia-noite.
 * Suporta formatos: "13:00", "13h", "13", "13:30", etc.
 */
export const parseTime = (timeStr: string): number | null => {
    if (!timeStr) return null;

    // Normaliza a string: remove espaços, converte para minúsculo
    let clean = timeStr.toLowerCase().trim();

    // Se termina com 'h', remove o 'h' final para evitar problemas com regex estrita
    // Ex: "13h" -> "13". "13:00h" -> "13:00"
    if (clean.endsWith('h')) {
        clean = clean.slice(0, -1);
    }

    // Remove espaços internos restantes
    clean = clean.replace(/\s/g, '');

    // Substitui 'h' no meio por ':'
    clean = clean.replace('h', ':');

    // Tenta encontrar padrão HH:MM ou HH
    // Aceita "13", "13:00", "13:30"
    const match = clean.match(/^(\d{1,2})(?::(\d{2}))?$/);

    if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = match[2] ? parseInt(match[2], 10) : 0;
        return hours * 60 + minutes;
    }

    return null;
};

/**
 * Tenta extrair início e fim de um texto de turno.
 * Ex: "10h as 18h", "10-18", "10:00 - 18:00"
 */
export const parseTurno = (turnoStr: string): { inicio: number; fim: number } | null => {
    if (!turnoStr || ['FOLGA', 'ATESTADO', 'FERIADO', '-'].includes(turnoStr.toUpperCase())) return null;

    // Normaliza separadores
    const clean = turnoStr.toLowerCase()
        .replace('às', '-')
        .replace('as', '-')
        .replace('a', '-')
        .replace(' ate ', '-')
        .replace(/\s/g, '');

    // Divide por hifens
    const parts = clean.split('-');
    if (parts.length !== 2) return null;

    const inicio = parseTime(parts[0]);
    const fim = parseTime(parts[1]);

    if (inicio !== null && fim !== null) {
        return { inicio, fim };
    }

    return null;
};

interface ValidacaoDiaResult {
    valido: boolean;
    erros: string[];
}

/**
 * Valida um dia específico da escala contra as regras
 */
export const validarDia = (
    data: Date,
    horariosDoDia: string[],
    regras: RegrasEmpresa
): ValidacaoDiaResult => {
    // Se o dia estiver totalmente vazio (nenhum horário preenchido), ignora validação
    // Isso evita avisos em dias futuros que ainda não foram planejados
    const diaVazio = horariosDoDia.every(h => !h || h.trim() === '');
    if (diaVazio) {
        return { valido: true, erros: [] };
    }

    const diaSemana = data.getDay(); // 0 = Domingo, 6 = Sábado
    let regraDia;

    if (diaSemana === 0) { // Domingo
        regraDia = regras.horarios.domingo;
    } else if (diaSemana === 6) { // Sábado
        regraDia = regras.horarios.sabado;
    } else { // Semana
        regraDia = regras.horarios.semana;
    }

    // Se a validação não estiver ativa para este tipo de dia, retorna válido
    if (!regraDia.ativo) {
        return { valido: true, erros: [] };
    }

    const horaAbertura = parseTime(regraDia.abertura);
    const horaFechamento = parseTime(regraDia.fechamento);

    if (horaAbertura === null || horaFechamento === null) {
        return { valido: true, erros: [] }; // Regra mal formada, ignora
    }

    // Analisa os turnos do dia
    let pessoasNaAbertura = 0;
    let pessoasNoFechamento = 0;

    horariosDoDia.forEach(h => {
        const turno = parseTurno(h);
        if (turno) {
            // Verifica tolerância de 15 min (opcional, ajustável)
            const tolerancia = 15;

            // Checa se alguém "cobre" a abertura (começa antes ou exatamente na hora)
            if (turno.inicio <= horaAbertura + tolerancia) {
                pessoasNaAbertura++;
            }

            // Checa se alguém "cobre" o fechamento (termina depois ou exatamente na hora)
            if (turno.fim >= horaFechamento - tolerancia) {
                pessoasNoFechamento++;
            }
        }
    });

    const erros: string[] = [];

    if (pessoasNaAbertura < regras.minimoAbertura) {
        erros.push(`Falta abertura (Loja abre ${regraDia.abertura})`);
    }

    if (pessoasNoFechamento < regras.minimoFechamento) {
        erros.push(`Falta fechamento (Loja fecha ${regraDia.fechamento})`);
    }

    return {
        valido: erros.length === 0,
        erros
    };
};
