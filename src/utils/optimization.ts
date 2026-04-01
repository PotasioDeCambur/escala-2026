import { EscalaData, Funcionario, DiaEscala } from '../types';

// Limite máximo do histórico de edições
const MAX_HISTORY_SIZE = 50;

// Limite máximo de funcionários
const MAX_FUNCIONARIOS = 20;

// Função para limpar dados órfãos
export const limparDadosOrfaos = (escala: EscalaData): EscalaData => {
  const funcionariosIds = new Set(escala.funcionarios.map(f => f.id));

  // Remove horários de funcionários que não existem mais
  const diasLimpos = escala.dias.map(dia => ({
    ...dia,
    horarios: dia.horarios.filter(h => funcionariosIds.has(h.funcionarioId))
  }));

  return {
    ...escala,
    dias: diasLimpos
  };
};



// Função para compactar dados
export const compactarEscala = (escala: EscalaData): EscalaData => {
  // Se a escala tem funcionários mas não tem dias, não compacta
  // (caso de escala recém-criada)
  if (escala.funcionarios.length > 0 && escala.dias.length === 0) {
    return escala;
  }

  // Remove dias vazios (sem horários) apenas se há dias
  const diasCompactados = escala.dias.filter(dia =>
    dia.horarios.length > 0
  );

  // Mantém todos os funcionários, mesmo sem horários
  // (não remove funcionários sem horários para manter a estrutura completa)
  return {
    funcionarios: escala.funcionarios,
    dias: diasCompactados
  };
};

// Função para verificar tamanho do localStorage
export const verificarTamanhoLocalStorage = (): { tamanho: number; limite: number } => {
  let tamanho = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      tamanho += localStorage[key].length + key.length;
    }
  }

  // Estimativa do limite (varia por navegador)
  const limite = 5 * 1024 * 1024; // ~5MB

  return { tamanho, limite };
};

// Função para limpeza automática
export const limpezaAutomatica = () => {
  const { tamanho, limite } = verificarTamanhoLocalStorage();

  // Se está usando mais de 80% do espaço disponível
  if (tamanho > limite * 0.8) {
    // Remove backup antigo se existir
    const backup = localStorage.getItem('escala-horarios-backup');
    if (backup) {
      localStorage.removeItem('escala-horarios-backup');
    }

    // Limpa chaves temporárias
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('temp') || key.includes('cache')) {
        localStorage.removeItem(key);
      }
    });
  }
};

// Função para otimizar dados antes de salvar
export const otimizarParaSalvamento = (escala: EscalaData): EscalaData => {
  // Se é uma escala recém-criada (tem funcionários mas não tem dias), salva como está
  if (escala.funcionarios.length > 0 && escala.dias.length === 0) {
    return escala;
  }

  // 1. Limpa dados órfãos
  let escalaOtimizada = limparDadosOrfaos(escala);

  // 2. Compacta dados
  escalaOtimizada = compactarEscala(escalaOtimizada);

  // 3. Verifica se não excede limites
  if (escalaOtimizada.funcionarios.length > MAX_FUNCIONARIOS) {
    console.warn(`⚠️ Muitos funcionários (${escalaOtimizada.funcionarios.length}). Considere remover alguns.`);
  }

  return escalaOtimizada;
}; 