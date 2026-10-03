/* =========================================================
   GH Studio — Main Application (v2 — DataStore + Auth)
   ========================================================= */

// ── Utility Functions ──
const formatCurrency = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getInitials = (name) =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

const getDayOfWeek = (dateStr) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return days[new Date(dateStr + 'T00:00:00').getDay()];
};

const getMonthName = (month) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return months[month];
};

const metodosLabel = { pix: 'PIX', credito: 'Cartão Crédito', debito: 'Cartão Débito', dinheiro: 'Dinheiro' };
const statusLabel = { recebido: 'Recebido', pago: 'Pago', parcial: 'Parcial', pendente: 'Pendente' };
const catLabels = { materiais: 'Materiais', epi: 'EPIs', aluguel: 'Aluguel', energia: 'Energia', internet: 'Internet', manutencao: 'Manutenção', outros: 'Outros' };
const catIcons = { materiais: '🖊️', epi: '🧤', aluguel: '🏠', energia: '⚡', internet: '🌐', manutencao: '🔧', outros: '📦' };

const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const TODAY = getTodayStr();

// ── Action Buttons HTML ──
const editBtn = (type, id) => `<button class="btn-action edit" title="Editar" onclick="handleEdit('${type}','${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>`;
const deleteBtn = (type, id) => `<button class="btn-action delete" title="Excluir" onclick="handleDelete('${type}','${id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>`;
const actionBtns = (type, id) => `<div class="row-actions">${editBtn(type, id)}${deleteBtn(type, id)}</div>`;

const emptyState = (icon, title, desc) => `
    <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icon}</svg>
        <h3>${title}</h3>
        <p>${desc}</p>
    </div>`;

// ── Confirmation Dialog ──
const showConfirm = (title, message) => {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-overlay';
        overlay.innerHTML = `
            <div class="confirm-dialog">
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirm-actions">
                    <button class="btn-secondary" id="confirmCancel">Cancelar</button>
                    <button class="btn-danger" id="confirmOk">Excluir</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#confirmCancel').onclick = () => { overlay.remove(); resolve(false); };
        overlay.querySelector('#confirmOk').onclick = () => { overlay.remove(); resolve(true); };
        overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    });
};

// ── Toast ──
const showToast = (message, type = 'success') => {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

// ── Chart Instance (for updates) ──
let chartInstance = null;

// =========================================================
// RENDER FUNCTIONS (Async — read from DataStore)
// =========================================================

// ── Dashboard Month Selection State ──
let currentDashYearMonth = getTodayStr().slice(0, 7); // 'YYYY-MM'

function formatDashMonth(ymStr) {
    const [y, m] = (ymStr || getTodayStr().slice(0, 7)).split('-').map(Number);
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesesCurto = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const curYM = getTodayStr().slice(0, 7);
    const isCurrent = ymStr === curYM;
    const isPast = ymStr < curYM;
    const isFuture = ymStr > curYM;
    return {
        title: `${meses[m - 1]} de ${y}`,
        short: `${mesesCurto[m - 1]}/${y}`,
        monthName: meses[m - 1],
        year: y,
        month: m,
        isCurrent,
        isPast,
        isFuture,
        key: `${y}-${String(m).padStart(2, '0')}`
    };
}

async function renderDashboardCards(targetYM = currentDashYearMonth) {
    try {
        const monthInfo = formatDashMonth(targetYM);
        
        // Update Month Bar in Dashboard
        const lblMonth = document.getElementById('dashMonthLabel');
        const badgeMonth = document.getElementById('dashMonthBadge');
        const inputMonth = document.getElementById('dashMonthInput');
        if (lblMonth) lblMonth.textContent = monthInfo.title;
        if (inputMonth) inputMonth.value = targetYM;
        if (badgeMonth) {
            if (monthInfo.isCurrent) {
                badgeMonth.textContent = 'Mês Atual';
                badgeMonth.className = 'dmb-badge';
            } else if (monthInfo.isPast) {
                badgeMonth.textContent = 'Mês Passado';
                badgeMonth.className = 'dmb-badge past';
            } else {
                badgeMonth.textContent = 'Mês Futuro';
                badgeMonth.className = 'dmb-badge future';
            }
        }

        // Update Card Labels
        const lblFat = document.getElementById('labelFaturamento');
        const lblDesp = document.getElementById('labelDespesas');
        const lblLuc = document.getElementById('labelLucro');
        if (lblFat) lblFat.textContent = `Faturamento (${monthInfo.short})`;
        if (lblDesp) lblDesp.textContent = `Despesas (${monthInfo.short})`;
        if (lblLuc) lblLuc.textContent = `Lucro Líquido (${monthInfo.short})`;

        const totais = await DataStore.getDashboardTotals(targetYM);
        document.getElementById('valFaturamento').textContent = formatCurrency(totais.entradas);
        document.getElementById('valDespesas').textContent = formatCurrency(totais.saidas);
        document.getElementById('valLucro').textContent = formatCurrency(totais.lucro);
        document.getElementById('valReceber').textContent = formatCurrency(totais.aReceber);
        document.getElementById('trendReceber').textContent = `${totais.pendentes} ${totais.pendentes === 1 ? 'cliente pendente' : 'clientes pendentes'}`;

        const trendFat = document.getElementById('trendFaturamento');
        const trendDesp = document.getElementById('trendDespesas');
        const trendLuc = document.getElementById('trendLucro');

        if (trendFat) {
            if (totais.entradas > 0) {
                if (totais.prevEntradas > 0) {
                    const growth = ((totais.entradas - totais.prevEntradas) / totais.prevEntradas) * 100;
                    trendFat.textContent = `${growth >= 0 ? '+' : ''}${growth.toFixed(0)}% vs mês anterior`;
                    trendFat.className = growth >= 0 ? 'card-trend positive' : 'card-trend negative';
                } else {
                    trendFat.textContent = `Entradas em ${monthInfo.short}`;
                    trendFat.className = 'card-trend positive';
                }
            } else {
                trendFat.textContent = `Sem movimentações em ${monthInfo.short}`;
                trendFat.className = 'card-trend';
            }
        }

        if (trendDesp) {
            if (totais.saidas > 0) {
                trendDesp.textContent = `Total despesas em ${monthInfo.short}`;
                trendDesp.className = 'card-trend negative';
            } else {
                trendDesp.textContent = `Sem despesas em ${monthInfo.short}`;
                trendDesp.className = 'card-trend';
            }
        }

        if (trendLuc) {
            if (totais.entradas > 0 || totais.saidas > 0) {
                if (totais.lucro >= 0) {
                    const margem = totais.entradas > 0 ? ((totais.lucro / totais.entradas) * 100).toFixed(0) : 100;
                    trendLuc.textContent = `Margem de ${margem}% apurada`;
                    trendLuc.className = 'card-trend positive';
                } else {
                    trendLuc.textContent = `Déficit operacional no mês`;
                    trendLuc.className = 'card-trend negative';
                }
            } else {
                trendLuc.textContent = `Sem saldo apurado em ${monthInfo.short}`;
                trendLuc.className = 'card-trend';
            }
        }
    } catch (e) { console.error('Error rendering dashboard cards:', e); }
}

async function renderMetaMensal(targetYM = currentDashYearMonth) {
    const card = document.querySelector('.meta-mensal-card');
    if (!card) return;

    try {
        const monthInfo = formatDashMonth(targetYM);
        const [totals, metaEstipulada] = await Promise.all([
            DataStore.getDashboardTotals(targetYM),
            DataStore.getMetaMensal(targetYM)
        ]);

        const faturado = totals.entradas || 0;
        const meta = metaEstipulada > 0 ? metaEstipulada : 10000;
        const percent = meta > 0 ? (faturado / meta) * 100 : 0;

        const elMes = document.getElementById('metaMesAtual');
        const elRealizado = document.getElementById('metaValRealizado');
        const elObjetivo = document.getElementById('metaValObjetivo');
        const badge = document.getElementById('metaPercentBadge');
        const progressBar = document.getElementById('metaProgressBar');
        const statusLabel = document.getElementById('metaStatusLabel');
        const valRestante = document.getElementById('metaValRestante');

        if (elMes) elMes.textContent = monthInfo.title;
        if (elRealizado) elRealizado.textContent = formatCurrency(faturado);
        if (elObjetivo) elObjetivo.textContent = formatCurrency(meta);

        if (progressBar) {
            progressBar.style.width = `${Math.min(Math.max(percent, 0), 100)}%`;
        }

        if (percent >= 100) {
            const superavit = faturado - meta;
            if (badge) {
                badge.textContent = `🎉 Meta Batida! (${percent.toFixed(0)}%)`;
                badge.classList.add('meta-batida');
            }
            if (statusLabel) statusLabel.textContent = 'Superávit Acima da Meta';
            if (valRestante) {
                valRestante.textContent = `+ ${formatCurrency(superavit)}`;
                valRestante.className = 'meta-num-val val-green';
            }
        } else {
            const falta = meta - faturado;
            if (badge) {
                badge.textContent = `${percent.toFixed(1)}% atingido`;
                badge.classList.remove('meta-batida');
            }
            if (statusLabel) statusLabel.textContent = 'Faltam para a Meta';
            if (valRestante) {
                valRestante.textContent = formatCurrency(falta);
                valRestante.className = 'meta-num-val';
            }
        }

        const elDias = document.getElementById('metaDiasRestantesText');
        const elRitmo = document.getElementById('metaRitmoDiarioText');

        if (monthInfo.isCurrent) {
            const now = new Date();
            const daysInMonth = new Date(monthInfo.year, monthInfo.month, 0).getDate();
            const currentDay = now.getDate();
            const daysLeft = Math.max(daysInMonth - currentDay, 1);
            const neededPerDay = Math.max(meta - faturado, 0) / daysLeft;
            if (elDias) elDias.textContent = `🗓️ ${daysLeft} ${daysLeft === 1 ? 'dia restante' : 'dias restantes'} no mês de ${monthInfo.monthName}`;
            if (elRitmo) {
                if (percent >= 100) {
                    elRitmo.textContent = '🏆 Parabéns! Objetivo mensal conquistado com sucesso!';
                    elRitmo.style.color = 'var(--green)';
                } else {
                    elRitmo.textContent = `⚡ Ritmo necessário: ${formatCurrency(neededPerDay)} / dia`;
                    elRitmo.style.color = '';
                }
            }
        } else if (monthInfo.isPast) {
            if (elDias) elDias.textContent = `🏁 Mês encerrado (${monthInfo.title})`;
            if (elRitmo) {
                elRitmo.textContent = percent >= 100 ? '✅ Meta atingida no encerramento!' : 'Fechamento abaixo da meta prevista';
                elRitmo.style.color = percent >= 100 ? 'var(--green)' : 'var(--text-tertiary)';
            }
        } else {
            if (elDias) elDias.textContent = `⏳ Mês futuro (${monthInfo.title})`;
            if (elRitmo) {
                elRitmo.textContent = `Meta planejada: ${formatCurrency(meta)}`;
                elRitmo.style.color = 'var(--text-tertiary)';
            }
        }
    } catch (e) {
        console.error('Error rendering meta mensal:', e);
    }
}

function setupMetaModal() {
    const btnDefinir = document.getElementById('btnDefinirMeta');
    const modal = document.getElementById('modalMetaOverlay');
    const form = document.getElementById('formMetaMensal');
    const closeBtn = document.getElementById('modalMetaClose');
    const cancelBtn = document.getElementById('btnCancelMeta');

    const openMeta = async () => {
        const curMeta = await DataStore.getMetaMensal(currentDashYearMonth);
        const input = document.getElementById('metaInputValor');
        if (input) input.value = curMeta;
        openModal(modal);
    };

    btnDefinir?.addEventListener('click', openMeta);
    closeBtn?.addEventListener('click', () => closeModal(modal));
    cancelBtn?.addEventListener('click', () => closeModal(modal));

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = parseFloat(document.getElementById('metaInputValor').value) || 0;
        if (val <= 0) {
            showToast('Informe um valor de meta maior que zero', 'warning');
            return;
        }
        await DataStore.setMetaMensal(val, currentDashYearMonth);
        showToast(`Meta de ${formatDashMonth(currentDashYearMonth).short} estipulada em ${formatCurrency(val)}! 🎯`, 'success');
        closeModal(modal);
        renderMetaMensal(currentDashYearMonth);
    });
}

// =========================================================
// FECHAMENTO MENSAL & DRE DO ESTÚDIO
// =========================================================

async function renderDREModalContent(targetYM) {
    const ym = targetYM || currentDashYearMonth || getTodayStr().slice(0, 7);
    const monthInfo = formatDashMonth(ym);
    const [y, m] = ym.split('-').map(Number);

    const subTitle = document.getElementById('fechamentoSubTitle');
    const badge = document.getElementById('fechamentoMonthBadge');
    const monthInput = document.getElementById('fechamentoMonthInput');
    if (subTitle) subTitle.textContent = `Demonstrativo do Resultado do Exercício — ${monthInfo.title}`;
    if (monthInput) monthInput.value = ym;
    if (badge) {
        if (monthInfo.isCurrent) {
            badge.textContent = 'Mês Atual';
            badge.className = 'dmb-badge';
        } else if (monthInfo.isPast) {
            badge.textContent = 'Mês Passado';
            badge.className = 'dmb-badge past';
        } else {
            badge.textContent = 'Mês Futuro';
            badge.className = 'dmb-badge future';
        }
    }

    try {
        const transacoes = await DataStore.getTransacoes();
        const monthTx = transacoes.filter(t => {
            if (!t.data) return false;
            const parts = t.data.split('-');
            return parseInt(parts[0], 10) === y && parseInt(parts[1], 10) === m;
        });

        // Revenues
        const entradasValidas = monthTx.filter(t => t.tipo === 'entrada' && t.status !== 'cancelado');
        const recTattoos = entradasValidas
            .filter(t => t.categoria !== 'sinal' && !String(t.descricao || '').toLowerCase().includes('sinal'))
            .reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
        const recSinais = entradasValidas
            .filter(t => t.categoria === 'sinal' || String(t.descricao || '').toLowerCase().includes('sinal'))
            .reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
        const recTotal = recTattoos + recSinais;

        // Variable costs
        const saidas = monthTx.filter(t => t.tipo === 'saida');
        const custoMateriais = saidas
            .filter(t => t.categoria === 'materiais')
            .reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
        const custoEpi = saidas
            .filter(t => t.categoria === 'epi')
            .reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
        const custoVariavelTotal = custoMateriais + custoEpi;
        const margemBruta = recTotal - custoVariavelTotal;

        // Fixed expenses
        const despAluguel = saidas.filter(t => t.categoria === 'aluguel').reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
        const despEnergia = saidas.filter(t => t.categoria === 'energia').reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
        const despInternet = saidas.filter(t => t.categoria === 'internet').reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
        const despManut = saidas.filter(t => t.categoria === 'manutencao').reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
        const despOutros = saidas.filter(t => !['materiais', 'epi', 'aluguel', 'energia', 'internet', 'manutencao'].includes(t.categoria)).reduce((acc, t) => acc + (parseFloat(t.valor) || 0), 0);
        const despFixaTotal = despAluguel + despEnergia + despInternet + despManut + despOutros;
        const despesasTotal = custoVariavelTotal + despFixaTotal;
        const lucroLiquido = recTotal - despesasTotal;
        const percLucro = recTotal > 0 ? ((lucroLiquido / recTotal) * 100).toFixed(1) : '0.0';

        // Update KPI boxes
        const elRec = document.getElementById('dreValReceita');
        const elDesp = document.getElementById('dreValDespesas');
        const elLuc = document.getElementById('dreValLucro');
        const elMargem = document.getElementById('dreValMargem');
        if (elRec) elRec.textContent = formatCurrency(recTotal);
        if (elDesp) elDesp.textContent = formatCurrency(despesasTotal);
        if (elLuc) elLuc.textContent = formatCurrency(lucroLiquido);
        if (elMargem) elMargem.textContent = `${percLucro}%`;

        // Render DRE Table
        const tbody = document.getElementById('drePreviewTbody');
        if (!tbody) return;

        const dreLines = [
            { text: '(+) RECEITA BRUTA OPERACIONAL', val: recTotal, bold: true, color: 'var(--green)' },
            { text: '   • Tatuagens e Sessões Concluídas', val: recTattoos, indent: true },
            { text: '   • Sinais de Agendamentos Recebidos', val: recSinais, indent: true },
            { text: '(-) CUSTOS OPERACIONAIS VARIÁVEIS', val: custoVariavelTotal, bold: true, color: 'var(--red)', negative: true },
            { text: '   • Tintas, Agulhas e Materiais de Bancada', val: custoMateriais, indent: true, negative: true },
            { text: '   • EPIs e Descartáveis (Luvas, Máscaras)', val: custoEpi, indent: true, negative: true },
            { text: '(=) MARGEM BRUTA DE CONTRIBUIÇÃO', val: margemBruta, bold: true, color: 'var(--accent)' },
            { text: '(-) DESPESAS OPERACIONAIS FIXAS', val: despFixaTotal, bold: true, color: 'var(--red)', negative: true },
            { text: '   • Aluguel do Estúdio', val: despAluguel, indent: true, negative: true },
            { text: '   • Energia Elétrica', val: despEnergia, indent: true, negative: true },
            { text: '   • Internet e Telefonia', val: despInternet, indent: true, negative: true },
            { text: '   • Manutenção de Máquinas e Equipamentos', val: despManut, indent: true, negative: true },
            { text: '   • Outras Despesas Operacionais', val: despOutros, indent: true, negative: true },
            { text: '(=) RESULTADO OPERACIONAL LÍQUIDO (LUCRO)', val: lucroLiquido, bold: true, color: lucroLiquido >= 0 ? 'var(--accent)' : 'var(--red)', highlight: true }
        ];

        tbody.innerHTML = dreLines.map(line => {
            const perc = recTotal > 0 ? ((Math.abs(line.val) / recTotal) * 100).toFixed(1) + '%' : '-';
            const valStr = (line.negative && line.val > 0 ? '- ' : '') + formatCurrency(line.val);
            const rowStyle = line.highlight ? 'background:rgba(245,197,24,0.12); font-weight:800; font-size:0.9rem;' : (line.bold ? 'font-weight:700;' : 'color:var(--text-secondary);');
            return `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.04); ${rowStyle}">
                    <td style="padding:6px 8px; ${line.color ? 'color:' + line.color : ''}">${line.text}</td>
                    <td style="padding:6px 8px; text-align:right; ${line.color ? 'color:' + line.color : ''}">${valStr}</td>
                    <td style="padding:6px 8px; text-align:center; color:var(--text-tertiary);">${perc}</td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        console.error('Error rendering DRE preview:', err);
    }
}

function setupFechamentoModal() {
    const modal = document.getElementById('modalFechamentoOverlay');
    const closeBtn = document.getElementById('modalFechamentoClose');
    const cancelBtn = document.getElementById('btnCancelFechamento');
    const monthInput = document.getElementById('fechamentoMonthInput');

    const btnOpenDash = document.getElementById('btnOpenFechamentoDash');
    const btnOpenFin = document.getElementById('btnOpenFechamentoFin');

    const btnPDF = document.getElementById('btnExportPDF_DRE');
    const btnCSV = document.getElementById('btnExportCSV_DRE');

    const openModalDRE = (ym) => {
        const targetYM = ym || currentDashYearMonth || getTodayStr().slice(0, 7);
        if (monthInput) monthInput.value = targetYM;
        renderDREModalContent(targetYM);
        openModal(modal);
    };

    btnOpenDash?.addEventListener('click', () => openModalDRE(currentDashYearMonth));
    btnOpenFin?.addEventListener('click', () => openModalDRE(currentDashYearMonth));

    closeBtn?.addEventListener('click', () => closeModal(modal));
    cancelBtn?.addEventListener('click', () => closeModal(modal));
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
    });

    monthInput?.addEventListener('change', (e) => {
        if (e.target.value) {
            renderDREModalContent(e.target.value);
        }
    });

    btnPDF?.addEventListener('click', async () => {
        const ym = monthInput?.value || currentDashYearMonth;
        if (window.PDFExport && typeof PDFExport.generateMonthlyDRE === 'function') {
            await PDFExport.generateMonthlyDRE(ym);
        }
    });

    btnCSV?.addEventListener('click', async () => {
        const ym = monthInput?.value || currentDashYearMonth;
        if (window.PDFExport && typeof PDFExport.exportMonthlyDRE_CSV === 'function') {
            await PDFExport.exportMonthlyDRE_CSV(ym);
        }
    });
}

