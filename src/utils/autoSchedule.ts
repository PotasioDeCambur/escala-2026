import { EscalaData } from '../types';
import { getDiasMes } from './dateUtils';

interface AutoScheduleOptions {
    escala: EscalaData;
    funcionarioId: number;
    mes: number;
    ano: number;
    // Nova abordagem: Dias específicos de folga + Horário padrão
    folgasSelecionadas: number[]; // Array com os dias do mês (1-31) que são folga
    horarioTrabalho: string;
    horarioSabado?: string;  // Horário específico para Sábados
    horarioDomingo?: string; // Horário específico para Domingos
}

export const gerarSugestaoEscala = (options: AutoScheduleOptions): EscalaData => {
    const {
        escala,
        funcionarioId,
        mes,
        ano,
        folgasSelecionadas,
        horarioTrabalho,
        horarioSabado,
        horarioDomingo
    } = options;

    // Clona a escala
    const novaEscala: EscalaData = JSON.parse(JSON.stringify(escala));

    // Obter todos os dias do mês para garantir que iteramos sobre o mês correto
    const diasDoMes = getDiasMes(mes, ano);

    diasDoMes.forEach(infoDia => {
        const dia = infoDia.dia;

        // Encontra ou cria o dia na estrutura da escala
        let diaEscala = novaEscala.dias.find(d => d.dia === dia);
        if (!diaEscala) {
            diaEscala = { dia, horarios: [] };
            novaEscala.dias.push(diaEscala);
        }

        // Verifica se é dia de folga (está na lista selecionada pelo usuário)
        const isFolga = folgasSelecionadas.includes(dia);

        // Determina o horário a ser aplicado
        let novoHorarioStr = horarioTrabalho;

        if (isFolga) {
            novoHorarioStr = "FOLGA";
        } else {
            // Verifica exceções de fim de semana
            if (infoDia.diaSemana === 'SAB' && horarioSabado) {
                novoHorarioStr = horarioSabado;
            } else if (infoDia.diaSemana === 'DOM' && horarioDomingo) {
                novoHorarioStr = horarioDomingo;
            }
        }

        // Atualiza ou adiciona o horário
        const horarioIndex = diaEscala.horarios.findIndex(h => h.funcionarioId === funcionarioId);
        if (horarioIndex !== -1) {
            diaEscala.horarios[horarioIndex].horario = novoHorarioStr;
        } else {
            diaEscala.horarios.push({ funcionarioId, horario: novoHorarioStr });
        }
    });

    // Ordenar dias
    novaEscala.dias.sort((a, b) => a.dia - b.dia);

    return novaEscala;
};
