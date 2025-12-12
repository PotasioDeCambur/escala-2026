import React, { useState, useEffect } from 'react';
import { EscalaData, Funcionario, DiaEscala } from './types';
import { dadosIniciais } from './data';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import './App.css';

function EscalaParcial() {
  const [escala, setEscala] = useState<EscalaData>(() => {
    const savedEscala = localStorage.getItem('escala-horarios');
    let parsedEscala = savedEscala ? JSON.parse(savedEscala) : dadosIniciais;
    // Garantir que sempre há funcionários
    if (!parsedEscala.funcionarios || parsedEscala.funcionarios.length === 0) {
      parsedEscala = {
        ...parsedEscala,
        funcionarios: dadosIniciais.funcionarios
      };
    }
    return parsedEscala;
  });
  const [anoAtual, setAnoAtual] = useState<number>(() => new Date().getFullYear());
  const [isEditing, setIsEditing] = useState(false);
  const [dataInicial, setDataInicial] = useState<string>('');
  const [dataFinal, setDataFinal] = useState<string>('');

  const anos = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 2 + i);

  const handleAnoChange = (novoAno: number) => {
    setAnoAtual(novoAno);
  };

  // Usar funcionários da escala diretamente
  const funcionarios = escala.funcionarios || dadosIniciais.funcionarios;

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
  const turnos = buildUnique(["", ...frequent.filter(f => !paused.includes(f)), "FOLGA", "ATESTADO", "FERIADO"]);

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
      nome: `FUNCIONARIO ${novoId}`,
      cor: `#${Math.floor(Math.random()*16777215).toString(16)}`
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

  const handleExportPdfParcial = () => {
    const input = document.getElementById('escala-parcial-container');
    if (!input) return;

    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 8; // Margem reduzida para melhor uso do espaço

    html2canvas(input as HTMLElement, {
      background: '#ffffff',
      scale: 3,
      useCORS: true
    } as any).then((canvas: HTMLCanvasElement) => {
      const imgData = canvas.toDataURL('image/png');

      let imgWidth = pageWidth - margin * 2;
      let imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight - margin * 2) {
        imgHeight = pageHeight - margin * 2;
        imgWidth = (canvas.width * imgHeight) / canvas.height;
      }

      const xPosition = (pageWidth - imgWidth) / 2;
      const yPosition = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', xPosition, yPosition, imgWidth, imgHeight);
      pdf.save(`escala-parcial-${dataInicial}-${dataFinal}.pdf`);
    });
  };

  const handleExportExcelParcial = () => {
    const diasParciais = getDiasParciais(dataInicial, dataFinal);
    
    const workbook = XLSX.utils.book_new();
    const dados = [];
    
    // Cabeçalho
    const header = ['DATA', ...funcionarios.map(f => f.nome)];
    dados.push(header);
    
    // Dados dos dias parciais
    diasParciais.forEach(({ dia, diaSemana, data, mes }) => {
      const row = [data + ' (' + diaSemana + ')'];
      
      funcionarios.forEach(func => {
        const horario = getHorarioFuncionario(dia, func.id);
        row.push(horario);
      });
      
      dados.push(row);
    });
    
    const worksheet = XLSX.utils.aoa_to_sheet(dados);
    
    const colWidths = [
      { wch: 15 },
      ...funcionarios.map(() => ({ wch: 12 }))
    ];
    worksheet['!cols'] = colWidths;
    
    // Remove caracteres inválidos do nome da planilha
    const nomePlanilha = `Escala Parcial ${dataInicial} a ${dataFinal}`.replace(/[:\\/?*[\]]/g, '');
    XLSX.utils.book_append_sheet(workbook, worksheet, nomePlanilha);
    // Remove caracteres inválidos do nome do arquivo
    const nomeArquivo = `escala-parcial-${dataInicial}-${dataFinal}.xlsx`.replace(/[:\\/?*[\]]/g, '');
    XLSX.writeFile(workbook, nomeArquivo);
  };

  const calcularEstatisticas = () => {
    const diasParciais = getDiasParciais(dataInicial, dataFinal);
    let totalFolgas = 0;
    let funcionariosComFolga = 0;

    diasParciais.forEach(({ dia }) => {
      funcionarios.forEach(func => {
        const horario = getHorarioFuncionario(dia, func.id);
        if (horario === "FOLGA") {
          totalFolgas++;
        }
      });
    });

    // Conta quantos funcionários têm pelo menos uma folga no período
    funcionarios.forEach(func => {
      const temFolga = diasParciais.some(({ dia }) => {
        const horario = getHorarioFuncionario(dia, func.id);
        return horario === "FOLGA";
      });
      if (temFolga) funcionariosComFolga++;
    });

    return {
      totalDias: diasParciais.length,
      totalFolgas,
      funcionariosComFolga
    };
  };

  // Salvar escala no localStorage sempre que ela mudar
  useEffect(() => {
    localStorage.setItem('escala-horarios', JSON.stringify(escala));
  }, [escala]);

  const stats = calcularEstatisticas();
  const diasParciais = getDiasParciais(dataInicial, dataFinal);

  return (
    <div className="container">
      <div className="header">
        <h1>📅 Escala Parcial - Gestão de Períodos</h1>
        <p>Sistema de Gestão de Escalas por Período Específico</p>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', margin: '20px 0' }}>
          <div className="selector-group">
            <label htmlFor="ano-select">Ano:</label>
            <select 
              id="ano-select"
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
        </div>
        
        <button onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Salvar' : 'Editar'}
        </button>
        {isEditing && (
          <button onClick={handleAddFuncionario} className="add-funcionario-button">
            Adicionar Funcionário
          </button>
        )}
        <button onClick={() => window.location.href = '/'} style={{ backgroundColor: '#6c757d' }}>
          🏠 Voltar à Escala Principal
        </button>
      </div>

      {/* Seletor de Período */}
      <div className="escala-parcial-section">
        <h3>📅 Selecionar Período</h3>
        <div className="escala-parcial-controls">
          <div className="selector-group">
            <label htmlFor="data-inicial">Data Inicial:</label>
            <input
              id="data-inicial"
              type="text"
              placeholder="DD/MM"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="escala-parcial-input"
            />
          </div>
          <div className="selector-group">
            <label htmlFor="data-final">Data Final:</label>
            <input
              id="data-final"
              type="text"
              placeholder="DD/MM"
              value={dataFinal}
              onChange={(e) => setDataFinal(e.target.value)}
              className="escala-parcial-input"
            />
          </div>
          {diasParciais.length > 0 && (
            <>
              <button 
                onClick={handleExportPdfParcial}
                className="escala-parcial-button pdf"
              >
                Exportar PDF
              </button>
              <button 
                onClick={handleExportExcelParcial}
                className="escala-parcial-button excel"
              >
                Exportar Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Estatísticas */}
      {diasParciais.length > 0 && (
        <div className="stats">
          <div className="stat-card">
            <div className="stat-number">{stats.totalDias}</div>
            <div className="stat-label">Dias no Período</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.totalFolgas}</div>
            <div className="stat-label">Total de Folgas</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{funcionarios.length}</div>
            <div className="stat-label">Funcionários</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{stats.funcionariosComFolga}</div>
            <div className="stat-label">Dias com Folga</div>
          </div>
        </div>
      )}

      {/* Escala Parcial */}
      {diasParciais.length > 0 && (
        <div className="escala-table">
          <div className="table-header">
            <h2>Escala Parcial - {dataInicial} a {dataFinal}</h2>
            {isEditing && (
              <p style={{ 
                color: '#e67e22', 
                fontSize: '0.9em', 
                margin: '5px 0 0 0',
                fontStyle: 'italic'
              }}>
                ✏️ Modo de edição ativo - Você pode alterar os horários diretamente
              </p>
            )}
          </div>
          
          <div className="table-container" id="escala-parcial-container">
            <table>
              <thead>
                <tr>
                  <th className="data-cell">DATA</th>
                  {funcionarios.map(func => (
                    <th key={func.id} className="funcionario-header">
                      {func.nome}
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
                        {isFeriado(data) && (
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
                          className={`horario-cell ${horario === "FOLGA" ? 'folga' : ''} ${horario === "FERIADO" ? 'feriado' : ''}`}
                        >
                          {isEditing ? (
                            <select 
                              value={horario || ""} 
                              onChange={(e) => handleHorarioChange(dia, func.id, e.target.value)}
                            >
                              {turnos.map(t => (
                                <option key={t} value={t}>
                                  {t || "Selecione..."}
                                </option>
                              ))}
                            </select>
                          ) : (
                            horario || ""
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