let currentChartPeriod = '6m';

async function renderChart(period = currentChartPeriod) {
    currentChartPeriod = period;
    try {
        const transacoes = await DataStore.getTransacoes();
        const numMonths = period === '12m' ? 12 : 6;

        // Aggregate by month (last 6 or 12 months)
        const months = [];
        const now = new Date();
        for (let i = numMonths - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ label: getMonthName(d.getMonth()), year: d.getFullYear(), month: d.getMonth() });
        }

        const faturamento = months.map(m => {
            return transacoes.filter(t => {
                const td = new Date(t.data + 'T00:00:00');
                return t.tipo === 'entrada' && td.getMonth() === m.month && td.getFullYear() === m.year;
            }).reduce((acc, t) => acc + t.valor, 0);
        });

        const despesas = months.map(m => {
            return transacoes.filter(t => {
                const td = new Date(t.data + 'T00:00:00');
                return t.tipo === 'saida' && td.getMonth() === m.month && td.getFullYear() === m.year;
            }).reduce((acc, t) => acc + t.valor, 0);
        });

        const lucro = faturamento.map((f, i) => f - despesas[i]);

        const canvas = document.getElementById('chartFinanceiro');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (chartInstance) chartInstance.destroy();

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months.map(m => m.label),
                datasets: [
                    { label: 'Faturamento', data: faturamento, backgroundColor: 'rgba(245, 197, 24, 0.75)', borderColor: '#F5C518', borderWidth: 1, borderRadius: 6, borderSkipped: false },
                    { label: 'Despesas', data: despesas, backgroundColor: 'rgba(248, 113, 113, 0.6)', borderColor: '#F87171', borderWidth: 1, borderRadius: 6, borderSkipped: false },
                    { label: 'Lucro', data: lucro, backgroundColor: 'rgba(52, 211, 153, 0.6)', borderColor: '#34D399', borderWidth: 1, borderRadius: 6, borderSkipped: false }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', align: 'end', labels: { color: '#9A9AA0', usePointStyle: true, pointStyle: 'circle', padding: 16, font: { family: 'Inter', size: 12 } } },
                    tooltip: { backgroundColor: '#1E1E24', titleColor: '#F0F0F0', bodyColor: '#9A9AA0', borderColor: '#2A2A30', borderWidth: 1, padding: 12, cornerRadius: 8, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}` } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#6B6B72', font: { family: 'Inter', size: 12 } }, border: { display: false } },
                    y: { grid: { color: 'rgba(42, 42, 48, 0.5)' }, ticks: { color: '#6B6B72', font: { family: 'Inter', size: 11 }, callback: (val) => formatCurrency(val) }, border: { display: false } }
                }
            }
        });
    } catch (e) { console.error('Error rendering chart:', e); }
}

async function renderAppointments() {
    const list = document.getElementById('appointmentsList');
    try {
        const agendamentos = await DataStore.getAgendamentos({ dateFrom: TODAY });
        const upcoming = agendamentos.filter(a => a.status !== 'cancelado').slice(0, 5);

        if (upcoming.length === 0) {
            list.innerHTML = emptyState('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', 'Nenhum agendamento', 'Crie um agendamento na aba Agenda.');
            return;
        }

        list.innerHTML = upcoming.map(a => `
            <div class="appointment-item">
                <div class="appt-time">
                    <span class="time">${a.horaInicio}</span>
                    <span class="period">${getDayOfWeek(a.data)} ${new Date(a.data + 'T00:00:00').getDate()}</span>
                </div>
                <div class="appt-info">
                    <div class="appt-name">
                        ${a.cliente}
                        ${(a.referenciaUrl || a.referencia) ? `<button class="ag-ref-thumb" onclick="openLightbox('${a.referenciaUrl || a.referencia}', 'Referência: ${a.descricao.replace(/'/g, "\\'")}', 'Cliente: ${a.cliente.replace(/'/g, "\\'")}', 'Imagem de referência para a sessão')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Ref</button>` : ''}
                    </div>
                    <div class="appt-desc">${a.descricao}</div>
                </div>
                <span class="appt-status status-${a.status}">${a.status}</span>
                <div style="display:flex;align-items:center;gap:4px;">
                    <button class="btn-action" title="Enviar Lembrete Pré-Sessão & Cuidados (WhatsApp)" onclick="WhatsAppService.sendLembretePreSessao('${a.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                    </button>
                    ${actionBtns('agendamento', a.id)}
                </div>
            </div>
        `).join('');
    } catch (e) { console.error('Error rendering appointments:', e); list.innerHTML = ''; }
}

async function renderRecentTransactions() {
    const tbody = document.getElementById('recentTransactionsBody');
    try {
        const transacoes = await DataStore.getTransacoes();
        const recent = transacoes.slice(0, 6);

        if (recent.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary);padding:32px;">Nenhuma transação registrada</td></tr>';
            return;
        }

        tbody.innerHTML = recent.map(t => `
            <tr>
                <td style="color: var(--text-primary); font-weight: 500;">${t.descricao}</td>
                <td><span class="${t.tipo === 'entrada' ? 'tx-entrada' : 'tx-saida'}">${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                <td class="${t.tipo === 'entrada' ? 'tx-entrada' : 'tx-saida'}">${t.tipo === 'saida' ? '- ' : '+ '}${formatCurrency(t.valor)}</td>
                <td><span class="tx-method">${metodosLabel[t.metodo] || t.metodo}</span></td>
                <td>${formatDate(t.data)}</td>
            </tr>
        `).join('');
    } catch (e) { console.error('Error rendering recent transactions:', e); }
}

let currentWeekOffset = 0;

function getWeekMonday(offsetWeeks = 0) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const day = now.getDay();
    // No Brasil a semana de agendamentos no estúdio inicia na Segunda-feira (1) até Domingo (0)
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday + (offsetWeeks * 7));
    return monday;
}

function formatWeekRangeLabel(mondayDate) {
    const sundayDate = new Date(mondayDate);
    sundayDate.setDate(sundayDate.getDate() + 6);

    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const diaInicio = String(mondayDate.getDate()).padStart(2, '0');
    const diaFim = String(sundayDate.getDate()).padStart(2, '0');
    const mesInicio = meses[mondayDate.getMonth()];
    const mesFim = meses[sundayDate.getMonth()];
    const ano = sundayDate.getFullYear();

    if (mesInicio === mesFim) {
        return `Semana de ${diaInicio} a ${diaFim} ${mesInicio}, ${ano}`;
    } else {
        return `Semana de ${diaInicio} ${mesInicio} a ${diaFim} ${mesFim}, ${ano}`;
    }
}

async function renderWeekView() {
    const grid = document.getElementById('weekGrid');
    const label = document.getElementById('agendaWeekLabel');
    if (!grid) return;

    try {
        const monday = getWeekMonday(currentWeekOffset);
        if (label) {
            label.textContent = formatWeekRangeLabel(monday);
        }

        const agendamentos = await DataStore.getAgendamentos();
        const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

        let html = '';
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(d.getDate() + i);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const isToday = dateStr === getTodayStr();
            const dayAppts = agendamentos.filter(a => a.data === dateStr);

            html += `
                <div class="week-day ${isToday ? 'today' : ''}">
                    <div class="week-day-header">
                        <div class="week-day-label">${daysOfWeek[d.getDay()]}</div>
                        <div class="week-day-number">${d.getDate()}${isToday ? ' <span style="font-size:0.6rem; background:var(--accent); color:#0A0A0B; padding:1px 5px; border-radius:4px; font-weight:800; vertical-align:middle; margin-left:2px;">HOJE</span>' : ''}</div>
                    </div>
                    <div class="day-appointments">
                        ${dayAppts.map(a => `
                            <div class="day-appt ${a.status === 'cancelado' ? 'status-cancelado-card' : a.status === 'concluido' ? 'status-concluido-card' : ''}" onclick="handleEdit('agendamento', '${a.id}')" title="Clique para editar agendamento">
                                <div class="da-top-bar">
                                    <div class="da-time">${a.horaInicio} - ${a.horaFim}</div>
                                    <div class="da-actions">
                                        <button type="button" class="btn-appt-wa" title="Enviar Lembrete Pré-Sessão (WhatsApp)" onclick="event.stopPropagation(); WhatsAppService.sendLembretePreSessao('${a.id}')">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                        </button>
                                        <button type="button" class="btn-appt-del" title="Excluir agendamento" onclick="event.stopPropagation(); handleDelete('agendamento', '${a.id}')">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                        </button>
                                    </div>
                                </div>
                                <div class="da-name">${a.cliente} ${(a.referenciaUrl || a.referencia) ? '📸' : ''}</div>
                                <div class="da-desc">${a.descricao}</div>
                                ${(a.valorTotal !== undefined || a.valor) ? `<div class="da-val">${formatCurrency(a.valorTotal !== undefined ? a.valorTotal : (a.valor || 0))}${a.valorSinal ? ` <span style="font-size:0.65rem;color:var(--text-tertiary);">(sinal: ${formatCurrency(a.valorSinal)})</span>` : ''}</div>` : ''}
                            </div>
                        `).join('')}
                        ${dayAppts.length === 0 ? '<div style="color:var(--text-tertiary);font-size:0.75rem;padding:8px;">Sem agendamentos</div>' : ''}
                    </div>
                </div>`;
        }
        grid.innerHTML = html;
    } catch (e) { console.error('Error rendering week view:', e); }
}

async function renderListView() {
    const list = document.getElementById('agendaList');
    try {
        const agendamentos = await DataStore.getAgendamentos();

        if (agendamentos.length === 0) {
            list.innerHTML = emptyState('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', 'Nenhum agendamento', 'Clique em "Novo Agendamento" para começar.');
            return;
        }

        list.innerHTML = agendamentos.map(a => {
            const d = new Date(a.data + 'T00:00:00');
            return `
                <div class="agenda-list-item">
                    <div class="al-date">
                        <div class="al-day">${d.getDate()}</div>
                        <div class="al-month">${getMonthName(d.getMonth())}</div>
                    </div>
                    <div class="al-content">
                        <h3>
                            ${a.cliente}
                            ${(a.referenciaUrl || a.referencia) ? `<button class="ag-ref-thumb" onclick="openLightbox('${a.referenciaUrl || a.referencia}', 'Referência: ${a.descricao.replace(/'/g, "\\'")}', 'Cliente: ${a.cliente.replace(/'/g, "\\'")}', 'Imagem de referência para a sessão')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Ver Ref</button>` : ''}
                        </h3>
                        <p>${a.descricao}</p>
                    </div>
                    <div class="al-time">${a.horaInicio} - ${a.horaFim}</div>
                    <span class="appt-status status-${a.status}">${a.status}</span>
                    <div class="al-valor">
                        ${formatCurrency(a.valorTotal !== undefined ? a.valorTotal : (a.valor || 0))}
                        ${a.valorSinal ? `<span style="display:block;font-size:0.75rem;color:var(--text-secondary);font-weight:normal;">Sinal: ${formatCurrency(a.valorSinal)} (${a.sinalPago === 'sim' ? 'Pago' : a.sinalPago === 'pendente' ? 'Pendente' : 'Sem sinal'})</span>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                        <button class="btn-action" title="Enviar Lembrete Pré-Sessão & Cuidados (WhatsApp)" onclick="WhatsAppService.sendLembretePreSessao('${a.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        </button>
                        ${actionBtns('agendamento', a.id)}
                    </div>
                </div>`;
        }).join('');
    } catch (e) { console.error('Error rendering list view:', e); }
}

async function renderAllTransactions() {
    const tbody = document.getElementById('allTransactionsBody');
    try {
        const filters = {};
        const metodo = document.getElementById('filterPayment').value;
        if (metodo !== 'todos') filters.metodo = metodo;
        const dateFrom = document.getElementById('filterDateFrom').value;
        const dateTo = document.getElementById('filterDateTo').value;
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;

        const transacoes = await DataStore.getTransacoes(filters);

        if (transacoes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-tertiary);padding:32px;">Nenhuma transação encontrada</td></tr>';
            return;
        }

        tbody.innerHTML = transacoes.map(t => `
            <tr>
                <td>${formatDate(t.data)}</td>
                <td style="color: var(--text-primary); font-weight: 500;">${t.descricao}</td>
                <td>${t.cliente || '-'}</td>
                <td><span class="${t.tipo === 'entrada' ? 'tx-entrada' : 'tx-saida'}">${t.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
                <td class="${t.tipo === 'entrada' ? 'tx-entrada' : 'tx-saida'}">${t.tipo === 'saida' ? '- ' : '+ '}${formatCurrency(t.valor)}</td>
                <td><span class="tx-method">${metodosLabel[t.metodo] || t.metodo}</span></td>
                <td style="display:flex;align-items:center;gap:8px;">
                    <span class="appt-status status-${t.status === 'recebido' || t.status === 'pago' ? 'concluido' : t.status === 'parcial' ? 'agendado' : 'cancelado'}">${statusLabel[t.status] || t.status}</span>
                    ${actionBtns('transacao', t.id)}
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error('Error rendering transactions:', e); }
}

async function renderSinais() {
    const grid = document.getElementById('sinaisGrid');
    try {
        const sinais = await DataStore.getSinais();

        if (sinais.length === 0) {
            grid.innerHTML = emptyState('<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>', 'Nenhum sinal registrado', 'Registre sinais e adiantamentos dos clientes.');
            return;
        }

        grid.innerHTML = sinais.map(s => {
            const restante = s.valorTotal - s.valorSinal;
            const percent = s.valorTotal > 0 ? (s.valorSinal / s.valorTotal * 100).toFixed(0) : 0;
            return `
                <div class="sinal-card">
                    <div class="sinal-header">
                        <h3>${s.cliente}</h3>
                        <div style="display:flex;align-items:center;gap:6px;">
                            <span>${formatDate(s.dataSinal)}</span>
                            <button class="btn-action" title="Lembrar Sinal via WhatsApp" onclick="WhatsAppService.quickSend('sinal_pendente', { cliente: '${(s.cliente || '').replace(/'/g, "\\'")}', clienteId: '${s.clienteId || ''}', servico: '${(s.descricao || '').replace(/'/g, "\\'")}', valorSinal: '${formatCurrency(s.valorSinal || 0)}', data: '${formatDate(s.dataSessao || s.dataSinal)}' })">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                            </button>
                            ${actionBtns('sinal', s.id)}
                        </div>
                    </div>
                    <p style="font-size:0.82rem;color:var(--text-tertiary);margin-bottom:16px;">${s.descricao}</p>
                    <div class="sinal-values">
                        <div class="sinal-val"><label>Valor Total</label><span class="val-yellow">${formatCurrency(s.valorTotal)}</span></div>
                        <div class="sinal-val"><label>Sinal Pago</label><span class="val-green">${formatCurrency(s.valorSinal)}</span></div>
                        <div class="sinal-val"><label>Restante</label><span class="val-red">${formatCurrency(restante)}</span></div>
                    </div>
                    <div class="sinal-progress"><div class="sinal-progress-bar" style="width:${percent}%"></div></div>
                    <div style="font-size:0.72rem;color:var(--text-tertiary);margin-top:8px;text-align:right;">Sessão: ${s.dataSessao ? formatDate(s.dataSessao) : '—'} · ${percent}% pago</div>
                </div>`;
        }).join('');
    } catch (e) { console.error('Error rendering sinais:', e); }
}

async function renderDespesas() {
    try {
        const filters = { tipo: 'saida' };
        const metodo = document.getElementById('filterPayment')?.value;
        if (metodo && metodo !== 'todos') filters.metodo = metodo;
        const dateFrom = document.getElementById('filterDateFrom')?.value;
        const dateTo = document.getElementById('filterDateTo')?.value;
        if (dateFrom) filters.dateFrom = dateFrom;
        if (dateTo) filters.dateTo = dateTo;

        const transacoes = await DataStore.getTransacoes(filters);
        const categorias = {};
        transacoes.forEach(d => { const cat = d.categoria || 'outros'; categorias[cat] = (categorias[cat] || 0) + d.valor; });

        const summary = document.getElementById('despesasSummary');
        summary.innerHTML = Object.entries(categorias).map(([cat, val]) => `
            <div class="desp-cat-card">
                <div class="desp-cat-icon">${catIcons[cat] || '📦'}</div>
                <div class="desp-cat-label">${catLabels[cat] || cat}</div>
                <div class="desp-cat-value">${formatCurrency(val)}</div>
            </div>
        `).join('');

        const tbody = document.getElementById('despesasBody');
        if (transacoes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary);padding:32px;">Nenhuma despesa encontrada</td></tr>';
            return;
        }

        tbody.innerHTML = transacoes.map(d => `
            <tr>
                <td>${formatDate(d.data)}</td>
                <td style="color:var(--text-primary);font-weight:500;">${d.descricao}</td>
                <td><span class="tx-method">${catLabels[d.categoria] || d.categoria || 'Outros'}</span></td>
                <td class="tx-saida">- ${formatCurrency(d.valor)}</td>
                <td style="display:flex;align-items:center;gap:8px;">
                    <span class="tx-method">${metodosLabel[d.metodo] || d.metodo}</span>
                    ${actionBtns('transacao', d.id)}
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error('Error rendering despesas:', e); }
}

async function renderValoresReceber() {
    const list = document.getElementById('receberList');
    try {
        const valoresReceber = await DataStore.getValoresReceber();
        const today = new Date(TODAY);

        if (valoresReceber.length === 0) {
            list.innerHTML = emptyState('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>', 'Nenhum valor pendente', 'Todos os pagamentos estão em dia! 🎉');
            return;
        }

        list.innerHTML = valoresReceber.map(v => {
            const restante = v.valorTotal - v.valorPago;
            const isSettled = restante <= 0;
            const vencimento = new Date(v.dataVencimento + 'T00:00:00');
            const isOverdue = !isSettled && vencimento < today;
            const diffDays = Math.ceil(Math.abs(today - vencimento) / 86400000);
            const daysStr = isSettled ? '✅ 100% Quitado' : (isOverdue ? `Vencido há ${diffDays} dias` : `Vence em ${diffDays} dias`);

            return `
                <div class="receber-item ${isSettled ? 'settled' : isOverdue ? 'overdue' : ''}">
                    <div class="receber-avatar" style="${isSettled ? 'background:rgba(52,211,153,0.15);color:#34D399;' : ''}">${getInitials(v.cliente)}</div>
                    <div class="receber-info">
                        <h3>${v.cliente} ${isSettled ? '<span class="receber-alert" style="background:rgba(52,211,153,0.15);color:#34D399;">✅ Quitado</span>' : isOverdue ? '<span class="receber-alert pulse">⚠ Atrasado</span>' : ''}</h3>
                        <p>${v.descricao} ${v.dataSessao ? `· Sessão em ${formatDate(v.dataSessao)}` : ''}</p>
                        <div class="receber-date-control">
                            <label style="font-size:0.75rem; color:var(--text-tertiary); display:flex; align-items:center; gap:4px;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px;"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                Data de quando será pago:
                            </label>
                            <input type="date" value="${v.dataVencimento || ''}" onchange="window.updateReceberDataPagamento('${v.id}', this.value)" title="Alterar data de quando o valor será pago">
                        </div>
                    </div>
                    <div class="receber-valor">
                        <div class="rv-amount" style="${isSettled ? 'color:#34D399;' : ''}">${formatCurrency(Math.max(restante, 0))}</div>
                        <div class="rv-due ${isSettled ? '' : isOverdue ? 'rv-overdue' : ''}">${daysStr}</div>
                        ${v.valorPago > 0 ? `<span style="font-size:0.72rem;color:var(--text-tertiary);display:block;margin-top:2px;">(Pago: ${formatCurrency(v.valorPago)} de ${formatCurrency(v.valorTotal)})</span>` : ''}
                    </div>
                    <div style="display:flex;align-items:center;gap:4px;">
                        ${!isSettled ? `
                            <button class="btn-action" title="Cobrança Amigável via WhatsApp" onclick="WhatsAppService.quickSend('valor_receber', { cliente: '${(v.cliente || '').replace(/'/g, "\\'")}', clienteId: '${v.clienteId || ''}', servico: '${(v.descricao || '').replace(/'/g, "\\'")}', valorRestante: '${formatCurrency(Math.max(restante, 0))}', dataVencimento: '${formatDate(v.dataVencimento)}' })">
                                <svg viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                            </button>
                        ` : ''}
                        ${actionBtns('valorReceber', v.id)}
                    </div>
                </div>`;
        }).join('');
    } catch (e) { console.error('Error rendering valores a receber:', e); }
}

