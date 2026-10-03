/* =========================================================
   GH Studio — WhatsApp Automation & Messaging Hub
   Lembretes de Sinais, Sessões, Orçamentos e Cuidados Pós
   ========================================================= */

const WhatsAppService = {
    // ── Default Message Templates ──
    templates: {
        lembrete_pre_sessao: (d, cfg) => {
            const primeiroNome = d.cliente ? d.cliente.split(' ')[0] : 'tudo bem';
            const estudio = cfg.nomeEstudio || 'GH Studio';
            const dataFmt = d.data || 'data combinada';
            const hora = d.horaInicio || 'horário agendado';
            const projeto = d.servico || d.descricao || 'Sessão de Tatuagem';
            const endereco = cfg.enderecoEstudio ? `\n📍 *Endereço:* ${cfg.enderecoEstudio}` : '';
            
            let financeiro = '';
            if (d.valorRestante && d.valorRestante !== 'R$ 0,00' && d.valorRestante !== '0') {
                financeiro = `\n💰 *Saldo restante a acertar na sessão:* ${d.valorRestante}`;
            }

            return `Olá, *${primeiroNome}*! 🤘 Aqui é do *${estudio}*.\n\nPassando para lembrar que a sua sessão de tattoo está chegando! 📅✨\n\n📌 *DADOS DO AGENDAMENTO:*\n📅 *Data:* ${dataFmt}\n⏰ *Horário:* ${hora}${endereco}\n🎨 *Projeto:* ${projeto}${financeiro}\n\n⚠️ *ORIENTAÇÕES & CUIDADOS PRÉ-SESSÃO (MUITO IMPORTANTE):*\n\n1️⃣ *Alimentação:* Faça uma refeição reforçada antes de vir. *Nunca venha em jejum* para evitar queda de pressão ou tontura.\n2️⃣ *Hidratação:* Beba bastante água desde hoje. Pele bem hidratada absorve melhor a tinta e sangra menos!\n3️⃣ *Descanso:* Tenha uma boa noite de sono na véspera. O cansaço diminui a tolerância à dor.\n4️⃣ *Zero Álcool:* *NÃO* consuma bebidas alcoólicas, drogas ou aspirinas nas 24h antes da sessão (dilatam os vasos e aumentam o sangramento).\n5️⃣ *Roupas Confortáveis:* Venha com roupas leves e que facilitem o acesso à área a ser tatuada (preferência por roupas pretas/escuras).\n6️⃣ *Documento:* Obrigatório trazer documento oficial com foto (RG ou CNH).\n\n👇 Por favor, *responda esta mensagem com um "CONFIRMADO"* para garantirmos a esterilização da bancada e seus materiais reservados!\n\nQualquer dúvida ou imprevisto, avise por aqui. Te esperamos! 🖤🔥`;
        },

        sinal_pendente: (d, cfg) => 
            `Olá, ${d.cliente || 'tudo bem'}! 🖤 Aqui é do ${cfg.nomeEstudio || 'GH Studio'}.\n\nPassando para lembrar do *sinal de ${d.valorSinal || d.valor}* referente ao seu agendamento de *"${d.servico || d.descricao || 'Tatuagem'}"* para o dia *${d.data || 'agendado'}*.\n\nO pagamento do sinal é essencial para garantir o seu horário na nossa agenda. 📅✨\n\n🔑 *Chave PIX:* ${cfg.chavePix || '(favor solicitar chave)'}\n\nAssim que efetuar o pagamento, por gentileza nos envie o comprovante por aqui. Qualquer dúvida estamos à disposição! 🤘`,

        sessao_marcada: (d, cfg) =>
            `Fala, ${d.cliente || 'tudo bem'}! 🤘 Aqui é do ${cfg.nomeEstudio || 'GH Studio'}.\n\nConfirmando sua sessão de tatuagem agendada:\n📅 *Data:* ${d.data}\n⏰ *Horário:* ${d.horaInicio || 'Conforme combinado'}\n🎨 *Projeto:* ${d.servico || d.descricao || 'Sessão de Tatuagem'}\n\n*Dicas essenciais para o dia da sessão:*\n✅ Venha bem alimentado(a) e hidratado(a)\n✅ Use roupas confortáveis e fáceis para a área da tattoo\n✅ Evite bebidas alcoólicas nas 24h antes\n\nNos vemos em breve! Se precisar de algo, só nos avisar por aqui. 🖤`,

        orcamento_followup: (d, cfg) =>
            `Fala, ${d.cliente || 'tudo bem'}! 🤘 Aqui é do ${cfg.nomeEstudio || 'GH Studio'}.\n\nPassando aqui para saber se você conseguiu pensar no projeto de tattoo que conversamos (*"${d.servico || d.descricao || 'Ideia de Tatuagem'}"*)!\n\nSe tiver qualquer dúvida sobre ideias, referências, tamanhos ou valores, me avisa por aqui que alinhamos tudo e já reservamos um horário bacana na agenda para você. Bora tirar essa ideia do papel? 🔥`,

        valor_receber: (d, cfg) =>
            `Olá, ${d.cliente || 'tudo bem'}! 🖤 Aqui é do ${cfg.nomeEstudio || 'GH Studio'}.\n\nPassando com carinho para lembrar sobre o saldo restante de *${d.valorRestante || d.valor}* referente ao seu trabalho de *"${d.servico || d.descricao || 'Tatuagem'}"* (vencimento: ${d.dataVencimento || 'combinado'}).\n\n🔑 *Chave PIX:* ${cfg.chavePix || '(favor solicitar chave)'}\n\nAssim que puder efetuar o pagamento, basta nos encaminhar o comprovante. Muito obrigado pela confiança no nosso estúdio! ✨`,

        cuidados_pos: (d, cfg) =>
            `Parabéns pela tattoo nova, ${d.cliente || ''}! Ficou sensacional! 🔥🖤\n\nPara que ela cicatrize perfeitamente e mantenha os traços e cores impecáveis, siga estes cuidados essenciais:\n\n1️⃣ Remova o plástico/filme após 2 a 3 horas e lave com água morna e sabonete neutro.\n2️⃣ Seque suavemente com papel toalha (sem esfregar).\n3️⃣ A partir do 2º ou 3º dia, aplique pomada cicatrizante específica em camada bem fina (3x ao dia).\n4️⃣ NÃO coce e NUNCA arranque casquinhas!\n5️⃣ Evite sol direto, praia, piscina e banho de imersão por 20 dias.\n6️⃣ Evite comidas muito gordurosas nos primeiros dias.\n\nQualquer dúvida durante a cicatrização, é só mandar mensagem aqui! 👊`
    },

    // ── Helper: Clean & Normalize Brazilian Phone ──
    cleanPhone(rawPhone) {
        if (!rawPhone) return '';
        let digits = String(rawPhone).replace(/\D/g, '');
        if (!digits) return '';
        // If lacks country code 55, add it (DDDs in Brazil have 2 digits + 8 or 9 phone digits = 10 or 11 digits)
        if (digits.length === 10 || digits.length === 11) {
            digits = '55' + digits;
        }
        return digits;
    },

    // ── Open Interactive WhatsApp Modal ──
    async openModal({ cliente = '', telefone = '', tipo = 'sessao_marcada', dados = {} }) {
        const modal = document.getElementById('modalWhatsAppOverlay');
        if (!modal) return;

        const config = await DataStore.getWhatsAppConfig();
        const clientName = cliente || dados.cliente || '';
        const phone = telefone || dados.telefone || '';

        this._currentDados = { ...dados, cliente: clientName, telefone: phone };
        this._currentConfig = config;

        document.getElementById('waModalClienteNome').textContent = clientName || 'Cliente';
        document.getElementById('waDestinatarioTel').value = phone;

        const tipoSelect = document.getElementById('waTipoMensagem');
        if (tipoSelect) tipoSelect.value = tipo;

        // Generate message
        dados.cliente = clientName;
        const msgGenerator = this.templates[tipo] || this.templates.sessao_marcada;
        const text = msgGenerator(dados, config);

        document.getElementById('waMensagemTexto').value = text;
        this.updateCharCount();

        // Show modal
        modal.classList.add('active');
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
    },

    init() {
        const tipoSelect = document.getElementById('waTipoMensagem');
        if (tipoSelect) {
            tipoSelect.addEventListener('change', () => {
                const tipo = tipoSelect.value;
                const dados = this._currentDados || {};
                const cfg = this._currentConfig || {};
                const msgGenerator = this.templates[tipo] || this.templates.sessao_marcada;
                const txt = msgGenerator(dados, cfg);
                const txtInput = document.getElementById('waMensagemTexto');
                if (txtInput) txtInput.value = txt;
                this.updateCharCount();
            });
        }

        const msgInput = document.getElementById('waMensagemTexto');
        if (msgInput) {
            msgInput.addEventListener('input', () => this.updateCharCount());
        }

        const modalWa = document.getElementById('modalWhatsAppOverlay');
        if (modalWa) {
            modalWa.addEventListener('click', (e) => {
                if (e.target === modalWa) this.closeModal();
            });
        }

        const modalOrc = document.getElementById('modalNovoOrcamentoOverlay');
        if (modalOrc) {
            modalOrc.addEventListener('click', (e) => {
                if (e.target === modalOrc) this.closeNovoOrcamentoModal();
            });
        }

        // Hub tab switching
        document.querySelectorAll('.wa-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabKey = tab.dataset.watab || tab.dataset.tab;
                if (tabKey) this.switchTab(tabKey);
            });
        });
    },

    switchTab(tabKey) {
        if (!tabKey) return;
        document.querySelectorAll('.wa-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.wa-panel').forEach(p => p.classList.remove('active'));

        const tabBtn = document.querySelector(`.wa-tab[data-watab="${tabKey}"]`) || document.getElementById(`tabWa${tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}`);
        const panel = document.getElementById(`panel-wa-${tabKey}`);

        if (tabBtn) tabBtn.classList.add('active');
        if (panel) panel.classList.add('active');
    },

    sendOrcamentoById(id) {
        if (!this._orcamentosMap || !this._orcamentosMap[id]) return;
        const o = this._orcamentosMap[id];
        this.quickSend("orcamento_followup", {
            cliente: o.cliente,
            telefone: o.telefone,
            servico: o.descricao,
            valor: formatCurrency(o.valorEstimado || 0)
        });
    },

    closeModal() {
        const modal = document.getElementById('modalWhatsAppOverlay');
        if (modal) {
            modal.classList.remove('active');
            const activeOverlays = document.querySelectorAll('.modal-overlay.active, .lightbox-overlay.active');
            if (activeOverlays.length === 0) {
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
            }
        }
    },

    updateCharCount() {
        const txt = document.getElementById('waMensagemTexto');
        const counter = document.getElementById('waCharCount');
        if (txt && counter) {
            counter.textContent = `${txt.value.length} caracteres`;
        }
    },

    // ── Dispatch via WhatsApp Web / App ──
    dispatchCurrentMessage() {
        const rawPhone = document.getElementById('waDestinatarioTel').value.trim();
        const text = document.getElementById('waMensagemTexto').value.trim();

        if (!text) {
            showToast('A mensagem não pode estar vazia', 'warning');
            return;
        }

        const phone = this.cleanPhone(rawPhone);
        if (!phone) {
            showToast('Informe o número de WhatsApp (com DDD)', 'warning');
            document.getElementById('waDestinatarioTel').focus();
            return;
        }

        const encoded = encodeURIComponent(text);
        const url = `https://wa.me/${phone}?text=${encoded}`;
        window.open(url, '_blank');
        showToast('Abrindo WhatsApp... 🚀', 'success');
        this.closeModal();
    },

    copyCurrentMessage() {
        const text = document.getElementById('waMensagemTexto').value;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Mensagem copiada para a área de transferência! 📋', 'success');
        }).catch(() => {
            showToast('Não foi possível copiar automaticamente', 'error');
        });
    },

    // ── Direct Send for Cards ──
    async quickSend(tipo, dados) {
        let telefone = dados.telefone || '';
        // If client phone not attached, search client
        if (!telefone && (dados.clienteId || dados.cliente)) {
            try {
                const clientes = await DataStore.getClientes();
                const found = clientes.find(c => 
                    (dados.clienteId && c.id === dados.clienteId) || 
                    (dados.cliente && (c.nome || '').trim().toLowerCase() === String(dados.cliente).trim().toLowerCase())
                );
                if (found && found.telefone) telefone = found.telefone;
            } catch (e) {}
        }

        this.openModal({
            cliente: dados.cliente || dados.clienteNome,
            telefone: telefone,
            tipo: tipo,
            dados: dados
        });
    },

    // ── 1-Click: Disparo de Lembrete Pré-Sessão & Cuidados ──
    async sendLembretePreSessao(agendamentoId) {
        try {
            const agendamentos = await DataStore.getAgendamentos();
            const a = agendamentos.find(item => String(item.id) === String(agendamentoId));
            if (!a) {
                showToast('Agendamento não encontrado', 'warning');
                return;
            }

            let telefone = a.clienteTel || a.telefone || '';
            const clientes = await DataStore.getClientes().catch(() => []);
            const cl = clientes.find(c => 
                (a.clienteId && c.id === a.clienteId) || 
                (a.cliente && (c.nome || '').trim().toLowerCase() === String(a.cliente).trim().toLowerCase())
            );
            if (cl && cl.telefone) {
                telefone = cl.telefone;
            }

            const valorTotal = a.valorTotal !== undefined ? a.valorTotal : (a.valor || 0);
            const valorSinal = a.valorSinal || 0;
            const restante = Math.max(0, valorTotal - (a.sinalPago === 'sim' ? valorSinal : 0));

            const dados = {
                cliente: a.cliente,
                clienteId: a.clienteId,
                telefone: telefone,
                servico: a.descricao || 'Sessão de Tatuagem',
                data: formatDate(a.data),
                rawDate: a.data,
                horaInicio: a.horaInicio || 'Conforme agendado',
                horaFim: a.horaFim || '',
                valorTotal: formatCurrency(valorTotal),
                valorSinal: formatCurrency(valorSinal),
                valorRestante: formatCurrency(restante),
                sinalPago: a.sinalPago
            };

            this.openModal({
                cliente: a.cliente,
                telefone: telefone,
                tipo: 'lembrete_pre_sessao',
                dados: dados
            });
        } catch (err) {
            console.error('Error opening lembrete pre-sessao:', err);
            showToast('Erro ao carregar agendamento', 'error');
        }
    },

    // ── Snippet Insertion into Active Message ──
    insertSnippet(type) {
        const txt = document.getElementById('waMensagemTexto');
        if (!txt) return;
        const cfg = this._currentConfig || {};

        let snippet = '';
        if (type === 'cuidados') {
            snippet = `\n\n⚠️ *ORIENTAÇÕES & CUIDADOS PRÉ-SESSÃO:*\n✅ Alimente-se bem antes de vir (NUNCA venha em jejum)\n✅ Beba bastante água para hidratar a pele\n✅ Tenha uma boa noite de sono na véspera\n✅ Zero álcool ou anticoagulantes nas 24h anteriores\n✅ Roupas confortáveis que facilitem o acesso ao local da tattoo\n✅ Traga documento original com foto (RG/CNH)`;
        } else if (type === 'pix') {
            const chave = cfg.chavePix || '(favor solicitar chave)';
            snippet = `\n\n🔑 *Chave PIX do Estúdio:* ${chave}`;
        } else if (type === 'endereco') {
            const end = cfg.enderecoEstudio || 'Nosso estúdio';
            snippet = `\n\n📍 *Localização do Estúdio:* ${end}`;
        }

        txt.value = (txt.value + snippet).trim();
        this.updateCharCount();
        showToast('Bloco inserido na mensagem!', 'info');
    },

    // ── Render Central WhatsApp Hub ──
    async renderHub() {
        const badge = document.getElementById('whatsappPendingBadge');
        try {
            const [agendamentos, sinais, receber, orcamentos, clientes, config] = await Promise.all([
                DataStore.getAgendamentos().catch(() => []),
                DataStore.getSinais().catch(() => []),
                DataStore.getValoresReceber().catch(() => []),
                DataStore.getOrcamentos().catch(() => []),
                DataStore.getClientes().catch(() => []),
                DataStore.getWhatsAppConfig().catch(() => ({}))
            ]);

            // Fill config fields
            const pixInput = document.getElementById('waConfigPix');
            const nomeInput = document.getElementById('waConfigEstudio');
            const instaInput = document.getElementById('waConfigInstagram');
            const endInput = document.getElementById('waConfigEndereco');
            if (pixInput && !pixInput.value) pixInput.value = config.chavePix || '';
            if (nomeInput && !nomeInput.value) nomeInput.value = config.nomeEstudio || 'GH Studio';
            if (instaInput && !instaInput.value) instaInput.value = config.instagram || '@ghstudio';
            if (endInput && !endInput.value) endInput.value = config.enderecoEstudio || '';

            // 1. Sinais Pendentes
            // Filter appointments with pending deposit OR signals
            const pendingSinais = [];
            agendamentos.forEach(a => {
                if (a.status !== 'cancelado' && a.valorSinal > 0 && a.sinalPago === 'pendente') {
                    const cl = clientes.find(c => c.id === a.clienteId || (c.nome || '').toLowerCase() === (a.cliente || '').toLowerCase());
                    pendingSinais.push({
                        cliente: a.cliente,
                        clienteId: a.clienteId,
                        telefone: cl?.telefone || '',
                        servico: a.descricao || 'Tatuagem',
                        data: formatDate(a.data),
                        valorSinal: formatCurrency(a.valorSinal),
                        raw: a
                    });
                }
            });

            // Also check sinais collection if any marked as pending
            sinais.forEach(s => {
                if (s.status === 'pendente') {
                    const cl = clientes.find(c => c.id === s.clienteId || (c.nome || '').toLowerCase() === (s.cliente || '').toLowerCase());
                    pendingSinais.push({
                        cliente: s.cliente,
                        clienteId: s.clienteId,
                        telefone: cl?.telefone || '',
                        servico: s.descricao || 'Sessão de Tatuagem',
                        data: formatDate(s.dataSessao || s.dataSinal),
                        valorSinal: formatCurrency(s.valorSinal),
                        raw: s
                    });
                }
            });

            // 2. Upcoming Sessions (today onwards)
            const todayObj = new Date();
            const todayStr = todayObj.toISOString().split('T')[0];
            const tmrwObj = new Date(todayObj);
            tmrwObj.setDate(tmrwObj.getDate() + 1);
            const tmrwStr = tmrwObj.toISOString().split('T')[0];

            const upcomingSessions = agendamentos
                .filter(a => a.status !== 'cancelado' && a.data >= todayStr)
                .sort((a, b) => a.data > b.data ? 1 : -1)
                .map(a => {
                    const cl = clientes.find(c => c.id === a.clienteId || (c.nome || '').toLowerCase() === (a.cliente || '').toLowerCase());
                    return {
                        cliente: a.cliente,
                        clienteId: a.clienteId,
                        telefone: cl?.telefone || a.clienteTel || '',
                        servico: a.descricao || 'Sessão de Tatuagem',
                        data: formatDate(a.data),
                        horaInicio: a.horaInicio || '09:00',
                        raw: a
                    };
                });

            // 3. Valores a Receber (open balance)
            const openDebts = receber
                .filter(r => (r.valorTotal - r.valorPago) > 0)
                .map(r => {
                    const cl = clientes.find(c => c.id === r.clienteId || (c.nome || '').toLowerCase() === (r.cliente || '').toLowerCase());
                    return {
                        cliente: r.cliente,
                        clienteId: r.clienteId,
                        telefone: cl?.telefone || '',
                        servico: r.descricao || 'Serviço de Tatuagem',
                        valorRestante: formatCurrency(r.valorTotal - r.valorPago),
                        dataVencimento: formatDate(r.dataVencimento),
                        raw: r
                    };
                });

            // 4. Orçamentos
            this._orcamentosMap = {};
            (orcamentos || []).forEach(o => { if (o && o.id) this._orcamentosMap[o.id] = o; });
            const pendingOrcamentos = (orcamentos || []).filter(o => (o.status || 'pendente') !== 'fechado' && (o.status || 'pendente') !== 'perdido');

            // Update badge (total actionable messages)
            const totalActionable = pendingSinais.length + upcomingSessions.length + openDebts.length;
            if (badge) {
                if (totalActionable > 0) {
                    badge.style.display = 'inline-flex';
                    badge.textContent = totalActionable;
                } else {
                    badge.style.display = 'none';
                }
            }

            // Summary stats in Hub
            const statSinais = document.getElementById('waStatSinais');
            const statSessoes = document.getElementById('waStatSessoes');
            const statOrcamentos = document.getElementById('waStatOrcamentos');
            const statReceber = document.getElementById('waStatReceber');
            if (statSinais) statSinais.textContent = pendingSinais.length;
            if (statSessoes) statSessoes.textContent = upcomingSessions.length;
            if (statOrcamentos) statOrcamentos.textContent = pendingOrcamentos.length;
            if (statReceber) statReceber.textContent = openDebts.length;

            // Render Tab 1: Sinais
            const containerSinais = document.getElementById('waListSinais');
            if (containerSinais) {
                if (pendingSinais.length === 0) {
                    containerSinais.innerHTML = emptyState('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>', 'Nenhum sinal pendente', 'Todos os sinais registrados estão em dia!');
                } else {
                    containerSinais.innerHTML = pendingSinais.map(s => `
                        <div class="wa-action-card">
                            <div class="wa-card-info">
                                <div class="wa-card-header">
                                    <span class="wa-client-name">${s.cliente}</span>
                                    <span class="status-badge status-pendente">Sinal Pendente: ${s.valorSinal}</span>
                                </div>
                                <div class="wa-card-meta">
                                    <span>📅 Sessão: <strong>${s.data}</strong></span>
                                    <span>🎨 Trabalho: ${s.servico}</span>
                                    <span>📱 Tel: ${s.telefone || '<em style="color:var(--text-tertiary);">Não cadastrado</em>'}</span>
                                </div>
                            </div>
                            <button type="button" class="btn-whatsapp" onclick='WhatsAppService.quickSend("sinal_pendente", ${JSON.stringify(s)})'>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                <span>Lembrar Sinal</span>
                            </button>
                        </div>
                    `).join('');
                }
            }

            // Render Tab 2: Sessões
            const containerSessoes = document.getElementById('waListSessoes');
            if (containerSessoes) {
                if (upcomingSessions.length === 0) {
                    containerSessoes.innerHTML = emptyState('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>', 'Nenhuma sessão próxima', 'Não há agendamentos nos próximos dias.');
                } else {
                    containerSessoes.innerHTML = upcomingSessions.map(u => {
                        let urgencyBadge = '';
                        if (u.raw.data === todayStr) {
                            urgencyBadge = `<span class="status-badge" style="background:rgba(239,68,68,0.18); color:#F87171; border:1px solid rgba(239,68,68,0.4); font-weight:800;">🚨 É HOJE</span>`;
                        } else if (u.raw.data === tmrwStr) {
                            urgencyBadge = `<span class="status-badge" style="background:rgba(245,197,24,0.18); color:var(--accent); border:1px solid rgba(245,197,24,0.4); font-weight:800;">⏳ É AMANHÃ (Disparar Lembrete)</span>`;
                        } else {
                            urgencyBadge = `<span class="status-badge status-concluido">Agendado: ${u.data} às ${u.horaInicio}</span>`;
                        }

                        return `
                            <div class="wa-action-card">
                                <div class="wa-card-info">
                                    <div class="wa-card-header">
                                        <span class="wa-client-name">${u.cliente}</span>
                                        ${urgencyBadge}
                                    </div>
                                    <div class="wa-card-meta">
                                        <span>📅 Data: <strong>${u.data} às ${u.horaInicio}</strong></span>
                                        <span>🎨 Trabalho: ${u.servico}</span>
                                        <span>📱 Tel: ${u.telefone || '<em style="color:var(--text-tertiary);">Não cadastrado</em>'}</span>
                                    </div>
                                </div>
                                <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                                    <button type="button" class="btn-whatsapp" onclick="WhatsAppService.sendLembretePreSessao('${u.raw.id}')" title="Disparar Lembrete Pré-Sessão com orientações de hidratação, alimentação e descanso">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                        <span>Lembrete & Cuidados</span>
                                    </button>
                                    <button type="button" class="btn-secondary btn-sm" onclick='WhatsAppService.quickSend("sessao_marcada", ${JSON.stringify(u)})' title="Confirmar agendamento simples">
                                        Confirmar
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            }

            // Render Tab 3: Orçamentos
            const containerOrcamentos = document.getElementById('waListOrcamentos');
            if (containerOrcamentos) {
                if (pendingOrcamentos.length === 0) {
                    containerOrcamentos.innerHTML = `
                        <div style="text-align:center; padding:32px 16px; color:var(--text-secondary);">
                            <div style="font-size:2rem; margin-bottom:8px;">💬</div>
                            <h3 style="color:var(--text-primary); margin-bottom:4px;">Nenhum orçamento pendente registrado</h3>
                            <p style="font-size:0.85rem; margin-bottom:16px;">Registre orçamentos em negociação para fazer follow-up e fechar mais tatuagens!</p>
                            <button type="button" class="btn-primary" onclick="WhatsAppService.openNovoOrcamentoModal()">+ Registrar Orçamento para Follow-up</button>
                        </div>
                    `;
                } else {
                    containerOrcamentos.innerHTML = pendingOrcamentos.map(o => `
                        <div class="wa-action-card">
                            <div class="wa-card-info">
                                <div class="wa-card-header">
                                    <span class="wa-client-name">${o.cliente}</span>
                                    <span class="status-badge status-parcial">Est. ${formatCurrency(o.valorEstimado || 0)}</span>
                                </div>
                                <div class="wa-card-meta">
                                    <span>🎨 Projeto: ${o.descricao}</span>
                                    <span>📅 Data da Consulta: ${formatDate(o.data)}</span>
                                    <span>📱 Tel: ${o.telefone || '<em style="color:var(--text-tertiary);">Não informado</em>'}</span>
                                </div>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button type="button" class="btn-action" title="Excluir Orçamento" onclick="WhatsAppService.deleteOrcamento('${o.id}')">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                                <button type="button" class="btn-whatsapp" onclick="WhatsAppService.sendOrcamentoById('${o.id}')">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                    <span>Enviar Follow-up</span>
                                </button>
                            </div>
                        </div>
                    `).join('');
                }
            }

            // Render Tab 4: Valores a Receber
            const containerReceber = document.getElementById('waListReceber');
            if (containerReceber) {
                if (openDebts.length === 0) {
                    containerReceber.innerHTML = emptyState('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>', 'Nenhum valor a receber pendente', 'Todos os pagamentos foram quitados!');
                } else {
                    containerReceber.innerHTML = openDebts.map(r => `
                        <div class="wa-action-card">
                            <div class="wa-card-info">
                                <div class="wa-card-header">
                                    <span class="wa-client-name">${r.cliente}</span>
                                    <span class="status-badge status-pendente">Resta: ${r.valorRestante}</span>
                                </div>
                                <div class="wa-card-meta">
                                    <span>🎨 Descrição: ${r.servico}</span>
                                    <span>📅 Vencimento: <strong>${r.dataVencimento}</strong></span>
                                    <span>📱 Tel: ${r.telefone || '<em style="color:var(--text-tertiary);">Não cadastrado</em>'}</span>
                                </div>
                            </div>
                            <button type="button" class="btn-whatsapp" onclick='WhatsAppService.quickSend("valor_receber", ${JSON.stringify(r)})'>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                <span>Lembrar Pagamento</span>
                            </button>
                        </div>
                    `).join('');
                }
            }

            // Render Tab 5: Cuidados Pós-Tattoo
            const containerCuidados = document.getElementById('waListCuidados');
            if (containerCuidados) {
                if (clientes.length === 0) {
                    containerCuidados.innerHTML = emptyState('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>', 'Nenhum cliente cadastrado', 'Cadastre clientes para enviar os cuidados pós-tatuagem.');
                } else {
                    containerCuidados.innerHTML = clientes.map(c => `
                        <div class="wa-action-card">
                            <div class="wa-card-info">
                                <div class="wa-card-header">
                                    <span class="wa-client-name">${c.nome}</span>
                                    <span style="font-size:0.78rem; color:var(--text-secondary);">${c.telefone || 'Sem telefone'}</span>
                                </div>
                                <div class="wa-card-meta">
                                    <span>🩸 Total de Sessões: <strong>${c.sessoes || 0}</strong></span>
                                    <span>💰 Total Investido: ${formatCurrency(c.totalGasto || 0)}</span>
                                </div>
                            </div>
                            <button type="button" class="btn-whatsapp" onclick='WhatsAppService.quickSend("cuidados_pos", ${JSON.stringify({ cliente: c.nome, telefone: c.telefone })})'>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21a9 9 0 0 0 9-9c0-4.97-4.03-9-9-9s-9 4.03-9 9a9 9 0 0 0 9 9z"/><path d="M12 7v5l3 3"/></svg>
                                <span>Enviar Guia de Cuidados</span>
                            </button>
                        </div>
                    `).join('');
                }
            }

        } catch (e) {
            console.error('Error rendering WhatsApp hub:', e);
        }
    },

    // ── Save WhatsApp Configuration ──
    async saveConfig(e) {
        if (e) e.preventDefault();
        const chavePix = document.getElementById('waConfigPix')?.value.trim() || '';
        const nomeEstudio = document.getElementById('waConfigEstudio')?.value.trim() || 'GH Studio';
        const instagram = document.getElementById('waConfigInstagram')?.value.trim() || '';
        const enderecoEstudio = document.getElementById('waConfigEndereco')?.value.trim() || '';

        try {
            await DataStore.setWhatsAppConfig({ chavePix, nomeEstudio, instagram, enderecoEstudio });
            showToast('Configurações salvas com sucesso! ⚡', 'success');
        } catch (err) {
            showToast('Erro ao salvar configurações', 'error');
        }
    },

    // ── Orçamentos Management Modal ──
    openNovoOrcamentoModal() {
        const modal = document.getElementById('modalNovoOrcamentoOverlay');
        if (modal) {
            modal.classList.add('active');
            document.body.classList.add('modal-open');
            document.body.style.overflow = 'hidden';
            this.populateOrcamentoClients();
        }
    },

    closeNovoOrcamentoModal() {
        const modal = document.getElementById('modalNovoOrcamentoOverlay');
        if (modal) {
            modal.classList.remove('active');
            const activeOverlays = document.querySelectorAll('.modal-overlay.active, .lightbox-overlay.active');
            if (activeOverlays.length === 0) {
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
            }
        }
    },

    async populateOrcamentoClients() {
        const select = document.getElementById('orcClienteSelect');
        if (!select) return;
        try {
            const clientes = await DataStore.getClientes();
            select.innerHTML = `
                <option value="">Selecione um cliente ou digite abaixo...</option>
                ${clientes.map(c => `<option value="${c.id}" data-nome="${c.nome}" data-tel="${c.telefone || ''}">${c.nome}</option>`).join('')}
            `;
            select.onchange = () => {
                const opt = select.selectedOptions[0];
                if (opt && opt.value) {
                    document.getElementById('orcClienteNome').value = opt.getAttribute('data-nome') || '';
                    document.getElementById('orcClienteTel').value = opt.getAttribute('data-tel') || '';
                }
            };
        } catch (e) {}
    },

    async saveOrcamento(e) {
        if (e) e.preventDefault();
        const nome = document.getElementById('orcClienteNome')?.value.trim();
        const tel = document.getElementById('orcClienteTel')?.value.trim() || '';
        const desc = document.getElementById('orcDescricao')?.value.trim();
        const valor = parseFloat(document.getElementById('orcValor')?.value) || 0;
        const estilo = document.getElementById('orcEstilo')?.value || 'blackwork';

        if (!nome || !desc) {
            showToast('Preencha o nome do cliente e a descrição da tattoo', 'warning');
            return;
        }

        try {
            await DataStore.addOrcamento({
                cliente: nome,
                telefone: tel,
                descricao: desc,
                valorEstimado: valor,
                estilo: estilo,
                status: 'pendente',
                data: new Date().toISOString().split('T')[0]
            });
            showToast('Orçamento salvo para acompanhamento! 💬', 'success');
            this.closeNovoOrcamentoModal();
            document.getElementById('formNovoOrcamento')?.reset();
            await this.renderHub();
            this.switchTab('orcamentos');
        } catch (err) {
            console.error('Error saving orcamento:', err);
            showToast('Erro ao salvar orçamento', 'error');
        }
    },

    async deleteOrcamento(id) {
        const ok = await showConfirm('Excluir Orçamento', 'Deseja excluir este orçamento em acompanhamento?');
        if (!ok) return;
        try {
            await DataStore.deleteOrcamento(id);
            showToast('Orçamento excluído!', 'success');
            await this.renderHub();
            this.switchTab('orcamentos');
        } catch (err) {
            showToast('Erro ao excluir orçamento', 'error');
        }
    }
};

window.WhatsAppService = WhatsAppService;

document.addEventListener('DOMContentLoaded', () => {
    WhatsAppService.init();
});
