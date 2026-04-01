import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EscalaData, Funcionario } from './types';
import { dadosIniciais } from './data';
import { saveAndReturnLink, copyToClipboard } from './utils/share';

import './App.css';
import {
  diasSemana,
  isFeriado,
  isFimDeSemana
} from './utils/dateUtils';
import {
  exportToPdf,
  exportToExcel,
  exportToGoogleSheets
} from './utils/exportUtils';

function EscalaParcial() {
  const [escala, setEscala] = useState<EscalaData>(() => {
    const savedEscala = localStorage.getItem('escala-horarios');
    let parsedEscala = savedEscala ? JSON.parse(savedEscala) : dadosIniciais;
    return parsedEscala;
  });
  const [anoAtual, setAnoAtual] = useState<number>(() => new Date().getFullYear());
  const [isEditing, setIsEditing] = useState(false);
  const [dataInicial, setDataInicial] = useState<string>('');
  // Theme Management
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const [dataFinal, setDataFinal] = useState<string>('');

  const anos = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

  const handleAnoChange = (novoAno: number) => {
    setAnoAtual(novoAno);
  };

  // Usar funcionários da escala diretamente
  const funcionarios = escala.funcionarios || [];

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

  // Construir opções do seletor a partir do gerenciador (localStorage) + marcadores especiais
  const readFrequent = () => {
    try {
      const raw = localStorage.getItem('horarios-frequentes');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((s: any) => String(s).trim()).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  };

  const readPaused = () => {
    try {
      const raw = localStorage.getItem('horarios-pausados');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map((s: any) => String(s).trim()).filter(Boolean) : [];
    } catch (e) {
      return [];
    }
  };

  const frequent = readFrequent();
  const paused = readPaused();
  const buildUnique = (arr: string[]) => Array.from(new Set(arr));
  const turnos = buildUnique(["", ...frequent.filter(f => !paused.includes(f)), STATUS.FOLGA, STATUS.ATESTADO, STATUS.FERIADO]);

  // Date logic moved to utils/dateUtils.ts

  // Helper para converter DD/MM + Ano para YYYY-MM-DD (para o input date)
  const formatToInputDate = (ddMm: string, year: number) => {
    if (!ddMm) return '';
    const [day, month] = ddMm.split('/').map(Number);
    if (!day || !month) return '';
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  // Helper para converter YYYY-MM-DD para DD/MM (para o estado)
  const formatFromInputDate = (yyyyMmDd: string) => {
    if (!yyyyMmDd) return '';
    const [year, month, day] = yyyyMmDd.split('-');
    return `${day}/${month}`;
  };

  const getDiasParciais = (dataInicial: string, dataFinal: string) => {
    if (!dataInicial || !dataFinal) return [];

    const [diaInicial, mesInicial] = dataInicial.split('/').map(Number);
    const [diaFinal, mesFinal] = dataFinal.split('/').map(Number);

    const diasArray = [];
    let dataAtual = new Date(anoAtual, mesInicial - 1, diaInicial);
    const dataFim = new Date(anoAtual, mesFinal - 1, diaFinal);

    while (dataAtual <= dataFim) {
      const dia = dataAtual.getDate();
      const mes = dataAtual.getMonth() + 1;
      const diaSemana = diasSemana[dataAtual.getDay()];
      const data = `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}`;

      diasArray.push({
        dia,
        diaSemana,
        data,
        mes
      });

      dataAtual.setDate(dataAtual.getDate() + 1);
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
      return novaEscala;
    });
  };

  const handleAddFuncionario = () => {
    const novoId = Math.max(...funcionarios.map(f => f.id)) + 1;
    const novoFuncionario: Funcionario = {
      id: novoId,
      nome: "Novo Funcionário",
      cor: `#${Math.floor(Math.random() * 16777215).toString(16)}`
    };
    setEscala(prevEscala => ({
      ...prevEscala,
      funcionarios: [...prevEscala.funcionarios, novoFuncionario]
    }));
  };

  const handleRemoveFuncionario = (funcionarioIdToRemove: number) => {
    if (window.confirm('Tem certeza que deseja remover este funcionário?')) {
      // Remove funcionário e seus horários da escala
      setEscala(prevEscala => ({
        ...prevEscala,
        funcionarios: prevEscala.funcionarios.filter(f => f.id !== funcionarioIdToRemove),
        dias: prevEscala.dias.map(dia => ({
          ...dia,
          horarios: dia.horarios.filter(h => h.funcionarioId !== funcionarioIdToRemove)
        }))
      }));
    }
  };

  const handleEditFuncionarioName = (funcionarioId: number) => {
    const funcionario = funcionarios.find(f => f.id === funcionarioId);
    if (!funcionario) return;

    const novoNome = prompt('Digite o novo nome do funcionário:', funcionario.nome);
    if (novoNome && novoNome.trim()) {
      setEscala(prevEscala => ({
        ...prevEscala,
        funcionarios: prevEscala.funcionarios.map(f =>
          f.id === funcionarioId ? { ...f, nome: novoNome.trim() } : f
        )
      }));
    }
  };

  const handleExportPdfParcial = async () => {
    if (diasParciais.length === 0) return;
    const dias = getDiasParciais(dataInicial, dataFinal);
    await exportToPdf(
      escala,
      funcionarios,
      dias,
      0, // mes placeholder
      anoAtual,
      `Escala Parcial - ${dataInicial} a ${dataFinal}`,
      `escala-parcial-${dataInicial}-${dataFinal}.pdf`
    );
  };

  const handleExportGoogleSheetsParcial = async () => {
    if (diasParciais.length === 0) return;
    await exportToGoogleSheets(escala, funcionarios, diasParciais, anoAtual);
  };

  const handleExportExcelParcial = async () => {
    if (diasParciais.length === 0) return;
    await exportToExcel(
      escala,
      funcionarios,
      diasParciais,
      0, // mes placeholder
      anoAtual,
      'escala-parcial',
      `escala-parcial-${dataInicial}-${dataFinal}.xlsx`
    );
  };



  const handleCopyLink = async () => {
    if (diasParciais.length === 0) return;

    // Filter days for the current partial view
    const diasIds = diasParciais.map(d => d.dia);
    const escalaFiltrada = {
      ...escala,
      dias: escala.dias.filter(d => diasIds.includes(d.dia)),
      isParcial: true
    };

    // Parse month from start string
    const [, mes] = dataInicial.split('/').map(Number); // [dia, mes]

    try {
      const { link, savedOn } = await saveAndReturnLink(escalaFiltrada, mes, anoAtual);
      const copied = await copyToClipboard(link);
      if (copied) {
        alert(`Link da escala parcial copiado! (${savedOn})`);
      } else {
        alert('Link gerado, mas não foi possível copiar automaticamente. Cole manualmente: ' + link);
      }
    } catch (err) {
      console.error('Erro ao gerar link de compartilhamento:', err);
      alert('Erro ao gerar link. Tente novamente.');
    }
  };

  const handleShare = async () => {
    if (diasParciais.length === 0) return;

    // Filter days for the current partial view
    const diasIds = diasParciais.map(d => d.dia);
    const escalaFiltrada = {
      ...escala,
      dias: escala.dias.filter(d => diasIds.includes(d.dia)),
      isParcial: true
    };

    // Parse month from start string
    const [, mes] = dataInicial.split('/').map(Number); // [dia, mes]

    try {
      const { link } = await saveAndReturnLink(escalaFiltrada, mes, anoAtual);

      const activeFuncionarios = funcionarios.filter(f => escalaFiltrada.dias.some(d => d.horarios.some(h => h.funcionarioId === f.id && h.horario)));
      const message = `📅 *ESCALA PARCIAL - ${dataInicial} a ${dataFinal}* (${anoAtual})\n\nOlá! Confira a escala de horários para este período:\n\n🔗 ${link}\n\n📋 *Funcionários:* ${activeFuncionarios.map(f => f.nome).join(', ')}\n\nAcesse o link para ver os detalhes! 👆`;

      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
      } else {
        window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
      }
    } catch (err) {
      console.error('Erro ao gerar link de compartilhamento:', err);
      alert('Erro ao gerar link. Tente novamente.');
    }
  };

  // Salvar escala no localStorage sempre que ela mudar
  useEffect(() => {
    localStorage.setItem('escala-horarios', JSON.stringify(escala));
  }, [escala]);



  // Atalhos de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignorar se estiver em inputs, exceto para ESC (cancelar/voltar)
      const target = event.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';

      if (event.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false); // Cancelar edição
        } else {
          window.location.href = '/'; // Voltar ao sistema
        }
      } else if (event.key === 'Enter') {
        if (isInput) return; // Permitir comportamento natural em inputs (submit forms, new lines)

        event.preventDefault(); // Evitar scroll ou behaviors indesejados
        setIsEditing(prev => !prev); // Alternar modo edição
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditing]);

  const diasParciais = useMemo(() => getDiasParciais(dataInicial, dataFinal), [dataInicial, dataFinal, anoAtual]);

  return (
    <div className="container">
      {/* Floating Share Button */}
      {diasParciais.length > 0 && (
        <div className="floating-share">
          <button
            onClick={handleShare}
            className="floating-whatsapp-button"
            title="Compartilhar Escala Parcial no WhatsApp"
          >
            📱 WHATSAPP
          </button>
        </div>
      )}

      <div className="header-saas">
        <div className="header-top-row">
          <div className="header-branding">
            <h1>📅 Escala Parcial</h1>
            <p className="subtitle">Gestão de períodos específicos e customizados</p>
          </div>

          <div className="header-month-selector">
            <div className="selector-group">
              <label htmlFor="ano-select">ANO REFERÊNCIA</label>
              <select
                id="ano-select"
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
            <button
              onClick={toggleTheme}
              className="btn-icon"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <div className="actions-toolbar">
          <div className="toolbar-group main">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`btn-saas ${isEditing ? 'btn-save' : 'btn-edit'}`}
            >
              {isEditing ? '💾 SALVAR ALTERAÇÕES' : '📝 EDITAR'}
            </button>

            {isEditing && (
              <button onClick={handleAddFuncionario} className="btn-saas btn-add">
                ➕ NOVO FUNCIONÁRIO
              </button>
            )}
          </div>

          <div className="toolbar-group secondary">
            <button onClick={() => window.location.href = '/'} className="btn-saas btn-ghost">
              🏠 VOLTAR AO SISTEMA
            </button>
          </div>
        </div>
      </div>

      {/* Seletor de Período */}
      <div className="escala-parcial-section">
        <h3>📅 Selecionar Período</h3>
        <div className="escala-parcial-controls">
          <div className="selector-group">
            <label htmlFor="data-inicial">DATA INICIAL</label>
            <input
              id="data-inicial"
              type="date"
              value={formatToInputDate(dataInicial, anoAtual)}
              onChange={(e) => setDataInicial(formatFromInputDate(e.target.value))}
              className="escala-parcial-input"
            />
          </div>
          <div className="selector-group">
            <label htmlFor="data-final">DATA FINAL</label>
            <input
              id="data-final"
              type="date"
              value={formatToInputDate(dataFinal, anoAtual)}
              onChange={(e) => setDataFinal(formatFromInputDate(e.target.value))}
              className="escala-parcial-input"
            />
          </div>

          {diasParciais.length > 0 && (
            <div className="toolbar-group" style={{ marginLeft: 16 }}>
              <button
                onClick={handleExportPdfParcial}
                className="btn-saas btn-ghost"
                title="Exportar para PDF"
              >
                📄 PDF
              </button>
              <button
                onClick={handleExportExcelParcial}
                className="btn-saas btn-ghost"
                title="Exportar para Excel"
              >
                📊 EXCEL
              </button>
              <button
                onClick={handleExportGoogleSheetsParcial}
                className="btn-saas btn-ghost"
                title="Abrir no Google Sheets"
              >
                📑 SHEETS
              </button>
              <button
                onClick={handleCopyLink}
                className="btn-saas btn-ghost"
                title="Copiar Link"
              >
                🔗 LINK
              </button>
            </div>
          )}
        </div>
      </div>



      {/* Escala Parcial */}
      {diasParciais.length > 0 && (
        <div className={`escala-table ${isEditing ? 'editing-mode' : ''}`}>
          <div className="table-header">
            <h2>Escala Parcial - {dataInicial} a {dataFinal}</h2>

          </div>

          <div className="table-container" id="escala-parcial-container">
            <table>
              <thead>
                <tr>
                  <th className="data-cell">DATA</th>
                  {funcionarios.map(func => (
                    <th key={func.id} className="funcionario-header">
                      <div className="funcionario-nome-container">
                        {func.nome}
                      </div>
                      {isEditing && (
                        <div className="funcionario-actions">
                          <button
                            onClick={() => handleEditFuncionarioName(func.id)}
                            className="edit-funcionario-button"
                            title="Editar nome"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleRemoveFuncionario(func.id)}
                            className="remove-funcionario-button"
                            title="Remover funcionário"
                          >
                            ❌
                          </button>
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diasParciais.map(({ dia, diaSemana, data, mes }) => (
                  <tr key={`${mes}-${dia}`} className={isFimDeSemana(diaSemana) ? 'fim-de-semana' : ''}>
                    <td className="data-cell">
                      <div className="date-content">
                        {data} ({diaSemana})
                        {isFeriado(data, anoAtual) && (
                          <span className="holiday-icon" title="Feriado Nacional">
                            🎉
                          </span>
                        )}
                      </div>
                    </td>
                    {funcionarios.map(func => {
                      const horario = getHorarioFuncionario(dia, func.id);
                      return (
                        <td
                          key={func.id}
                          className={`horario-cell ${getStatusClass(horario)}`}
                        >
                          {isEditing ? (
                            <select
                              value={horario || ""}
                              onChange={(e) => handleHorarioChange(dia, func.id, e.target.value)}
                            >
                              {turnos.map(t => (
                                <option key={t} value={t}>
                                  {t === STATUS.FERIADO ? 'FERIADO 🎉' : (t || "Selecione...")}
                                </option>
                              ))}
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
      )}

      {/* Mensagem quando não há período selecionado */}
      {diasParciais.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '50px',
          color: '#6c757d',
          fontSize: '1.1em'
        }}>
          <p>📅 Digite as datas inicial e final para gerar a escala parcial</p>
          <p style={{ fontSize: '0.9em', marginTop: '10px' }}>
            Exemplo: 13/07 a 18/07
          </p>
        </div>
      )}
    </div>
  );
}

export default EscalaParcial; 