window.updateReceberDataPagamento = async function(id, newDate) {
    if (!newDate) return;
    try {
        await DataStore.updateValorReceber(id, { dataVencimento: newDate });
        showToast(`Data prevista de pagamento atualizada para ${formatDate(newDate)}!`, 'success');
        refreshAll();
    } catch (e) {
        console.error('Error updating receber date:', e);
        showToast('Erro ao atualizar data', 'error');
    }
};

async function renderClientes() {
    const grid = document.getElementById('clientesGrid');
    try {
        await DataStore.syncAllClientStats();
        const clientes = await DataStore.getClientes();

        if (clientes.length === 0) {
            grid.innerHTML = emptyState('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>', 'Nenhum cliente cadastrado', 'Adicione seus primeiros clientes.');
            return;
        }

        grid.innerHTML = clientes.map(c => {
            const hasAnamnese = !!(c.anamnese && c.anamnese.assinado);
            return `
            <div class="cliente-card" data-id="${c.id}">
                <div class="cliente-header">
                    <div class="cliente-avatar-group">
                        <div class="cliente-avatar">${getInitials(c.nome)}</div>
                        <div style="min-width:0;">
                            <div class="cliente-name" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                                <span style="font-weight:700;">${c.nome}</span>
                                ${hasAnamnese 
                                    ? `<span class="badge-anamnese signed" onclick="openAnamneseModal('${c.id}')" title="Termo de Consentimento assinado em ${formatDate(c.anamnese.dataAssinatura)} — Clique para visualizar ou exportar">✓ Termo Assinado</span>` 
                                    : `<span class="badge-anamnese pending" onclick="openAnamneseModal('${c.id}')" title="Clique para coletar anamnese e assinatura digital">⚠️ Sem Termo</span>`}
                            </div>
                            <div class="cliente-phone">${c.telefone || '—'}</div>
                        </div>
                    </div>
                    <div class="row-actions">
                        <button class="btn-action" title="Termo de Consentimento & Anamnese" onclick="openAnamneseModal('${c.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M9 14l2 2 4-4"/></svg>
                        </button>
                        <button class="btn-action" title="Enviar WhatsApp / Cuidados" onclick="WhatsAppService.quickSend('cuidados_pos', { cliente: '${(c.nome || '').replace(/'/g, "\\'")}', telefone: '${c.telefone || ''}' })">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#25D366" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        </button>
                        <button class="btn-action btn-action-pdf" title="Exportar Ficha do Cliente em PDF" onclick="PDFExport.generateClientReport('${c.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M12 18v-6"/><path d="m9 15 3 3 3-3"/></svg>
                        </button>
                        ${editBtn('cliente', c.id)}
                        ${deleteBtn('cliente', c.id)}
                    </div>
                </div>
                <div class="cliente-stats">
                    <div class="cs-item"><span class="cs-label">Sessões</span><span class="cs-value">${c.sessoes || 0}</span></div>
                    <div class="cs-item"><span class="cs-label">Total Gasto</span><span class="cs-value" style="color:var(--accent);">${formatCurrency(c.totalGasto || 0)}</span></div>
                    <div class="cs-item"><span class="cs-label">Email</span><span class="cs-value" style="font-size:0.78rem;font-weight:400;color:var(--text-tertiary);">${c.email || '—'}</span></div>
                    <div class="cs-item"><span class="cs-label">Telefone</span><span class="cs-value" style="font-size:0.82rem;font-weight:500;">${c.telefone || '—'}</span></div>
                </div>
            </div>`;
        }).join('');
    } catch (e) { console.error('Error rendering clientes:', e); }
}


// =========================================================
// CRUD HANDLERS
// =========================================================

// ── Edit Handler ──
window.handleEdit = async function(type, id) {
    try {
        if (type === 'transacao') {
            const t = await DataStore._getDB().getById('transacoes', id);
            if (!t) return;
            document.getElementById('txTipo').value = t.tipo;
            handleTipoChange();
            document.getElementById('txValor').value = t.valor;
            document.getElementById('txDescricao').value = t.descricao;
            document.getElementById('txCliente').value = t.cliente || '';
            document.getElementById('txMetodo').value = t.metodo;
            document.getElementById('txData').value = t.data;
            if (t.tipo === 'saida') document.getElementById('txCategoria').value = t.categoria || 'outros';
            editingId = id;
            editingType = 'transacao';
            document.getElementById('modalTitle').textContent = 'Editar Transação';
            openModal(document.getElementById('modalOverlay'));
        } else if (type === 'agendamento') {
            const a = await DataStore._getDB().getById('agendamentos', id);
            if (!a) return;
            await populateAgClients(a.clienteId || null);

            const agSelect = document.getElementById('agClienteSelect');
            if (agSelect && !agSelect.value && a.cliente) {
                for (let i = 0; i < agSelect.options.length; i++) {
                    if (agSelect.options[i].getAttribute('data-nome') === a.cliente) {
                        agSelect.selectedIndex = i;
                        handleAgClienteSelectChange();
                        break;
                    }
                }
            }

            document.getElementById('agCliente').value = a.cliente || '';
            document.getElementById('agClienteId').value = a.clienteId || '';
            document.getElementById('agDescricao').value = a.descricao || '';
            document.getElementById('agData').value = a.data || TODAY;
            document.getElementById('agInicio').value = a.horaInicio || '14:00';
            document.getElementById('agFim').value = a.horaFim || '17:00';
            document.getElementById('agValorTotal').value = a.valorTotal !== undefined ? a.valorTotal : (a.valor || '');
            document.getElementById('agValorSinal').value = a.valorSinal !== undefined ? a.valorSinal : '';
            document.getElementById('agSinalPago').value = a.sinalPago || 'sim';
            document.getElementById('agStatus').value = a.status || 'agendado';
            calcAgRestante();

            if (a.referenciaUrl || a.referencia) {
                const ref = a.referenciaUrl || a.referencia;
                document.getElementById('agReferenciaUrl').value = ref;
                document.getElementById('agPreviewImg').src = ref;
                document.getElementById('agDropzonePreview').style.display = 'flex';
                document.getElementById('agDropzonePrompt').style.display = 'none';
            } else {
                resetAgDropzone();
            }
            editingId = id;
            editingType = 'agendamento';
            const modalTitle = document.getElementById('modalAgendaTitle');
            if (modalTitle) modalTitle.textContent = 'Editar Agendamento';
            const btnDeleteModalAg = document.getElementById('btnDeleteModalAg');
            if (btnDeleteModalAg) {
                btnDeleteModalAg.style.display = 'inline-flex';
                btnDeleteModalAg.onclick = async () => {
                    closeModal(document.getElementById('modalAgendaOverlay'));
                    await handleDelete('agendamento', id);
                };
            }
            const btnAgSendWhatsApp = document.getElementById('btnAgSendWhatsApp');
            if (btnAgSendWhatsApp) {
                btnAgSendWhatsApp.style.display = 'inline-flex';
                btnAgSendWhatsApp.onclick = () => {
                    closeModal(document.getElementById('modalAgendaOverlay'));
                    WhatsAppService.sendLembretePreSessao(id);
                };
            }
            openModal(document.getElementById('modalAgendaOverlay'));
        } else if (type === 'cliente') {
            const c = await DataStore._getDB().getById('clientes', id);
            if (!c) return;
            openClienteModal(c);
        } else if (type === 'sinal') {
            const s = await DataStore._getDB().getById('sinais', id);
            if (!s) return;
            document.getElementById('txTipo').value = 'sinal';
            handleTipoChange();
            document.getElementById('txValor').value = s.valorSinal;
            document.getElementById('txDescricao').value = s.descricao;
            document.getElementById('txCliente').value = s.cliente;
            document.getElementById('txValorTotal').value = s.valorTotal;
            document.getElementById('txMetodo').value = s.metodo;
            document.getElementById('txData').value = s.dataSinal;
            calcRestante();
            editingId = id;
            editingType = 'sinal';
            document.getElementById('modalTitle').textContent = 'Editar Sinal';
            openModal(document.getElementById('modalOverlay'));
        } else if (type === 'valorReceber') {
            const v = await DataStore._getDB().getById('valoresReceber', id);
            if (!v) return;
            openReceberModal(v);
        }
    } catch (e) { console.error('Edit error:', e); showToast('Erro ao editar', 'error'); }
};

// ── Delete Handler ──
window.handleDelete = async function(type, id) {
    const typeLabels = { transacao: 'transação', agendamento: 'agendamento', cliente: 'cliente', sinal: 'sinal', valorReceber: 'valor a receber', galeria: 'obra do portfólio' };
    const confirmed = await showConfirm('Confirmar exclusão', `Tem certeza que deseja excluir este(a) ${typeLabels[type]}? Esta ação não pode ser desfeita.`);
    if (!confirmed) return;

    try {
        const collectionMap = { transacao: 'transacoes', agendamento: 'agendamentos', cliente: 'clientes', sinal: 'sinais', valorReceber: 'valoresReceber', galeria: 'galeria' };
        
        let item = null;
        try {
            item = await DataStore._getDB().getById(collectionMap[type], id);
        } catch (fetchErr) {
            console.warn('Could not fetch item before delete:', fetchErr);
        }

        // Linked/cascading cleanup:
        if (type === 'transacao' && item) {
            // If linked to a sinal
            const allSinais = await DataStore.getSinais().catch(() => []);
            const linkedSinal = allSinais.find(s => 
                (item.sinalId && s.id === item.sinalId) || 
                (s.transacaoId && s.transacaoId === id) ||
                (item.categoria === 'sinal' && 
                 (s.clienteId === item.clienteId || s.cliente === item.cliente) && 
                 Math.abs(s.valorSinal - item.valor) < 0.01)
            );
            if (linkedSinal) {
                await DataStore._getDB().delete('sinais', linkedSinal.id).catch(() => {});
                // Clean up linked valoresReceber
                const allReceber = await DataStore.getValoresReceber().catch(() => []);
                const linkedReceber = allReceber.filter(vr => vr.sinalId === linkedSinal.id || vr.transacaoId === id);
                for (const vr of linkedReceber) {
                    await DataStore._getDB().delete('valoresReceber', vr.id).catch(() => {});
                }
            }
        } else if (type === 'sinal' && item) {
            // If deleting a sinal, find linked transaction
            const allTxs = await DataStore.getTransacoes().catch(() => []);
            const linkedTx = allTxs.find(t => 
                (item.transacaoId && t.id === item.transacaoId) || 
                (t.sinalId && t.sinalId === id) ||
                (t.categoria === 'sinal' && 
                 (t.clienteId === item.clienteId || t.cliente === item.cliente) && 
                 Math.abs(t.valor - item.valorSinal) < 0.01)
            );
            if (linkedTx) {
                await DataStore._getDB().delete('transacoes', linkedTx.id).catch(() => {});
            }
            // Clean up linked valoresReceber
            const allReceber = await DataStore.getValoresReceber().catch(() => []);
            const linkedReceber = allReceber.filter(vr => vr.sinalId === id || (linkedTx && vr.transacaoId === linkedTx.id));
            for (const vr of linkedReceber) {
                await DataStore._getDB().delete('valoresReceber', vr.id).catch(() => {});
            }
        }

        if (type === 'agendamento') {
            await DataStore.deleteAgendamento(id);
        } else {
            await DataStore._getDB().delete(collectionMap[type], id);
        }

        // Recalculate stats for all clients from actual DB records
        await DataStore.syncAllClientStats();

        showToast(`${typeLabels[type].charAt(0).toUpperCase() + typeLabels[type].slice(1)} excluído(a) com sucesso!`, 'success');
        await refreshAll();
    } catch (e) { console.error('Delete error:', e); showToast('Erro ao excluir', 'error'); }
};

// ── Editing state ──
let editingId = null;
let editingType = null;

const resetEditing = () => {
    editingId = null;
    editingType = null;
    const debtBox = document.getElementById('txOpenDebtBox');
    if (debtBox) debtBox.style.display = 'none';
};

// ── Client Modal (reuse existing structure with simple approach) ──
function openClienteModal(cliente = null) {
    // Create a temporary client form modal
    const existingModal = document.getElementById('modalClienteOverlay');
    if (existingModal) existingModal.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.id = 'modalClienteOverlay';
    overlay.innerHTML = `
        <div class="modal glass-card">
            <div class="modal-header">
                <h2>${cliente ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                <button class="btn-icon modal-close" onclick="this.closest('.modal-overlay').remove();">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <form id="formCliente" class="modal-form">
                <div class="form-group">
                    <label for="clNome">Nome</label>
                    <input type="text" id="clNome" class="input-field" placeholder="Nome completo" value="${cliente?.nome || ''}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="clTelefone">Telefone</label>
                        <input type="text" id="clTelefone" class="input-field" placeholder="(11) 99999-9999" value="${cliente?.telefone || ''}">
                    </div>
                    <div class="form-group">
                        <label for="clEmail">Email</label>
                        <input type="email" id="clEmail" class="input-field" placeholder="email@exemplo.com" value="${cliente?.email || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="clNotas">Notas</label>
                    <textarea id="clNotas" class="input-field" rows="3" placeholder="Observações sobre o cliente...">${cliente?.notas || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove();">Cancelar</button>
                    <button type="submit" class="btn-primary">Salvar Cliente</button>
                </div>
            </form>
        </div>`;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); document.body.style.overflow = ''; } });

    overlay.querySelector('#formCliente').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            nome: document.getElementById('clNome').value,
            telefone: document.getElementById('clTelefone').value,
            email: document.getElementById('clEmail').value,
            notas: document.getElementById('clNotas').value,
        };

        try {
            if (cliente) {
                await DataStore.updateCliente(cliente.id, data);
                showToast('Cliente atualizado!', 'success');
            } else {
                await DataStore.addCliente(data);
                showToast('Cliente adicionado!', 'success');
            }
            overlay.remove();
            document.body.style.overflow = '';
            renderClientes();
        } catch (err) { showToast('Erro ao salvar cliente', 'error'); }
    });
}

// =========================================================
// TERMO DE CONSENTIMENTO & FICHA DE ANAMNESE DIGITAL
// =========================================================

const ANAMNESE_QUESTIONS = [
    { key: 'maiorIdade', label: '1. É maior de 18 anos de idade?', defaultSim: true },
    { key: 'alergias', label: '2. Possui alergia a tintas, pigmentos, látex, álcool ou pomadas?' },
    { key: 'queloides', label: '3. Histórico de queloides ou cicatrização hipertrófica?' },
    { key: 'diabetesHipertensao', label: '4. É portador(a) de diabetes ou hipertensão arterial?' },
    { key: 'coagulacao', label: '5. Problemas de coagulação, hemofilia ou usa anticoagulantes?' },
    { key: 'doencasTransmissiveis', label: '6. Possui doença transmissível pelo sangue (Hepatite, HIV)?' },
    { key: 'gestanteLactante', label: '7. Encontra-se gestante ou em período de amamentação?' },
    { key: 'epilepsia', label: '8. Histórico de epilepsia, convulsões ou desmaios frequentes?' },
    { key: 'medicamentosRoacutan', label: '9. Usa medicação contínua ou usou Roacutan nos últimos 6 meses?' },
    { key: 'problemasPele', label: '10. Psoríase, dermatite, manchas ou lesões no local a tatuar?' },
    { key: 'alcoolDrogas24h', label: '11. Consumiu bebidas alcoólicas ou substâncias nas últimas 24 horas?' }
];

let signaturePadInstance = null;

class SignaturePad {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isDrawing = false;
        this.hasSignature = false;
        this.lastX = 0;
        this.lastY = 0;
        this.init();
    }

    init() {
        this.ctx.strokeStyle = '#0F172A';
        this.ctx.lineWidth = 2.5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.bindEvents();
        this.clear();
    }

    bindEvents() {
        const getPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            if (e.touches && e.touches.length > 0) {
                return {
                    x: (e.touches[0].clientX - rect.left) * scaleX,
                    y: (e.touches[0].clientY - rect.top) * scaleY
                };
            }
            return {
                x: (e.clientX - rect.left) * scaleX,
                y: (e.clientY - rect.top) * scaleY
            };
        };

        const start = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            this.isDrawing = true;
            const pos = getPos(e);
            this.lastX = pos.x;
            this.lastY = pos.y;
        };

        const draw = (e) => {
            if (!this.isDrawing) return;
            if (e.type === 'touchmove') e.preventDefault();
            const pos = getPos(e);
            this.ctx.beginPath();
            this.ctx.moveTo(this.lastX, this.lastY);
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
            this.lastX = pos.x;
            this.lastY = pos.y;
            this.hasSignature = true;
            this.updateStatus(true);
        };

        const stop = () => {
            this.isDrawing = false;
        };

        this.canvas.addEventListener('mousedown', start);
        this.canvas.addEventListener('mousemove', draw);
        window.addEventListener('mouseup', stop);

        this.canvas.addEventListener('touchstart', start, { passive: false });
        this.canvas.addEventListener('touchmove', draw, { passive: false });
        this.canvas.addEventListener('touchend', stop);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.hasSignature = false;
        this.updateStatus(false);
    }

    loadDataURL(dataURL) {
        if (!dataURL) {
            this.clear();
            return;
        }
        const img = new Image();
        img.onload = () => {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
            this.hasSignature = true;
            this.updateStatus(true);
        };
        img.src = dataURL;
    }

    toDataURL() {
        return this.hasSignature ? this.canvas.toDataURL('image/png') : '';
    }

    updateStatus(signed) {
        const msg = document.getElementById('sigStateMsg');
        if (msg) {
            if (signed) {
                msg.innerHTML = '<span style="color:#10B981; font-weight:600;">✓ Assinatura digital registrada</span>';
            } else {
                msg.textContent = 'Aguardando assinatura do cliente...';
            }
        }
    }
}

window.toggleAnamQuestion = function(btn, isYes) {
    const group = btn.closest('.anam-toggle-group');
    const row = btn.closest('.anam-q-row');
    const btns = group.querySelectorAll('.anam-btn-toggle');
    btns.forEach(b => b.classList.remove('active-nao', 'active-sim'));
    if (isYes) {
        btn.classList.add('active-sim');
        const key = row.getAttribute('data-key');
        if (key !== 'maiorIdade') row.classList.add('warn');
    } else {
        btn.classList.add('active-nao');
        row.classList.remove('warn');
    }
};

