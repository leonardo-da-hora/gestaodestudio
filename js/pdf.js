/* =========================================================
   GH Studio — PDF Export Engine (jsPDF + AutoTable)
   Generates professional, high-aesthetic reports
   ========================================================= */

const PDFExport = {
    // ── Helper: Format BRL ──
    _formatCurrency(val) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    },

    _formatDate(dateVal) {
        if (!dateVal) return '-';
        if (typeof dateVal === 'object') {
            if (dateVal.seconds) {
                return new Date(dateVal.seconds * 1000).toLocaleDateString('pt-BR');
            }
            if (typeof dateVal.toDate === 'function') {
                return dateVal.toDate().toLocaleDateString('pt-BR');
            }
            if (dateVal instanceof Date) {
                return dateVal.toLocaleDateString('pt-BR');
            }
        }
        if (typeof dateVal === 'string') {
            const clean = dateVal.includes('T') ? dateVal : dateVal + 'T00:00:00';
            const d = new Date(clean);
            return isNaN(d.getTime()) ? dateVal : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return '-';
    },

    // ── Draw Header Banner ──
    _drawHeader(doc, title, subtitle) {
        // Dark header block
        doc.setFillColor(14, 14, 17);
        doc.rect(0, 0, 210, 38, 'F');

        // Gold Accent Bar
        doc.setFillColor(245, 197, 24);
        doc.rect(0, 36, 210, 2, 'F');

        // Logo text & Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(245, 197, 24);
        doc.text('GH Studio', 14, 18);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 180, 185);
        doc.text('TATTOO & ART MANAGEMENT', 14, 25);

        // Document Title (Right-aligned)
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text(title, 196, 18, { align: 'right' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(160, 160, 165);
        doc.text(subtitle || `Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`, 196, 25, { align: 'right' });
    },

    // ── Draw Page Footers ──
    _drawFooters(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(130, 130, 135);
            doc.text(`GH Studio — Sistema de Gestão do Estúdio  •  Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
        }
    },

    // ── Robust Save Helper (guarantees correct filename and .pdf extension in Chromium/Windows) ──
    _savePDF(doc, filename) {
        if (!filename) filename = 'documento.pdf';
        if (!filename.toLowerCase().endsWith('.pdf')) {
            filename += '.pdf';
        }

        // Sanitize filename for Windows filesystem
        const cleanFilename = filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');

        try {
            // Get Blob from jsPDF with explicit application/pdf MIME type
            const rawBlob = doc.output('blob');
            const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' });

            // Modern standard: URL.createObjectURL with DOM-attached anchor
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.style.position = 'fixed';
            a.style.left = '-9999px';
            a.style.top = '-9999px';
            a.style.opacity = '0';
            a.href = url;
            a.download = cleanFilename;
            a.setAttribute('download', cleanFilename);

            document.body.appendChild(a);

            // Programmatic click with MouseEvent
            const clickEvt = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            a.dispatchEvent(clickEvt);

            // Cleanup anchor element from DOM after short delay
            setTimeout(() => {
                if (document.body.contains(a)) {
                    document.body.removeChild(a);
                }
            }, 2000);

            // Keep ObjectURL alive for 60s so Chromium download manager writes the file with full metadata & name
            setTimeout(() => {
                URL.revokeObjectURL(url);
            }, 60000);

            return true;
        } catch (err) {
            console.warn('Blob download failed, falling back to native doc.save:', err);
            doc.save(cleanFilename);
            return true;
        }
    },

    // ── 1. Relatório Financeiro Completo ──
    async generateFinancialReport(options = {}) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const transacoes = await DataStore.getTransacoes(options.filters || {});
            const totais = await DataStore.getDashboardTotals();
            const sinais = await DataStore.getSinais();
            const receber = await DataStore.getValoresReceber();

            const title = options.title || 'Relatório Financeiro Geral';
            const periodStr = options.period || new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

            this._drawHeader(doc, title, `Período: ${periodStr}`);

            let y = 48;

            // ── KPI Cards ──
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(20, 20, 25);
            doc.text('Resumo de Desempenho', 14, y);
            y += 6;

            const marginRate = totais.entradas > 0 ? ((totais.lucro / totais.entradas) * 100).toFixed(1) + '%' : '0%';

            const kpis = [
                ['Faturamento Total', this._formatCurrency(totais.entradas)],
                ['Despesas Totais', this._formatCurrency(totais.saidas)],
                ['Lucro Líquido', this._formatCurrency(totais.lucro)],
                ['Margem Líquida', marginRate],
                ['Valores a Receber (Pendentes)', this._formatCurrency(totais.aReceber)]
            ];

            doc.autoTable({
                startY: y,
                head: [['Métrica Financeira', 'Valor Consolidado']],
                body: kpis,
                theme: 'grid',
                headStyles: { fillColor: [245, 197, 24], textColor: [10, 10, 12], fontStyle: 'bold', fontSize: 9 },
                styles: { fontSize: 8.5, cellPadding: 3.5 },
                columnStyles: {
                    0: { fontStyle: 'bold', textColor: [50, 50, 55] },
                    1: { halign: 'right', fontStyle: 'bold', textColor: [15, 15, 20] }
                },
                margin: { left: 14, right: 14 }
            });

            y = doc.lastAutoTable.finalY + 12;

            // ── Categorias de Despesas ──
            const despesas = transacoes.filter(t => t.tipo === 'saida');
            const catTotals = {};
            despesas.forEach(d => {
                const cat = d.categoria || 'outros';
                catTotals[cat] = (catTotals[cat] || 0) + d.valor;
            });

            if (Object.keys(catTotals).length > 0) {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(20, 20, 25);
                doc.text('Detalhamento de Custos por Categoria', 14, y);
                y += 5;

                const catLabels = { materiais: 'Materiais de Tatuagem', epi: 'EPIs e Higiene', aluguel: 'Aluguel do Estúdio', energia: 'Energia Elétrica', internet: 'Internet / Telecom', manutencao: 'Manutenção de Máquinas', outros: 'Outros Custos' };
                const catRows = Object.entries(catTotals).map(([cat, val]) => [
                    catLabels[cat] || cat,
                    this._formatCurrency(val),
                    totais.saidas > 0 ? ((val / totais.saidas) * 100).toFixed(1) + '%' : '-'
                ]);

                doc.autoTable({
                    startY: y,
                    head: [['Categoria', 'Total Investido', '% das Despesas']],
                    body: catRows,
                    theme: 'striped',
                    headStyles: { fillColor: [40, 40, 48], textColor: [240, 240, 245], fontSize: 8.5 },
                    styles: { fontSize: 8, cellPadding: 2.8 },
                    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
                    margin: { left: 14, right: 14 }
                });

                y = doc.lastAutoTable.finalY + 12;
            }

            // ── Tabela de Transações ──
            if (y > 220) {
                doc.addPage();
                this._drawHeader(doc, title, 'Transações Detalhadas');
                y = 48;
            }

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(20, 20, 25);
            doc.text('Lista de Transações Realizadas', 14, y);
            y += 5;

            const metodosLabel = { pix: 'PIX', credito: 'Cartão Crédito', debito: 'Cartão Débito', dinheiro: 'Dinheiro' };

            const txRows = transacoes.map(t => [
                this._formatDate(t.data),
                t.descricao,
                t.cliente || '-',
                t.tipo === 'entrada' ? 'Receita' : 'Despesa',
                metodosLabel[t.metodo] || t.metodo,
                (t.tipo === 'saida' ? '- ' : '+ ') + this._formatCurrency(t.valor)
            ]);

            doc.autoTable({
                startY: y,
                head: [['Data', 'Descrição', 'Cliente / Fornecedor', 'Tipo', 'Método', 'Valor']],
                body: txRows,
                theme: 'striped',
                headStyles: { fillColor: [20, 20, 24], textColor: [245, 197, 24], fontStyle: 'bold', fontSize: 8 },
                styles: { fontSize: 7.5, cellPadding: 2.5 },
                columnStyles: {
                    0: { cellWidth: 20 },
                    3: { cellWidth: 20 },
                    4: { cellWidth: 26 },
                    5: { halign: 'right', fontStyle: 'bold', cellWidth: 28 }
                },
                margin: { left: 14, right: 14 }
            });

            this._drawFooters(doc);

            const filename = `GH_Studio_Relatorio_Financeiro_${new Date().toISOString().slice(0, 10)}.pdf`;
            this._savePDF(doc, filename);
            showToast('Relatório Financeiro exportado em PDF!', 'success');
            return true;
        } catch (e) {
            console.error('PDF export error:', e);
            showToast('Erro ao exportar PDF', 'error');
            return false;
        }
    },

    // ── 2. Ficha do Cliente & Histórico Completo ──
    async generateClientReport(clienteId) {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const cliente = await DataStore.getClienteById(clienteId);
            if (!cliente) throw new Error('Cliente não encontrado');

            const allAgendamentos = await DataStore.getAgendamentos();
            const clientAgendamentos = allAgendamentos.filter(a => a.cliente === cliente.nome || a.clienteId === cliente.id);

            const allTransacoes = await DataStore.getTransacoes();
            const clientTransacoes = allTransacoes.filter(t => (t.cliente === cliente.nome || t.clienteId === cliente.id) && t.tipo === 'entrada');

            const allReceber = await DataStore.getValoresReceber();
            const clientReceber = allReceber.filter(v => v.cliente === cliente.nome || v.clienteId === cliente.id);

            this._drawHeader(doc, 'Ficha do Cliente', `Cadastro: ${cliente.nome}`);

            let y = 48;

            // Dados Cadastrais
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(20, 20, 25);
            doc.text('Dados Cadastrais & Contato', 14, y);
            y += 6;

            const anam = cliente.anamnese || await DataStore.getAnamnese(cliente.id);
            const anamStatus = anam && anam.assinado ? `ASSINADO (${this._formatDate(anam.dataAssinatura)})` : 'PENDENTE (Não assinado)';

            const clientInfo = [
                ['Nome Completo', cliente.nome || 'Não informado', 'Telefone / WhatsApp', cliente.telefone || 'Não informado'],
                ['Email', cliente.email || 'Não informado', 'Total Investido no Estúdio', this._formatCurrency(cliente.totalGasto || 0)],
                ['Sessões Realizadas', `${cliente.sessoes || 0} sessões`, 'Data de Cadastro', this._formatDate(cliente.createdAt)],
                ['CPF', anam?.cpf || 'Não informado', 'Termo de Consentimento', anamStatus]
            ];

            doc.autoTable({
                startY: y,
                body: clientInfo,
                theme: 'grid',
                styles: { fontSize: 8.5, cellPadding: 3 },
                columnStyles: {
                    0: { fontStyle: 'bold', fillColor: [245, 245, 248], cellWidth: 40 },
                    2: { fontStyle: 'bold', fillColor: [245, 245, 248], cellWidth: 45 }
                },
                margin: { left: 14, right: 14 }
            });

            y = doc.lastAutoTable.finalY + 12;

            // Histórico de Tatuagens / Sessões
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(20, 20, 25);
            doc.text('Histórico de Sessões e Agendamentos', 14, y);
            y += 5;

            const agRows = clientAgendamentos.map(a => [
                this._formatDate(a.data),
                `${a.horaInicio} - ${a.horaFim}`,
                a.descricao,
                a.status.toUpperCase(),
                this._formatCurrency(a.valor)
            ]);

            if (agRows.length > 0) {
                doc.autoTable({
                    startY: y,
                    head: [['Data', 'Horário', 'Descrição da Tatuagem', 'Status', 'Valor']],
                    body: agRows,
                    theme: 'striped',
                    headStyles: { fillColor: [245, 197, 24], textColor: [10, 10, 12], fontStyle: 'bold', fontSize: 8 },
                    styles: { fontSize: 8, cellPadding: 2.5 },
                    columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } },
                    margin: { left: 14, right: 14 }
                });
                y = doc.lastAutoTable.finalY + 12;
            } else {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(120);
                doc.text('Nenhuma sessão registrada para este cliente.', 14, y + 4);
                y += 12;
            }

            // Pagamentos Realizados
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(20, 20, 25);
            doc.text('Histórico de Pagamentos e Recebimentos', 14, y);
            y += 5;

            const metodosLabel = { pix: 'PIX', credito: 'Cartão Crédito', debito: 'Cartão Débito', dinheiro: 'Dinheiro' };
            const payRows = clientTransacoes.map(t => [
                this._formatDate(t.data),
                t.descricao,
                metodosLabel[t.metodo] || t.metodo,
                this._formatCurrency(t.valor)
            ]);

            if (payRows.length > 0) {
                doc.autoTable({
                    startY: y,
                    head: [['Data', 'Descrição do Pagamento', 'Forma', 'Valor']],
                    body: payRows,
                    theme: 'striped',
                    headStyles: { fillColor: [30, 30, 36], textColor: [240, 240, 245], fontSize: 8 },
                    styles: { fontSize: 8, cellPadding: 2.5 },
                    columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } },
                    margin: { left: 14, right: 14 }
                });
                y = doc.lastAutoTable.finalY + 12;
            }

            // Valores Pendentes
            if (clientReceber.length > 0) {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(190, 40, 40);
                doc.text('Valores Pendentes / A Receber', 14, y);
                y += 5;

                const recRows = clientReceber.map(r => [
                    r.descricao,
                    this._formatDate(r.dataVencimento),
                    this._formatCurrency(r.valorTotal),
                    this._formatCurrency(r.valorPago),
                    this._formatCurrency(r.valorTotal - r.valorPago)
                ]);

                doc.autoTable({
                    startY: y,
                    head: [['Descrição', 'Vencimento', 'Total', 'Já Pago', 'Saldo Devedor']],
                    body: recRows,
                    theme: 'grid',
                    headStyles: { fillColor: [220, 60, 60], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
                    styles: { fontSize: 8, cellPadding: 2.5 },
                    columnStyles: { 4: { halign: 'right', fontStyle: 'bold', textColor: [180, 20, 20] } },
                    margin: { left: 14, right: 14 }
                });
            }

            this._drawFooters(doc);

            const safeName = (cliente.nome || 'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            this._savePDF(doc, `GH_Studio_Ficha_${safeName}.pdf`);
            showToast(`Ficha de ${cliente.nome} exportada em PDF!`, 'success');
            return true;
        } catch (e) {
            console.error('Client PDF export error:', e);
            showToast('Erro ao exportar ficha do cliente', 'error');
            return false;
        }
    },

    // ── 3. Termo de Consentimento & Ficha de Anamnese em PDF ──
    async generateAnamnesePDF(clienteId) {
        try {
            const jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
            if (!jsPDFClass) {
                showToast('Erro: Biblioteca jsPDF não disponível', 'error');
                return false;
            }
            const doc = new jsPDFClass();

            // Try to find client from DataStore or active form
            let cliente = null;
            if (clienteId) {
                try {
                    cliente = await DataStore.getClienteById(clienteId);
                } catch (e) {
                    console.warn('DataStore.getClienteById error in generateAnamnesePDF:', e);
                }
            }

            const formNome = document.getElementById('anamNome')?.value.trim();
            if (!cliente) {
                cliente = {
                    id: clienteId || 'temp',
                    nome: formNome || 'Cliente',
                    telefone: document.getElementById('anamTelefone')?.value.trim() || ''
                };
            }

            let anam = cliente?.anamnese;
            if (!anam && clienteId) {
                try {
                    anam = await DataStore.getAnamnese(clienteId);
                } catch (e) {}
            }

            // If modal is currently open, read form values directly so any recent edits or signature on canvas are used!
            const modalOpen = document.getElementById('modalAnamneseOverlay')?.classList.contains('active');
            if (modalOpen || !anam) {
                const respostas = {};
                document.querySelectorAll('.anam-q-row').forEach(row => {
                    const key = row.getAttribute('data-key');
                    const activeSim = row.querySelector('.anam-btn-toggle.active-sim');
                    respostas[key] = !!activeSim;
                });

                const hasCanvasSig = signaturePadInstance && signaturePadInstance.hasSignature;
                const canvasSigUrl = hasCanvasSig ? signaturePadInstance.toDataURL() : '';

                anam = {
                    nome: formNome || anam?.nome || cliente?.nome || 'Cliente',
                    dataNascimento: document.getElementById('anamNascimento')?.value || anam?.dataNascimento || '',
                    cpf: document.getElementById('anamCpf')?.value.trim() || anam?.cpf || '',
                    rg: document.getElementById('anamRg')?.value.trim() || anam?.rg || '',
                    telefone: document.getElementById('anamTelefone')?.value.trim() || anam?.telefone || cliente?.telefone || '',
                    endereco: document.getElementById('anamEndereco')?.value.trim() || anam?.endereco || '',
                    obsSaude: document.getElementById('anamObsSaude')?.value.trim() || anam?.obsSaude || '',
                    autorizaFoto: document.getElementById('anamAutorizaFoto') ? document.getElementById('anamAutorizaFoto').checked : (anam?.autorizaFoto ?? true),
                    respostas: Object.keys(respostas).length > 0 ? respostas : (anam?.respostas || {}),
                    assinaturaUrl: canvasSigUrl || anam?.assinaturaUrl || '',
                    assinado: hasCanvasSig || !!(anam && anam.assinado),
                    dataAssinatura: anam?.dataAssinatura || new Date().toISOString()
                };
            }

            const isSigned = !!(anam.assinado || (anam.assinaturaUrl && anam.assinaturaUrl.length > 50));
            const subTitle = isSigned 
                ? `Documento Assinado Digitalmente • ${this._formatDate(anam.dataAssinatura || new Date())}`
                : `Ficha Cadastral e Termo para Assinatura Física`;

            this._drawHeader(doc, 'Termo de Consentimento & Anamnese', subTitle);

            let y = 48;

            // 1. Identificação do Cliente
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(20, 20, 25);
            doc.text('1. Identificação do Cliente', 14, y);
            y += 6;

            const clientInfo = [
                ['Nome Completo', anam.nome || cliente.nome || '-', 'Telefone / WhatsApp', anam.telefone || cliente.telefone || '-'],
                ['CPF', anam.cpf || 'Não informado', 'RG', anam.rg || 'Não informado'],
                ['Data de Nascimento', this._formatDate(anam.dataNascimento), 'Data da Assinatura', this._formatDate(anam.dataAssinatura)],
                ['Endereço Completo', anam.endereco || 'Não informado', 'Autoriza Uso de Imagem', anam.autorizaFoto ? 'SIM (Autorizado)' : 'NÃO']
            ];

            doc.autoTable({
                startY: y,
                body: clientInfo,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 2.5 },
                columnStyles: {
                    0: { fontStyle: 'bold', fillColor: [245, 245, 248], cellWidth: 40 },
                    2: { fontStyle: 'bold', fillColor: [245, 245, 248], cellWidth: 40 }
                },
                margin: { left: 14, right: 14 }
            });

            y = doc.lastAutoTable.finalY + 10;

            // 2. Questionário de Saúde (Anamnese)
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(20, 20, 25);
            doc.text('2. Avaliação Clínica e Restrições de Saúde (Anamnese)', 14, y);
            y += 5;

            const questLabels = [
                { key: 'maiorIdade', label: '1. É maior de 18 anos de idade?' },
                { key: 'alergias', label: '2. Possui alergia a pigmentos, látex, álcool ou pomadas?' },
                { key: 'queloides', label: '3. Histórico de queloides ou cicatrização hipertrófica?' },
                { key: 'diabetesHipertensao', label: '4. É portador(a) de diabetes ou hipertensão arterial?' },
                { key: 'coagulacao', label: '5. Problemas de coagulação sanguínea ou usa anticoagulantes?' },
                { key: 'doencasTransmissiveis', label: '6. Possui doença transmissível pelo sangue (Hepatite, HIV)?' },
                { key: 'gestanteLactante', label: '7. Encontra-se gestante ou em período de amamentação?' },
                { key: 'epilepsia', label: '8. Histórico de epilepsia, convulsões ou desmaios?' },
                { key: 'medicamentosRoacutan', label: '9. Faz uso de medicação contínua ou Roacutan recente?' },
                { key: 'problemasPele', label: '10. Psoríase, dermatite, manchas ou lesões no local a tatuar?' },
                { key: 'alcoolDrogas24h', label: '11. Consumiu álcool ou substâncias nas últimas 24 horas?' }
            ];

            const respostas = anam.respostas || {};
            const qRows = questLabels.map(q => {
                const isYes = respostas[q.key] === true || respostas[q.key] === 'sim';
                return [
                    q.label,
                    isYes ? 'SIM' : 'NÃO',
                    isYes ? 'Requer atenção profissional' : 'Sem restrição declarada'
                ];
            });

            doc.autoTable({
                startY: y,
                head: [['Pergunta / Condição Médica Avaliada', 'Resposta', 'Observação Clínica']],
                body: qRows,
                theme: 'striped',
                headStyles: { fillColor: [245, 197, 24], textColor: [10, 10, 12], fontStyle: 'bold', fontSize: 8 },
                styles: { fontSize: 7.5, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 110 },
                    1: { halign: 'center', fontStyle: 'bold', cellWidth: 25 },
                    2: { cellWidth: 47 }
                },
                didParseCell: function(data) {
                    if (data.column.index === 1 && data.section === 'body') {
                        // Inverted: SIM = Green, NÃO = Red
                        if (data.cell.raw === 'SIM') {
                            data.cell.styles.textColor = [22, 101, 52];
                            data.cell.styles.fillColor = [220, 252, 231];
                        } else {
                            data.cell.styles.textColor = [220, 38, 38];
                            data.cell.styles.fillColor = [254, 226, 226];
                        }
                    }
                },
                margin: { left: 14, right: 14 }
            });

            y = doc.lastAutoTable.finalY + 8;

            if (anam.obsSaude) {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(50, 50, 60);
                doc.text(`Observações Médicas Adicionais: ${anam.obsSaude}`, 14, y);
                y += 8;
            }

            // 3. Termo de Consentimento Livre e Esclarecido (TCLE)
            doc.setFontSize(10.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(20, 20, 25);
            doc.text('3. Termo de Responsabilidade e Consentimento Informado', 14, y);
            y += 5;

            const legalText = [
                'Declaro serem autênticas e exatas todas as informações médicas e cadastrais fornecidas neste documento.',
                'Estou ciente de que o procedimento de tatuagem é invasivo e irreversível (permanente), executado conforme desenho aprovado.',
                'Comprometo-me a seguir fielmente todas as instruções de assepsia, hidratação e cuidados pós-tatuagem fornecidas pelo GH Studio.'
            ];

            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(70, 70, 80);
            legalText.forEach(line => {
                doc.text(`• ${line}`, 14, y);
                y += 4;
            });

            y += 4;

            // 4. Assinatura do Cliente
            if (y > 220) {
                doc.addPage();
                y = 40;
            }

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(20, 20, 25);
            doc.text(isSigned ? '4. Assinatura Digital Coletada' : '4. Assinatura do(a) Cliente (Coleta Física)', 14, y);
            y += 3;

            // Add signature image if available
            if (anam.assinaturaUrl && typeof anam.assinaturaUrl === 'string' && anam.assinaturaUrl.startsWith('data:image/')) {
                try {
                    doc.addImage(anam.assinaturaUrl, 'PNG', 14, y, 65, 20);
                } catch (imgErr) {
                    console.warn('Could not draw signature image in PDF:', imgErr);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(16, 185, 129);
                    doc.text('✓ Assinado digitalmente no sistema GH Studio', 14, y + 12);
                }
            } else if (isSigned) {
                doc.setFontSize(8);
                doc.setFont('helvetica', 'italic');
                doc.setTextColor(16, 185, 129);
                doc.text('✓ Assinado digitalmente no sistema GH Studio', 14, y + 12);
            }

            y += 22;
            doc.setDrawColor(80, 80, 90);
            doc.setLineWidth(0.5);
            doc.line(14, y, 95, y); // client signature line
            doc.line(115, y, 196, y); // studio counter-signature line

            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 30, 35);
            doc.text(anam.nome || cliente.nome, 14, y + 4);
            doc.text('GH Studio — Responsável Técnico', 115, y + 4);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 100, 110);
            const dateStr = anam.dataAssinatura ? this._formatDate(anam.dataAssinatura) : new Date().toLocaleDateString('pt-BR');
            doc.text(`CPF: ${anam.cpf || cliente.cpf || '-'} • Data: ${dateStr}`, 14, y + 8);
            doc.text('Certificação e Responsabilidade Técnica', 115, y + 8);

            this._drawFooters(doc);

            const safeName = (cliente.nome || 'cliente').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]/g, '_');
            this._savePDF(doc, `GH_Studio_Termo_${safeName}.pdf`);
            showToast(`Termo de Consentimento de ${cliente.nome} exportado em PDF!`, 'success');
            return true;
        } catch (e) {
            console.error('Anamnese PDF export error:', e);
            showToast('Erro ao exportar termo de consentimento', 'error');
            return false;
        }
    }
};

// Expose globally to window
window.PDFExport = PDFExport;
