export const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

// Lista de feriados brasileiros (dia/mês)
export const feriadosFixos = [
    "01/01", // Ano Novo
    "21/04", // Tiradentes
    "01/05", // Dia do Trabalho
    "07/09", // Independência do Brasil
    "12/10", // Nossa Senhora Aparecida
    "02/11", // Finados
    "15/11", // Proclamação da República
    "25/12"  // Natal
];

// Feriados móveis (Páscoa, Carnaval, etc.) - aproximação
export const getFeriadosMoveis = (ano: number) => {
    const feriadosMoveis = [];

    // Carnaval (47 dias antes da Páscoa)
    const pascoa = new Date(ano, 2, 21); // Aproximação da Páscoa
    const carnaval = new Date(pascoa.getTime() - (47 * 24 * 60 * 60 * 1000));
    feriadosMoveis.push(`${carnaval.getDate().toString().padStart(2, '0')}/${(carnaval.getMonth() + 1).toString().padStart(2, '0')}`);

    // Sexta-feira Santa (2 dias antes da Páscoa)
    const sextaSanta = new Date(pascoa.getTime() - (2 * 24 * 60 * 60 * 1000));
    feriadosMoveis.push(`${sextaSanta.getDate().toString().padStart(2, '0')}/${(sextaSanta.getMonth() + 1).toString().padStart(2, '0')}`);

    // Páscoa
    feriadosMoveis.push(`${pascoa.getDate().toString().padStart(2, '0')}/${(pascoa.getMonth() + 1).toString().padStart(2, '0')}`);

    // Corpus Christi (60 dias após a Páscoa)
    const corpusChristi = new Date(pascoa.getTime() + (60 * 24 * 60 * 60 * 1000));
    feriadosMoveis.push(`${corpusChristi.getDate().toString().padStart(2, '0')}/${(corpusChristi.getMonth() + 1).toString().padStart(2, '0')}`);

    return feriadosMoveis;
};

export const isFeriado = (data: string | Date, anoAtual?: number): boolean => {
    let diaMes: string;
    let ano: number;

    if (data instanceof Date) {
        diaMes = `${data.getDate().toString().padStart(2, '0')}/${(data.getMonth() + 1).toString().padStart(2, '0')}`;
        ano = data.getFullYear();
    } else {
        // Assume string format "DD/MM" or "DD/MM/YYYY"
        const parts = data.split(' ')[0].split('/'); // Handles "DD/MM (Dia)" or just "DD/MM"
        diaMes = `${parts[0]}/${parts[1]}`;
        ano = anoAtual || new Date().getFullYear();
    }

    const todosFeriados = [...feriadosFixos, ...getFeriadosMoveis(ano)];
    return todosFeriados.includes(diaMes);
};

export const isFimDeSemana = (diaSemana: string) => {
    const normalized = diaSemana.toUpperCase().slice(0, 3);
    return normalized === 'DOM' || normalized === 'SAB';
};

export interface DiaMes {
    dia: number;
    diaSemana: string;
    data: string;
}

export const getDiasMes = (mes: number, ano: number): DiaMes[] => {
    const dias = new Date(ano, mes, 0).getDate();
    const diasArray = [];

    for (let i = 1; i <= dias; i++) {
        const data = new Date(ano, mes - 1, i);
        const diaSemana = diasSemana[data.getDay()];
        diasArray.push({
            dia: i,
            diaSemana,
            data: `${i.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}`
        });
    }

    return diasArray;
};

export const meses = [
    { valor: 1, nome: 'Janeiro' },
    { valor: 2, nome: 'Fevereiro' },
    { valor: 3, nome: 'Março' },
    { valor: 4, nome: 'Abril' },
    { valor: 5, nome: 'Maio' },
    { valor: 6, nome: 'Junho' },
    { valor: 7, nome: 'Julho' },
    { valor: 8, nome: 'Agosto' },
    { valor: 9, nome: 'Setembro' },
    { valor: 10, nome: 'Outubro' },
    { valor: 11, nome: 'Novembro' },
    { valor: 12, nome: 'Dezembro' }
];

export const getNomeMes = (mes: number) => {
    return meses.find(m => m.valor === mes)?.nome || '';
};

export interface CalendarDay {
    day: number;
    month: number;
    year: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isWeekend: boolean;
    dateString: string; // "YYYY-MM-DD" for easier comparison
}

export const getCalendarGrid = (mes: number, ano: number): CalendarDay[] => {
    const calendar: CalendarDay[] = [];

    // First day of the month
    const firstDayOfMonth = new Date(ano, mes - 1, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)

    // Days in current month
    const daysInMonth = new Date(ano, mes, 0).getDate();

    // Days in previous month
    const daysInPrevMonth = new Date(ano, mes - 1, 0).getDate();

    const today = new Date();

    // Previous month days
    for (let i = 0; i < startingDayOfWeek; i++) {
        const day = daysInPrevMonth - startingDayOfWeek + 1 + i;
        const date = new Date(ano, mes - 2, day);
        calendar.push({
            day,
            month: mes - 1 === 0 ? 12 : mes - 1,
            year: mes - 1 === 0 ? ano - 1 : ano,
            isCurrentMonth: false,
            isToday: false, // Simplifying for prev month
            isWeekend: date.getDay() === 0 || date.getDay() === 6,
            dateString: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`
        });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(ano, mes - 1, i);
        calendar.push({
            day: i,
            month: mes,
            year: ano,
            isCurrentMonth: true,
            isToday: today.getDate() === i && today.getMonth() + 1 === mes && today.getFullYear() === ano,
            isWeekend: date.getDay() === 0 || date.getDay() === 6,
            dateString: `${ano}-${mes.toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`
        });
    }

    // Next month days to fill grid (assuming 6 rows of 7 days = 42 cells maximum, or just enough to finish the week)
    // Ensuring we have a multiple of 7
    const remainingCells = 7 - (calendar.length % 7);
    if (remainingCells < 7) {
        for (let i = 1; i <= remainingCells; i++) {
            const date = new Date(ano, mes, i);
            calendar.push({
                day: i,
                month: mes + 1 === 13 ? 1 : mes + 1,
                year: mes + 1 === 13 ? ano + 1 : ano,
                isCurrentMonth: false,
                isToday: false,
                isWeekend: date.getDay() === 0 || date.getDay() === 6,
                dateString: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`
            });
        }
    }

    return calendar;
};