window.openAnamneseModal = async function(clienteId) {
    const modalOverlay = document.getElementById('modalAnamneseOverlay');
    if (!modalOverlay) return;

    try {
        const cliente = await DataStore.getClienteById(clienteId);
        if (!cliente) {
            showToast('Cliente não encontrado', 'error');
            return;
        }

        const anamnese = cliente.anamnese || await DataStore.getAnamnese(clienteId);

        document.getElementById('anamClienteId').value = cliente.id;
        document.getElementById('anamNome').value = anamnese?.nome || cliente.nome || '';
        document.getElementById('anamNascimento').value = anamnese?.dataNascimento || '';
        document.getElementById('anamCpf').value = anamnese?.cpf || '';
        document.getElementById('anamRg').value = anamnese?.rg || '';
        document.getElementById('anamTelefone').value = anamnese?.telefone || cliente.telefone || '';
        document.getElementById('anamEndereco').value = anamnese?.endereco || '';
        document.getElementById('anamObsSaude').value = anamnese?.obsSaude || '';
        document.getElementById('anamAutorizaFoto').checked = anamnese ? (anamnese.autorizaFoto !== false) : true;

        const questionsList = document.getElementById('anamQuestionsList');
        const respostas = anamnese?.respostas || {};

        questionsList.innerHTML = ANAMNESE_QUESTIONS.map(q => {
            const isYes = respostas[q.key] !== undefined ? !!respostas[q.key] : (q.defaultSim || false);
            return `
                <div class="anam-q-row ${isYes && !q.defaultSim ? 'warn' : ''}" data-key="${q.key}">
                    <div class="anam-q-label">${q.label}</div>
                    <div class="anam-toggle-group">
                        <button type="button" class="anam-btn-toggle ${!isYes ? 'active-nao' : ''}" onclick="toggleAnamQuestion(this, false)">NÃO</button>
                        <button type="button" class="anam-btn-toggle ${isYes ? 'active-sim' : ''}" onclick="toggleAnamQuestion(this, true)">SIM</button>
                    </div>
                </div>
            `;
        }).join('');

        const canvas = document.getElementById('signatureCanvas');
        if (!signaturePadInstance && canvas) {
            signaturePadInstance = new SignaturePad(canvas);
        }

        const banner = document.getElementById('anamStatusBanner');
        const btnDelete = document.getElementById('btnDeleteAnamnese');
        const btnExport = document.getElementById('btnExportPDFAnamnese');
        const btnWhatsapp = document.getElementById('btnWhatsappAnamnese');
        const sigDateMsg = document.getElementById('sigDateMsg');

        if (anamnese && anamnese.assinado) {
            banner.style.display = 'flex';
            banner.className = 'anam-status-banner signed';
            banner.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Termo assinado digitalmente em ${formatDate(anamnese.dataAssinatura)} às ${new Date(anamnese.dataAssinatura).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</span>
            `;
            if (sigDateMsg) sigDateMsg.textContent = `Registrado em: ${formatDate(anamnese.dataAssinatura)}`;
            if (btnDelete) btnDelete.style.display = 'inline-flex';
            if (btnExport) btnExport.style.display = 'inline-flex';
            if (btnWhatsapp) btnWhatsapp.style.display = 'inline-flex';

            signaturePadInstance?.loadDataURL(anamnese.assinaturaUrl);
        } else {
            banner.style.display = 'flex';
            banner.className = 'anam-status-banner pending';
            banner.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                <span>Aguardando preenchimento da ficha e assinatura digital do cliente</span>
            `;
            if (sigDateMsg) sigDateMsg.textContent = '';
            if (btnDelete) btnDelete.style.display = 'none';
            if (btnExport) btnExport.style.display = 'inline-flex';
            if (btnWhatsapp) btnWhatsapp.style.display = 'none';

            signaturePadInstance?.clear();
        }

        openModal(modalOverlay);
    } catch (e) {
        console.error('Error opening anamnese modal:', e);
        showToast('Erro ao abrir termo', 'error');
    }
};

// Setup Anamnese Modal Event Listeners
document.getElementById('modalAnamneseClose')?.addEventListener('click', () => closeModal(document.getElementById('modalAnamneseOverlay')));
document.getElementById('btnCancelAnamnese')?.addEventListener('click', () => closeModal(document.getElementById('modalAnamneseOverlay')));
document.getElementById('modalAnamneseOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalAnamneseOverlay')) {
        closeModal(document.getElementById('modalAnamneseOverlay'));
    }
});

document.getElementById('btnClearSignature')?.addEventListener('click', () => {
    signaturePadInstance?.clear();
});

window.handleExportAnamnesePDF = async function() {
    const clienteId = document.getElementById('anamClienteId')?.value;
    if (!clienteId) {
        showToast('Nenhum cliente selecionado', 'error');
        return;
    }

    try {
        const exporter = window.PDFExport || (typeof PDFExport !== 'undefined' ? PDFExport : null);
        if (!exporter || typeof exporter.generateAnamnesePDF !== 'function') {
            throw new Error('Módulo de exportação de PDF não carregado');
        }

        // Auto-sync form if signature was drawn on canvas
        const hasSig = signaturePadInstance && signaturePadInstance.hasSignature;
        if (hasSig) {
            const respostas = {};
            document.querySelectorAll('.anam-q-row').forEach(row => {
                const key = row.getAttribute('data-key');
                const activeSim = row.querySelector('.anam-btn-toggle.active-sim');
                respostas[key] = !!activeSim;
            });
            const sigUrl = signaturePadInstance.toDataURL();
            const currentData = {
                nome: document.getElementById('anamNome')?.value.trim() || '',
                dataNascimento: document.getElementById('anamNascimento')?.value || '',
                cpf: document.getElementById('anamCpf')?.value.trim() || '',
                rg: document.getElementById('anamRg')?.value.trim() || '',
                telefone: document.getElementById('anamTelefone')?.value.trim() || '',
                endereco: document.getElementById('anamEndereco')?.value.trim() || '',
                obsSaude: document.getElementById('anamObsSaude')?.value.trim() || '',
                autorizaFoto: document.getElementById('anamAutorizaFoto')?.checked ?? true,
                respostas: respostas,
                assinaturaUrl: sigUrl,
                assinado: true,
                dataAssinatura: new Date().toISOString()
            };
            DataStore.saveAnamnese(clienteId, currentData).catch(e => console.warn('Silent save:', e));
        }

        await exporter.generateAnamnesePDF(clienteId);
    } catch (err) {
        console.error('Error generating Anamnese PDF:', err);
        showToast('Erro ao exportar termo: ' + (err.message || err), 'error');
    }
};

document.getElementById('btnExportPDFAnamnese')?.addEventListener('click', (e) => {
    e.preventDefault();
    window.handleExportAnamnesePDF();
});

document.getElementById('btnWhatsappAnamnese')?.addEventListener('click', () => {
    const nome = document.getElementById('anamNome').value.trim();
    const tel = document.getElementById('anamTelefone').value.trim();
    if (window.WhatsAppService) {
        WhatsAppService.quickSend('cuidados_pos', { cliente: nome, telefone: tel });
    }
});

document.getElementById('btnDeleteAnamnese')?.addEventListener('click', async () => {
    const clienteId = document.getElementById('anamClienteId').value;
    if (!clienteId) return;
    const conf = await showConfirm('Excluir Termo', 'Tem certeza que deseja excluir o termo de consentimento deste cliente?');
    if (!conf) return;

    await DataStore.deleteAnamnese(clienteId);
    showToast('Termo excluído com sucesso!', 'info');
    closeModal(document.getElementById('modalAnamneseOverlay'));
    renderClientes();
});

document.getElementById('formAnamnese')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clienteId = document.getElementById('anamClienteId').value;
    if (!clienteId) return;

    if (!signaturePadInstance || !signaturePadInstance.hasSignature) {
        showToast('Por favor, solicite a assinatura do cliente no quadro antes de salvar!', 'warning');
        return;
    }

    const respostas = {};
    document.querySelectorAll('.anam-q-row').forEach(row => {
        const key = row.getAttribute('data-key');
        const activeSim = row.querySelector('.anam-btn-toggle.active-sim');
        respostas[key] = !!activeSim;
    });

    const anamneseData = {
        nome: document.getElementById('anamNome').value.trim(),
        dataNascimento: document.getElementById('anamNascimento').value,
        cpf: document.getElementById('anamCpf').value.trim(),
        rg: document.getElementById('anamRg').value.trim(),
        telefone: document.getElementById('anamTelefone').value.trim(),
        endereco: document.getElementById('anamEndereco').value.trim(),
        obsSaude: document.getElementById('anamObsSaude').value.trim(),
        autorizaFoto: document.getElementById('anamAutorizaFoto').checked,
        respostas: respostas,
        assinaturaUrl: signaturePadInstance.toDataURL(),
        dataAssinatura: new Date().toISOString()
    };

    try {
        await DataStore.saveAnamnese(clienteId, anamneseData);
        showToast('Termo de Consentimento e Anamnese salvos com sucesso! ✍️', 'success');

        document.getElementById('btnExportPDFAnamnese').style.display = 'inline-flex';
        document.getElementById('btnWhatsappAnamnese').style.display = 'inline-flex';
        document.getElementById('btnDeleteAnamnese').style.display = 'inline-flex';

        const banner = document.getElementById('anamStatusBanner');
        banner.style.display = 'flex';
        banner.className = 'anam-status-banner signed';
        banner.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>Termo assinado digitalmente agora mesmo!</span>
        `;

        renderClientes();
    } catch (err) {
        console.error('Error saving anamnese:', err);
        showToast('Erro ao salvar termo', 'error');
    }
});

// =========================================================
// PDF REPORT GENERATION
// =========================================================

async function generatePDFReport() {
    openModal(document.getElementById('modalPDFOverlay'));
}

// =========================================================
// LIGHTBOX SYSTEM
// =========================================================

window.openLightbox = function(imgUrl, title = '', meta = '', desc = '', tag = 'GH Studio', galeriaId = null) {
    const overlay = document.getElementById('modalLightboxOverlay');
    if (!overlay) return;
    document.getElementById('lightboxImage').src = imgUrl;
    document.getElementById('lightboxTitle').textContent = title || 'Obra GH Studio';
    document.getElementById('lightboxMeta').textContent = meta || '';
    document.getElementById('lightboxDesc').textContent = desc || '';
    document.getElementById('lightboxTag').textContent = (tag || 'GH Studio').toUpperCase();

    const btnDel = document.getElementById('btnDeleteLightbox');
    if (btnDel) {
        if (galeriaId) {
            btnDel.style.display = 'inline-flex';
            btnDel.onclick = async (e) => {
                e.stopPropagation();
                closeLightbox();
                await handleDelete('galeria', galeriaId);
            };
        } else {
            btnDel.style.display = 'none';
            btnDel.onclick = null;
        }
    }

    overlay.classList.add('active');
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
};

window.closeLightbox = function() {
    const overlay = document.getElementById('modalLightboxOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        const activeOverlays = document.querySelectorAll('.modal-overlay.active, .lightbox-overlay.active');
        if (activeOverlays.length === 0) {
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
        }
    }
};

document.getElementById('lightboxClose')?.addEventListener('click', closeLightbox);
document.getElementById('modalLightboxOverlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modalLightboxOverlay')) closeLightbox();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
});


// =========================================================
// GALERIA / PORTFÓLIO RENDERING & ACTIONS
// =========================================================

let currentGaleriaStyle = 'todos';
let currentGaleriaSearch = '';

async function renderGaleria(style = currentGaleriaStyle, query = currentGaleriaSearch) {
    const grid = document.getElementById('galeriaGrid');
    if (!grid) return;
    try {
        let items = await DataStore.getGaleria(style !== 'todos' ? { estilo: style } : {});
        if (query) {
            const q = query.toLowerCase();
            items = items.filter(g =>
                g.titulo.toLowerCase().includes(q) ||
                g.clienteNome.toLowerCase().includes(q) ||
                (g.descricao && g.descricao.toLowerCase().includes(q))
            );
        }

        if (items.length === 0) {
            grid.innerHTML = emptyState(
                '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
                'Nenhum trabalho encontrado',
                'Adicione fotos de seus trabalhos finalizados no estúdio.'
            );
            return;
        }

        grid.innerHTML = items.map(item => `
            <div class="galeria-card" data-id="${item.id}">
                <div class="galeria-card-tag">${item.estilo}</div>
                <button class="btn-delete-card" title="Excluir Obra" onclick="event.stopPropagation(); handleDelete('galeria', '${item.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
                <div class="galeria-image-wrap" onclick="openLightbox('${item.imagemUrl}', '${item.titulo.replace(/'/g, "\\'")}', 'Cliente: ${item.clienteNome.replace(/'/g, "\\'")} • ${formatDate(item.data)}', '${(item.descricao || '').replace(/'/g, "\\'")}', '${item.estilo}', '${item.id}')">
                    <img src="${item.imagemUrl}" alt="${item.titulo}" loading="lazy">
                    <div class="galeria-image-overlay">
                        <button class="btn-zoom-overlay">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                            Ver Foto
                        </button>
                    </div>
                </div>
                <div class="galeria-card-body">
                    <h3 class="galeria-card-title">${item.titulo}</h3>
                    <div class="galeria-card-meta">
                        <span>👤 ${item.clienteNome}</span>
                        <span>•</span>
                        <span>📅 ${formatDate(item.data)}</span>
                    </div>
                    <p class="galeria-card-desc">${item.descricao || 'Trabalho realizado no GH Studio.'}</p>
                    <div class="galeria-card-footer">
                        <button class="btn-like" onclick="handleLikeGaleria('${item.id}', this)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                            <span class="like-count">${item.curtidas || 0}</span>
                        </button>
                        <div class="row-actions">
                            <button class="btn-action delete" title="Excluir do Portfólio" onclick="handleDelete('galeria', '${item.id}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        console.error('Error rendering galeria:', e);
    }
}

window.handleLikeGaleria = async function(id, btn) {
    try {
        const item = await DataStore._getDB().getById('galeria', id);
        if (!item) return;
        const newLikes = (item.curtidas || 0) + 1;
        await DataStore.updateGaleriaItem(id, { curtidas: newLikes });
        btn.querySelector('.like-count').textContent = newLikes;
        const svg = btn.querySelector('svg');
        svg.style.fill = 'var(--red)';
        svg.style.stroke = 'var(--red)';
        showToast('Trabalho curtido! ❤️', 'success');
    } catch (e) { console.error('Like error:', e); }
};

// Filter chip listeners
document.querySelectorAll('#galeriaFilterChips .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('#galeriaFilterChips .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentGaleriaStyle = chip.dataset.style;
        renderGaleria(currentGaleriaStyle, currentGaleriaSearch);
    });
});

// Search galeria listener
document.getElementById('searchGaleria')?.addEventListener('input', (e) => {
    currentGaleriaSearch = e.target.value;
    renderGaleria(currentGaleriaStyle, currentGaleriaSearch);
});

// Add Galeria item modal trigger
const modalGaleriaOverlay = document.getElementById('modalGaleriaOverlay');
document.getElementById('btnAddGaleria')?.addEventListener('click', () => {
    document.getElementById('formGaleria').reset();
    document.getElementById('galData').value = TODAY;
    resetGalDropzone();
    openModal(modalGaleriaOverlay);
});
document.getElementById('modalGaleriaClose')?.addEventListener('click', () => closeModal(modalGaleriaOverlay));
document.getElementById('btnCancelGal')?.addEventListener('click', () => closeModal(modalGaleriaOverlay));
modalGaleriaOverlay?.addEventListener('click', (e) => { if (e.target === modalGaleriaOverlay) closeModal(modalGaleriaOverlay); });

// PDF Modal listeners
const modalPDFOverlay = document.getElementById('modalPDFOverlay');
document.getElementById('modalPDFClose')?.addEventListener('click', () => closeModal(modalPDFOverlay));
modalPDFOverlay?.addEventListener('click', (e) => { if (e.target === modalPDFOverlay) closeModal(modalPDFOverlay); });
document.getElementById('btnExportRelGeral')?.addEventListener('click', async () => {
    closeModal(modalPDFOverlay);
    await PDFExport.generateFinancialReport();
});

// Form Galeria submission
document.getElementById('formGaleria')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        titulo: document.getElementById('galTitulo').value,
        estilo: document.getElementById('galEstilo').value,
        clienteNome: document.getElementById('galCliente').value,
        data: document.getElementById('galData').value,
        imagemUrl: document.getElementById('galImagemUrl').value || 'assets/tattoo_lion.jpg',
        descricao: document.getElementById('galDescricao').value,
        curtidas: 0
    };

    try {
        await DataStore.addGaleriaItem(data);
        showToast('Obra adicionada com sucesso ao portfólio!', 'success');
        closeModal(modalGaleriaOverlay);
        e.target.reset();
        resetGalDropzone();
        renderGaleria();
    } catch (err) {
        console.error('Galeria save error:', err);
        showToast('Erro ao salvar no portfólio', 'error');
    }
});


// =========================================================
// NAVIGATION
// =========================================================

const pageTitles = { 
    dashboard: 'Dashboard', 
    agenda: 'Agenda', 
    financeiro: 'Financeiro', 
    clientes: 'Clientes', 
    galeria: 'Portfólio & Galeria', 
    whatsapp: 'Central WhatsApp & Automação',
    estoque: 'Controle de Estoque & Materiais'
};

const navigateTo = (page) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${page}`)?.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${page}"]`)?.classList.add('active');
    document.querySelectorAll('.bottom-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.bottom-tab[data-page="${page}"]`)?.classList.add('active');
    document.getElementById('pageTitle').textContent = pageTitles[page] || 'GH Studio';
    if (page === 'galeria') renderGaleria();
    if (page === 'agenda') { renderWeekView(); renderListView(); }
    if (page === 'whatsapp' && window.WhatsAppService) WhatsAppService.renderHub();
    if (page === 'dashboard') { renderDashboardCards(); renderMetaMensal(); }
    if (page === 'estoque') renderEstoque();
    closeSidebar();
};

window.navigateToPage = navigateTo;

// Sidebar nav
document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => navigateTo(btn.dataset.page)));
document.querySelectorAll('.bottom-tab').forEach(btn => btn.addEventListener('click', () => navigateTo(btn.dataset.page)));
document.getElementById('btnVerAgenda')?.addEventListener('click', () => navigateTo('agenda'));
document.getElementById('btnVerFinanceiro')?.addEventListener('click', () => navigateTo('financeiro'));


// =========================================================
// MOBILE SIDEBAR
// =========================================================

const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
let sidebarOverlay = null;

const openSidebar = () => {
    sidebar.classList.add('open');
    if (!sidebarOverlay) {
        sidebarOverlay = document.createElement('div');
        sidebarOverlay.className = 'sidebar-overlay';
        sidebarOverlay.addEventListener('click', closeSidebar);
        document.body.appendChild(sidebarOverlay);
    }
    setTimeout(() => sidebarOverlay.classList.add('active'), 10);
};

const closeSidebar = () => {
    sidebar.classList.remove('open');
    if (sidebarOverlay) sidebarOverlay.classList.remove('active');
};

menuToggle?.addEventListener('click', () => sidebar.classList.contains('open') ? closeSidebar() : openSidebar());
document.getElementById('sidebarCloseBtn')?.addEventListener('click', closeSidebar);

// Close on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar?.classList.contains('open')) {
        closeSidebar();
    }
});


// =========================================================
// FINANCIAL TABS
// =========================================================

document.querySelectorAll('.fin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.fin-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.fin-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    });
});

// Agenda view toggle
document.getElementById('btnViewWeek')?.addEventListener('click', () => {
    document.getElementById('weekView').style.display = 'block';
    document.getElementById('listView').style.display = 'none';
    document.getElementById('btnViewWeek').classList.add('active');
    document.getElementById('btnViewList').classList.remove('active');
    renderWeekView();
});

document.getElementById('btnViewList')?.addEventListener('click', () => {
    document.getElementById('weekView').style.display = 'none';
    document.getElementById('listView').style.display = 'block';
    document.getElementById('btnViewList').classList.add('active');
    document.getElementById('btnViewWeek').classList.remove('active');
    renderListView();
});

// Agenda week navigation (< Anterior, Próxima >, Hoje)
document.getElementById('btnPrevWeek')?.addEventListener('click', () => {
    currentWeekOffset--;
    renderWeekView();
});
document.getElementById('btnNextWeek')?.addEventListener('click', () => {
    currentWeekOffset++;
    renderWeekView();
});
document.getElementById('btnTodayWeek')?.addEventListener('click', () => {
    currentWeekOffset = 0;
    renderWeekView();
});

// ── Dashboard Month Navigation (< Anterior, Escolher Mês, Próximo >, Mês Atual) ──
function setupDashboardMonthSelector() {
    const btnPrev = document.getElementById('btnPrevDashMonth');
    const btnNext = document.getElementById('btnNextDashMonth');
    const btnToday = document.getElementById('btnTodayDashMonth');
    const inputMonth = document.getElementById('dashMonthInput');
    const btnChoose = document.getElementById('btnChooseDashMonth');

    const updateMonth = (newYM) => {
        currentDashYearMonth = newYM;
        renderDashboardCards(currentDashYearMonth);
        renderMetaMensal(currentDashYearMonth);
    };

    btnPrev?.addEventListener('click', () => {
        const [y, m] = currentDashYearMonth.split('-').map(Number);
        const prevDate = new Date(y, m - 2, 1);
        const prevYM = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
        updateMonth(prevYM);
    });

    btnNext?.addEventListener('click', () => {
        const [y, m] = currentDashYearMonth.split('-').map(Number);
        const nextDate = new Date(y, m, 1);
        const nextYM = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;
        updateMonth(nextYM);
    });

    btnToday?.addEventListener('click', () => {
        const curYM = getTodayStr().slice(0, 7);
        updateMonth(curYM);
    });

    inputMonth?.addEventListener('change', (e) => {
        if (e.target.value) {
            updateMonth(e.target.value);
        }
    });

    btnChoose?.addEventListener('click', () => {
        if (inputMonth) {
            if (typeof inputMonth.showPicker === 'function') {
                inputMonth.showPicker();
            } else {
                inputMonth.focus();
                inputMonth.click();
            }
        }
    });
}

