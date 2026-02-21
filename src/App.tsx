import React, { useState, useEffect, useMemo, useRef } from 'react';
import { EscalaData, Funcionario } from './types';
import { dadosIniciais } from './data';
import {
  limpezaAutomatica,
  otimizarParaSalvamento,
  verificarTamanhoLocalStorage
} from './utils/optimization';

import { saveEscala, isSupabaseConfigured } from './supabaseClient';
import { saveAndReturnLink, copyToClipboard } from './utils/share';
import { useAuth } from './contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './App.css';
import {
  diasSemana,
  meses,
  isFeriado,
  isFimDeSemana,
  getDiasMes,
  getNomeMes
} from './utils/dateUtils';
import {
  exportToPdf,
  exportToExcel,
  exportToGoogleSheets
} from './utils/exportUtils';
import { RegrasEmpresa, regrasPadrao, validarDia } from './utils/validation';
import { gerarSugestaoEscala } from './utils/autoSchedule';
import { AutoFillModal } from './components/AutoFillModal';
import {
  saveSnapshot,
  getHistoryIndex,
  loadSnapshot,
  deleteSnapshot,
  HistoryMetadata,
  formatHistoryDate
} from './utils/historyUtils';

function App() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [escala, setEscala] = useState<EscalaData>(() => {
    const savedEscala = localStorage.getItem('escala-horarios');

    // Se não há dados salvos ou se os dados estão vazios, usa dados iniciais
    let parsedEscala;
    if (!savedEscala) {
      parsedEscala = dadosIniciais;
    } else {
      const tempParsed = JSON.parse(savedEscala);
      // Garantir que sempre há funcionários
      if (!tempParsed.funcionarios || tempParsed.funcionarios.length === 0) {
        // Se os dados salvos não têm funcionários, adiciona os dados iniciais
        parsedEscala = {
          ...tempParsed,
          funcionarios: dadosIniciais.funcionarios
        };
        // Salva a escala corrigida
        localStorage.setItem('escala-horarios', JSON.stringify(parsedEscala));
      } else {
        parsedEscala = tempParsed;
      }
    }

    // Carregar vencedorId do localStorage se não estiver na escala
    if (!parsedEscala.vencedorId) {
      const savedVencedorId = localStorage.getItem('vencedor-id');
      if (savedVencedorId) {
        parsedEscala.vencedorId = parseInt(savedVencedorId, 10);
      }
    }

    return parsedEscala;
  });
  const [mesAtual, setMesAtual] = useState<number>(() => new Date().getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState<number>(() => new Date().getFullYear());
  const [isEditing, setIsEditing] = useState(false);
  // Novo estado para o sistema de Toast/Undo
  const [undoToast, setUndoToast] = useState<{
    isVisible: boolean;
    message: string;
    onUndo: () => void;
  }>({ isVisible: false, message: '', onUndo: () => { } });


  const [showDestaqueModal, setShowDestaqueModal] = useState(false);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);

  const [historyList, setHistoryList] = useState<HistoryMetadata[]>([]);
  const [cloudId, setCloudId] = useState<string | null>(() => localStorage.getItem('escala-cloud-id'));
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const autoSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Theme Management
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };



  const anos = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

  const handleMesChange = (novoMes: number) => {
    setMesAtual(novoMes);
  };

  const handleAnoChange = (novoAno: number) => {
    setAnoAtual(novoAno);
  };



  const handleCancelEdit = () => {
    if (window.confirm('Tem certeza que deseja cancelar as edições? Todas as mudanças serão perdidas.')) {
      setIsEditing(false);
    }
  };

  const closeToast = () => {
    setUndoToast(prev => ({ ...prev, isVisible: false }));
  };

  const handleUndo = () => {
    undoToast.onUndo();
    closeToast();
  };

  // Salvar escala no localStorage sempre que ela mudar
  useEffect(() => {
    // Otimiza os dados antes de salvar
    const escalaOtimizada = otimizarParaSalvamento(escala);
    localStorage.setItem('escala-horarios', JSON.stringify(escalaOtimizada));

    // Verifica e faz limpeza automática se necessário
    limpezaAutomatica();
  }, [escala]);

  // Persistir cloudId
  useEffect(() => {
    if (cloudId) {
      localStorage.setItem('escala-cloud-id', cloudId);
    }
  }, [cloudId]);

  // Função para sincronizar com a nuvem (Supabase)
  const handleSyncToCloud = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    setSyncError(false);
    try {
      // Se já temos um ID, tentamos atualizar. Se não, cria novo.
      // Passamos o cloudId existente (se houver) para o saveAndReturnLink
      const result = await saveAndReturnLink(escala, mesAtual, anoAtual, cloudId || undefined);

      if (result.success === false) {
        setSyncError(true);
        if (!silent) console.warn('⚠️ Erro ao salvar (success: false)');
      }

      if (result.id && !result.id.startsWith('local-')) {
        setCloudId(result.id);
        setLastSyncTime(new Date().toLocaleTimeString());
        if (!silent) console.log('☁️ Sincronizado com sucesso:', result.id);
        return result.link;
      } else {
        // Se retornou local, é porque falhou ou não tem credenciais
        if (!silent) console.warn('⚠️ Sincronização falhou ou em modo local');
        return result.link; // Retorna o link fallback
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
      setSyncError(true);
      return window.location.href; // Fallback
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  // Auto-sync ao salvar edições e em mudanças fora do modo de edição
  useEffect(() => {
    if (isEditing) return;
    if (!cloudId) return;
    if (!isSupabaseConfigured()) return;

    if (autoSyncTimeoutRef.current) {
      clearTimeout(autoSyncTimeoutRef.current);
    }

    autoSyncTimeoutRef.current = setTimeout(() => {
      handleSyncToCloud(true);
    }, 800);

    return () => {
      if (autoSyncTimeoutRef.current) {
        clearTimeout(autoSyncTimeoutRef.current);
      }
    };
  }, [escala, isEditing, cloudId]);

  // Salvar estado inicial quando entrar no modo de edição (sem histórico)
  useEffect(() => {
    if (isEditing) {
      // nada extra — removido histórico para simplificar
    }
  }, [isEditing]);

  // Atalhos de teclado (Global)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar se modais estiverem abertos
      if (showDestaqueModal || showConfigModal) return;

      // Ignorar se estiver em inputs, exceto para ESC (cancelar) e ENTER (salvar/editar)
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';

      if (event.key === 'Escape') {
        if (isEditing) {
          handleCancelEdit(); // Cancelar edição
        }
      } else if (event.key === 'Enter') {
        if (isInput) return; // Deixar inputs funcionarem normalmente

        event.preventDefault();
        // Se estiver editando, salvar (sair do modo edição). Se não, entrar no modo edição.
        setIsEditing(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing, showDestaqueModal, showConfigModal]);

  // Garantir que a escala sempre tem funcionários (inicializar se necessário)
  useEffect(() => {
    if (!escala.funcionarios || escala.funcionarios.length === 0) {
      const escalaAtualizada = {
        ...escala,
        funcionarios: dadosIniciais.funcionarios
      };
      setEscala(escalaAtualizada);
    }
  }, []);

  // Carregar vencedorId do localStorage ao iniciar
  useEffect(() => {
    const savedVencedorId = localStorage.getItem('vencedor-id');
    if (savedVencedorId && !escala.vencedorId) {
      const vencedorId = parseInt(savedVencedorId, 10);
      setEscala(prevEscala => ({
        ...prevEscala,
        vencedorId: vencedorId
      }));
    }
  }, []);

  // Salvar vencedorId no localStorage sempre que mudar
  useEffect(() => {
    if (escala.vencedorId) {
      localStorage.setItem('vencedor-id', escala.vencedorId.toString());
    } else {
      localStorage.removeItem('vencedor-id');
    }
  }, [escala.vencedorId]);

  // Usar funcionários da escala diretamente
  const funcionarios = escala.funcionarios || dadosIniciais.funcionarios;

  const STATUS = {
    FOLGA: "FOLGA",
    ATESTADO: "ATESTADO",
    FERIADO: "FERIADO"
  } as const;

  const getStatusClass = (horario?: string) => {
    if (horario === STATUS.FOLGA) return 'folga';
    if (horario === STATUS.FERIADO) return 'feriado';
    if (horario === STATUS.ATESTADO) return 'atestado';
    return '';
  };

  // Mantemos apenas marcadores especiais como padrões; horários comuns serão gerenciados pelo usuário
  const turnosPadrao: string[] = [
    STATUS.FOLGA,
    STATUS.ATESTADO,
    STATUS.FERIADO
  ];

  const [frequentHorarios, setFrequentHorarios] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('horarios-frequentes');
      const fromStorage = raw ? (JSON.parse(raw) || []) : [];
      const values = (Array.isArray(fromStorage) ? fromStorage : []).map((s: any) => String(s).trim()).filter(Boolean);
      // Remover horários que já fazem parte dos turnos padrão para evitar duplicatas
      return values.filter(v => !turnosPadrao.includes(v));
    } catch (e) {
      return [];
    }
  });

  const [novoHorarioFrequente, setNovoHorarioFrequente] = useState('');

  const [pausedHorarios, setPausedHorarios] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('horarios-pausados');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((s: any) => String(s).trim()).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  });

  const [regras, setRegras] = useState<RegrasEmpresa>(() => {
    try {
      const saved = localStorage.getItem('regras-empresa');
      return saved ? JSON.parse(saved) : regrasPadrao;
    } catch (e) {
      return regrasPadrao;
    }
  });

  useEffect(() => {
    localStorage.setItem('regras-empresa', JSON.stringify(regras));
  }, [regras]);

  useEffect(() => {
    try {
      localStorage.setItem('horarios-pausados', JSON.stringify(pausedHorarios));
    } catch (e) {
      // ignore
    }
  }, [pausedHorarios]);

  useEffect(() => {
    try {
      localStorage.setItem('horarios-frequentes', JSON.stringify(frequentHorarios));
    } catch (e) {
      // ignore
    }
  }, [frequentHorarios]);

  // Construir opções do seletor: vazio + horários frequentes (user-managed) + marcadores especiais.
  const buildUnique = (arr: string[]) => Array.from(new Set(arr));
  const turnos = buildUnique(["", ...frequentHorarios.filter(f => !pausedHorarios.includes(f)), ...turnosPadrao]);

  const handleAddFrequentHorario = (valor: string) => {
    const v = (valor || '').trim();
    if (!v) return;
    // evita duplicatas exatas
    if (turnosPadrao.includes(v) || frequentHorarios.includes(v)) {
      alert('Horário já existe na lista.');
      return;
    }
    setFrequentHorarios(prev => [...prev, v]);
    setNovoHorarioFrequente('');
  };

  const handleRemoveFrequentHorario = (index: number) => {
    setFrequentHorarios(prev => {
      const removed = prev[index];
      // remove também dos pausados
      setPausedHorarios(p => p.filter(x => x !== removed));
      return prev.filter((_, i) => i !== index);
    });
  };

  const togglePauseHorario = (valor: string) => {
    const v = (valor || '').trim();
    if (!v) return;
    setPausedHorarios(prev => {
      if (prev.includes(v)) return prev.filter(x => x !== v);
      return [...prev, v];
    });
  };

  // Ao abrir o modal de configurações, popula `frequentHorarios` com os horários
  // atualmente usados no seletor (escala.dias). Substitui a lista exibida.
  useEffect(() => {
    // Ao abrir o modal, só preenche a lista com horários encontrados na escala
    // se não houver uma lista salva (ou seja, se o usuário ainda não adicionou horários).
    if (!showConfigModal) return;
    if (frequentHorarios && frequentHorarios.length > 0) return; // preservar lista do gerenciador

    try {
      const dias = (escala && escala.dias) ? escala.dias : [];
      const found = new Set<string>();
      dias.forEach(d => {
        (d.horarios || []).forEach((h: any) => {
          if (h && h.horario && typeof h.horario === 'string') {
            const val = h.horario.trim();
            if (val && !turnosPadrao.includes(val)) found.add(val);
          }
        });
      });
      const arr = Array.from(found);
      if (arr.length > 0) {
        setFrequentHorarios(arr);
        setPausedHorarios(p => p.filter(x => arr.includes(x)));
      }
    } catch (e) {
      // ignore
    }
  }, [showConfigModal, escala, frequentHorarios]);

  // Date/Holiday logic moved to utils/dateUtils.ts



  const getHorarioFuncionario = (dia: number, funcionarioId: number) => {
    const diaEscala = escala.dias.find(d => d.dia === dia);
    if (!diaEscala) return "";

    const horario = diaEscala.horarios.find(h => h.funcionarioId === funcionarioId);
    return horario ? horario.horario : "";
  };

  const handleHorarioChange = (dia: number, funcionarioId: number, novoHorario: string) => {
    setEscala(prevEscala => {
      const novaEscala = { ...prevEscala };
      const diaIndex = novaEscala.dias.findIndex(d => d.dia === dia);

      if (diaIndex !== -1) {
        const horarioIndex = novaEscala.dias[diaIndex].horarios.findIndex(h => h.funcionarioId === funcionarioId);
        if (horarioIndex !== -1) {
          novaEscala.dias[diaIndex].horarios[horarioIndex].horario = novoHorario;
        } else {
          novaEscala.dias[diaIndex].horarios.push({ funcionarioId, horario: novoHorario });
        }
      } else {
        novaEscala.dias.push({
          dia,
          horarios: [{ funcionarioId, horario: novoHorario }]
        });
      }
      // Histórico removido — apenas atualiza a escala
      return novaEscala;
    });
  };

  const handleAddDay = () => {
    const lastDay = escala.dias.length > 0 ? Math.max(...escala.dias.map(d => d.dia)) : 0;
    const newDayNumber = lastDay + 1;
    const newDate = new Date(anoAtual, mesAtual - 1, newDayNumber);
    const newDayOfWeek = diasSemana[newDate.getDay()];

    const newHorarios = funcionarios.map(func => ({
      funcionarioId: func.id,
      horario: "FOLGA" // Horário padrão para o novo dia
    }));

    const newDiaEscala = {
      dia: newDayNumber,
      horarios: newHorarios
    };

    setEscala(prevEscala => ({
      ...prevEscala,
      dias: [...prevEscala.dias, newDiaEscala]
    }));
  };

  const handleRemoveDay = (diaToRemove: number) => {
    // Salva os dados do dia antes de remover
    const diaToRemoveData = escala.dias.find(d => d.dia === diaToRemove);
    if (!diaToRemoveData) return;

    setEscala(prevEscala => ({
      ...prevEscala,
      dias: prevEscala.dias.filter(dia => dia.dia !== diaToRemove)
    }));

    // Ativa o Toast de Undo
    setUndoToast({
      isVisible: true,
      message: `Dia ${diaToRemove} removido`,
      onUndo: () => {
        setEscala(current => ({
          ...current,
          dias: [...current.dias, diaToRemoveData].sort((a, b) => a.dia - b.dia)
        }));
      }
    });

    // Auto-hide após 5 segundos
    setTimeout(() => {
      setUndoToast(prev => (prev.message.includes(`Dia ${diaToRemove}`) ? { ...prev, isVisible: false } : prev));
    }, 5000);
  };

  const handleAddFuncionario = () => {
    const newFuncionarioId = funcionarios.length > 0 ? Math.max(...funcionarios.map(f => f.id)) + 1 : 1;
    const newFuncionarioName = "Novo Funcionário";
    const newFuncionario: Funcionario = { id: newFuncionarioId, nome: newFuncionarioName, cor: "#CCCCCC" };

    // Adicionar funcionário e horários padrão em todos os dias existentes
    setEscala(prevEscala => ({
      ...prevEscala,
      funcionarios: [...prevEscala.funcionarios, newFuncionario],
      dias: prevEscala.dias.map(dia => ({
        ...dia,
        horarios: [...dia.horarios, { funcionarioId: newFuncionario.id, horario: "FOLGA" }]
      }))
    }));
  };

  const handleRemoveFuncionario = (funcionarioIdToRemove: number) => {
    const funcionarioToRemove = funcionarios.find(f => f.id === funcionarioIdToRemove);
    if (!funcionarioToRemove) return;

    // Backup dos horários deste funcionário
    const horariosBackup = escala.dias.map(d => ({
      diaId: d.dia,
      horarioItem: d.horarios.find(h => h.funcionarioId === funcionarioIdToRemove)
    }));

    // Remover funcionário e seus horários
    setEscala(prevEscala => ({
      ...prevEscala,
      funcionarios: prevEscala.funcionarios.filter(func => func.id !== funcionarioIdToRemove),
      dias: prevEscala.dias.map(dia => ({
        ...dia,
        horarios: dia.horarios.filter(h => h.funcionarioId !== funcionarioIdToRemove)
      }))
    }));

    // Ativa o Toast de Undo
    setUndoToast({
      isVisible: true,
      message: `${funcionarioToRemove.nome} removido`,
      onUndo: () => {
        setEscala(current => ({
          ...current,
          funcionarios: [...current.funcionarios, funcionarioToRemove],
          dias: current.dias.map(dia => {
            const backup = horariosBackup.find(b => b.diaId === dia.dia);
            // Se tinha horário salvo, restaura. Se não, restaura como FOLGA (fallback se algo falhar)
            const horarioRestaurado = backup?.horarioItem || { funcionarioId: funcionarioIdToRemove, horario: "FOLGA" };
            return {
              ...dia,
              horarios: [...dia.horarios, horarioRestaurado]
            };
          })
        }));
      }
    });

    setTimeout(() => {
      setUndoToast(prev => (prev.message.includes(funcionarioToRemove.nome) ? { ...prev, isVisible: false } : prev));
    }, 5000);
  };

  const handleEditFuncionarioName = (funcionarioId: number) => {
    const funcionario = funcionarios.find(f => f.id === funcionarioId);
    if (!funcionario) return;

    const novoNome = prompt(`Digite o novo nome para ${funcionario.nome}:`, funcionario.nome);

    if (novoNome && novoNome.trim() !== '' && novoNome !== funcionario.nome) {
      setEscala(prevEscala => ({
        ...prevEscala,
        funcionarios: prevEscala.funcionarios.map(func =>
          func.id === funcionarioId
            ? { ...func, nome: novoNome.trim() }
            : func
        )
      }));
    }
  };

  const handleUpdateFuncionarioColor = (funcionarioId: number, novaCor: string) => {
    setEscala(prevEscala => ({
      ...prevEscala,
      funcionarios: prevEscala.funcionarios.map(func =>
        func.id === funcionarioId
          ? { ...func, cor: novaCor }
          : func
      )
    }));
  };

  const handleDestaque = () => {
    if (funcionarios.length === 0) {
      alert('Não há funcionários cadastrados!');
      return;
    }
    setShowDestaqueModal(true);
  };

  const handleSelecionarDestaque = (funcionarioId: number | null) => {
    if (funcionarioId === null) {
      // Remover destaque
      setEscala(prevEscala => ({
        ...prevEscala,
        vencedorId: undefined
      }));
      localStorage.removeItem('vencedor-id');
    } else {
      // Definir funcionário destacado
      setEscala(prevEscala => ({
        ...prevEscala,
        vencedorId: funcionarioId
      }));
      localStorage.setItem('vencedor-id', funcionarioId.toString());
    }
    setShowDestaqueModal(false);
  };

  const calcularEstatisticas = () => {
    const stats = {
      totalDias: escala.dias.length,
      totalFolgas: 0,
      totalHorarios: 0,
      funcionariosComFolga: 0
    };

    escala.dias.forEach(dia => {
      const folgasDia = dia.horarios.filter(h => h.horario === "FOLGA").length;
      stats.totalFolgas += folgasDia;
      stats.totalHorarios += dia.horarios.length;
      if (folgasDia > 0) stats.funcionariosComFolga++;
    });

    return stats;
  };

  const handleOpenHistory = () => {
    setHistoryList(getHistoryIndex());
    setShowHistoryModal(true);
  };

  const handleSaveCurrent = () => {
    const defaultName = prompt('Deseja dar um nome a esta versão? (Opcional)');
    saveSnapshot(escala, mesAtual, anoAtual, defaultName || undefined);
    setHistoryList(getHistoryIndex()); // Update list
    alert('Escala arquivada com sucesso!');
  };

  const handleLoadSnapshot = (id: string) => {
    if (window.confirm('Carregar esta versão substituirá a escala atual não salva. Continuar?')) {
      const loaded = loadSnapshot(id);
      if (loaded) {
        setEscala(loaded);
        // We might want to set mes/ano to match snapshot?
        // Let's rely on user manually setting context, OR auto-set:
        // The snapshot has data. If we want we could store Mes/Ano inside EscalaData?
        // historyUtils stores mes/ano in metadata.
        // For now, loading data is key.
        localStorage.setItem('escala-horarios', JSON.stringify(loaded));
        setShowHistoryModal(false);
        alert('Versão carregada com sucesso!');
      } else {
        alert('Erro ao carregar versão.');
      }
    }
  };

  const handleDeleteSnapshot = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este histórico?')) {
      deleteSnapshot(id);
      setHistoryList(getHistoryIndex());
    }
  };

  const handleZerarEscala = () => {
    if (window.confirm('Tem certeza que deseja zerar toda a escala? Esta ação não pode ser desfeita.')) {
      // Limpa completamente a escala
      const escalaLimpa = { funcionarios: escala.funcionarios, dias: [] };
      setEscala(escalaLimpa);

      // Limpa o localStorage
      localStorage.setItem('escala-horarios', JSON.stringify(escalaLimpa));
    }
  };

  // Backup e restauração removidos — ações gerenciadas manualmente pelo usuário

  // Removido: função de verificação de uso/estatísticas detalhadas que referenciava histórico

  const stats = calcularEstatisticas();
  const diasMes = useMemo(() => getDiasMes(mesAtual, anoAtual), [mesAtual, anoAtual]);

  const handleExportPdf = async () => {
    await exportToPdf(escala, funcionarios, diasMes, mesAtual, anoAtual);
  };

  const handleExportGoogleSheets = async () => {
    await exportToGoogleSheets(escala, funcionarios, diasMes, anoAtual);
  };

  const handleExportExcel = async () => {
    await exportToExcel(escala, funcionarios, diasMes, mesAtual, anoAtual);
  };

  // Calcula uso do localStorage
  const { tamanho, limite } = verificarTamanhoLocalStorage();
  const percentualUso = (tamanho / limite) * 100;

  const handleAutoFillSubmit = (config: { funcionarioId: number, horario: string, folgasSelecionadas: number[], horarioSabado?: string, horarioDomingo?: string }) => {
    if (!config.funcionarioId) {
      alert("Selecione um funcionário.");
      return;
    }

    const novaEscala = gerarSugestaoEscala({
      escala,
      funcionarioId: config.funcionarioId,
      mes: mesAtual,
      ano: anoAtual,
      folgasSelecionadas: config.folgasSelecionadas,
      horarioTrabalho: config.horario,
      horarioSabado: config.horarioSabado,
      horarioDomingo: config.horarioDomingo
    });

    setEscala(novaEscala);
    setShowAutoFillModal(false);
    alert("Escala preenchida com sucesso!");
  };

  return (
    <div className="container">
      {/* Notificação Toast de Desfazer (Novo) */}
      <div className={`undo-toast ${undoToast.isVisible ? 'visible' : ''}`}>
        <span className="undo-message">{undoToast.message}</span>
        <button onClick={handleUndo} className="undo-action-btn">
          DESFAZER
        </button>
        <button onClick={closeToast} className="undo-close-btn">
          ✕
        </button>
      </div>

      {/* Botão flutuante do WhatsApp */}
      <div className="floating-share">
        <button
          onClick={async () => {
            // Sincroniza antes de compartilhar para garantir link atualizado
            const link = await handleSyncToCloud();
            const message = `📅 *ESCALA DE HORÁRIOS - ${getNomeMes(mesAtual).toUpperCase()} ${anoAtual}*\n\nOlá! Aqui está o link da escala de horários:\n\n🔗 ${link}\n\n📋 *Funcionários:* ${funcionarios.map(f => f.nome).join(', ')}\n📅 *Período:* ${getNomeMes(mesAtual)} ${anoAtual}\n\nAcesse o link para ver seus horários e folgas! 👆`;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
              window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
            } else {
              window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
            }
          }}
          className="floating-whatsapp-button"
          disabled={isSyncing}
        >
          {isSyncing ? '⏳ SINCRONIZANDO...' : '📱 WHATSAPP'}
        </button>
      </div>

      <div className="header-saas">
        <div className="header-top-row">
          <div className="header-branding">
            <h1>📅 ESCALA DE HORÁRIOS</h1>
            <p className="subtitle">Gerencie sua escala com facilidade e eficiência</p>

          </div>

          <div className="header-month-selector">
            <div className="selector-group">
              <label>MÊS</label>
              <select
                value={mesAtual}
                onChange={(e) => handleMesChange(Number(e.target.value))}
                className="saas-select"
              >
                {meses.map(mes => (
                  <option key={mes.valor} value={mes.valor}>
                    {mes.nome.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="selector-group">
              <label>ANO</label>
              <select
                value={anoAtual}
                onChange={(e) => handleAnoChange(Number(e.target.value))}
                className="saas-select"
              >
                {anos.map(ano => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="header-utils">
            {/* Connection Status Indicator */}
            {!isSupabaseConfigured() ? (
              <div className="connection-status offline" title="Sistema desconectado da nuvem">
                <span className="status-dot"></span>
              </div>
            ) : (
              <div className={`connection-status ${syncError ? 'offline' : (isSyncing ? 'syncing' : 'online')}`}
                title={syncError ? "Erro ao salvar" : (isSyncing ? "Sincronizando..." : "Sistema conectado e salvo")}>
                <span className="status-dot"></span>
              </div>
            )}

            <button onClick={toggleTheme} className="btn-icon" title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button onClick={handleOpenHistory} className="btn-icon" title="Máquina do Tempo (Histórico)">
              🕰️
            </button>
            <button onClick={() => setShowConfigModal(true)} className="btn-saas btn-ghost" title="Gerenciar Horários">
              🕒 HORÁRIOS
            </button>
            {user?.email === 'armandoo.linares@gmail.com' && (
              <button
                onClick={() => navigate('/admin')}
                className="btn-saas btn-ghost"
                title="Painel Admin Secreto"
                style={{ color: '#28a745', borderColor: '#28a745' }}
              >
                ⚙️ ADMIN
              </button>
            )}
            <button onClick={handleDestaque} className="btn-icon" title="Destaque">
              👑
            </button>
          </div>
        </div>

        <div className="actions-toolbar">
          <div className="toolbar-group main">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`btn-saas ${isEditing ? 'btn-save' : 'btn-edit'}`}
            >
              {isEditing ? '💾 SALVAR ALTERAÇÕES' : '📝 EDITAR ESCALA'}
            </button>
            {isEditing && (
              <button onClick={handleAddFuncionario} className="btn-saas btn-add">
                ➕ NOVO FUNCIONÁRIO
              </button>
            )}
            <button
              onClick={() => setShowAutoFillModal(true)}
              className="btn-saas btn-ghost"
              title="Assistente de Preenchimento"
            >
              ✨ PREENCHER
            </button>
          </div>

          <div className="toolbar-group secondary">
            <button onClick={handleExportPdf} className="btn-saas btn-ghost">
              📄 PDF
            </button>
            <button onClick={handleExportExcel} className="btn-saas btn-ghost">
              📊 EXCEL
            </button>
            <button onClick={handleExportGoogleSheets} className="btn-saas btn-ghost" title="Abrir no Google Sheets">
              📑 SHEETS
            </button>
            <button onClick={async () => {
              // Verificação de data (Segurança)
              const hoje = new Date();
              const mesReal = hoje.getMonth() + 1;
              const anoReal = hoje.getFullYear();

              if (mesAtual !== mesReal || anoAtual !== anoReal) {
                const nomeMesAtual = meses.find(m => m.valor === mesAtual)?.nome.toUpperCase();
                const nomeMesReal = meses.find(m => m.valor === mesReal)?.nome.toUpperCase();

                const confirmed = window.confirm(
                  `⚠️ ATENÇÃO: DATA DIVERGENTE!\n\n` +
                  `Você está compartilhando a escala de ${nomeMesAtual}/${anoAtual}.\n` +
                  `Porém, estamos em ${nomeMesReal}/${anoReal}.\n\n` +
                  `Tem certeza que deseja compartilhar essa escala antiga/futura?`
                );

                if (!confirmed) return;
              }

              const escalaData = {
                dias: escala.dias,
                funcionarios: escala.funcionarios,
                vencedorId: escala.vencedorId,
                mes: mesAtual,
                ano: anoAtual
              };

              try {
                const { link, savedOn, id } = await saveAndReturnLink(
                  escalaData,
                  mesAtual,
                  anoAtual,
                  cloudId || undefined
                );
                if (id && !id.startsWith('local-')) {
                  setCloudId(id);
                  setLastSyncTime(new Date().toLocaleTimeString());
                }
                const copied = await copyToClipboard(link);
                if (copied) {
                  alert(`Link da escala mobile copiado! (${savedOn})`);
                } else {
                  alert('Link gerado, mas não foi possível copiar automaticamente. Cole manualmente: ' + link);
                }
              } catch (err) {
                console.error('Erro ao gerar link de compartilhamento:', err);
                alert('Erro ao gerar link. Tente novamente.');
              }
            }} className="btn-saas btn-ghost">
              🔗 LINK
            </button>
            <button onClick={() => window.location.href = '/parcial'} className="btn-saas btn-ghost">
              📅 PARCIAL
            </button>
            <button onClick={() => window.location.href = '/mobile'} className="btn-saas btn-ghost">
              📱 MOBILE
            </button>
          </div>

          <div className="toolbar-group danger">
            <button onClick={handleZerarEscala} className="btn-saas btn-danger-ghost" title="Zerar Escala">
              🗑️ ZERAR ESCALA
            </button>
          </div>
        </div>
      </div>

      <div className={`escala-table ${isEditing ? 'editing-mode' : ''}`}>
        <div className="table-header">
          <h2>ESCALA MENSAL - {getNomeMes(mesAtual).toUpperCase()} {anoAtual}</h2>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th className="data-cell">DATA</th>
                {funcionarios.map(func => (
                  <th key={func.id} className="funcionario-header">
                    <div className="funcionario-nome-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>

                      {func.nome}
                      {escala.vencedorId === func.id && (
                        <span className="coroa-vencedor">👑</span>
                      )}
                    </div>
                    {isEditing && (
                      <div className="funcionario-actions">
                        <button onClick={() => handleEditFuncionarioName(func.id)} className="edit-btn" title="Editar Nome">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                          </svg>
                        </button>
                        <button onClick={() => handleRemoveFuncionario(func.id)} className="remove-btn" title="Remover Funcionário">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diasMes.map(({ dia, diaSemana, data }) => (
                <tr key={dia} className={isFimDeSemana(diaSemana) ? 'fim-de-semana' : ''}>
                  <td className="data-cell">
                    {data} ({diaSemana})
                    {isFeriado(data, anoAtual) && <span title="Feriado">🎉</span>}
                    {(() => {
                      // Coletar horários do dia para validação
                      const horariosDia = funcionarios.map(f => getHorarioFuncionario(dia, f.id));
                      // Converter string "DD/MM" para Date para saber dia da semana
                      // diasMes já tem diaSemana, mas precisamos do Date correto para o validarDia (que usa getDay())
                      // Alternativamente, podemos ajustar validarDia para aceitar o dia da semana string, mas vamos criar o Date
                      const dateObj = new Date(anoAtual, mesAtual - 1, dia);

                      const validacao = validarDia(dateObj, horariosDia, regras);

                      if (!validacao.valido) {
                        return (
                          <div className="warning-tooltip">
                            <strong>Atenção:</strong>
                            <ul className="warning-list">
                              {validacao.erros.map((erro, i) => <li key={i}>{erro}</li>)}
                            </ul>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {(() => {
                      const horariosDia = funcionarios.map(f => getHorarioFuncionario(dia, f.id));
                      const dateObj = new Date(anoAtual, mesAtual - 1, dia);
                      const validacao = validarDia(dateObj, horariosDia, regras);
                      if (!validacao.valido) {
                        return <span className="warning-icon">⚠️</span>;
                      }
                      return null;
                    })()}
                  </td>
                  {funcionarios.map(func => {
                    const horario = getHorarioFuncionario(dia, func.id);
                    return (
                      <td key={func.id} className={`horario-cell ${getStatusClass(horario)}`}>
                        {isEditing ? (
                          <select
                            value={horario || ""}
                            onChange={(e) => handleHorarioChange(dia, func.id, e.target.value)}
                          >
                            {turnos.map(t => <option key={t} value={t}>{t === STATUS.FERIADO ? 'FERIADO 🎉' : t}</option>)}
                          </select>
                        ) : (
                          horario === STATUS.ATESTADO ? (
                            <span className="status-badge atestado">ATESTADO 🤒</span>
                          ) : horario === STATUS.FERIADO ? (
                            <span className="status-badge feriado">FERIADO 🎉</span>
                          ) : horario === STATUS.FOLGA ? (
                            <span className="status-badge folga">FOLGA</span>
                          ) : (
                            horario || ""
                          )
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Destaque */}
      {showDestaqueModal && (
        <div className="modal-overlay" onClick={() => setShowDestaqueModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>👑 Escolher Funcionário em Destaque</h2>
              <button className="modal-close" onClick={() => setShowDestaqueModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">Selecione o funcionário que deseja destacar na escala:</p>
              <div className="funcionarios-list">
                <button
                  className={`funcionario-destaque-option ${!escala.vencedorId ? 'selected' : ''}`}
                  onClick={() => handleSelecionarDestaque(null)}
                >
                  <span className="option-icon">❌</span>
                  <span className="option-text">Remover destaque</span>
                </button>
                {funcionarios.map(func => (
                  <button
                    key={func.id}
                    className={`funcionario-destaque-option ${escala.vencedorId === func.id ? 'selected' : ''}`}
                    onClick={() => handleSelecionarDestaque(func.id)}
                  >
                    <span className="option-icon">👑</span>
                    <span className="option-text">{func.nome}</span>
                    {escala.vencedorId === func.id && (
                      <span className="option-badge">Atual</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configurações */}
      {showConfigModal && (
        <div className="modal-overlay" onClick={() => setShowConfigModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙️ Configurações</h2>
              <button className="modal-close" onClick={() => setShowConfigModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="config-layout">
                {/* Coluna 1: Horários Frequentes */}
                <div className="config-column">
                  <div className="config-section-title">
                    <span>🕒</span> Horários Frequentes
                  </div>

                  <div className="config-field">
                    <div className="frequent-controls">
                      <input
                        value={novoHorarioFrequente}
                        onChange={(e) => setNovoHorarioFrequente(e.target.value)}
                        placeholder="Ex: 08H AS 12H"
                      />
                      <div className="btn-group">
                        <button onClick={() => handleAddFrequentHorario(novoHorarioFrequente)} className="btn-saas btn-edit">Adicionar</button>
                      </div>
                    </div>

                    <div className="frequent-list">
                      {frequentHorarios.length === 0 ? (
                        <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Nenhum horário frequente salvo.</p>
                      ) : (
                        frequentHorarios.map((h, i) => {
                          const isPaused = pausedHorarios.includes(h);
                          return (
                            <div key={i} className={`frequent-item ${isPaused ? 'paused' : ''}`}>
                              <div className="label">{h} {isPaused && <small style={{ marginLeft: 8, color: '#7f8c8d' }}>• Pausado</small>}</div>
                              <div className="frequent-actions">
                                <button onClick={() => togglePauseHorario(h)} className="small-btn pause">{isPaused ? 'Retomar' : 'Pausar'}</button>
                                <button onClick={() => handleRemoveFrequentHorario(i)} className="small-btn remove">Remover</button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Coluna 2: Regras da Empresa */}
                <div className="config-column">
                  <div className="config-section-title">
                    <span>🏢</span> Regras da Empresa
                  </div>

                  <div className="config-field">
                    <label>Mínimo de Pessoas</label>
                    <div className="rule-inputs">
                      <div className="input-with-label">
                        <label>Abrir Loja</label>
                        <input
                          type="number"
                          className="rule-input"
                          min="1"
                          value={regras.minimoAbertura}
                          onChange={(e) => setRegras({ ...regras, minimoAbertura: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                      <div className="input-with-label">
                        <label>Fechar Loja</label>
                        <input
                          type="number"
                          className="rule-input"
                          min="1"
                          value={regras.minimoFechamento}
                          onChange={(e) => setRegras({ ...regras, minimoFechamento: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rule-group">
                    <div className="rule-header">
                      <span>Segunda a Sexta</span>
                      <label className="toggle-label">
                        <div className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={regras.horarios.semana.ativo}
                            onChange={(e) => setRegras({
                              ...regras,
                              horarios: {
                                ...regras.horarios,
                                semana: { ...regras.horarios.semana, ativo: e.target.checked }
                              }
                            })}
                          />
                          <span className="slider"></span>
                        </div>
                        Ativar
                      </label>
                    </div>
                    {regras.horarios.semana.ativo && (
                      <div className="rule-inputs">
                        <div className="input-with-label">
                          <label>Horário Abertura</label>
                          <input
                            type="time"
                            className="rule-input"
                            value={regras.horarios.semana.abertura}
                            onChange={(e) => setRegras({
                              ...regras,
                              horarios: {
                                ...regras.horarios,
                                semana: { ...regras.horarios.semana, abertura: e.target.value }
                              }
                            })}
                          />
                        </div>
                        <div className="input-with-label">
                          <label>Horário Fechamento</label>
                          <input
                            type="time"
                            className="rule-input"
                            value={regras.horarios.semana.fechamento}
                            onChange={(e) => setRegras({
                              ...regras,
                              horarios: {
                                ...regras.horarios,
                                semana: { ...regras.horarios.semana, fechamento: e.target.value }
                              }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rule-group">
                    <div className="rule-header">
                      <span>Sábado</span>
                      <label className="toggle-label">
                        <div className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={regras.horarios.sabado.ativo}
                            onChange={(e) => setRegras({
                              ...regras,
                              horarios: {
                                ...regras.horarios,
                                sabado: { ...regras.horarios.sabado, ativo: e.target.checked }
                              }
                            })}
                          />
                          <span className="slider"></span>
                        </div>
                        Ativar
                      </label>
                    </div>
                    {regras.horarios.sabado.ativo && (
                      <div className="rule-inputs">
                        <div className="input-with-label">
                          <label>Horário Abertura</label>
                          <input
                            type="time"
                            className="rule-input"
                            value={regras.horarios.sabado.abertura}
                            onChange={(e) => setRegras({
                              ...regras,
                              horarios: {
                                ...regras.horarios,
                                sabado: { ...regras.horarios.sabado, abertura: e.target.value }
                              }
                            })}
                          />
                        </div>
                        <div className="input-with-label">
                          <label>Horário Fechamento</label>
                          <input
                            type="time"
                            className="rule-input"
                            value={regras.horarios.sabado.fechamento}
                            onChange={(e) => setRegras({
                              ...regras,
                              horarios: {
                                ...regras.horarios,
                                sabado: { ...regras.horarios.sabado, fechamento: e.target.value }
                              }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rule-group">
                    <div className="rule-header">
                      <span>Domingo</span>
                      <label className="toggle-label">
                        <div className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={regras.horarios.domingo.ativo}
                            onChange={(e) => setRegras({
                              ...regras,
                              horarios: {
                                ...regras.horarios,
                                domingo: { ...regras.horarios.domingo, ativo: e.target.checked }
                              }
                            })}
                          />
                          <span className="slider"></span>
                        </div>
                        Ativar
                      </label>
                    </div>
                    {regras.horarios.domingo.ativo && (
                      <div className="rule-inputs">
                        <div className="input-with-label">
                          <label>Horário Abertura</label>
                          <input
                            type="time"
                            className="rule-input"
                            value={regras.horarios.domingo.abertura}
                            onChange={(e) => setRegras({
                              ...regras,
                              horarios: {
                                ...regras.horarios,
                                domingo: { ...regras.horarios.domingo, abertura: e.target.value }
                              }
                            })}
                          />
                        </div>
                        <div className="input-with-label">
                          <label>Horário Fechamento</label>
                          <input
                            type="time"
                            className="rule-input"
                            value={regras.horarios.domingo.fechamento}
                            onChange={(e) => setRegras({
                              ...regras,
                              horarios: {
                                ...regras.horarios,
                                domingo: { ...regras.horarios.domingo, fechamento: e.target.value }
                              }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      )}
      {/* Modal de Histórico */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🕰️ Máquina do Tempo</h2>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: 20, textAlign: 'center' }}>
                <button onClick={handleSaveCurrent} className="btn-saas btn-save" style={{ width: '100%' }}>
                  💾 ARQUIVAR ESCALA ATUAL
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  Salve uma cópia exata de como a escala está agora para consultá-la depois.
                </p>
              </div>

              <div className="history-list">
                {historyList.length === 0 ? (
                  <div className="empty-history">
                    <span className="empty-history-icon">🕸️</span>
                    <p>Nenhum histórico salvo.</p>
                  </div>
                ) : (
                  historyList.map(item => (
                    <div key={item.id} className="history-item">
                      <div className="history-info">
                        <span className="history-title">
                          {item.name || `${getNomeMes(item.mes)} ${item.ano}`}
                        </span>
                        <div className="history-meta">
                          <span>📅 {formatHistoryDate(item.timestamp)}</span>
                          <span>👥 {item.funcionariosCount} funcs</span>
                        </div>
                      </div>
                      <div className="history-actions">
                        <button onClick={() => handleLoadSnapshot(item.id)} className="btn-history-load">
                          📂 Abrir
                        </button>
                        <button onClick={() => handleDeleteSnapshot(item.id)} className="btn-history-delete" title="Excluir">
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <AutoFillModal
        isOpen={showAutoFillModal}
        onClose={() => setShowAutoFillModal(false)}
        onSubmit={handleAutoFillSubmit}
        funcionarios={funcionarios}
        frequentHorarios={frequentHorarios}
        mes={mesAtual}
        ano={anoAtual}
        escala={escala}
      />
    </div>
  );
}

export default App;
