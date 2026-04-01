
import { getDiasMes, DiaMes } from './dateUtils';

export interface Semana {
    id: number;
    label: string;
    dias: DiaMes[];
}

export const getSemanaDoMes = (mes: number, ano: number): Semana[] => {
    const dias = getDiasMes(mes, ano);
    const semanas: Semana[] = [];
    let currentWeek: DiaMes[] = [];
    let weekIndex = 1;

    dias.forEach((dia, index) => {
        currentWeek.push(dia);
        // Fecha a semana se for Sábado ou se for o último dia do mês
        if (dia.diaSemana === 'SAB' || index === dias.length - 1) {
            const primeiroDia = currentWeek[0].data;
            const ultimoDia = currentWeek[currentWeek.length - 1].data;

            semanas.push({
                id: weekIndex,
                label: `Semana ${weekIndex} (${primeiroDia} a ${ultimoDia})`,
                dias: [...currentWeek]
            });

            currentWeek = [];
            weekIndex++;
        }
    });

    return semanas;
};