// ── Financial Filters & Period Quick Chips ──
const setupFinanceiroFilters = () => {
    const btnFiltrar = document.getElementById('btnFiltrar');
    const btnClearFilter = document.getElementById('btnClearFilter');
    const filterPayment = document.getElementById('filterPayment');
    const dateFrom = document.getElementById('filterDateFrom');
    const dateTo = document.getElementById('filterDateTo');

    [dateFrom, dateTo].forEach(el => {
        if (!el) return;
        el.addEventListener('click', () => {
            if (typeof el.showPicker === 'function') {
                try { el.showPicker(); } catch (err) {}
            }
        });
        el.addEventListener('change', () => {
            renderAllTransactions();
            renderDespesas();
        });
    });

    if (filterPayment) {
        filterPayment.addEventListener('change', () => {
            renderAllTransactions();
            renderDespesas();
        });
    }

    // Period Quick Chips
    document.querySelectorAll('#finPeriodChips .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#finPeriodChips .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const period = chip.dataset.period;
            const now = new Date();
            let fromStr = '';
            let toStr = now.toISOString().split('T')[0];

            if (period === 'mes') {
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                fromStr = firstDay.toISOString().split('T')[0];
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                toStr = lastDay.toISOString().split('T')[0];
            } else if (period === '30d') {
                const past30 = new Date(now);
                past30.setDate(past30.getDate() - 30);
                fromStr = past30.toISOString().split('T')[0];
            } else if (period === 'ano') {
                fromStr = `${now.getFullYear()}-01-01`;
                toStr = `${now.getFullYear()}-12-31`;
            }

            if (dateFrom) dateFrom.value = fromStr;
            if (dateTo) dateTo.value = toStr;
            renderAllTransactions();
            renderDespesas();
            showToast(`Filtro "${chip.textContent}" aplicado!`, 'info');
        });
    });

    if (btnFiltrar) {
        btnFiltrar.addEventListener('click', async () => {
            await renderAllTransactions();
            await renderDespesas();
            showToast('Filtro financeiro aplicado!', 'success');
        });
    }

    if (btnClearFilter) {
        btnClearFilter.addEventListener('click', async () => {
            if (dateFrom) dateFrom.value = '';
            if (dateTo) dateTo.value = '';
            if (filterPayment) filterPayment.value = 'todos';
            document.querySelectorAll('#finPeriodChips .chip').forEach(c => c.classList.remove('active'));
            await renderAllTransactions();
            await renderDespesas();
            showToast('Filtros limpos!', 'info');
        });
    }
};
setupFinanceiroFilters();


// =========================================================
// MODALS & CLIENT SELECTION
// =========================================================

const modalOverlay = document.getElementById('modalOverlay');
const modalAgendaOverlay = document.getElementById('modalAgendaOverlay');

window.openModal = (overlay) => { 
    if (!overlay) return;
    overlay.classList.add('active'); 
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden'; 
};
window.closeModal = (overlay) => { 
    if (!overlay) return;
    overlay.classList.remove('active'); 
    const activeOverlays = document.querySelectorAll('.modal-overlay.active, .lightbox-overlay.active');
    if (activeOverlays.length === 0) {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = ''; 
    }
    if (typeof resetEditing === 'function') resetEditing(); 
};
const openModal = window.openModal;
const closeModal = window.closeModal;

async function populateTxClients(selectedClientId = null) {
    const select = document.getElementById('txClienteSelect');
    if (!select) return;
    try {
        const clientes = await DataStore.getClientes();
        select.innerHTML = `
            <option value="">Selecione ou cadastre um cliente...</option>
            <option value="+novo">➕ Cadastrar Novo Cliente</option>
            ${clientes.map(c => `
                <option value="${c.id}" data-nome="${c.nome}" data-gasto="${c.totalGasto || 0}" data-sessoes="${c.sessoes || 0}">
                    ${c.nome} (Total gasto: ${formatCurrency(c.totalGasto || 0)})
                </option>
            `).join('')}
        `;

        if (selectedClientId) {
            select.value = selectedClientId;
        } else {
            select.value = '';
        }
        handleTxClienteSelectChange();
    } catch (e) {
        console.warn('Error populating clients select:', e);
    }
}

function handleTxClienteSelectChange() {
    const select = document.getElementById('txClienteSelect');
    const badge = document.getElementById('txClienteBadge');
    const newFields = document.getElementById('newClienteFields');
    const hiddenNome = document.getElementById('txCliente');
    const hiddenId = document.getElementById('txClienteId');

    if (!select) return;

    if (select.value === '+novo') {
        if (newFields) newFields.style.display = 'block';
        if (badge) badge.style.display = 'none';
        if (hiddenNome) hiddenNome.value = '';
        if (hiddenId) hiddenId.value = '';
        document.getElementById('newClienteNome')?.focus();
    } else if (select.value) {
        if (newFields) newFields.style.display = 'none';
        const opt = select.selectedOptions[0];
        const nome = opt.getAttribute('data-nome') || opt.textContent.split(' (')[0].trim();
        const gasto = parseFloat(opt.getAttribute('data-gasto')) || 0;
        const sessoes = parseInt(opt.getAttribute('data-sessoes')) || 0;

        if (hiddenNome) hiddenNome.value = nome;
        if (hiddenId) hiddenId.value = select.value;

        if (badge) {
            badge.style.display = 'flex';
            badge.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/></svg>
                <span>Total já investido no estúdio: <strong>${formatCurrency(gasto)}</strong> (${sessoes} ${sessoes === 1 ? 'sessão' : 'sessões'})</span>
            `;
        }
    } else {
        if (newFields) newFields.style.display = 'none';
        if (badge) badge.style.display = 'none';
        if (hiddenNome) hiddenNome.value = '';
        if (hiddenId) hiddenId.value = '';
    }
    checkClientOpenDebts();
}
document.getElementById('txClienteSelect')?.addEventListener('change', handleTxClienteSelectChange);

// ── Open Debt Checking & Prompt Handling ──
async function checkClientOpenDebts() {
    const tipo = document.getElementById('txTipo')?.value;
    const box = document.getElementById('txOpenDebtBox');
    const select = document.getElementById('txDebtItemSelect');
    const hiddenNome = document.getElementById('txCliente')?.value;
    const hiddenId = document.getElementById('txClienteId')?.value;

    if (!box || !select) return;

    if (tipo !== 'entrada' || (!hiddenNome && !hiddenId)) {
        box.style.display = 'none';
        return;
    }

    try {
        const allReceber = await DataStore.getValoresReceber();
        const clientDebts = allReceber.filter(v => {
            const matchClient = (hiddenId && v.clienteId === hiddenId) || (v.cliente && hiddenNome && v.cliente.toLowerCase() === hiddenNome.toLowerCase());
            const hasRestante = (v.valorTotal - v.valorPago) > 0;
            return matchClient && hasRestante;
        });

        if (clientDebts.length > 0) {
            select.innerHTML = clientDebts.map(d => {
                const restante = d.valorTotal - d.valorPago;
                return `<option value="${d.id}" data-restante="${restante}" data-desc="${d.descricao}">${d.descricao} — Restante: ${formatCurrency(restante)} (Vence em ${formatDate(d.dataVencimento)})</option>`;
            }).join('');
            box.style.display = 'block';
            const optAbater = document.getElementById('optAbaterDebt');
            if (optAbater) optAbater.checked = true;
            const wrap = document.getElementById('txDebtSelectWrap');
            if (wrap) wrap.style.display = 'block';
            applySelectedDebtToTx();
        } else {
            box.style.display = 'none';
        }
    } catch (e) {
        console.warn('Error checking client open debts:', e);
        box.style.display = 'none';
    }
}

function applySelectedDebtToTx() {
    const optAbater = document.getElementById('optAbaterDebt');
    if (!optAbater?.checked) return;
    const debtSelect = document.getElementById('txDebtItemSelect');
    if (!debtSelect || !debtSelect.selectedOptions[0]) return;
    const opt = debtSelect.selectedOptions[0];
    const restante = parseFloat(opt.getAttribute('data-restante')) || 0;
    const desc = opt.getAttribute('data-desc') || '';

    const txValor = document.getElementById('txValor');
    const txDescricao = document.getElementById('txDescricao');
    if (txValor && (!txValor.value || parseFloat(txValor.value) === 0)) {
        txValor.value = restante;
    }
    if (txDescricao && (!txDescricao.value || txDescricao.value.startsWith('Pagamento'))) {
        txDescricao.value = `Pagamento restante: ${desc}`;
    }
}

document.querySelectorAll('input[name="txDebtOption"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const wrap = document.getElementById('txDebtSelectWrap');
        if (e.target.value === 'abater') {
            if (wrap) wrap.style.display = 'block';
            applySelectedDebtToTx();
        } else {
            if (wrap) wrap.style.display = 'none';
            const txDescricao = document.getElementById('txDescricao');
            if (txDescricao && txDescricao.value.startsWith('Pagamento restante')) {
                txDescricao.value = '';
            }
        }
    });
});
document.getElementById('txDebtItemSelect')?.addEventListener('change', applySelectedDebtToTx);

// ── Agenda Client Selection & Calculations ──
async function populateAgClients(selectedClientId = null) {
    const select = document.getElementById('agClienteSelect');
    if (!select) return;
    try {
        const clientes = await DataStore.getClientes();
        select.innerHTML = `
            <option value="">Selecione um cliente cadastrado...</option>
            <option value="+novo">➕ Cadastrar Novo Cliente</option>
            ${clientes.map(c => `
                <option value="${c.id}" data-nome="${c.nome}" data-gasto="${c.totalGasto || 0}" data-sessoes="${c.sessoes || 0}">
                    ${c.nome} (Total gasto: ${formatCurrency(c.totalGasto || 0)})
                </option>
            `).join('')}
        `;

        if (selectedClientId) {
            select.value = selectedClientId;
        } else {
            select.value = '';
        }
        handleAgClienteSelectChange();
        if (window.TattooCalculator && typeof TattooCalculator.populateClientSelect === 'function') {
            TattooCalculator.populateClientSelect();
        }
    } catch (e) {
        console.warn('Error populating agenda clients select:', e);
    }
}
window.populateAgClients = populateAgClients;

function handleAgClienteSelectChange() {
    const select = document.getElementById('agClienteSelect');
    const badge = document.getElementById('agClienteBadge');
    const newFields = document.getElementById('newAgClienteFields');
    const hiddenNome = document.getElementById('agCliente');
    const hiddenId = document.getElementById('agClienteId');

    if (!select) return;

    if (select.value === '+novo') {
        if (newFields) newFields.style.display = 'block';
        if (badge) badge.style.display = 'none';
        if (hiddenNome) hiddenNome.value = '';
        if (hiddenId) hiddenId.value = '';
        document.getElementById('newAgClienteNome')?.focus();
    } else if (select.value) {
        if (newFields) newFields.style.display = 'none';
        const opt = select.selectedOptions[0];
        const nome = opt.getAttribute('data-nome') || opt.textContent.split(' (')[0].trim();
        const gasto = parseFloat(opt.getAttribute('data-gasto')) || 0;
        const sessoes = parseInt(opt.getAttribute('data-sessoes')) || 0;

        if (hiddenNome) hiddenNome.value = nome;
        if (hiddenId) hiddenId.value = select.value;

        if (badge) {
            badge.style.display = 'flex';
            badge.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><line x1="12" y1="6" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="18"/></svg>
                <span>Total já investido no estúdio: <strong>${formatCurrency(gasto)}</strong> (${sessoes} ${sessoes === 1 ? 'sessão' : 'sessões'})</span>
            `;
        }
    } else {
        if (newFields) newFields.style.display = 'none';
        if (badge) badge.style.display = 'none';
        if (hiddenNome) hiddenNome.value = '';
        if (hiddenId) hiddenId.value = '';
    }
}
window.handleAgClienteSelectChange = handleAgClienteSelectChange;
document.getElementById('agClienteSelect')?.addEventListener('change', handleAgClienteSelectChange);

window.calcAgRestante = function() {
    const totalEl = document.getElementById('agValorTotal');
    const sinalEl = document.getElementById('agValorSinal');
    const sinalPagoSelect = document.getElementById('agSinalPago');

    const totalRaw = (totalEl?.value ?? '').toString().replace(',', '.');
    const sinalRaw = (sinalEl?.value ?? '').toString().replace(',', '.');

    const total = parseFloat(totalRaw) || 0;
    let sinal = parseFloat(sinalRaw) || 0;

    // Se o sinal foi definido como "Sem sinal prévio", não desconta sinal
    if (sinalPagoSelect && sinalPagoSelect.value === 'nao') {
        sinal = 0;
    }

    const restante = Math.max(total - sinal, 0);
    const restanteEl = document.getElementById('agValorRestante');
    if (restanteEl) {
        restanteEl.textContent = formatCurrency(restante);
    }
};
const calcAgRestante = window.calcAgRestante;

['input', 'change', 'keyup', 'paste'].forEach(evt => {
    document.getElementById('agValorTotal')?.addEventListener(evt, window.calcAgRestante);
    document.getElementById('agValorSinal')?.addEventListener(evt, window.calcAgRestante);
});
document.getElementById('agSinalPago')?.addEventListener('change', window.calcAgRestante);

// Buttons
document.getElementById('btnNovaTransacao')?.addEventListener('click', () => { resetEditing(); populateTxClients(); openModal(modalOverlay); });
document.getElementById('btnAddTransacao')?.addEventListener('click', () => { resetEditing(); populateTxClients(); openModal(modalOverlay); });
document.getElementById('btnAddDespesa')?.addEventListener('click', () => { resetEditing(); populateTxClients(); document.getElementById('txTipo').value = 'saida'; handleTipoChange(); openModal(modalOverlay); });
document.getElementById('btnAddSinal')?.addEventListener('click', () => { resetEditing(); populateTxClients(); document.getElementById('txTipo').value = 'sinal'; handleTipoChange(); openModal(modalOverlay); });

document.getElementById('btnNovoAgendamento')?.addEventListener('click', async () => {
    resetEditing();
    const form = document.getElementById('formAgenda');
    if (form) form.reset();
    resetAgDropzone();
    const newFields = document.getElementById('newAgClienteFields');
    if (newFields) newFields.style.display = 'none';
    const badge = document.getElementById('agClienteBadge');
    if (badge) badge.style.display = 'none';
    const btnDel = document.getElementById('btnDeleteModalAg');
    if (btnDel) btnDel.style.display = 'none';
    const btnWa = document.getElementById('btnAgSendWhatsApp');
    if (btnWa) btnWa.style.display = 'none';
    const title = document.getElementById('modalAgendaTitle');
    if (title) title.textContent = 'Novo Agendamento';
    
    document.getElementById('agData').value = TODAY;
    document.getElementById('agInicio').value = '14:00';
    document.getElementById('agFim').value = '17:00';
    document.getElementById('agSinalPago').value = 'sim';
    document.getElementById('agStatus').value = 'agendado';
    if (window.calcAgRestante) window.calcAgRestante();
    
    await populateAgClients();
    openModal(modalAgendaOverlay);
});

document.getElementById('modalClose')?.addEventListener('click', () => closeModal(modalOverlay));
document.getElementById('btnCancelTx')?.addEventListener('click', () => closeModal(modalOverlay));
modalOverlay?.addEventListener('click', (e) => { if (e.target === modalOverlay) closeModal(modalOverlay); });

document.getElementById('modalAgendaClose')?.addEventListener('click', () => closeModal(modalAgendaOverlay));
document.getElementById('btnCancelAg')?.addEventListener('click', () => closeModal(modalAgendaOverlay));
modalAgendaOverlay?.addEventListener('click', (e) => { if (e.target === modalAgendaOverlay) closeModal(modalAgendaOverlay); });

// ── Modal Valor a Receber ──
const modalReceberOverlay = document.getElementById('modalReceberOverlay');

async function openReceberModal(item = null) {
    if (!modalReceberOverlay) return;
    const select = document.getElementById('recClienteSelect');
    if (select) {
        const clientes = await DataStore.getClientes();
        select.innerHTML = `
            <option value="">Selecione o cliente...</option>
            ${clientes.map(c => `<option value="${c.id}" data-nome="${c.nome}">${c.nome}</option>`).join('')}
        `;
    }

    if (item) {
        document.getElementById('modalReceberTitle').textContent = 'Editar Valor a Receber';
        document.getElementById('recId').value = item.id;
        if (select) {
            let matched = false;
            for (let i = 0; i < select.options.length; i++) {
                if (select.options[i].value === item.clienteId || select.options[i].getAttribute('data-nome') === item.cliente) {
                    select.selectedIndex = i;
                    matched = true;
                    break;
                }
            }
            if (!matched && item.cliente) {
                const opt = document.createElement('option');
                opt.value = item.clienteId || '';
                opt.textContent = item.cliente;
                opt.selected = true;
                select.appendChild(opt);
            }
        }
        document.getElementById('recCliente').value = item.cliente || '';
        document.getElementById('recClienteId').value = item.clienteId || '';
        document.getElementById('recDescricao').value = item.descricao || '';
        document.getElementById('recValorTotal').value = item.valorTotal || '';
        document.getElementById('recValorPago').value = item.valorPago || 0;
        document.getElementById('recDataVencimento').value = item.dataVencimento || TODAY;
        document.getElementById('recDataSessao').value = item.dataSessao || '';
    } else {
        document.getElementById('modalReceberTitle').textContent = 'Novo Valor a Receber';
        document.getElementById('formReceber')?.reset();
        document.getElementById('recId').value = '';
        document.getElementById('recCliente').value = '';
        document.getElementById('recClienteId').value = '';
        document.getElementById('recValorPago').value = 0;
        document.getElementById('recDataVencimento').value = TODAY;
        document.getElementById('recDataSessao').value = '';
    }
    openModal(modalReceberOverlay);
}

document.getElementById('btnNovoValorReceber')?.addEventListener('click', () => openReceberModal());
document.getElementById('modalReceberClose')?.addEventListener('click', () => closeModal(modalReceberOverlay));
document.getElementById('btnCancelRec')?.addEventListener('click', () => closeModal(modalReceberOverlay));
modalReceberOverlay?.addEventListener('click', (e) => { if (e.target === modalReceberOverlay) closeModal(modalReceberOverlay); });

document.getElementById('recClienteSelect')?.addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    if (opt && opt.value) {
        document.getElementById('recCliente').value = opt.getAttribute('data-nome') || opt.textContent;
        document.getElementById('recClienteId').value = opt.value;
    } else {
        document.getElementById('recCliente').value = '';
        document.getElementById('recClienteId').value = '';
    }
});

document.getElementById('formReceber')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('recId').value;
    const select = document.getElementById('recClienteSelect');
    let clienteNome = document.getElementById('recCliente').value;
    let clienteId = document.getElementById('recClienteId').value;
    if (!clienteNome && select?.selectedOptions[0]) {
        clienteNome = select.selectedOptions[0].getAttribute('data-nome') || select.selectedOptions[0].textContent;
        clienteId = select.value;
    }

    if (!clienteNome) {
        showToast('Selecione um cliente', 'warning');
        return;
    }

    const recData = {
        cliente: clienteNome,
        clienteId: clienteId,
        descricao: document.getElementById('recDescricao').value.trim() || 'Serviço de Tatuagem',
        valorTotal: parseFloat(document.getElementById('recValorTotal').value) || 0,
        valorPago: parseFloat(document.getElementById('recValorPago').value) || 0,
        dataVencimento: document.getElementById('recDataVencimento').value,
        dataSessao: document.getElementById('recDataSessao').value || ''
    };

    try {
        if (id) {
            await DataStore.updateValorReceber(id, recData);
            showToast('Valor a receber atualizado!', 'success');
        } else {
            await DataStore.addValorReceber(recData);
            showToast('Valor a receber registrado!', 'success');
        }
        closeModal(modalReceberOverlay);
        refreshAll();
    } catch (err) {
        console.error('Error saving valor a receber:', err);
        showToast('Erro ao salvar valor a receber', 'error');
    }
});

// Dynamic form fields
const handleTipoChange = () => {
    const tipo = document.getElementById('txTipo').value;
    document.getElementById('sinalFields').style.display = tipo === 'sinal' ? 'block' : 'none';
    document.getElementById('despesaFields').style.display = tipo === 'saida' ? 'block' : 'none';
    const titles = { entrada: 'Nova Entrada', saida: 'Nova Despesa', sinal: 'Registrar Sinal' };
    if (!editingId) document.getElementById('modalTitle').textContent = titles[tipo] || 'Nova Transação';
    checkClientOpenDebts();
};
document.getElementById('txTipo').addEventListener('change', handleTipoChange);

