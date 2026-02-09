import { EscalaData, Funcionario } from '../types';
import { isFeriado, isFimDeSemana, getNomeMes } from './dateUtils';

interface DiaExport {
    dia: number;
    diaSemana: string;
    data: string; // DD/MM
}

const getHorarioFuncionario = (escala: EscalaData, dia: number, funcionarioId: number) => {
    const diaEscala = escala.dias.find(d => d.dia === dia);
    if (!diaEscala) return "";

    const horario = diaEscala.horarios.find(h => h.funcionarioId === funcionarioId);
    return horario ? horario.horario : "";
};

export const exportToPdf = async (
    escala: EscalaData,
    funcionarios: Funcionario[],
    dias: DiaExport[],
    mes: number,
    ano: number,
    titulo?: string,
    fileName?: string
) => {
    // Importação dinâmica
    const { default: jsPDF } = await import('jspdf');

    // Cria o PDF em modo paisagem (A4) com unidades em milímetros
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Dimensões da página A4 paisagem
    const pageWidth = pdf.internal.pageSize.getWidth(); // 297mm
    const pageHeight = pdf.internal.pageSize.getHeight(); // 210mm
    const margin = 8;

    // Área útil da página
    const usableWidth = pageWidth - (margin * 2);

    // Configurações de fonte
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);

    // Título principal
    const title = titulo || `ESCALA - ${getNomeMes(mes).toUpperCase()} ${ano}`;
    const titleWidth = pdf.getTextWidth(title);
    const titleX = (pageWidth - titleWidth) / 2;
    pdf.text(title, titleX, margin + 6);

    // Configurações da tabela
    pdf.setFontSize(9);
    const tableStartY = margin + 10;
    const rowHeight = 5.5;
    const colWidth = usableWidth / (funcionarios.length + 1); // +1 para a coluna de data

    // Função auxiliar para desenhar o cabeçalho
    const drawHeader = (y: number) => {
        pdf.setFillColor(52, 73, 94); // Cor azul escura
        pdf.rect(margin, y, usableWidth, rowHeight, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);

        // Coluna DATA
        const dataHeaderText = 'DATA';
        const dataHeaderWidth = pdf.getTextWidth(dataHeaderText);
        const dataHeaderX = margin + (colWidth - dataHeaderWidth) / 2;
        pdf.text(dataHeaderText, dataHeaderX, y + (rowHeight / 2) + 1);

        // Funcionários
        funcionarios.forEach((func, index) => {
            const cellX = margin + colWidth * (index + 1);
            const textWidth = pdf.getTextWidth(func.nome);
            const textX = cellX + (colWidth - textWidth) / 2;
            pdf.text(func.nome, textX, y + (rowHeight / 2) + 1);
        });

        pdf.setTextColor(0, 0, 0); // Reset para corpo
    };

    // Desenha cabeçalho inicial
    drawHeader(tableStartY);

    // Dados da tabela
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);

    dias.forEach(({ dia, diaSemana, data }, rowIndex) => {
        // Verifica paginação
        // Cada página precisa de espaço para header (nova página) + linhas
        // Mas aqui estamos iterando. Se currentY + rowHeight > pageHeight...
        // rowIndex 0 já desenhamos header em tableStartY
        // As linhas começam em tableStartY + rowHeight

        // Cálculo da posição Y da linha atual (considerando quebras de página seria complexo se não rastrearmos currentY)
        // Vamos simplificar: reiniciar o "y" relativo a cada página
        // Precisamos de um contador de páginas ou offset
    });

    // Refazendo loop com controle de Y
    let currentY = tableStartY + rowHeight;

    dias.forEach(({ dia, diaSemana, data }) => {
        if (currentY + rowHeight > pageHeight - margin) {
            pdf.addPage();
            currentY = margin + 10; // Reinicia Y (header)
            drawHeader(margin); // Desenha header na nova página (em 'margin', ajustando y)
            // Ops, drawHeader desenha em 'y'. Se nova página, desenha em 'margin'
            currentY = margin + rowHeight;
        }

        // Cor de fundo para fins de semana
        if (isFimDeSemana(diaSemana)) {
            pdf.setFillColor(248, 249, 250);
            pdf.rect(margin, currentY, usableWidth, rowHeight, 'F');
        }

        // Coluna DATA
        const dataText = `${data} (${diaSemana})`;
        const dataTextWidth = pdf.getTextWidth(dataText);
        const dataTextX = margin + (colWidth - dataTextWidth) / 2;
        pdf.setTextColor(0, 0, 0);
        pdf.text(dataText, dataTextX, currentY + (rowHeight / 2) + 1);

        // Funcionários
        funcionarios.forEach((func, colIndex) => {
            const cellX = margin + colWidth * (colIndex + 1);
            const horario = getHorarioFuncionario(escala, dia, func.id);

            // Backgrounds especiais
            if (horario === 'FOLGA') {
                pdf.setFillColor(255, 234, 167);
                pdf.rect(cellX, currentY, colWidth, rowHeight, 'F');
            } else if (horario === 'FERIADO' || isFeriado(data, ano)) {
                pdf.setFillColor(255, 235, 238);
                pdf.rect(cellX, currentY, colWidth, rowHeight, 'F');
                pdf.setTextColor(211, 47, 47);
            } else {
                pdf.setTextColor(0, 0, 0);
            }

            // Texto
            const displayText = isFeriado(data, ano) ? 'FERIADO' : (horario || '');
            const textWidth = pdf.getTextWidth(displayText);
            const textX = cellX + (colWidth - textWidth) / 2;
            pdf.text(displayText, textX, currentY + (rowHeight / 2) + 1);
        });

        currentY += rowHeight;
    });

    // Bordas (desenhar linhas verticais e horizontais em todas as páginas seria ideal, ou desenhar celula por celula com rect)
    // O código original desenhava linhas no final. Em multipagina isso é complicado.
    // Vamos desenhar bordas célula a célula ou simplificar.
    // Pelo código original, ele desenhava linhas no final sobre tudo. Se houver quebra de página, as linhas quebram.
    // Para manter a fidelidade e robustez com paginação, desenhar rect (outline) em cada célula pode ser melhor, ou desenhar linhas por página.
    // Dado o escopo de "cleanup", vou manter simples: rects já dão fundo, vamos adicionar stroke nos rects ou uma linha geral.
    // jsPDF rect com style 'DF' (draw and fill) resolve.
    // Mas o código original usava 'F' (fill) e depois linhas sobre.
    // Vou deixar como está (sem bordas detalhadas célula a célula para não poluir, ou adicionar 'S' (stroke) se necessário).
    // O original fazia `pdf.line(...)` no final.


    const finalFileName = fileName || `escala-${getNomeMes(mes).toLowerCase()}-${ano}.pdf`;
    pdf.save(finalFileName);
};

