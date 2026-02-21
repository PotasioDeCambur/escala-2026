import React, { useState, useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import './MobileEscala.css';
import { getEscalaById, supabase } from './supabaseClient';
import { getNomeMes, isFeriado, isFimDeSemana } from './utils/dateUtils';

interface Funcionario {
    id: number;
    nome: string;
    horario?: string;
}

interface DiaEscala {
    dia: number;
    diaSemana: string;
    nomeDia: string;
    data: Date;
    funcionarios: Funcionario[];
}

interface EscalaData {
    dias: DiaEscala[];
    vencedorId?: number;
    isParcial?: boolean;
}

const MobileEscala: React.FC = () => {
    const [escala, setEscala] = useState<EscalaData>({ dias: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentDayIndex, setCurrentDayIndex] = useState(0);
    const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1);
    const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());
    const [isEscalaParcial, setIsEscalaParcial] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [headerOffset, setHeaderOffset] = useState(90);
    const [flashUpdate, setFlashUpdate] = useState(false);
    const [showUpdateModal, setShowUpdateModal] = useState(false);

    const [lastUpdate, setLastUpdate] = useState<string>('');

    // Obtém o ID da escala da URL (Helper)
    // Definimos isso aqui em cima para o useCallback poder usar
    const getLinkId = () => {
        const path = window.location.pathname;
        let match = path.match(/\/mobile\/([a-zA-Z0-9-]+)/);
        if (match) return match[1];
        match = path.match(/\/escala\/([a-zA-Z0-9-]+)/);
        return match ? match[1] : null;
    };

    // Inicialização direta do linkId
    const linkId = useMemo(() => getLinkId(), []); // Memoriza para evitar re-calculos





    const checkForUpdates = useCallback(async () => {
        if (!linkId || !getEscalaById) return;

        try {
            const row: any = await getEscalaById(linkId);
            if (row && row.updated_at) {
                // Se a data de atualização for diferente da última que temos
                if (row.updated_at !== lastUpdate) {
                    console.log('🔄 Nova versão detectada via Polling/Manual:', row.updated_at);

                    setMesAtual(row.mes);
                    setAnoAtual(row.ano);
                    setLastUpdate(row.updated_at);

                    const escalaConvertida = converterEstruturaDados(row.data, row.mes, row.ano);
                    setEscala(escalaConvertida);

                    const totalDiasNoMes = new Date(row.ano, row.mes, 0).getDate();
                    const diasComDados = row.data.dias.length;
                    const isParcial = diasComDados < totalDiasNoMes * 0.5;
                    const isParcialHeuristic = diasComDados < totalDiasNoMes * 0.5;
                    setIsEscalaParcial(escalaConvertida.isParcial || isParcialHeuristic);

                    // Notificação visual (Toast e Flash)
                    setFlashUpdate(true);
                    setShowUpdateModal(true);
                    // Modal não some sozinho, espera o usuário clicar
                    setTimeout(() => {
                        setFlashUpdate(false);
                    }, 4000);
                }
            }
        } catch (error) {
            console.error('Erro ao verificar atualizações:', error);
        }
    }, [linkId, lastUpdate]);

    // Polling de segurança: verifica a cada 10 segundos se há novidades
    useEffect(() => {
        const interval = setInterval(checkForUpdates, 10000);
        return () => clearInterval(interval);
    }, [checkForUpdates]);

    const updateHeaderOffset = useCallback(() => {
        if (!headerRef.current) {
            return;
        }

        const measuredHeight = headerRef.current.getBoundingClientRect().height;
        const spacing = 16; // espaço extra para garantir respiro visual abaixo do header
        setHeaderOffset(Math.max(measuredHeight + spacing, 90));
    }, []);

    useLayoutEffect(() => {
        updateHeaderOffset();
    }, [updateHeaderOffset]);

    useEffect(() => {
        const handleResize = () => updateHeaderOffset();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [updateHeaderOffset]);

    useEffect(() => {
        if (!headerRef.current || typeof window === 'undefined' || !('ResizeObserver' in window)) {
            return;
        }

        const observer = new ResizeObserver(() => updateHeaderOffset());
        observer.observe(headerRef.current);
        return () => observer.disconnect();
    }, [updateHeaderOffset]);

    // Obtém os dados da escala da query string
    const getSharedData = () => {
        const params = new URLSearchParams(window.location.search);
        const data = params.get('data');
        if (data) {
            try {
                const jsonString = decodeURIComponent(atob(data));
                return JSON.parse(jsonString);
            } catch (error) {
                console.error('Erro ao decodificar dados compartilhados:', error);
                return null;
            }
        }
        return null;
    };

    const sharedDataFromUrl = getSharedData();



    const handleScroll = () => {
        if (scrollRef.current) {
            const scrollLeft = scrollRef.current.scrollLeft;
            const width = scrollRef.current.offsetWidth;
            const index = Math.round(scrollLeft / width);
            if (index !== currentDayIndex) {
                setCurrentDayIndex(index);
            }
        }
    };

    const handleDayClick = (index: number) => {
        if (scrollRef.current) {
            const width = scrollRef.current.offsetWidth;
            scrollRef.current.scrollTo({
                left: index * width,
                behavior: 'smooth'
            });
            setCurrentDayIndex(index);
        }
    };

    // Gera os dias do mês
    const getDiasMes = (mes: number, ano: number) => {
        const dias = [];
        const data = new Date(ano, mes - 1, 1);
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

        while (data.getMonth() === mes - 1) {
            dias.push({
                dia: data.getDate(),
                diaSemana: diasSemana[data.getDay()],
                nomeDia: diasSemana[data.getDay()],
                data: new Date(data)
            });
            data.setDate(data.getDate() + 1);
        }
        return dias;
    };

    const diasMes = useMemo(() => {
        if (isEscalaParcial && escala.dias.length > 0) {
            return [...escala.dias].sort((a, b) => a.dia - b.dia);
        }
        return getDiasMes(mesAtual, anoAtual);
    }, [isEscalaParcial, escala.dias, mesAtual, anoAtual]);

    // Converte a estrutura de dados do formato App.tsx para o formato MobileEscala
    const converterEstruturaDados = (dadosOriginais: any, mes?: number, ano?: number) => {
        if (!dadosOriginais || !dadosOriginais.dias) return { dias: [] };

        // Se já está no formato correto (com funcionarios dentro de cada dia), retorna como está
        if (dadosOriginais.dias.length > 0 && dadosOriginais.dias[0].funcionarios) {
            return dadosOriginais;
        }

        // Converte do formato { dias: [{ dia, horarios: [{ funcionarioId, horario }] }] }
        // para o formato { dias: [{ dia, funcionarios: [{ id, nome, horario }] }] }
        // Garantir que funcionários existem - se não, usar dados padrão
        let funcionarios = dadosOriginais.funcionarios || [];
        if (!funcionarios || funcionarios.length === 0) {
            // Se não há funcionários salvos, usar os padrão
            funcionarios = [
                { id: 1, nome: "FILIPE", cor: "#4CAF50" },
                { id: 2, nome: "ARMANDO", cor: "#2196F3" },
                { id: 3, nome: "DAYANE", cor: "#FF9800" },
                { id: 4, nome: "JOAO P", cor: "#9C27B0" }
            ];
        }
        const funcionariosMap = new Map(funcionarios.map((f: any) => [f.id, f]));

        // Usa o mês e ano fornecidos ou usa o mês/ano atual como padrão
        const hoje = new Date();
        const mesParaCalculo = mes || mesAtual || (hoje.getMonth() + 1);
        const anoParaCalculo = ano || anoAtual || hoje.getFullYear();
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

        const diasConvertidos = dadosOriginais.dias.map((diaEscala: any) => {
            // Calcula a data completa para obter dia da semana
            const dataCompleta = new Date(anoParaCalculo, mesParaCalculo - 1, diaEscala.dia);
            const diaSemana = diasSemana[dataCompleta.getDay()];

            const funcionariosDoDia = (diaEscala.horarios || []).map((horario: any) => {
                const funcionario = funcionariosMap.get(horario.funcionarioId) as { nome?: string } | undefined;
                return {
                    id: horario.funcionarioId,
                    nome: funcionario?.nome || `Funcionário ${horario.funcionarioId}`,
                    horario: horario.horario || ''
                };
            });

            return {
                dia: diaEscala.dia,
                diaSemana: diaEscala.diaSemana || diaSemana,
                nomeDia: diaEscala.nomeDia || diaSemana,
                data: diaEscala.data || dataCompleta,
                funcionarios: funcionariosDoDia
            };
        });

        return {
            dias: diasConvertidos,
            vencedorId: dadosOriginais.vencedorId,
            isParcial: dadosOriginais.isParcial
        };
    };

    // Filtra funcionários com horário para o dia
    const getFuncionariosComHorario = (dia: number) => {
        const diaEscala = escala.dias.find(d => d.dia === dia);
        if (!diaEscala || !diaEscala.funcionarios || !Array.isArray(diaEscala.funcionarios)) return [];

        // Ordena: primeiro quem trabalha (por horário), depois folga
        const funcionariosComHorario = [...diaEscala.funcionarios]
            .filter(f => f.horario) // Remove quem não tem horário definido
            .sort((a, b) => {
                if (a.horario === 'FOLGA' && b.horario !== 'FOLGA') return 1;
                if (a.horario !== 'FOLGA' && b.horario === 'FOLGA') return -1;
                if (a.horario === 'FOLGA' && b.horario === 'FOLGA') return a.nome.localeCompare(b.nome);

                // Ordena por horário de início
                const getHoraInicio = (h: string) => {
                    if (!h || h === 'ATESTADO') return 999;
                    const match = h.match(/(\d+)H/);
                    return match ? parseInt(match[1]) : 999;
                };

                const horaA = getHoraInicio(a.horario || '');
                const horaB = getHoraInicio(b.horario || '');

                if (horaA === horaB) {
                    return a.nome.localeCompare(b.nome);
                }

                return horaA - horaB;
            });

        return funcionariosComHorario;
    };

    const getDiaAtual = () => {
        const hoje = new Date();
        const diaHoje = hoje.getDate();
        const mesHoje = hoje.getMonth() + 1;
        const anoHoje = hoje.getFullYear();

        if (mesHoje === mesAtual && anoHoje === anoAtual) {
            return diasMes.findIndex(dia => dia.dia === diaHoje);
        }
        return 0;
    };

    // Carrega dados da escala
    useEffect(() => {
        const sharedData = getSharedData();

        console.log('🔍 Debug MobileEscala:', { linkId, hasGetEscalaById: !!getEscalaById, hasSharedData: !!sharedData });

        // Primeiro, tenta carregar dados compartilhados via URL
        if (sharedData) {
            console.log('📡 Carregando dados compartilhados da URL');
            try {
                setMesAtual(sharedData.mes || mesAtual);
                setAnoAtual(sharedData.ano || anoAtual);
                const escalaConvertida = converterEstruturaDados(sharedData, sharedData.mes, sharedData.ano);
                setEscala(escalaConvertida);
                setLoading(false);
                console.log('✅ Escala carregada com sucesso dos dados compartilhados:', escalaConvertida);
                return;
            } catch (error) {
                console.error('❌ Erro ao processar dados compartilhados:', error);
            }
        }

        if (linkId && getEscalaById) {
            setLoading(true);
            console.log('📡 Tentando carregar escala do Supabase com ID:', linkId);

            getEscalaById(linkId)
                .then((row: any) => {
                    console.log('✅ Dados recebidos do Supabase:', row);
                    if (row && row.data) {
                        setMesAtual(row.mes);
                        setAnoAtual(row.ano);

                        if (row.updated_at) {
                            setLastUpdate(row.updated_at);
                        }

                        const escalaConvertida = converterEstruturaDados(row.data, row.mes, row.ano);
                        setEscala(escalaConvertida);

                        const totalDiasNoMes = new Date(row.ano, row.mes, 0).getDate();
                        const diasComDados = row.data.dias.length;
                        const isParcial = diasComDados < totalDiasNoMes * 0.5;
                        const isParcialHeuristic = diasComDados < totalDiasNoMes * 0.5;
                        setIsEscalaParcial(escalaConvertida.isParcial || isParcialHeuristic);

                        console.log('✅ Escala carregada com sucesso:', escalaConvertida);
                        console.log(`📊 Tipo: ${isParcial ? 'Escala Parcial' : 'Escala Completa'}`);
                    } else {
                        console.warn('⚠️ Dados vazios recebidos do Supabase');
                        setError('Escala não encontrada. Pode ter sido removida ou o link está incorreto.');
                    }
                    setLoading(false);
                })
                .catch((err: any) => {
                    console.error('❌ Erro ao carregar escala:', err);
                    const savedEscala = localStorage.getItem('escala-horarios');
                    if (savedEscala) {
                        try {
                            const parsedEscala = JSON.parse(savedEscala);
                            const savedVencedorId = localStorage.getItem('vencedor-id');
                            if (savedVencedorId) {
                                parsedEscala.vencedorId = parseInt(savedVencedorId, 10);
                            }
                            const escalaConvertida = converterEstruturaDados(parsedEscala);
                            setEscala(escalaConvertida);
                        } catch (parseError) {
                            console.error('Erro ao parse localStorage:', parseError);
                        }
                    }
                    setLoading(false);
                });
        } else {
            const savedEscala = localStorage.getItem('escala-horarios');
            if (savedEscala) {
                try {
                    const parsedEscala = JSON.parse(savedEscala);
                    const savedVencedorId = localStorage.getItem('vencedor-id');
                    if (savedVencedorId) {
                        parsedEscala.vencedorId = parseInt(savedVencedorId, 10);
                    }
                    const escalaConvertida = converterEstruturaDados(parsedEscala);
                    setEscala(escalaConvertida);
                    console.log('✅ Dados convertidos do localStorage:', escalaConvertida);
                } catch (parseError) {
                    console.error('Erro ao parse localStorage:', parseError);
                }
            }
            setLoading(false);
        }
    }, [linkId]);

    // Realtime Updates Implementation
    useEffect(() => {
        if (!linkId || !supabase) return;

        console.log('🔌 Iniciando conexão Realtime para:', linkId);

        const channel = supabase
            .channel(`escala_updates_${linkId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'escala',
                    filter: `id=eq.${linkId}`
                },
                (payload) => {
                    console.log('⚡ Atualização em tempo real recebida. Buscando dados frescos...');

                    // Em vez de confiar no payload (que pode vir incompleto se for muito grande),
                    // buscamos os dados atualizados diretamente do banco.
                    getEscalaById(linkId).then(({ data: freshData, error }) => {
                        if (error || !freshData) {
                            console.error('Erro ao buscar dados atualizados após notificação:', error);
                            return;
                        }

                        const newData = freshData.data;
                        const newMes = freshData.mes;
                        const newAno = freshData.ano;

                        // Atualiza estados
                        setMesAtual(newMes);
                        setAnoAtual(newAno);

                        const escalaConvertida = converterEstruturaDados(newData, newMes, newAno);
                        setEscala(escalaConvertida);

                        // Recalcula se é parcial
                        const totalDiasNoMes = new Date(newAno, newMes, 0).getDate();
                        const diasComDados = newData.dias.length;
                        const isParcial = diasComDados < totalDiasNoMes * 0.5;
                        const isParcialHeuristic = diasComDados < totalDiasNoMes * 0.5;
                        setIsEscalaParcial(escalaConvertida.isParcial || isParcialHeuristic);

                        // Flash discreto para indicar atualização
                        setFlashUpdate(true);
                        setShowUpdateModal(true);
                        setTimeout(() => {
                            setFlashUpdate(false);
                        }, 4000);
                    });
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Inscrito no canal de atualizações com sucesso');
                }
            });

        return () => {
            console.log('🔌 Desconectando Realtime');
            supabase?.removeChannel(channel);
        };
        // Dependências: linkId é o principal. converterEstruturaDados é estável.
    }, [linkId]);

    useEffect(() => {
        if (!loading && diasMes.length > 0) {
            const diaAtualIndex = getDiaAtual();
            if (diaAtualIndex >= 0) {
                setCurrentDayIndex(diaAtualIndex);
                setTimeout(() => {
                    if (scrollRef.current) {
                        const width = scrollRef.current.offsetWidth;
                        scrollRef.current.scrollTo({
                            left: diaAtualIndex * width,
                            behavior: 'auto'
                        });
                    }
                }, 100);
            }
        }
    }, [mesAtual, anoAtual, loading, diasMes.length]);

    if (loading) {
        return (
            <div className="mobile-escala-container">
                <div className="mobile-header">
                    <h1>📅 Carregando escala...</h1>
                </div>
                <div className="mobile-loading">
                    <p>⏳ Buscando dados da escala...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mobile-escala-container">
            <div className="mobile-header" ref={headerRef}>

                <div className="mobile-title">
                    <h1>📅 Escala</h1>
                    <p>{getNomeMes(mesAtual)} {anoAtual}</p>

                    {isEscalaParcial && (
                        <p className="escala-parcial-info">
                            📊 Período específico - {escala.dias.length} dias
                        </p>
                    )}
                </div>
                {!linkId && !sharedDataFromUrl && (
                    <button
                        onClick={() => window.location.href = '/'}
                        className="back-to-system-btn"
                        title="Voltar ao sistema principal"
                    >
                        ← Sistema
                    </button>
                )}


            </div>

            {sharedDataFromUrl && !linkId && (
                <div className="static-link-warning" style={{ marginTop: headerOffset }}>
                    ⚠️ VISUALIZAÇÃO ESTÁTICA: Este link não atualiza automaticamente.
                </div>
            )}

            {/* Modal de Atualização Importante */}
            {showUpdateModal && (
                <div className="update-modal-overlay">
                    <div className="update-modal-content">
                        <div className="update-modal-icon">🔄</div>
                        <h3 className="update-modal-title">ATUALIZAÇÃO RECEBIDA</h3>
                        <p className="update-modal-message">
                            A escala acabou de ser alterada pelo gerente.
                            <br />
                            Confira as novas informações.
                        </p>
                        <button
                            className="update-modal-btn"
                            onClick={() => setShowUpdateModal(false)}
                        >
                            ENTENDIDO
                        </button>
                    </div>
                </div>
            )}

            <div className={`main-content ${flashUpdate ? 'flash-update' : ''}`} style={{ paddingTop: sharedDataFromUrl && !linkId ? '0' : `${headerOffset}px` }}>
                {error && !loading && (
                    <div className="error-banner">
                        <p>⚠️ {error}</p>
                    </div>
                )}

                <div className="days-container" ref={scrollRef} onScroll={handleScroll}>
                    {diasMes.map((dia, index) => {
                        const funcionariosDoDia = getFuncionariosComHorario(dia.dia);
                        return (
                            <div key={index} className="day-slide">
                                <div className="day-card">
                                    <div className="card-header">
                                        <div className="card-date">
                                            <div className="date-number">{dia.dia.toString().padStart(2, '0')}</div>
                                            <div className="date-month">/ {mesAtual.toString().padStart(2, '0')}</div>
                                        </div>
                                        <div className="card-day">
                                            {dia.nomeDia}
                                            {isFeriado(dia.data) && <span className="holiday-badge">Feriado</span>}
                                            {isFimDeSemana(dia.diaSemana) && <span className="weekend-badge">Fim de Semana</span>}
                                        </div>
                                    </div>

                                    <div className="card-content">
                                        {funcionariosDoDia.length > 0 ? (
                                            funcionariosDoDia.map(func => (
                                                <div
                                                    key={func.id}
                                                    className={`funcionario-item ${!func.horario ? 'no-horario' : ''}`}
                                                >
                                                    <div className={`horario`}>
                                                        {func.horario ? (
                                                            func.horario === 'ATESTADO' ? <span className="status-badge atestado">ATESTADO 🤒</span> :
                                                                func.horario === 'FERIADO' ? <span className="status-badge feriado">FERIADO 🎉</span> :
                                                                    func.horario === 'FOLGA' ? <span className="status-badge folga">FOLGA</span> :
                                                                        func.horario.replace(/(\d+H) AS (\d+H)/, '$1 - $2')
                                                        ) : '--:--'}
                                                    </div>
                                                    <div className="nome">
                                                        {func.nome}
                                                        {escala.vencedorId === func.id && (
                                                            <span className="crown-icon"> 👑</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="no-schedule">
                                                <p>Nenhum funcionário escalado</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="card-footer">
                                        <div className="day-indicator">
                                            Dia {index + 1} de {diasMes.length}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="date-navigation">
                <div className="date-carousel">
                    {diasMes.map((dia, index) => (
                        <button
                            key={index}
                            className={`date-item ${index === currentDayIndex ? 'active' : ''}`}
                            onClick={() => handleDayClick(index)}
                            title={`${dia.nomeDia} - ${dia.dia}/${mesAtual}`}
                        >
                            <div className="date-number">{dia.dia}</div>
                            <div className="date-weekday">{dia.diaSemana.slice(0, 3)}</div>
                            {isFeriado(dia.data) && <div className="nav-dot holiday">●</div>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mobile-instructions">
                <p>💡 Clique nos círculos com as datas para navegar rapidamente ou deslize para os lados</p>
                {!linkId && !sharedDataFromUrl && (
                    <button onClick={() => window.location.href = '/'} className="back-button">
                        ← Voltar ao Sistema
                    </button>
                )}
            </div>
        </div>
    );
}

export default MobileEscala;