// Sinal remaining calc
const calcRestante = () => {
    const total = parseFloat(document.getElementById('txValorTotal').value) || 0;
    const sinal = parseFloat(document.getElementById('txValor').value) || 0;
    document.getElementById('valorRestante').textContent = formatCurrency(Math.max(total - sinal, 0));
};
document.getElementById('txValorTotal').addEventListener('input', calcRestante);
document.getElementById('txValor').addEventListener('input', () => { if (document.getElementById('txTipo').value === 'sinal') calcRestante(); });

// Add cliente button
document.getElementById('btnAddCliente').addEventListener('click', () => openClienteModal());


// =========================================================
// FORM SUBMISSIONS (Create or Update)
// =========================================================

// Transaction form
document.getElementById('formTransacao').addEventListener('submit', async (e) => {
    e.preventDefault();
    const tipo = document.getElementById('txTipo').value;
    const select = document.getElementById('txClienteSelect');
    let clienteNome = document.getElementById('txCliente')?.value || '-';
    let clienteId = document.getElementById('txClienteId')?.value || '';

    if (select && select.value === '+novo') {
        const newNome = document.getElementById('newClienteNome')?.value.trim();
        if (!newNome) {
            showToast('Informe o nome do novo cliente', 'warning');
            return;
        }
        const newTel = document.getElementById('newClienteTel')?.value.trim() || '';
        const newEmail = document.getElementById('newClienteEmail')?.value.trim() || '';
        try {
            const novoCliente = await DataStore.addCliente({
                nome: newNome,
                telefone: newTel,
                email: newEmail,
                totalGasto: 0,
                sessoes: 0
            });
            clienteNome = novoCliente.nome;
            clienteId = novoCliente.id;
        } catch (err) {
            console.error('Error creating client from transaction:', err);
            showToast('Erro ao cadastrar novo cliente', 'error');
            return;
        }
    }

    const valor = parseFloat(document.getElementById('txValor').value) || 0;
    const data = {
        tipo,
        valor,
        descricao: document.getElementById('txDescricao').value,
        cliente: clienteNome,
        clienteId: clienteId,
        metodo: document.getElementById('txMetodo').value,
        data: document.getElementById('txData').value,
        categoria: tipo === 'saida' ? document.getElementById('txCategoria').value : '',
        status: tipo === 'entrada' ? 'recebido' : 'pago'
    };

    try {
        if (editingType === 'sinal' || (tipo === 'sinal' && editingId)) {
            const valorTotalSinal = parseFloat(document.getElementById('txValorTotal').value) || data.valor;
            const dataVencimentoSinal = document.getElementById('txDataVencimentoSinal')?.value || data.data;
            const sinalData = {
                cliente: data.cliente,
                clienteId: data.clienteId,
                descricao: data.descricao,
                valorTotal: valorTotalSinal,
                valorSinal: data.valor,
                dataSinal: data.data,
                dataVencimento: dataVencimentoSinal,
                metodo: data.metodo
            };
            await DataStore.updateSinal(editingId, sinalData);
            showToast('Sinal atualizado!', 'success');
        } else if (tipo === 'sinal' && !editingId) {
            const valorTotalSinal = parseFloat(document.getElementById('txValorTotal').value) || data.valor;
            const valorSinal = data.valor;
            const dataVencimentoSinal = document.getElementById('txDataVencimentoSinal')?.value || data.data;
            const restante = Math.max(valorTotalSinal - valorSinal, 0);

            const sinalData = {
                cliente: data.cliente,
                clienteId: data.clienteId,
                descricao: data.descricao,
                valorTotal: valorTotalSinal,
                valorSinal: valorSinal,
                dataSinal: data.data,
                dataVencimento: dataVencimentoSinal,
                metodo: data.metodo
            };
            const createdSinal = await DataStore.addSinal(sinalData);

            // Register deposit entry in transacoes (linked with sinal)
            const createdTx = await DataStore.addTransacao({
                tipo: 'entrada',
                valor: valorSinal,
                descricao: `Sinal - ${data.descricao || 'Sessão'}`,
                cliente: data.cliente,
                clienteId: data.clienteId,
                metodo: data.metodo,
                data: data.data,
                status: 'recebido',
                categoria: 'sinal',
                sinalId: createdSinal ? createdSinal.id : ''
            });

            if (createdSinal && createdTx) {
                await DataStore.updateSinal(createdSinal.id, { transacaoId: createdTx.id });
            }

            // If remaining amount > 0, register in valoresReceber (user request 1)
            if (restante > 0) {
                await DataStore.addValorReceber({
                    clienteId: data.clienteId,
                    cliente: data.cliente,
                    descricao: `Restante: ${data.descricao || 'Sessão de Tatuagem'}`,
                    valorTotal: restante,
                    valorPago: 0,
                    dataVencimento: dataVencimentoSinal,
                    dataSessao: dataVencimentoSinal,
                    sinalId: createdSinal ? createdSinal.id : '',
                    transacaoId: createdTx ? createdTx.id : ''
                });
            }

            showToast(`Sinal de ${formatCurrency(valorSinal)} e restante de ${formatCurrency(restante)} registrados!`, 'success');
        } else if (editingId && editingType === 'transacao') {
            await DataStore.updateTransacao(editingId, data);
            showToast('Transação atualizada!', 'success');
        } else if (tipo === 'entrada' && !editingId) {
            // Check if user chose to settle an open debt
            const openDebtBox = document.getElementById('txOpenDebtBox');
            const debtChoiceAbater = document.getElementById('optAbaterDebt')?.checked;
            const debtSelect = document.getElementById('txDebtItemSelect');
            const selectedDebtId = debtSelect?.value;

            if (openDebtBox && openDebtBox.style.display !== 'none' && debtChoiceAbater && selectedDebtId) {
                try {
                    const rec = await DataStore._getDB().getById('valoresReceber', selectedDebtId);
                    if (rec) {
                        const newPago = (rec.valorPago || 0) + data.valor;
                        await DataStore.updateValorReceber(rec.id, { valorPago: newPago });
                        data.valorReceberId = rec.id;
                        data.categoria = 'restante';
                        await DataStore.addTransacao(data);

                        if (newPago >= rec.valorTotal) {
                            showToast(`Entrada registrada e valor a receber quitado com sucesso! 🎉`, 'success');
                        } else {
                            const aindaResta = rec.valorTotal - newPago;
                            showToast(`Entrada registrada! Restam ${formatCurrency(aindaResta)} a receber.`, 'success');
                        }
                    } else {
                        await DataStore.addTransacao(data);
                        showToast('Transação salva!', 'success');
                    }
                } catch (e) {
                    console.error('Error settling open debt:', e);
                    await DataStore.addTransacao(data);
                    showToast('Transação salva!', 'success');
                }
            } else {
                await DataStore.addTransacao(data);
                showToast('Transação salva!', 'success');
            }
        } else {
            await DataStore.addTransacao(data);
            showToast('Transação salva!', 'success');
        }

        closeModal(modalOverlay);
        e.target.reset();
        document.getElementById('txData').value = TODAY;
        if (document.getElementById('txOpenDebtBox')) {
            document.getElementById('txOpenDebtBox').style.display = 'none';
        }
        if (document.getElementById('newClienteFields')) {
            document.getElementById('newClienteFields').style.display = 'none';
        }
        if (document.getElementById('txClienteBadge')) {
            document.getElementById('txClienteBadge').style.display = 'none';
        }
        refreshAll();
    } catch (err) {
        console.error('Save error:', err);
        showToast('Erro ao salvar', 'error');
    }
});

// Dropzone helpers
const resetAgDropzone = () => {
    const hidden = document.getElementById('agReferenciaUrl');
    const input = document.getElementById('agFileInput');
    const prev = document.getElementById('agDropzonePreview');
    const prompt = document.getElementById('agDropzonePrompt');
    const img = document.getElementById('agPreviewImg');
    if (hidden) hidden.value = '';
    if (input) input.value = '';
    if (prev) prev.style.display = 'none';
    if (prompt) prompt.style.display = 'flex';
    if (img) img.src = '';
};

const resetGalDropzone = () => {
    const hidden = document.getElementById('galImagemUrl');
    const input = document.getElementById('galFileInput');
    const prev = document.getElementById('galDropzonePreview');
    const prompt = document.getElementById('galDropzonePrompt');
    const img = document.getElementById('galPreviewImg');
    if (hidden) hidden.value = '';
    if (input) input.value = '';
    if (prev) prev.style.display = 'none';
    if (prompt) prompt.style.display = 'flex';
    if (img) img.src = '';
};

function setupDropzone(dropzoneEl, fileInputEl, promptEl, previewWrapEl, previewImgEl, hiddenInputEl, removeBtnEl, folder = 'references') {
    if (!dropzoneEl || !fileInputEl) return;

    dropzoneEl.addEventListener('click', (e) => {
        if (!e.target.closest('.btn-remove-preview')) fileInputEl.click();
    });

    dropzoneEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzoneEl.classList.add('dragover');
    });

    dropzoneEl.addEventListener('dragleave', () => dropzoneEl.classList.remove('dragover'));

    dropzoneEl.addEventListener('drop', async (e) => {
        e.preventDefault();
        dropzoneEl.classList.remove('dragover');
        if (e.dataTransfer.files?.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInputEl.addEventListener('change', () => {
        if (fileInputEl.files?.length > 0) {
            handleFile(fileInputEl.files[0]);
        }
    });

    removeBtnEl?.addEventListener('click', (e) => {
        e.stopPropagation();
        hiddenInputEl.value = '';
        fileInputEl.value = '';
        previewWrapEl.style.display = 'none';
        promptEl.style.display = 'flex';
        previewImgEl.src = '';
    });

    async function handleFile(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Por favor selecione um arquivo de imagem válido', 'warning');
            return;
        }
        try {
            showToast('Otimizando imagem...', 'info');
            const res = await StorageService.upload(file, folder);
            previewImgEl.src = res.url;
            hiddenInputEl.value = res.url;
            previewWrapEl.style.display = 'flex';
            promptEl.style.display = 'none';
            showToast('Imagem carregada com sucesso!', 'success');
        } catch (err) {
            console.error('Dropzone upload error:', err);
            showToast('Erro ao processar imagem', 'error');
        }
    }
}

// Agenda form
document.getElementById('formAgenda').addEventListener('submit', async (e) => {
    e.preventDefault();
    const select = document.getElementById('agClienteSelect');
    let clienteNome = document.getElementById('agCliente')?.value || '';
    let clienteId = document.getElementById('agClienteId')?.value || '';

    // Handle new client inline creation
    if (select && select.value === '+novo') {
        const newNome = document.getElementById('newAgClienteNome')?.value.trim();
        if (!newNome) {
            showToast('Informe o nome do cliente', 'warning');
            return;
        }
        const newTel = document.getElementById('newAgClienteTel')?.value.trim() || '';
        const newEmail = document.getElementById('newAgClienteEmail')?.value.trim() || '';
        try {
            const novoCliente = await DataStore.addCliente({
                nome: newNome,
                telefone: newTel,
                email: newEmail,
                totalGasto: 0,
                sessoes: 0
            });
            clienteNome = novoCliente.nome;
            clienteId = novoCliente.id;
        } catch (err) {
            console.error('Error creating client from agenda:', err);
            showToast('Erro ao cadastrar novo cliente', 'error');
            return;
        }
    } else if (!clienteNome && select && select.value) {
        const opt = select.selectedOptions[0];
        clienteNome = opt.getAttribute('data-nome') || opt.textContent.split(' (')[0].trim();
        clienteId = select.value;
    }

    if (!clienteNome) {
        showToast('Selecione ou cadastre um cliente', 'warning');
        return;
    }

    const valorTotal = parseFloat(document.getElementById('agValorTotal').value) || 0;
    const valorSinal = parseFloat(document.getElementById('agValorSinal').value) || 0;
    const sinalPago = document.getElementById('agSinalPago').value;
    const descricao = document.getElementById('agDescricao').value.trim();
    const dataAg = document.getElementById('agData').value;
    const horaInicio = document.getElementById('agInicio').value;
    const horaFim = document.getElementById('agFim').value;
    const status = document.getElementById('agStatus').value;
    const referenciaUrl = document.getElementById('agReferenciaUrl').value || '';

    const apptData = {
        cliente: clienteNome,
        clienteId: clienteId,
        descricao: descricao || 'Tatuagem',
        data: dataAg,
        horaInicio: horaInicio,
        horaFim: horaFim,
        valor: valorTotal,
        valorTotal: valorTotal,
        valorSinal: valorSinal,
        sinalPago: sinalPago,
        status: status,
        referenciaUrl: referenciaUrl
    };

    try {
        if (editingId && editingType === 'agendamento') {
            await DataStore.updateAgendamento(editingId, apptData);
            showToast('Agendamento atualizado!', 'success');
        } else {
            const createdAg = await DataStore.addAgendamento(apptData);
            const agId = createdAg ? createdAg.id : '';

            // Financial linkage for deposit
            const restanteAg = Math.max(valorTotal - valorSinal, 0);
            const dataVencimentoRestante = document.getElementById('agDataVencimentoRestante')?.value || dataAg;

            if (sinalPago === 'sim' && valorSinal > 0) {
                const createdSinal = await DataStore.addSinal({
                    cliente: clienteNome,
                    clienteId: clienteId,
                    descricao: descricao || 'Agendamento de Sessão',
                    valorTotal: valorTotal,
                    valorSinal: valorSinal,
                    dataSinal: dataAg,
                    dataVencimento: dataVencimentoRestante,
                    metodo: 'pix',
                    agendamentoId: agId
                });

                const createdTx = await DataStore.addTransacao({
                    tipo: 'entrada',
                    valor: valorSinal,
                    descricao: `Sinal - ${descricao || 'Agendamento'} (${clienteNome})`,
                    cliente: clienteNome,
                    clienteId: clienteId,
                    metodo: 'pix',
                    data: dataAg,
                    status: 'recebido',
                    categoria: 'sinal',
                    sinalId: createdSinal ? createdSinal.id : '',
                    agendamentoId: agId
                });

                if (createdSinal && createdTx) {
                    await DataStore.updateSinal(createdSinal.id, { transacaoId: createdTx.id });
                }

                // If remaining amount > 0, register in valoresReceber (user request 1)
                if (restanteAg > 0) {
                    await DataStore.addValorReceber({
                        cliente: clienteNome,
                        clienteId: clienteId,
                        descricao: `Restante: ${descricao || 'Sessão de Tatuagem'}`,
                        valorTotal: restanteAg,
                        valorPago: 0,
                        dataVencimento: dataVencimentoRestante,
                        dataSessao: dataAg,
                        sinalId: createdSinal ? createdSinal.id : '',
                        transacaoId: createdTx ? createdTx.id : '',
                        agendamentoId: agId
                    });
                }
            } else if (sinalPago === 'pendente' && valorSinal > 0) {
                await DataStore.addValorReceber({
                    cliente: clienteNome,
                    clienteId: clienteId,
                    descricao: `Sinal agendamento: ${descricao || 'Tatuagem'}`,
                    valorTotal: valorSinal,
                    valorPago: 0,
                    dataVencimento: dataAg,
                    dataSessao: dataAg,
                    agendamentoId: agId
                });
                if (restanteAg > 0) {
                    await DataStore.addValorReceber({
                        cliente: clienteNome,
                        clienteId: clienteId,
                        descricao: `Restante: ${descricao || 'Sessão de Tatuagem'}`,
                        valorTotal: restanteAg,
                        valorPago: 0,
                        dataVencimento: dataVencimentoRestante,
                        dataSessao: dataAg,
                        agendamentoId: agId
                    });
                }
            } else if (sinalPago === 'nao' && restanteAg > 0) {
                await DataStore.addValorReceber({
                    cliente: clienteNome,
                    clienteId: clienteId,
                    descricao: `Total Sessão: ${descricao || 'Tatuagem'}`,
                    valorTotal: restanteAg,
                    valorPago: 0,
                    dataVencimento: dataVencimentoRestante,
                    dataSessao: dataAg,
                    agendamentoId: agId
                });
            }

            showToast('Agendamento criado com sucesso!', 'success');
        }

        closeModal(modalAgendaOverlay);
        e.target.reset();
        resetAgDropzone();
        document.getElementById('agData').value = TODAY;
        if (document.getElementById('newAgClienteFields')) {
            document.getElementById('newAgClienteFields').style.display = 'none';
        }
        if (document.getElementById('agClienteBadge')) {
            document.getElementById('agClienteBadge').style.display = 'none';
        }
        refreshAll();
    } catch (err) {
        console.error('Save error:', err);
        showToast('Erro ao salvar', 'error');
    }
});


// =========================================================
// WHATSAPP NOTIFICATIONS
// =========================================================

function sendWhatsApp(phone, message) {
    const cleanPhone = phone.replace(/\D/g, '');
    const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// Add WhatsApp button context (globally accessible)
window.sendAppointmentReminder = async function(agendamentoId) {
    try {
        const a = await DataStore._getDB().getById('agendamentos', agendamentoId);
        if (!a) return;
        const clientes = await DataStore.getClientes();
        const cliente = clientes.find(c => c.nome === a.cliente);
        if (!cliente?.telefone) {
            showToast('Telefone do cliente não encontrado', 'warning');
            return;
        }
        const msg = `Olá ${a.cliente}! 🎨\n\nLembrete do seu agendamento no *GH Studio*:\n📅 Data: ${formatDate(a.data)}\n🕐 Horário: ${a.horaInicio} às ${a.horaFim}\n✏️ ${a.descricao}\n\nNos vemos lá! 💪`;
        sendWhatsApp(cliente.telefone, msg);
    } catch (e) { showToast('Erro ao enviar lembrete', 'error'); }
};

window.sendPaymentReminder = async function(valorReceberId) {
    try {
        const v = await DataStore._getDB().getById('valoresReceber', valorReceberId);
        if (!v) return;
        const clientes = await DataStore.getClientes();
        const cliente = clientes.find(c => c.nome === v.cliente);
        if (!cliente?.telefone) {
            showToast('Telefone do cliente não encontrado', 'warning');
            return;
        }
        const restante = v.valorTotal - v.valorPago;
        const msg = `Olá ${v.cliente}! 👋\n\nPassando para lembrar sobre o pagamento pendente no *GH Studio*:\n💰 Valor: ${formatCurrency(restante)}\n📋 Ref: ${v.descricao}\n📅 Vencimento: ${formatDate(v.dataVencimento)}\n\nQualquer dúvida, estamos à disposição! ✨`;
        sendWhatsApp(cliente.telefone, msg);
    } catch (e) { showToast('Erro ao enviar lembrete', 'error'); }
};


// =========================================================
// SEARCH
// =========================================================

document.getElementById('searchClientes').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.cliente-card').forEach(card => {
        const name = card.querySelector('.cliente-name').textContent.toLowerCase();
        card.style.display = name.includes(query) ? '' : 'none';
    });
});


// =========================================================
// CONTROLE DE ESTOQUE & INSUMOS
// =========================================================

const estoqueCatBadges = {
    agulhas: { label: '💉 Agulhas & Cartuchos', cls: 'cat-badge-agulhas' },
    tintas: { label: '🎨 Tintas & Pigmentos', cls: 'cat-badge-tintas' },
    epi: { label: '🧤 EPIs & Higiene', cls: 'cat-badge-epi' },
    preparacao: { label: '📄 Decalque & Bancada', cls: 'cat-badge-preparacao' },
    aftercare: { label: '🧴 Pomadas & Cuidados', cls: 'cat-badge-aftercare' },
    geral: { label: '📦 Geral / Outros', cls: 'cat-badge-geral' }
};

let currentEstoqueCategoria = 'todos';
let currentEstoqueStatus = 'todos';
let currentEstoqueSearch = '';