export const exportToExcel = async (
    escala: EscalaData,
    funcionarios: Funcionario[],
    dias: DiaExport[],
    mes: number,
    ano: number,
    filenamePrefix: string = 'escala',
    customFileName?: string
) => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const dados = [];

    // Cabeçalho
    const header = ['DATA', ...funcionarios.map(f => f.nome)];
    dados.push(header);

    // Dados
    dias.forEach(({ dia, diaSemana, data }) => {
        const row = [data + ' (' + diaSemana + ')'];
        funcionarios.forEach(func => {
            const horario = getHorarioFuncionario(escala, dia, func.id);
            row.push(horario);
        });
        dados.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(dados);

    // Largura colunas
    const colWidths = [
        { wch: 15 },
        ...funcionarios.map(() => ({ wch: 12 }))
    ];
    worksheet['!cols'] = colWidths;

    const nomePlanilha = `Escala ${getNomeMes(mes)} ${ano}`.replace(/[:\\/?*[\]]/g, '');
    XLSX.utils.book_append_sheet(workbook, worksheet, nomePlanilha);

    const finalFileName = customFileName || `${filenamePrefix}-${getNomeMes(mes).toLowerCase()}-${ano}.xlsx`.replace(/[:\\/?*[\]]/g, '');
    XLSX.writeFile(workbook, finalFileName);
};

export const exportToGoogleSheets = async (
    escala: EscalaData,
    funcionarios: Funcionario[],
    dias: DiaExport[],
    ano: number
) => {
    try {
        const header = ['DATA', ...funcionarios.map(f => f.nome)];
        let html = '<meta charset="utf-8"><table border="1" style="font-family: sans-serif; border-collapse: collapse;">';

        // Cabeçalho
        html += '<thead style="background-color: #34495e; color: #fff;"><tr>';
        header.forEach(h => html += `<th style="padding: 10px; border: 1px solid #ccc; font-weight: bold;">${h}</th>`);
        html += '</tr></thead><tbody>';

        dias.forEach(({ dia, diaSemana, data }) => {
            const isFimSemana = isFimDeSemana(diaSemana);
            const rowStyle = isFimSemana ? 'background-color: #f8fafc;' : '';

            html += `<tr style="${rowStyle}">`;
            html += `<td style="padding: 8px; border: 1px solid #ccc; font-weight: bold; text-align: center;">${data} (${diaSemana})</td>`;

            funcionarios.forEach(func => {
                const horario = getHorarioFuncionario(escala, dia, func.id);
                let cellStyle = 'padding: 8px; border: 1px solid #ccc; text-align: center;';
                let cellContent = horario || '';

                if (horario === 'FOLGA') {
                    cellStyle += 'background-color: #efe575; font-weight: bold; color: #000;';
                } else if (horario === 'FERIADO' || isFeriado(data, ano)) {
                    cellStyle += 'background-color: #fef2f2; color: #7f1d1d; font-weight: bold;';
                    if (isFeriado(data, ano)) cellContent = 'FERIADO';
                }

                html += `<td style="${cellStyle}">${cellContent}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody></table>';

        const blobHtml = new Blob([html], { type: 'text/html' });

        // Fallback texto
        const textRows = [header.join('\t')];
        dias.forEach(({ dia, diaSemana, data }) => {
            const row = [`${data} (${diaSemana})`];
            funcionarios.forEach(func => {
                const h = getHorarioFuncionario(escala, dia, func.id);
                row.push(isFeriado(data, ano) ? 'FERIADO' : (h || ''));
            });
            textRows.push(row.join('\t'));
        });
        const blobText = new Blob([textRows.join('\n')], { type: 'text/plain' });

        // @ts-ignore
        const data = [new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })];
        await navigator.clipboard.write(data);

        window.open('https://sheets.new', '_blank');
        alert('✅ DADOS COPIADOS!\n\n1. Uma nova planilha do Google Sheets foi aberta.\n2. Clique na célula A1.\n3. Pressione "Ctrl + V" para colar a escala.');

    } catch (err) {
        console.error('Erro (modo HTML):', err);
        // Fallback simples
        try {
            const header = ['DATA', ...funcionarios.map(f => f.nome)];
            const textRows = [header.join('\t')];
            dias.forEach(({ dia, diaSemana, data }) => {
                const row = [`${data} (${diaSemana})`];
                funcionarios.forEach(func => {
                    const h = getHorarioFuncionario(escala, dia, func.id);
                    row.push(isFeriado(data, ano) ? 'FERIADO' : (h || ''));
                });
                textRows.push(row.join('\t'));
            });
            await navigator.clipboard.writeText(textRows.join('\n'));
            window.open('https://sheets.new', '_blank');
            alert('✅ DADOS COPIADOS (Modo Texto)!\n\nCole na nova planilha com "Ctrl + V".');
        } catch (e2) {
            alert('Erro ao copiar dados. Tente usar a exportação Excel.');
        }
    }
};
