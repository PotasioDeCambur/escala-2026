import React, { useState, useEffect } from 'react';
import { EscalaData, Funcionario, DiaEscala } from './types';
import { dadosIniciais } from './data';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import {
  limpezaAutomatica,
  otimizarParaSalvamento,
  verificarTamanhoLocalStorage
} from './utils/optimization';
import { saveEscala } from './supabaseClient';
import { saveAndReturnLink, copyToClipboard } from './utils/share';
import './App.css';

function App() {
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
  const [lastRemovalAction, setLastRemovalAction] = useState<{
    type: 'day' | 'funcionario';
    id: number;
    data: any;
  } | null>(null);
  const [showDestaqueModal, setShowDestaqueModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);



  const meses = [
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

  const anos = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

  const handleMesChange = (novoMes: number) => {
    setMesAtual(novoMes);
  };

  const handleAnoChange = (novoAno: number) => {
    setAnoAtual(novoAno);
  };

  const getNomeMes = (mes: number) => {
    return meses.find(m => m.valor === mes)?.nome || '';
  };

  

  const handleCancelEdit = () => {
    if (window.confirm('Tem certeza que deseja cancelar as edições? Todas as mudanças serão perdidas.')) {
      setIsEditing(false);
    }
  };

  const handleUndoLastRemoval = () => {
    if (!lastRemovalAction) return;

    if (lastRemovalAction.type === 'day') {
      // Restaura o dia removido
      setEscala(prevEscala => ({
        ...prevEscala,
        dias: [...prevEscala.dias, lastRemovalAction.data].sort((a, b) => a.dia - b.dia)
      }));
    } else if (lastRemovalAction.type === 'funcionario') {
      // Restaura o funcionário removido
      setEscala(prevEscala => ({
        ...prevEscala,
        funcionarios: [...prevEscala.funcionarios, lastRemovalAction.data],
        dias: prevEscala.dias.map(dia => ({
          ...dia,
          horarios: [...dia.horarios, { funcionarioId: lastRemovalAction.id, horario: "FOLGA" }]
        }))
      }));
    }

    // Remove o botão de desfazer
    setLastRemovalAction(null);
  };

  // Salvar escala no localStorage sempre que ela mudar
  useEffect(() => {
    // Otimiza os dados antes de salvar
    const escalaOtimizada = otimizarParaSalvamento(escala);
    localStorage.setItem('escala-horarios', JSON.stringify(escalaOtimizada));

    // Verifica e faz limpeza automática se necessário
    limpezaAutomatica();
  }, [escala]);

  // Salvar estado inicial quando entrar no modo de edição (sem histórico)
  useEffect(() => {
    if (isEditing) {
      // nada extra — removido histórico para simplificar
    }
  }, [isEditing]);

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

  // Mantemos apenas marcadores especiais como padrões; horários comuns serão gerenciados pelo usuário
  const turnosPadrao = [
    "FOLGA",
    "ATESTADO",
    "FERIADO"
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

  const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

  // Lista de feriados brasileiros (dia/mês)
  const feriados = [
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
  const getFeriadosMoveis = (ano: number) => {
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

  const isFeriado = (data: string) => {
    const diaMes = data.split(' ')[0]; // Pega apenas "DD/MM"
    const todosFeriados = [...feriados, ...getFeriadosMoveis(anoAtual)];
    return todosFeriados.includes(diaMes);
  };

  const isFimDeSemana = (diaSemana: string) => {
    return diaSemana === 'DOM' || diaSemana === 'SAB';
  };

  const getDiasMes = (mes: number, ano: number) => {
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

    setEscala(prevEscala => ({
      ...prevEscala,
      dias: prevEscala.dias.filter(dia => dia.dia !== diaToRemove)
    }));

    // Mostra o botão de desfazer
    setLastRemovalAction({
      type: 'day',
      id: diaToRemove,
      data: diaToRemoveData
    });

    // Remove o botão de desfazer após 5 segundos
    setTimeout(() => {
      setLastRemovalAction(null);
    }, 5000);
  };

  const handleAddFuncionario = () => {
    const newFuncionarioId = funcionarios.length > 0 ? Math.max(...funcionarios.map(f => f.id)) + 1 : 1;
    const newFuncionarioName = `NOVO FUNC ${newFuncionarioId}`;
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
    // Salva os dados do funcionário antes de remover
    const funcionarioToRemove = funcionarios.find(f => f.id === funcionarioIdToRemove);

    // Remover funcionário e seus horários de todos os dias
    setEscala(prevEscala => ({
      ...prevEscala,
      funcionarios: prevEscala.funcionarios.filter(func => func.id !== funcionarioIdToRemove),
      dias: prevEscala.dias.map(dia => ({
        ...dia,
        horarios: dia.horarios.filter(h => h.funcionarioId !== funcionarioIdToRemove)
      }))
    }));

    // Mostra o botão de desfazer
    setLastRemovalAction({
      type: 'funcionario',
      id: funcionarioIdToRemove,
      data: funcionarioToRemove
    });

    // Remove o botão de desfazer após 5 segundos
    setTimeout(() => {
      setLastRemovalAction(null);
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
  const diasMes = getDiasMes(mesAtual, anoAtual);

  const handleExportPdf = () => {
    // Cria o PDF em modo paisagem (A4) com unidades em milímetros
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Dimensões da página A4 paisagem
    const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
    const margin = 8; // margem externa reduzida para 8mm

    // Área útil da página
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);

    // Configurações de fonte
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12); // Fonte do título reduzida de 14 para 12

    // Título principal (menor e mais compacto)
    const title = `ESCALA - ${getNomeMes(mesAtual).toUpperCase()} ${anoAtual}`;
    const titleWidth = pdf.getTextWidth(title);
    const titleX = (pageWidth - titleWidth) / 2;
    pdf.text(title, titleX, margin + 6); // Espaçamento reduzido de 8 para 6

    // Configurações da tabela otimizadas para melhor uso do espaço
    pdf.setFontSize(9); // Fonte maior para melhor visibilidade
    const tableStartY = margin + 10; // Espaçamento reduzido de 12 para 10
    const rowHeight = 5.5; // Altura otimizada para caber 31 dias mantendo boa visibilidade
    const colWidth = usableWidth / (funcionarios.length + 1); // +1 para a coluna de data

    // Cabeçalho da tabela
    pdf.setFillColor(52, 73, 94); // Cor azul escura
    pdf.rect(margin, tableStartY, usableWidth, rowHeight, 'F');

    // Texto do cabeçalho
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10); // Fonte maior para cabeçalhos

    // Cabeçalho da coluna DATA - centralizado
    const dataHeaderText = 'DATA';
    const dataHeaderWidth = pdf.getTextWidth(dataHeaderText);
    const dataHeaderX = margin + (colWidth - dataHeaderWidth) / 2;
    pdf.text(dataHeaderText, dataHeaderX, tableStartY + (rowHeight / 2) + 1);

    // Cabeçalhos dos funcionários - centralizados
    funcionarios.forEach((func, index) => {
      const cellX = margin + colWidth * (index + 1);
      const textWidth = pdf.getTextWidth(func.nome);
      const textX = cellX + (colWidth - textWidth) / 2;
      pdf.text(func.nome, textX, tableStartY + (rowHeight / 2) + 1);
    });

    // Dados da tabela
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold'); // Texto em negrito para melhor visibilidade
    pdf.setFontSize(9);

    diasMes.forEach(({ dia, diaSemana, data }, rowIndex) => {
      const y = tableStartY + rowHeight + (rowIndex * rowHeight);

      // Verifica se precisa de nova página
      if (y + rowHeight > pageHeight - margin) {
        pdf.addPage();
        // Repete o cabeçalho na nova página
        pdf.setFillColor(52, 73, 94);
        pdf.rect(margin, margin, usableWidth, rowHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);

        // Cabeçalho da coluna DATA na nova página - centralizado
        const dataHeaderWidth = pdf.getTextWidth('DATA');
        const dataHeaderX = margin + (colWidth - dataHeaderWidth) / 2;
        pdf.text('DATA', dataHeaderX, margin + (rowHeight / 2) + 1);

        // Cabeçalhos dos funcionários na nova página - centralizados
        funcionarios.forEach((func, index) => {
          const cellX = margin + colWidth * (index + 1);
          const textWidth = pdf.getTextWidth(func.nome);
          const textX = cellX + (colWidth - textWidth) / 2;
          pdf.text(func.nome, textX, margin + (rowHeight / 2) + 1);
        });

        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
      }

      // Cor de fundo para fins de semana
      if (isFimDeSemana(diaSemana)) {
        pdf.setFillColor(248, 249, 250);
        pdf.rect(margin, y, usableWidth, rowHeight, 'F');
      }

      // Coluna de data - centralizada
      const dataText = `${data} (${diaSemana})`;
      const dataTextWidth = pdf.getTextWidth(dataText);
      const dataTextX = margin + (colWidth - dataTextWidth) / 2;
      pdf.text(dataText, dataTextX, y + (rowHeight / 2) + 1);

      // Dados dos funcionários - centralizados
      funcionarios.forEach((func, colIndex) => {
        const cellX = margin + colWidth * (colIndex + 1);
        const horario = getHorarioFuncionario(dia, func.id);

        // Cor de fundo para folgas e feriados
        if (horario === 'FOLGA') {
          pdf.setFillColor(255, 234, 167);
          pdf.rect(cellX, y, colWidth, rowHeight, 'F');
          pdf.setFont('helvetica', 'bold');
        } else if (horario === 'FERIADO' || isFeriado(data)) {
          pdf.setFillColor(255, 235, 238);
          pdf.rect(cellX, y, colWidth, rowHeight, 'F');
          pdf.setTextColor(211, 47, 47);
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'bold'); // Mantém negrito para todos os textos
          pdf.setTextColor(0, 0, 0);
        }

        // Mostra "FERIADO" automaticamente se for feriado nacional
        const displayText = isFeriado(data) ? 'FERIADO' : (horario || '');
        const textWidth = pdf.getTextWidth(displayText);
        const textX = cellX + (colWidth - textWidth) / 2;
        pdf.text(displayText, textX, y + (rowHeight / 2) + 1);
      });
    });

    // Bordas da tabela
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);

    // Linhas horizontais
    for (let i = 0; i <= diasMes.length + 1; i++) {
      const y = tableStartY + (i * rowHeight);
      pdf.line(margin, y, margin + usableWidth, y);
    }

    // Linhas verticais
    for (let i = 0; i <= funcionarios.length + 1; i++) {
      const x = margin + (i * colWidth);
      pdf.line(x, tableStartY, x, tableStartY + (diasMes.length + 1) * rowHeight);
    }

    // Salva o PDF
    const nomeArquivo = `escala-${getNomeMes(mesAtual).toLowerCase()}-${anoAtual}.pdf`;
    pdf.save(nomeArquivo);
  };

  const handleExportExcel = () => {
    // Cria a planilha com os dados da escala
    const workbook = XLSX.utils.book_new();

    // Prepara os dados para o Excel
    const dados = [];

    // Cabeçalho
    const header = ['DATA', ...funcionarios.map(f => f.nome)];
    dados.push(header);

    // Dados dos dias
    diasMes.forEach(({ dia, diaSemana, data }) => {
      const row = [data + ' (' + diaSemana + ')'];

      funcionarios.forEach(func => {
        const horario = getHorarioFuncionario(dia, func.id);
        row.push(horario);
      });

      dados.push(row);
    });

    // Cria a planilha
    const worksheet = XLSX.utils.aoa_to_sheet(dados);

    // Ajusta a largura das colunas
    const colWidths = [
      { wch: 15 }, // DATA
      ...funcionarios.map(() => ({ wch: 12 })) // Funcionários
    ];
    worksheet['!cols'] = colWidths;

    // Remove caracteres inválidos do nome da planilha
    const nomePlanilha = `Escala ${getNomeMes(mesAtual)} ${anoAtual}`.replace(/[:\\/?*[\]]/g, '');
    XLSX.utils.book_append_sheet(workbook, worksheet, nomePlanilha);

    // Remove caracteres inválidos do nome do arquivo
    const nomeArquivo = `escala-${getNomeMes(mesAtual).toLowerCase()}-${anoAtual}.xlsx`.replace(/[:\\/?*[\]]/g, '');
    XLSX.writeFile(workbook, nomeArquivo);
  };

  // Calcula uso do localStorage
  const { tamanho, limite } = verificarTamanhoLocalStorage();
  const percentualUso = (tamanho / limite) * 100;

  return (
    <div className="container">
      {/* Botão flutuante de desfazer */}
      {lastRemovalAction && (
        <div className="floating-undo">
          <button
            onClick={handleUndoLastRemoval}
            className="floating-undo-button"
            title={`Desfazer remoção de ${lastRemovalAction.type === 'day' ? 'dia' : 'funcionário'}`}
          >
            ↩️ Desfazer
          </button>
        </div>
      )}

      {/* Botão flutuante do WhatsApp */}
      <div className="floating-share">
        <button
          onClick={() => {
            const message = `📅 *ESCALA DE HORÁRIOS - ${getNomeMes(mesAtual).toUpperCase()} ${anoAtual}*\n\nOlá! Aqui está o link da escala de horários:\n\n🔗 ${window.location.href}\n\n📋 *Funcionários:* ${funcionarios.map(f => f.nome).join(', ')}\n📅 *Período:* ${getNomeMes(mesAtual)} ${anoAtual}\n\nAcesse o link para ver seus horários e folgas! 👆`;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
              window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
            } else {
              window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
            }
          }}
          className="floating-whatsapp-button"
        >
          � WHATSAPP
        </button>
      </div>

      <div className="header">
        <h1>📅 ESCALA DE HORÁRIOS</h1>

        <div className="month-year-selector">
          <label>MÊS:</label>
          <select
            value={mesAtual}
            onChange={(e) => handleMesChange(Number(e.target.value))}
            className="month-select"
          >
            {meses.map(mes => (
              <option key={mes.valor} value={mes.valor}>
                {mes.nome.toUpperCase()}
              </option>
            ))}
          </select>

          <label>ANO:</label>
          <select
            value={anoAtual}
            onChange={(e) => handleAnoChange(Number(e.target.value))}
            className="year-select"
          >
            {anos.map(ano => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </div>

        <div className="actions-group">
          <div className="action-row">
            <button onClick={() => setShowConfigModal(true)} className="btn-secondary">⚙️ CONFIGURAÇÕES</button>
            <button onClick={handleDestaque} className="btn-destaque">👑 DESTAQUE</button>
            <button onClick={() => setIsEditing(!isEditing)} className="btn-secondary">
              {isEditing ? 'SALVAR' : 'EDITAR'}
            </button>
            <button onClick={handleExportPdf} className="btn-warning">EXPORTAR PARA PDF</button>
            <button onClick={handleExportExcel} className="btn-success">EXPORTAR PARA EXCEL</button>
          </div>

          {isEditing && (
            <div className="action-row">
              <button onClick={handleAddFuncionario} className="btn-primary">ADICIONAR FUNCIONÁRIO</button>
            </div>
          )}

          <div className="action-row">
            <button onClick={handleZerarEscala} className="btn-danger">ZERAR ESCALA</button>
            <button onClick={async () => {
              const escalaData = {
                dias: escala.dias,
                funcionarios: escala.funcionarios,
                vencedorId: escala.vencedorId,
                mes: mesAtual,
                ano: anoAtual
              };

              try {
                const { link, savedOn } = await saveAndReturnLink(escalaData, mesAtual, anoAtual);
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
            }} className="btn-secondary">🔗 COMPARTILHAR ESCALA</button>
            <button onClick={() => window.location.href = '/parcial'} className="btn-secondary">📅 ESCALA PARCIAL</button>
          </div>

          <div className="action-row">
            <button onClick={() => window.location.href = '/mobile'} className="btn-info full-width">
              📱 VISUALIZAÇÃO MOBILE
            </button>
          </div>
        </div>
      </div>

      <div className="escala-table">
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
                    <div className="funcionario-nome-container">
                      {func.nome}
                      {escala.vencedorId === func.id && (
                        <span className="coroa-vencedor">👑</span>
                      )}
                    </div>
                    {isEditing && (
                      <div className="funcionario-actions">
                        <button onClick={() => handleEditFuncionarioName(func.id)} className="edit-btn">✏️</button>
                        <button onClick={() => handleRemoveFuncionario(func.id)} className="remove-btn">❌</button>
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
                    {isFeriado(data) && <span title="Feriado">🎉</span>}
                  </td>
                  {funcionarios.map(func => {
                    const horario = getHorarioFuncionario(dia, func.id);
                    return (
                      <td key={func.id} className={`horario-cell ${horario === "FOLGA" ? 'folga' : ''} ${horario === "FERIADO" ? 'feriado' : ''} ${horario === "ATESTADO" ? 'atestado' : ''}`}>
                        {isEditing ? (
                          <select value={horario || ""} onChange={(e) => handleHorarioChange(dia, func.id, e.target.value)}>
                            {turnos.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        ) : (
                          horario === "ATESTADO" ? "ATESTADO 🤒" : (horario || "")
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
              <div className="config-panel">
                
                

                <div className="config-field">
                  <label>🕒 Horários Frequentes</label>
                  <div className="frequent-controls">
                    <input
                      value={novoHorarioFrequente}
                      onChange={(e) => setNovoHorarioFrequente(e.target.value)}
                      placeholder="Ex: 08H AS 12H"
                    />
                    <div className="btn-group">
                      <button onClick={() => handleAddFrequentHorario(novoHorarioFrequente)} className="btn-primary">Adicionar</button>
                    </div>
                  </div>

                  <div className="frequent-list">
                    {frequentHorarios.length === 0 ? (
                      <small>Nenhum horário frequente salvo.</small>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;