async function renderEstoque() {
    const tableBody = document.getElementById('estoqueTableBody');
    if (!tableBody) return;

    try {
        const [allItens, filteredItens] = await Promise.all([
            DataStore.getEstoque(),
            DataStore.getEstoque({
                categoria: currentEstoqueCategoria,
                status: currentEstoqueStatus,
                search: currentEstoqueSearch
            })
        ]);

        // 1. Calculate & Render KPIs
        let totalQtd = allItens.length;
        let normalQtd = 0;
        let baixoQtd = 0;
        let esgotadoQtd = 0;
        let valorTotalEstoque = 0;

        allItens.forEach(item => {
            const qtd = parseFloat(item.quantidade) || 0;
            const min = parseFloat(item.quantidadeMinima) || 0;
            const custo = parseFloat(item.precoCusto) || 0;

            valorTotalEstoque += (qtd * custo);

            if (qtd <= 0) {
                esgotadoQtd++;
            } else if (qtd <= min) {
                baixoQtd++;
            } else {
                normalQtd++;
            }
        });

        const kpiTotal = document.getElementById('kpiEstoqueTotal');
        const kpiNormal = document.getElementById('kpiEstoqueNormal');
        const kpiBaixo = document.getElementById('kpiEstoqueBaixo');
        const kpiEsgotado = document.getElementById('kpiEstoqueEsgotado');
        const kpiValor = document.getElementById('kpiEstoqueValor');

        if (kpiTotal) kpiTotal.textContent = totalQtd;
        if (kpiNormal) kpiNormal.textContent = normalQtd;
        if (kpiBaixo) kpiBaixo.textContent = baixoQtd;
        if (kpiEsgotado) kpiEsgotado.textContent = esgotadoQtd;
        if (kpiValor) kpiValor.textContent = formatCurrency(valorTotalEstoque);

        // Update Inventory Alert Badge on Sidebar
        const alertBadge = document.getElementById('inventoryAlertBadge');
        const totalAlertas = baixoQtd + esgotadoQtd;
        if (alertBadge) {
            if (totalAlertas > 0) {
                alertBadge.textContent = totalAlertas;
                alertBadge.style.display = 'inline-flex';
            } else {
                alertBadge.style.display = 'none';
            }
        }

        // 2. Render Table
        if (filteredItens.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding: 48px 16px; color: var(--text-tertiary);">
                        <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:36px;height:36px;color:var(--text-tertiary);"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                            <span style="font-weight:600; font-size:0.95rem; color:var(--text-secondary);">Nenhum material encontrado</span>
                            <span style="font-size:0.8rem;">Tente ajustar os filtros de busca ou cadastre um novo item.</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filteredItens.map(item => {
            const qtd = parseFloat(item.quantidade) || 0;
            const min = parseFloat(item.quantidadeMinima) || 1;
            const custo = parseFloat(item.precoCusto) || 0;
            const totalItemVal = qtd * custo;
            const catInfo = estoqueCatBadges[item.categoria] || estoqueCatBadges.geral;

            // Percentage of safety stock
            const pct = Math.min(Math.round((qtd / min) * 100), 100);
            let statusPill = '';
            let barFillClass = 'bar-fill-green';

            if (qtd <= 0) {
                statusPill = `<span class="estoque-status-pill status-pill-danger">🚨 Esgotado</span>`;
                barFillClass = 'bar-fill-red';
            } else if (qtd <= min) {
                statusPill = `<span class="estoque-status-pill status-pill-warning">⚠️ Baixo (${qtd}/${min})</span>`;
                barFillClass = 'bar-fill-yellow';
            } else {
                statusPill = `<span class="estoque-status-pill status-pill-normal">✅ Seguro (${qtd}/${min})</span>`;
                barFillClass = 'bar-fill-green';
            }

            return `
                <tr data-id="${item.id}">
                    <td>
                        <div class="estoque-item-title">${item.nome}</div>
                        <div class="estoque-item-sub">
                            ${item.marca ? `<span>🏷️ ${item.marca}</span>` : ''}
                            ${item.fornecedor ? `<span>🏪 ${item.fornecedor}</span>` : ''}
                        </div>
                    </td>
                    <td>
                        <span class="estoque-cat-badge ${catInfo.cls}">${catInfo.label}</span>
                    </td>
                    <td>
                        <div class="estoque-qty-wrap">
                            <span class="estoque-qty-num" style="${qtd <= 0 ? 'color:var(--red);' : qtd <= min ? 'color:#F59E0B;' : ''}">${qtd}</span>
                            <span class="estoque-qty-unit">${item.unidade || 'un'}</span>
                        </div>
                    </td>
                    <td>
                        <div class="estoque-level-box">
                            <div class="estoque-level-status">
                                ${statusPill}
                                <span style="font-size:0.7rem; color:var(--text-tertiary);">${pct}%</span>
                            </div>
                            <div class="estoque-level-bar-bg">
                                <div class="estoque-level-bar-fill ${barFillClass}" style="width: ${qtd <= 0 ? 0 : Math.max(pct, 8)}%;"></div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span style="font-weight:600; color:var(--text-primary);">${custo > 0 ? formatCurrency(custo) : '—'}</span>
                    </td>
                    <td>
                        <span style="font-weight:700; color:var(--gold);">${totalItemVal > 0 ? formatCurrency(totalItemVal) : 'R$ 0,00'}</span>
                    </td>
                    <td>
                        <div class="estoque-quick-adjust">
                            <button type="button" class="btn-qty-adj minus" onclick="window.ajustarEstoqueInline('${item.id}', -1)" title="Dar baixa (-1)">−</button>
                            <span style="font-size:0.75rem; font-weight:700; min-width:18px; text-align:center;">1</span>
                            <button type="button" class="btn-qty-adj" onclick="window.ajustarEstoqueInline('${item.id}', +1)" title="Adicionar (+1)">+</button>
                        </div>
                    </td>
                    <td style="text-align: right;">
                        <div style="display:flex; justify-content:flex-end; align-items:center; gap:6px;">
                            <button type="button" class="btn-secondary btn-sm" onclick="window.openEstoqueMovModal('${item.id}', 'entrada')" title="Registrar Entrada/Compra deste material">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;margin-right:4px;"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                                <span>Comprar</span>
                            </button>
                            <button type="button" class="btn-action edit" onclick="window.openEstoqueModal('${item.id}')" title="Editar item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button type="button" class="btn-action delete" onclick="window.deleteEstoqueItemPrompt('${item.id}', '${(item.nome || '').replace(/'/g, "\\'")}')" title="Excluir item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error('Error rendering estoque:', e);
    }
}

// Global modal triggers for Estoque
window.openEstoqueModal = async function(id = null) {
    const overlay = document.getElementById('modalEstoqueOverlay');
    const form = document.getElementById('formEstoque');
    const title = document.getElementById('modalEstoqueTitle');
    const btnDel = document.getElementById('btnDeleteEstoqueItem');

    if (!overlay || !form) return;
    form.reset();

    if (id) {
        try {
            const item = await DataStore.getEstoqueItemById(id);
            if (!item) return;
            title.textContent = 'Editar Item de Estoque';
            document.getElementById('estoqueId').value = item.id;
            document.getElementById('estNome').value = item.nome || '';
            document.getElementById('estCategoria').value = item.categoria || 'geral';
            document.getElementById('estUnidade').value = item.unidade || 'cx';
            document.getElementById('estQuantidade').value = item.quantidade !== undefined ? item.quantidade : 0;
            document.getElementById('estQuantidadeMinima').value = item.quantidadeMinima !== undefined ? item.quantidadeMinima : 1;
            document.getElementById('estPrecoCusto').value = item.precoCusto || '';
            document.getElementById('estMarca').value = item.marca || '';
            document.getElementById('estFornecedor').value = item.fornecedor || '';
            document.getElementById('estNotas').value = item.notas || '';

            if (btnDel) {
                btnDel.style.display = 'inline-flex';
                btnDel.onclick = () => window.deleteEstoqueItemPrompt(item.id, item.nome);
            }
        } catch (e) {
            console.error('Error opening item for edit:', e);
            showToast('Erro ao carregar item', 'error');
            return;
        }
    } else {
        title.textContent = 'Novo Item de Estoque';
        document.getElementById('estoqueId').value = '';
        document.getElementById('estQuantidade').value = 0;
        document.getElementById('estQuantidadeMinima').value = 2;
        if (btnDel) btnDel.style.display = 'none';
    }

    openModal(overlay);
};

window.openEstoqueMovModal = async function(preselectedId = null, tipo = 'entrada') {
    const overlay = document.getElementById('modalEstoqueMovOverlay');
    const form = document.getElementById('formEstoqueMov');
    const select = document.getElementById('movItemSelect');
    const title = document.getElementById('modalEstoqueMovTitle');
    const selTipo = document.getElementById('movTipo');
    const boxFin = document.getElementById('movFinanceiroBox');

    if (!overlay || !form || !select) return;
    form.reset();

    try {
        const itens = await DataStore.getEstoque();
        select.innerHTML = itens.map(i => `
            <option value="${i.id}" data-custo="${i.precoCusto || 0}" data-unidade="${i.unidade || 'un'}">${i.nome} (Atual: ${i.quantidade} ${i.unidade || 'un'})</option>
        `).join('');

        if (preselectedId) {
            select.value = preselectedId;
        }

        selTipo.value = tipo;
        document.getElementById('movData').value = TODAY;
        document.getElementById('movQuantidade').value = 1;

        const updateFieldsForSelection = () => {
            const opt = select.selectedOptions[0];
            const isEntrada = selTipo.value === 'entrada';
            title.textContent = isEntrada ? 'Registrar Entrada / Compra' : 'Registrar Baixa de Material';
            if (boxFin) boxFin.style.display = isEntrada ? 'block' : 'none';

            if (isEntrada && opt) {
                const custo = parseFloat(opt.getAttribute('data-custo')) || 0;
                const qtd = parseFloat(document.getElementById('movQuantidade').value) || 1;
                document.getElementById('movValorTotal').value = (custo * qtd).toFixed(2);
            }
        };

        select.onchange = updateFieldsForSelection;
        selTipo.onchange = updateFieldsForSelection;
        document.getElementById('movQuantidade').oninput = updateFieldsForSelection;

        updateFieldsForSelection();
        openModal(overlay);
    } catch (e) {
        console.error('Error opening mov modal:', e);
    }
};

window.ajustarEstoqueInline = async function(id, delta) {
    try {
        const res = await DataStore.ajustarEstoque(id, delta, 'Ajuste rápido');
        showToast(`${res.item.nome}: ${res.novaQtd} ${res.item.unidade || 'un'}`, 'success');
        await renderEstoque();
        if (window.NotificationService) NotificationService.refresh();
    } catch (e) {
        console.error('Inline adjust error:', e);
        showToast('Erro ao ajustar estoque', 'error');
    }
};

window.deleteEstoqueItemPrompt = async function(id, nome) {
    const ok = await showConfirm('Excluir do Estoque', `Deseja realmente excluir o item "${nome}" do cadastro de estoque?`);
    if (!ok) return;
    try {
        await DataStore.deleteEstoqueItem(id);
        showToast('Item removido do estoque!', 'success');
        closeModal(document.getElementById('modalEstoqueOverlay'));
        await renderEstoque();
        if (window.NotificationService) NotificationService.refresh();
    } catch (e) {
        console.error('Delete error:', e);
        showToast('Erro ao excluir item', 'error');
    }
};

// Event handlers for Estoque buttons & forms
const setupEstoqueListeners = () => {
    const modalEstoqueOverlay = document.getElementById('modalEstoqueOverlay');
    const modalEstoqueMovOverlay = document.getElementById('modalEstoqueMovOverlay');

    document.getElementById('btnNovoItemEstoque')?.addEventListener('click', () => window.openEstoqueModal());
    document.getElementById('btnRegistrarCompraEstoque')?.addEventListener('click', () => window.openEstoqueMovModal(null, 'entrada'));

    document.getElementById('modalEstoqueClose')?.addEventListener('click', () => closeModal(modalEstoqueOverlay));
    document.getElementById('btnCancelEstoque')?.addEventListener('click', () => closeModal(modalEstoqueOverlay));
    modalEstoqueOverlay?.addEventListener('click', (e) => { if (e.target === modalEstoqueOverlay) closeModal(modalEstoqueOverlay); });

    document.getElementById('modalEstoqueMovClose')?.addEventListener('click', () => closeModal(modalEstoqueMovOverlay));
    document.getElementById('btnCancelEstoqueMov')?.addEventListener('click', () => closeModal(modalEstoqueMovOverlay));
    modalEstoqueMovOverlay?.addEventListener('click', (e) => { if (e.target === modalEstoqueMovOverlay) closeModal(modalEstoqueMovOverlay); });

    // Category filter chips
    document.querySelectorAll('#estoqueCategoryChips .filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#estoqueCategoryChips .filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentEstoqueCategoria = chip.dataset.cat || 'todos';
            renderEstoque();
        });
    });

    // Status filter
    document.getElementById('filterEstoqueStatus')?.addEventListener('change', (e) => {
        currentEstoqueStatus = e.target.value;
        renderEstoque();
    });

    // Search filter
    document.getElementById('searchEstoque')?.addEventListener('input', (e) => {
        currentEstoqueSearch = e.target.value;
        renderEstoque();
    });

    // Form: Novo/Editar Item
    document.getElementById('formEstoque')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('estoqueId').value;
        const data = {
            nome: document.getElementById('estNome').value.trim(),
            categoria: document.getElementById('estCategoria').value,
            unidade: document.getElementById('estUnidade').value,
            quantidade: parseFloat(document.getElementById('estQuantidade').value) || 0,
            quantidadeMinima: parseFloat(document.getElementById('estQuantidadeMinima').value) || 1,
            precoCusto: parseFloat(document.getElementById('estPrecoCusto').value) || 0,
            marca: document.getElementById('estMarca').value.trim(),
            fornecedor: document.getElementById('estFornecedor').value.trim(),
            notas: document.getElementById('estNotas').value.trim()
        };

        try {
            if (id) {
                await DataStore.updateEstoqueItem(id, data);
                showToast('Item atualizado com sucesso!', 'success');
            } else {
                await DataStore.addEstoqueItem(data);
                showToast('Novo item cadastrado no estoque!', 'success');
            }
            closeModal(modalEstoqueOverlay);
            await renderEstoque();
            if (window.NotificationService) NotificationService.refresh();
        } catch (err) {
            console.error('Error saving estoque item:', err);
            showToast('Erro ao salvar item no estoque', 'error');
        }
    });

    // Form: Movimentação (Entrada/Saída)
    document.getElementById('formEstoqueMov')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const itemId = document.getElementById('movItemSelect').value;
        const tipo = document.getElementById('movTipo').value;
        const qtd = parseFloat(document.getElementById('movQuantidade').value) || 1;
        const gerarDespesa = document.getElementById('movGerarDespesa')?.checked && tipo === 'entrada';
        const valorTotal = parseFloat(document.getElementById('movValorTotal').value) || 0;
        const metodo = document.getElementById('movMetodo').value || 'pix';
        const data = document.getElementById('movData').value || TODAY;
        const motivo = document.getElementById('movMotivo').value.trim();

        if (!itemId) {
            showToast('Selecione um item', 'warning');
            return;
        }

        const delta = tipo === 'entrada' ? qtd : -qtd;

        try {
            const despesaInfo = gerarDespesa ? {
                valor: valorTotal,
                metodo: metodo,
                data: data,
                descricao: motivo ? `Compra estoque: ${motivo}` : null
            } : null;

            await DataStore.ajustarEstoque(itemId, delta, motivo || (tipo === 'entrada' ? 'Compra de reposição' : 'Consumo'), gerarDespesa, despesaInfo);

            if (gerarDespesa && valorTotal > 0) {
                showToast(`Entrada de ${qtd} un registrada e despesa de ${formatCurrency(valorTotal)} lançada no Financeiro! 🎉`, 'success');
            } else {
                showToast(`Movimentação de ${tipo === 'entrada' ? '+' : '-'}${qtd} registrada com sucesso!`, 'success');
            }

            closeModal(modalEstoqueMovOverlay);
            await refreshAll();
        } catch (err) {
            console.error('Error saving inventory movement:', err);
            showToast('Erro ao registrar movimentação', 'error');
        }
    });
};

// =========================================================
// REFRESH ALL
// =========================================================

async function refreshAll() {
    await DataStore.syncAllClientStats();

    await Promise.all([
        renderDashboardCards(),
        renderMetaMensal(),
        renderChart(),
        renderAppointments(),
        renderRecentTransactions(),
        renderWeekView(),
        renderListView(),
        renderAllTransactions(),
        renderSinais(),
        renderDespesas(),
        renderValoresReceber(),
        renderClientes(),
        renderGaleria(),
        renderEstoque()
    ]);

    if (window.WhatsAppService) {
        await WhatsAppService.renderHub();
    }

    if (window.NotificationService) {
        await NotificationService.refresh();
    }

    if (window.TattooCalculator && typeof TattooCalculator.populateClientSelect === 'function') {
        TattooCalculator.populateClientSelect();
    }
}


// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    // Set current date display
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    document.getElementById('txData').value = TODAY;
    document.getElementById('agData').value = TODAY;

    // ── Instant Cached Avatar Restore (prevents flash) ──
    const preCachedAvatar = localStorage.getItem('gh_avatar_current');
    if (preCachedAvatar) {
        const uAv = document.getElementById('userAvatar');
        if (uAv) uAv.innerHTML = `<img src="${preCachedAvatar}" class="user-avatar-img" alt="Avatar">`;
    }

    // ── Dashboard Month Navigation Setup ──
    setupDashboardMonthSelector();

    // ── Meta Mensal Modal Setup ──
    setupMetaModal();

    // ── Estoque & Materiais Setup ──
    setupEstoqueListeners();

    // ── Calculadora Inteligente de Orçamento Setup ──
    if (window.TattooCalculator) {
        TattooCalculator.init();
    }
    const modalCalcOverlay = document.getElementById('modalCalculadoraOverlay');
    document.getElementById('btnAbrirCalculadora')?.addEventListener('click', () => {
        if (window.TattooCalculator) TattooCalculator.openModal();
    });
    document.getElementById('modalCalculadoraClose')?.addEventListener('click', () => closeModal(modalCalcOverlay));
    modalCalcOverlay?.addEventListener('click', (e) => {
        if (e.target === modalCalcOverlay) closeModal(modalCalcOverlay);
    });

    // ── WhatsApp Hub Tab Navigation ──
    document.querySelectorAll('.wa-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabKey = tab.dataset.watab || tab.dataset.tab;
            if (window.WhatsAppService && WhatsAppService.switchTab) {
                WhatsAppService.switchTab(tabKey);
            }
        });
    });

    // ── Chart Period Toggle (6 meses / 12 meses) ──
    document.querySelectorAll('.chart-filters .chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chart-filters .chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            renderChart(chip.dataset.period || '6m');
        });
    });

    // ── Setup Dropzones ──
    setupDropzone(
        document.getElementById('agDropzone'),
        document.getElementById('agFileInput'),
        document.getElementById('agDropzonePrompt'),
        document.getElementById('agDropzonePreview'),
        document.getElementById('agPreviewImg'),
        document.getElementById('agReferenciaUrl'),
        document.getElementById('agRemovePreview'),
        'references'
    );

    setupDropzone(
        document.getElementById('galDropzone'),
        document.getElementById('galFileInput'),
        document.getElementById('galDropzonePrompt'),
        document.getElementById('galDropzonePreview'),
        document.getElementById('galPreviewImg'),
        document.getElementById('galImagemUrl'),
        document.getElementById('galRemovePreview'),
        'gallery'
    );

    // ── Notification Service Init ──
    if (window.NotificationService) {
        NotificationService.init();
    }

    // ── Auth Integration ──
    Auth.init(
        async (user) => {
            // User logged in
            document.getElementById('userName').textContent = user.displayName || user.email.split('@')[0];
            
            // Load Studio Profile name & role
            try {
                const studioProf = await DataStore.getStudioProfile();
                if (studioProf) {
                    if (studioProf.nomeArtista) {
                        document.getElementById('userName').textContent = studioProf.nomeArtista;
                    }
                    const studioRoleEl = document.getElementById('userStudioRole');
                    if (studioRoleEl) {
                        studioRoleEl.textContent = studioProf.nomeEstudio || 'GH Studio';
                    }
                }
            } catch (pErr) {}

            // Restore avatar if custom photo exists
            const savedAvatar = localStorage.getItem('gh_avatar_' + user.uid) || localStorage.getItem('gh_avatar_current') || user.photoURL;
            if (savedAvatar) {
                document.getElementById('userAvatar').innerHTML = `<img src="${savedAvatar}" class="user-avatar-img" alt="Avatar">`;
            } else {
                document.getElementById('userAvatar').textContent = getInitials(user.displayName || user.email);
            }

            // Show demo banner
            if (IS_DEMO_MODE || user.isGuest) {
                document.getElementById('demoBannerMain').style.display = 'flex';
            }

            // Seed data link
            const seedLink = document.getElementById('seedDataLink');
            if (seedLink) {
                seedLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    // Clear existing to re-seed with full portfolio & images
                    await DataStore.clearAllData();
                    const seeded = await DataStore.seedDemoData();
                    if (seeded) {
                        showToast('Dados e portfólio de exemplo recarregados!', 'success');
                        refreshAll();
                    } else {
                        showToast('Dados já existem!', 'warning');
                    }
                });
            }

            // Close demo banner
            const closeBtn = document.getElementById('closeDemoBanner');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    document.getElementById('demoBannerMain').style.display = 'none';
                });
            }

            // Check if clean requested via URL
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('clean') === 'true') {
                await DataStore.clearAllData();
                window.history.replaceState({}, document.title, window.location.pathname);
            }

            // Load all data from user database
            await refreshAll();
        },
        () => {
            // User not logged in — redirect to login
            window.location.href = 'login.html';
        }
    );

    // ── Profile Photo Upload ──
    const avatarFileInput = document.getElementById('avatarFileInput');
    const btnEditAvatar = document.getElementById('btnEditAvatar');
    const userAvatarWrap = document.getElementById('userAvatarWrap');

    const triggerAvatarUpload = () => avatarFileInput?.click();
    btnEditAvatar?.addEventListener('click', (e) => { e.stopPropagation(); triggerAvatarUpload(); });
    userAvatarWrap?.addEventListener('click', triggerAvatarUpload);

    avatarFileInput?.addEventListener('change', async () => {
        if (!avatarFileInput.files?.length) return;
        const file = avatarFileInput.files[0];
        if (!file.type.startsWith('image/')) {
            showToast('Selecione uma imagem válida (JPG, PNG ou WEBP)', 'warning');
            avatarFileInput.value = '';
            return;
        }

        try {
            showToast('Processando foto de perfil...', 'info');
            const base64 = await resizeImageToSquare(file, 200);
            
            // Instantly render image in avatar container
            const userAvatarEl = document.getElementById('userAvatar');
            if (userAvatarEl) {
                userAvatarEl.innerHTML = `<img src="${base64}" class="user-avatar-img" alt="Avatar">`;
            }
            const modalPerfilAvatar = document.getElementById('modalPerfilAvatar');
            if (modalPerfilAvatar) {
                modalPerfilAvatar.innerHTML = `<img src="${base64}" class="user-avatar-img" alt="Avatar">`;
            }

            // Obtain current user safely without throwing
            const currentUser = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : (typeof Auth !== 'undefined' && typeof Auth.getUser === 'function' ? Auth.getUser() : null);
            const userKey = currentUser?.uid || 'default';

            try {
                localStorage.setItem('gh_avatar_' + userKey, base64);
                localStorage.setItem('gh_avatar_current', base64);
            } catch (storageErr) {
                console.warn('Could not save avatar to localStorage:', storageErr);
            }

            // Sync with Firebase Auth photoURL if authenticated and URL length allows
            try {
                if (typeof auth !== 'undefined' && auth && auth.currentUser) {
                    if (base64.length <= 2048) {
                        await auth.currentUser.updateProfile({ photoURL: base64 });
                    }
                }
            } catch (authErr) {
                console.warn('Could not update Firebase photoURL:', authErr);
            }

            if (currentUser) {
                currentUser.photoURL = base64;
            }

            showToast('Foto de perfil atualizada com sucesso!', 'success');
        } catch (err) {
            console.error('Error updating avatar:', err);
            showToast('Erro ao atualizar foto de perfil: ' + (err.message || 'Tente outra imagem'), 'error');
        } finally {
            avatarFileInput.value = '';
        }
    });

    function resizeImageToSquare(file, size = 200) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = size;
                        canvas.height = size;
                        const ctx = canvas.getContext('2d');
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        const minSide = Math.min(img.width, img.height);
                        const sx = (img.width - minSide) / 2;
                        const sy = (img.height - minSide) / 2;
                        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                    } catch (canvasErr) {
                        reject(canvasErr);
                    }
                };
                img.onerror = () => reject(new Error('Formato ou arquivo de imagem corrompido.'));
                img.src = e.target.result;
            };
            reader.onerror = () => reject(new Error('Não foi possível ler o arquivo selecionado.'));
            reader.readAsDataURL(file);
        });
    }

    // ── Logout ──
    document.getElementById('btnLogout')?.addEventListener('click', async () => {
        const confirmed = await showConfirm('Sair do sistema', 'Deseja realmente fazer logout?');
        if (confirmed) Auth.logout();
    });

    // ── PDF Export Button ──
    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) {
        btnExportPDF.addEventListener('click', generatePDFReport);
    }

    // ── Fechamento Mensal / DRE Modal ──
    setupFechamentoModal();

    // ── PWA & Conexão Mobile ──
    setupPwaAndMobileConnect();
});

// =========================================================
// PWA & Mobile Connect Integration
// =========================================================

function setupPwaAndMobileConnect() {
    // 1. Service Worker Registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('GH Studio PWA ServiceWorker ativo:', reg.scope))
                .catch(err => console.warn('PWA ServiceWorker aviso:', err));
        });
    }

    // 2. Capture install prompt (beforeinstallprompt) for Android/Chrome/Edge
    let deferredPrompt = null;
    const pwaPromptWrap = document.getElementById('pwaInstallPromptWrap');
    const btnTriggerPwa = document.getElementById('btnTriggerPwaInstall');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (pwaPromptWrap) {
            pwaPromptWrap.style.display = 'block';
        }
    });

    btnTriggerPwa?.addEventListener('click', async () => {
        if (!deferredPrompt) {
            showToast('Para instalar, utilize a opção do navegador ou adicione à tela inicial.', 'info');
            return;
        }
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
            showToast('GH Studio instalado como aplicativo!', 'success');
            if (pwaPromptWrap) pwaPromptWrap.style.display = 'none';
        }
        deferredPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
        showToast('GH Studio adicionado com sucesso à sua tela de início!', 'success');
        if (pwaPromptWrap) pwaPromptWrap.style.display = 'none';
    });

    // 3. Connect Mobile Modal & QR Code
    const btnConnectMobile = document.getElementById('nav-connect-mobile');
    const btnCloudStatus = document.getElementById('btnCloudStatus');
    const modalConnectMobile = document.getElementById('modalConnectMobileOverlay');
    const modalClose = document.getElementById('modalConnectMobileClose');
    const btnCancel = document.getElementById('btnCancelConnectMobile');
    const btnCopy = document.getElementById('btnCopyAppUrl');
    const qrContainer = document.getElementById('qrcodeMobile');
    const tabIos = document.getElementById('tabInstalIos');
    const tabAndroid = document.getElementById('tabInstalAndroid');
    const instIos = document.getElementById('instrucoesIos');
    const instAndroid = document.getElementById('instrucoesAndroid');

    const tabModoInstalar = document.getElementById('tabModoInstalar');
    const tabModoQr = document.getElementById('tabModoQr');
    const secInstalarDirect = document.getElementById('secInstalarDirect');
    const secQrCode = document.getElementById('secQrCode');

    const appUrl = (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'))
        ? 'https://gh-studio-gestao.web.app'
        : window.location.origin;

    const directUrlEl = document.getElementById('mobileDirectUrl');
    if (directUrlEl) directUrlEl.textContent = appUrl;

    let qrGenerated = false;
    function renderQrCode() {
        if (!qrContainer) return;
        if (qrGenerated && qrContainer.children.length > 0) return;
        qrContainer.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(qrContainer, {
                    text: appUrl,
                    width: 130,
                    height: 130,
                    colorDark: '#0A0A0B',
                    colorLight: '#FFFFFF',
                    correctLevel: QRCode.CorrectLevel.M
                });
                qrGenerated = true;
                return;
            } catch (qrErr) {
                console.warn('Erro ao instanciar QRCodeJS:', qrErr);
            }
        }
        // Fallback to QR server API image
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(appUrl)}`;
        img.alt = 'QR Code para acesso mobile';
        img.style.width = '130px';
        img.style.height = '130px';
        img.style.display = 'block';
        img.style.borderRadius = '8px';
        qrContainer.appendChild(img);
        qrGenerated = true;
    }

    // Direct PWA install prompt button
    let deferredPwaPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPwaPrompt = e;
        const pwaWrap = document.getElementById('pwaInstallPromptWrap');
        if (pwaWrap) pwaWrap.style.display = 'block';
    });

    document.getElementById('btnTriggerPwaInstall')?.addEventListener('click', async () => {
        if (deferredPwaPrompt) {
            deferredPwaPrompt.prompt();
            const { outcome } = await deferredPwaPrompt.userChoice;
            if (outcome === 'accepted') {
                showToast('Aplicativo instalado com sucesso no seu aparelho!', 'success');
                if (modalConnectMobile) closeModal(modalConnectMobile);
            }
            deferredPwaPrompt = null;
        } else {
            showToast('Para instalar agora, siga os passos abaixo do seu navegador!', 'info');
        }
    });

    const openConnectModal = () => {
        const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
        const isAndroid = /android/i.test(navigator.userAgent);

        // Pre-configure mode tabs
        if (isMobile) {
            tabModoInstalar?.classList.add('active');
            tabModoQr?.classList.remove('active');
            if (secInstalarDirect) secInstalarDirect.style.display = 'block';
            if (secQrCode) secQrCode.style.display = 'none';
        } else {
            tabModoQr?.classList.add('active');
            tabModoInstalar?.classList.remove('active');
            if (secQrCode) secQrCode.style.display = 'block';
            if (secInstalarDirect) secInstalarDirect.style.display = 'none';
            renderQrCode();
        }

        // Pre-configure OS tabs (Android default for Galaxy/Android)
        if (isAndroid) {
            tabAndroid?.classList.add('active');
            tabIos?.classList.remove('active');
            if (instAndroid) instAndroid.style.display = 'block';
            if (instIos) instIos.style.display = 'none';
        } else if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
            tabIos?.classList.add('active');
            tabAndroid?.classList.remove('active');
            if (instIos) instIos.style.display = 'block';
            if (instAndroid) instAndroid.style.display = 'none';
        }

        openModal(modalConnectMobile);
    };

    btnConnectMobile?.addEventListener('click', openConnectModal);
    btnCloudStatus?.addEventListener('click', openConnectModal);

    modalClose?.addEventListener('click', () => closeModal(modalConnectMobile));
    btnCancel?.addEventListener('click', () => closeModal(modalConnectMobile));
    modalConnectMobile?.addEventListener('click', (e) => {
        if (e.target === modalConnectMobile) closeModal(modalConnectMobile);
    });

    // Copy URL Button
    btnCopy?.addEventListener('click', async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(appUrl);
            } else {
                throw new Error('Clipboard indisponível');
            }
            showToast('Link do aplicativo copiado! Abra no navegador do celular.', 'success');
        } catch {
            const temp = document.createElement('input');
            temp.value = appUrl;
            document.body.appendChild(temp);
            temp.select();
            document.execCommand('copy');
            document.body.removeChild(temp);
            showToast('Link copiado para a área de transferência!', 'success');
        }
    });

    // Main Mode Switcher
    tabModoInstalar?.addEventListener('click', () => {
        tabModoInstalar.classList.add('active');
        tabModoQr?.classList.remove('active');
        if (secInstalarDirect) secInstalarDirect.style.display = 'block';
        if (secQrCode) secQrCode.style.display = 'none';
    });

    tabModoQr?.addEventListener('click', () => {
        tabModoQr.classList.add('active');
        tabModoInstalar?.classList.remove('active');
        if (secQrCode) secQrCode.style.display = 'block';
        if (secInstalarDirect) secInstalarDirect.style.display = 'none';
        renderQrCode();
    });

    // Instructions OS Tab Switching
    tabIos?.addEventListener('click', () => {
        tabIos.classList.add('active');
        tabAndroid?.classList.remove('active');
        if (instIos) instIos.style.display = 'block';
        if (instAndroid) instAndroid.style.display = 'none';
    });

    tabAndroid?.addEventListener('click', () => {
        tabAndroid.classList.add('active');
        tabIos?.classList.remove('active');
        if (instAndroid) instAndroid.style.display = 'block';
        if (instIos) instIos.style.display = 'none';
    });
}

