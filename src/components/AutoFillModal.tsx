
import React, { useState, useMemo, useEffect } from 'react';
import { EscalaData, Funcionario } from '../types';
import { getCalendarGrid, diasSemana } from '../utils/dateUtils';

interface AutoFillConfig {
    funcionarioId: number;
    horario: string;
    folgasSelecionadas: number[];
    horarioSabado?: string;
    horarioDomingo?: string;
}

interface AutoFillModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (config: AutoFillConfig) => void;
    funcionarios: Funcionario[];
    frequentHorarios: string[];
    mes: number;
    ano: number;
    escala: EscalaData;
}

export const AutoFillModal: React.FC<AutoFillModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    funcionarios,
    frequentHorarios,
    mes,
    ano,
    escala
}) => {
    // Estado local isolado
    const [config, setConfig] = useState<AutoFillConfig>({
        funcionarioId: 0,
        horario: '',
        folgasSelecionadas: []
    });

    // Calcula os dias do calendário
    const calendarDays = useMemo(() => getCalendarGrid(mes, ano), [mes, ano]);

    // Calcular folgas existentes para todos os funcionários
    const existingFolgasMap = useMemo(() => {
        const map = new Map<number, Funcionario[]>();
        if (!escala || !escala.dias) return map;

        escala.dias.forEach(dia => {
            const folgasNoDia: Funcionario[] = [];
            dia.horarios.forEach(h => {
                // Considerando "FOLGA" e "ATESTADO" como ausências visuais importantes
                if (h.horario === 'FOLGA' || h.horario === 'ATESTADO') {
                    const func = funcionarios.find(f => f.id === h.funcionarioId);
                    if (func) {
                        folgasNoDia.push(func);
                    }
                }
            });
            if (folgasNoDia.length > 0) {
                map.set(dia.dia, folgasNoDia);
            }
        });
        return map;
    }, [escala, funcionarios]);

    // Reset do estado ao abrir
    useEffect(() => {
        if (isOpen) {
            setConfig(prev => ({
                ...prev,
                horario: (prev.horario && prev.horario !== '10:00 - 16:00') ? prev.horario : (frequentHorarios.length > 0 ? frequentHorarios[0] : ''),
                folgasSelecionadas: []
            }));
        }
    }, [isOpen, frequentHorarios]);

    if (!isOpen) return null;

    const toggleFolga = (day: number) => {
        setConfig(prev => {
            const isSelected = prev.folgasSelecionadas.includes(day);
            const newFolgas = isSelected
                ? prev.folgasSelecionadas.filter(d => d !== day)
                : [...prev.folgasSelecionadas, day];
            return { ...prev, folgasSelecionadas: newFolgas };
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '95%' }}>
                <div className="modal-header">
                    <h2>✨ Preenchimento Automático</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 2fr', gap: '32px' }}>
                        {/* Coluna da Esquerda: Configurações */}
                        <div className="config-column" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="config-field">
                                <label style={{ color: 'var(--text-main)' }}>Funcionário</label>
                                <select
                                    className="saas-select"
                                    style={{ width: '100%', textAlign: 'left', color: 'var(--text-main)', backgroundColor: 'var(--input-bg)' }}
                                    value={config.funcionarioId}
                                    onChange={(e) => setConfig({ ...config, funcionarioId: Number(e.target.value) })}
                                >
                                    <option value={0}>Selecione um funcionário...</option>
                                    {funcionarios.map(f => (
                                        <option key={f.id} value={f.id}>{f.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="config-field">
                                <label style={{ color: 'var(--text-main)' }}>Horário Fixo (Padrão)</label>
                                <select
                                    className="saas-select"
                                    style={{ width: '100%', textAlign: 'left', color: 'var(--text-main)', backgroundColor: 'var(--input-bg)' }}
                                    value={config.horario}
                                    onChange={(e) => setConfig({ ...config, horario: e.target.value })}
                                >
                                    <option value="">Selecione um horário...</option>
                                    {frequentHorarios.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                                <div style={{
                                    marginTop: '12px',
                                    padding: '10px',
                                    backgroundColor: 'rgba(29, 78, 216, 0.1)',
                                    borderLeft: '4px solid var(--primary)',
                                    borderRadius: '4px',
                                    color: 'var(--text-main)',
                                    fontSize: '0.85rem',
                                    lineHeight: '1.5'
                                }}>
                                    <strong>Nota:</strong> Este horário será aplicado em todos os dias do mês, exceto os selecionados como <strong>FOLGA</strong>.
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <input
                                    type="checkbox"
                                    id="weekend-exception"
                                    checked={!!config.horarioSabado || !!config.horarioDomingo}
                                    onChange={(e) => {
                                        if (!e.target.checked) {
                                            setConfig({ ...config, horarioSabado: '', horarioDomingo: '' });
                                        } else {
                                            // Just enable, don't set values yet
                                            setConfig({ ...config, horarioSabado: config.horario, horarioDomingo: config.horario });
                                        }
                                    }}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <label htmlFor="weekend-exception" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-main)' }}>
                                    Horário diferente no Fim de Semana?
                                </label>
                            </div>

                            {(config.horarioSabado !== undefined || config.horarioDomingo !== undefined) && (
                                <div style={{
                                    padding: '16px',
                                    backgroundColor: 'var(--background)',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    animation: 'fadeIn 0.2s ease-in-out'
                                }}>

                                    <div className="config-field">
                                        <label style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 'bold' }}>Sábado</label>
                                        <select
                                            className="saas-select"
                                            style={{ width: '100%', textAlign: 'left', color: 'var(--text-main)', backgroundColor: 'var(--surface)', fontSize: '0.9rem' }}
                                            value={config.horarioSabado || ''}
                                            onChange={(e) => setConfig({ ...config, horarioSabado: e.target.value })}
                                        >
                                            <option value="">Igual ao padrão ({config.horario || '...'})</option>
                                            <option value="FOLGA">FOLGA Fixa</option>
                                            {frequentHorarios.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="config-field">
                                        <label style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 'bold' }}>Domingo</label>
                                        <select
                                            className="saas-select"
                                            style={{ width: '100%', textAlign: 'left', color: 'var(--text-main)', backgroundColor: 'var(--surface)', fontSize: '0.9rem' }}
                                            value={config.horarioDomingo || ''}
                                            onChange={(e) => setConfig({ ...config, horarioDomingo: e.target.value })}
                                        >
                                            <option value="">Igual ao padrão ({config.horario || '...'})</option>
                                            <option value="FOLGA">FOLGA Fixa</option>
                                            {frequentHorarios.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                                <button
                                    onClick={() => onSubmit(config)}
                                    className="btn-saas btn-edit"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    disabled={!config.funcionarioId || !config.horario || config.funcionarioId === 0}
                                >
                                    🚀 APLICAR ESCALA
                                </button>
                            </div>
                        </div>

                        {/* Coluna da Direita: Calendário */}
                        <div className="calendar-column">
                            <div className="config-section-title" style={{ marginTop: '0', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-main)' }}>📅 Selecione os dias de FOLGA</span>
                                <div style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--text-main)' }}>
                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', marginRight: '4px', borderRadius: '2px' }}></span>Trabalho
                                    <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'var(--status-folga-bg)', border: '1px solid var(--border)', marginLeft: '12px', marginRight: '4px', borderRadius: '2px' }}></span>Folga
                                </div>
                            </div>

                            <div className="calendar-grid-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px', textAlign: 'center' }}>
                                {diasSemana.map(dia => (
                                    <div key={dia} style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-main)', textTransform: 'uppercase' }}>
                                        {dia}
                                    </div>
                                ))}
                            </div>

                            <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                                {calendarDays.map((day, index) => {
                                    const isSelected = config.folgasSelecionadas.includes(day.day) && day.isCurrentMonth;
                                    const folgasGerais = day.isCurrentMonth ? existingFolgasMap.get(day.day) || [] : [];

                                    return (
                                        <div
                                            key={`${day.day}-${day.month}-${index}`}
                                            onClick={() => day.isCurrentMonth && toggleFolga(day.day)}
                                            style={{
                                                aspectRatio: '1',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                                paddingTop: '8px',
                                                backgroundColor: !day.isCurrentMonth
                                                    ? 'var(--background)' // Dias de outros meses em cinza
                                                    : (isSelected ? 'var(--status-folga-bg)' : 'var(--surface)'),
                                                border: !day.isCurrentMonth
                                                    ? '1px solid transparent'
                                                    : (isSelected ? '1px solid rgba(0,0,0,0.1)' : '1px solid var(--border)'),
                                                borderRadius: '8px',
                                                cursor: day.isCurrentMonth ? 'pointer' : 'default',
                                                // Opacidade removida para melhor leitura, diferenciado pelo background
                                                opacity: 1,
                                                position: 'relative',
                                                transition: 'all 0.2s ease',
                                                transform: isSelected ? 'scale(0.98)' : 'none',
                                                boxShadow: isSelected ? 'inset 0 2px 4px rgba(0,0,0,0.05)' : 'none'
                                            }}
                                        >
                                            <span style={{
                                                fontSize: '1rem',
                                                fontWeight: isSelected ? 'bold' : '500',
                                                color: !day.isCurrentMonth
                                                    ? 'var(--text-muted)'
                                                    : (isSelected ? 'var(--status-folga-text)' : 'var(--text-main)'),
                                                marginBottom: '4px'
                                            }}>
                                                {day.day}
                                            </span>

                                            {day.isCurrentMonth && isSelected && (
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    color: 'var(--status-folga-text)',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    marginTop: 'auto',
                                                    marginBottom: '8px'
                                                }}>
                                                    FOLGA
                                                </span>
                                            )}

                                            {/* Indicadores de outros funcionários de folga (nomes) */}
                                            {day.isCurrentMonth && folgasGerais.length > 0 && (
                                                <div style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '2px',
                                                    width: '92%',
                                                    marginTop: isSelected ? '2px' : 'auto',
                                                    marginBottom: isSelected ? '2px' : '6px',
                                                    overflow: 'hidden'
                                                }}>
                                                    {folgasGerais.slice(0, 4).map((f, i) => (
                                                        <div
                                                            key={i}
                                                            style={{
                                                                fontSize: '0.65rem',
                                                                lineHeight: '1.1',
                                                                backgroundColor: 'var(--surface)',
                                                                borderLeft: `3px solid ${f.cor || 'var(--text-muted)'}`,
                                                                color: 'var(--text-main)',
                                                                padding: '2px 4px',
                                                                borderRadius: '2px',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                textAlign: 'left',
                                                                boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
                                                                opacity: 0.9
                                                            }}
                                                            title={`${f.nome} está de folga`}
                                                        >
                                                            {f.nome.split(' ')[0]}
                                                        </div>
                                                    ))}
                                                    {folgasGerais.length > 4 && (
                                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: '1' }}>
                                                            +{folgasGerais.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                backgroundColor: 'rgba(255, 251, 235, 1)', // Amber-50 equivalents
                                border: '1px solid #fcd34d', // Amber-300
                                borderRadius: '6px',
                                fontSize: '0.85rem',
                                color: '#92400e', // Amber-800
                                textAlign: 'center',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                fontWeight: '600'
                            }}>
                                <span style={{ fontSize: '1.2rem' }}>💡</span>
                                <span>As etiquetas mostram quem já está de folga no dia (apenas mês atual).</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