// =========================================================
// PERFIL & STUDIO SETTINGS MANAGEMENT
// =========================================================

async function openPerfilModal() {
    const modal = document.getElementById('modalPerfilOverlay');
    if (!modal) return;

    try {
        const profile = await DataStore.getStudioProfile();
        const curUser = (typeof Auth !== 'undefined' && Auth.currentUser) ? Auth.currentUser : null;

        const elNome = document.getElementById('perfilNome');
        const elEmail = document.getElementById('perfilEmail');
        const elEstudio = document.getElementById('perfilNomeEstudio');
        const elTelefone = document.getElementById('perfilTelefone');
        const elEndereco = document.getElementById('perfilEndereco');
        const elInsta = document.getElementById('perfilInstagram');
        const elPix = document.getElementById('perfilChavePix');
        const elSenhaAtual = document.getElementById('perfilSenhaAtual');
        const elSenha = document.getElementById('perfilNovaSenha');
        const elConfSenha = document.getElementById('perfilConfirmarSenha');

        if (elNome) elNome.value = profile.nomeArtista || curUser?.displayName || '';
        if (elEmail) elEmail.value = profile.email || curUser?.email || '';
        if (elEstudio) elEstudio.value = profile.nomeEstudio || 'GH Studio';
        if (elTelefone) elTelefone.value = profile.telefone || '';
        if (elEndereco) elEndereco.value = profile.endereco || '';
        if (elInsta) elInsta.value = profile.instagram || '';
        if (elPix) elPix.value = profile.chavePix || '';
        if (elSenhaAtual) elSenhaAtual.value = '';
        if (elSenha) elSenha.value = '';
        if (elConfSenha) elConfSenha.value = '';

        // Avatar preview inside modal
        const modalAvatar = document.getElementById('modalPerfilAvatar');
        const currentAvatar = localStorage.getItem('gh_avatar_' + (curUser?.uid || 'default')) || localStorage.getItem('gh_avatar_current') || curUser?.photoURL;
        if (modalAvatar) {
            if (currentAvatar) {
                modalAvatar.innerHTML = `<img src="${currentAvatar}" class="user-avatar-img" alt="Avatar">`;
            } else {
                modalAvatar.textContent = getInitials(profile.nomeArtista || curUser?.displayName || 'G');
            }
        }

        openModal(modal);
    } catch (err) {
        console.error('Erro ao abrir perfil modal:', err);
        openModal(modal);
    }
}
window.openPerfilModal = openPerfilModal;

async function savePerfilStudio(e) {
    if (e) e.preventDefault();
    const btnSave = document.getElementById('btnSavePerfil');
    const originalText = btnSave ? btnSave.innerHTML : 'Salvar Alterações';

    const nome = document.getElementById('perfilNome')?.value.trim();
    const email = document.getElementById('perfilEmail')?.value.trim();
    const nomeEstudio = document.getElementById('perfilNomeEstudio')?.value.trim() || 'GH Studio';
    const telefone = document.getElementById('perfilTelefone')?.value.trim() || '';
    const endereco = document.getElementById('perfilEndereco')?.value.trim() || '';
    const instagram = document.getElementById('perfilInstagram')?.value.trim() || '';
    const chavePix = document.getElementById('perfilChavePix')?.value.trim() || '';
    const senhaAtual = document.getElementById('perfilSenhaAtual')?.value.trim() || '';
    const novaSenha = document.getElementById('perfilNovaSenha')?.value.trim() || '';
    const confirmarSenha = document.getElementById('perfilConfirmarSenha')?.value.trim() || '';

    if (!nome) {
        showToast('Informe o seu nome completo ou artístico!', 'warning');
        document.getElementById('perfilNome')?.focus();
        return;
    }

    if (!email) {
        showToast('Informe um endereço de e-mail válido!', 'warning');
        document.getElementById('perfilEmail')?.focus();
        return;
    }

    if (novaSenha) {
        if (!senhaAtual) {
            showToast('Informe a sua senha atual para poder trocar pela nova senha!', 'warning');
            document.getElementById('perfilSenhaAtual')?.focus();
            return;
        }
        if (novaSenha.length < 6) {
            showToast('A nova senha deve ter no mínimo 6 caracteres!', 'warning');
            document.getElementById('perfilNovaSenha')?.focus();
            return;
        }
        if (novaSenha !== confirmarSenha) {
            showToast('A confirmação da nova senha não confere!', 'warning');
            document.getElementById('perfilConfirmarSenha')?.focus();
            return;
        }
    }

    try {
        if (btnSave) {
            btnSave.disabled = true;
            btnSave.innerHTML = `<span>Salvando...</span>`;
        }

        // 1. Atualizar credenciais de autenticação
        const authRes = await Auth.updateProfileAndSecurity({
            name: nome,
            email: email,
            currentPassword: senhaAtual,
            password: novaSenha
        });

        if (authRes.errors && authRes.errors.length > 0) {
            showToast(authRes.errors.join(' | '), 'error');
            if (novaSenha && !authRes.passwordUpdated) {
                return;
            }
        }

        // 2. Salvar dados do estúdio no DataStore
        await DataStore.setStudioProfile({
            nomeArtista: nome,
            email: email,
            nomeEstudio: nomeEstudio,
            telefone: telefone,
            endereco: endereco,
            instagram: instagram,
            chavePix: chavePix
        });

        // 3. Atualizar elementos visuais
        const userNameEl = document.getElementById('userName');
        if (userNameEl) userNameEl.textContent = nome;

        const userStudioRole = document.getElementById('userStudioRole');
        if (userStudioRole) userStudioRole.textContent = nomeEstudio;

        closeModal(document.getElementById('modalPerfilOverlay'));
        showToast('Perfil e configurações do estúdio atualizados com sucesso! ⚡', 'success');

        // Se a senha foi alterada
        if (authRes.passwordUpdated) {
            showToast('Senha de acesso atualizada com sucesso! 🔒', 'info');
        }
    } catch (err) {
        console.error('Erro ao salvar perfil:', err);
        showToast('Erro ao salvar perfil: ' + (err.message || 'Tente novamente'), 'error');
    } finally {
        if (btnSave) {
            btnSave.disabled = false;
            btnSave.innerHTML = originalText;
        }
    }
}
window.savePerfilStudio = savePerfilStudio;

function setupPerfilListeners() {
    const btnOpenPerfilSidebar = document.getElementById('btnOpenPerfilSidebar');
    const userInfoClickable = document.getElementById('userInfoClickable');
    const navConfigPerfil = document.getElementById('nav-config-perfil');
    const btnCancelPerfil = document.getElementById('btnCancelPerfil');
    const modalPerfilClose = document.getElementById('modalPerfilClose');
    const modalPerfilOverlay = document.getElementById('modalPerfilOverlay');
    const formPerfilStudio = document.getElementById('formPerfilStudio');
    const btnModalEditAvatar = document.getElementById('btnModalEditAvatar');
    const btnTogglePerfilPassAtual = document.getElementById('btnTogglePerfilPassAtual');
    const btnTogglePerfilPass = document.getElementById('btnTogglePerfilPass');

    [btnOpenPerfilSidebar, userInfoClickable, navConfigPerfil].forEach(el => {
        el?.addEventListener('click', (e) => {
            e.preventDefault();
            // Se mobile e sidebar aberta, fecha sidebar
            const sidebar = document.getElementById('sidebar');
            const sidebarOverlay = document.getElementById('sidebarOverlay');
            if (sidebar && sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
                sidebarOverlay?.classList.remove('active');
            }
            openPerfilModal();
        });
    });

    [btnCancelPerfil, modalPerfilClose].forEach(el => {
        el?.addEventListener('click', () => closeModal(modalPerfilOverlay));
    });

    modalPerfilOverlay?.addEventListener('click', (e) => {
        if (e.target === modalPerfilOverlay) closeModal(modalPerfilOverlay);
    });

    formPerfilStudio?.addEventListener('submit', savePerfilStudio);

    btnModalEditAvatar?.addEventListener('click', () => {
        document.getElementById('avatarFileInput')?.click();
    });

    btnTogglePerfilPassAtual?.addEventListener('click', () => {
        const passInput = document.getElementById('perfilSenhaAtual');
        if (passInput) {
            const isPass = passInput.type === 'password';
            passInput.type = isPass ? 'text' : 'password';
            btnTogglePerfilPassAtual.textContent = isPass ? '🙈' : '👁️';
        }
    });

    btnTogglePerfilPass?.addEventListener('click', () => {
        const passInput = document.getElementById('perfilNovaSenha');
        const confInput = document.getElementById('perfilConfirmarSenha');
        if (passInput) {
            const isPass = passInput.type === 'password';
            passInput.type = isPass ? 'text' : 'password';
            if (confInput) confInput.type = isPass ? 'text' : 'password';
            btnTogglePerfilPass.textContent = isPass ? '🙈' : '👁️';
        }
    });
}
setupPerfilListeners();

