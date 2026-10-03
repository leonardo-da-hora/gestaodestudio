/* =========================================================
   GH Studio — Calculadora Inteligente de Orçamento de Tattoo
   Cálculo em tempo real de investimento, insumos e proposta
   ========================================================= */

const TattooCalculator = {
    // Configurações padrão
    config: {
        valorHoraBase: 180.00,       // Valor/hora padrão do tatuador
        custoInsumoBase: 45.00,      // Custo de bancada, agulhas, luvas, EPIs e tintas
        percentualSinalPadrao: 30,   // % de sinal para reserva de data
        precoMinimoEstudio: 200.00   // Preço mínimo para abrir bancada
    },

    // Fatores de estilo (cm² por minuto aproximado & multiplicador de valor)
    estilos: {
        lettering:   { nome: '✍️ Lettering / Escrita', fatorTempo: 0.9, multPreco: 1.0 },
        fineline:    { nome: '🌿 Fine Line Delicado',   fatorTempo: 1.1, multPreco: 1.1 },
        blackwork:   { nome: '🖤 Blackwork & Sombra',   fatorTempo: 1.25, multPreco: 1.15 },
        oldschool:   { nome: '⚓ Old School / Tradicional', fatorTempo: 1.15, multPreco: 1.1 },
        colorida:    { nome: '🎨 Colorida / Aquarela',  fatorTempo: 1.4, multPreco: 1.25 },
        realismo:    { nome: '👁️ Realismo / Hiper-realismo', fatorTempo: 1.8, multPreco: 1.4 },
        coverup:     { nome: '🔄 Cobertura (Cover-up)', fatorTempo: 1.6, multPreco: 1.35 },
        geometrico:  { nome: '📐 Geométrico & Pontilhismo', fatorTempo: 1.35, multPreco: 1.2 }
    },

    // Fatores de local do corpo (dificuldade, pele, dor e tensão)
    locais: {
        braco:     { nome: 'Antebraço / Bíceps (Fácil)', mult: 1.0 },
        panturrilha: { nome: 'Panturrilha / Coxa (Fácil)', mult: 1.0 },
        ombro:     { nome: 'Ombro / Trapézio (Médio)', mult: 1.1 },
        peito:     { nome: 'Peito / Canela (Médio)', mult: 1.15 },
        costela:   { nome: 'Costela / Flanco (Sensível)', mult: 1.35 },
        pescoco:   { nome: 'Pescoço / Garganta (Sensível)', mult: 1.4 },
        mao_pe:    { nome: 'Mãos / Pés / Dedos (Delicado)', mult: 1.4 },
        coluna:    { nome: 'Coluna / Lombar (Doloroso)', mult: 1.25 }
    },

    // Níveis de complexidade
    complexidades: {
        baixa: { nome: 'Minimalista / Traço simples', mult: 1.0 },
        media: { nome: 'Média / Sombra e texturas', mult: 1.25 },
        alta:  { nome: 'Alta / Projeto exclusivo e detalhado', mult: 1.55 }
    },

    // Presets rápidos
    presets: {
        escrita_pequena: {
            titulo: 'Escrita no Pulso / Frase',
            largura: 6,
            altura: 3,
            estilo: 'lettering',
            local: 'braco',
            complexidade: 'baixa',
            descricao: 'Frase ou palavra delicada com letra cursiva/fina'
        },
        fineline_floral: {
            titulo: 'Floral / Botânico Fine Line',
            largura: 8,
            altura: 12,
            estilo: 'fineline',
            local: 'ombro',
            complexidade: 'media',
            descricao: 'Ramo floral delicado com linhas finas e folhas'
        },
        flash_blackwork: {
            titulo: 'Flash Blackwork (10x10cm)',
            largura: 10,
            altura: 10,
            estilo: 'blackwork',
            local: 'braco',
            complexidade: 'media',
            descricao: 'Arte autoral com preto sólido e sombreado whipped'
        },
        realismo_antibraco: {
            titulo: 'Retrato / Realismo Antebraço',
            largura: 12,
            altura: 18,
            estilo: 'realismo',
            local: 'braco',
            complexidade: 'alta',
            descricao: 'Leão, animal ou retrato realista com textura e profundidade'
        },
        coverup_antigo: {
            titulo: 'Reforma / Cover-up',
            largura: 12,
            altura: 14,
            estilo: 'coverup',
            local: 'braco',
            complexidade: 'alta',
            descricao: 'Cobertura de tattoo antiga com pigmentos densos e sobreposição'
        }
    },

    init() {
        this.loadSavedConfig();
        this.bindEvents();
    },

    loadSavedConfig() {
        try {
            const saved = localStorage.getItem('gh_calc_config');
            if (saved) {
                this.config = { ...this.config, ...JSON.parse(saved) };
            }
        } catch (e) {}
    },

    saveConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        try {
            localStorage.setItem('gh_calc_config', JSON.stringify(this.config));
        } catch (e) {}
    },

    // ── Algoritmo Central de Precificação ──
    calculate(params) {
        const largura = Math.max(parseFloat(params.largura) || 5, 1);
        const altura = Math.max(parseFloat(params.altura) || 5, 1);
        const areaCm2 = largura * altura;

        const estiloInfo = this.estilos[params.estilo] || this.estilos.blackwork;
        const localInfo = this.locais[params.local] || this.locais.braco;
        const complexidadeInfo = this.complexidades[params.complexidade] || this.complexidades.media;
        const valorHora = parseFloat(params.valorHora) || this.config.valorHoraBase;
        const insumoExtra = parseFloat(params.insumoExtra) || 0;

        // 1. Estimativa de tempo base em minutos
        // Regra heurística realista: sqrt(área) * fatorEstilo * fatorComplexidade * fatorLocal
        // Para uma tattoo de 10x10 (100cm²): ~10 * 10 * fatores
        const baseMinutos = Math.sqrt(areaCm2) * 11;
        let tempoMinutos = baseMinutos * estiloInfo.fatorTempo * complexidadeInfo.mult * localInfo.mult;

        // Limite mínimo: qualquer atendimento exige no mínimo 45 minutos de bancada
        if (tempoMinutos < 45) tempoMinutos = 45;

        // Arredondar para blocos de 15 minutos
        tempoMinutos = Math.round(tempoMinutos / 15) * 15;
        const horasTotais = tempoMinutos / 60;

        // 2. Custos de Materiais
        // Kit base de biossegurança + acréscimo proporcional para grandes áreas/tintas extras
        let custoMateriais = this.config.custoInsumoBase + insumoExtra;
        if (areaCm2 > 150) custoMateriais += 25.00;
        if (params.estilo === 'colorida') custoMateriais += 20.00;
        if (params.estilo === 'coverup') custoMateriais += 15.00;

        // 3. Preço Base Calculado
        // (Horas de trabalho * Valor/Hora) + Custo de Materiais * Multiplicadores
        const valorMaoDeObra = horasTotais * valorHora;
        let precoCalculado = (valorMaoDeObra + custoMateriais) * estiloInfo.multPreco;

        // Não cobrar menos que o preço mínimo de segurança
        if (precoCalculado < this.config.precoMinimoEstudio) {
            precoCalculado = this.config.precoMinimoEstudio;
        }

        // Arredondar para valores comerciais atraentes (múltiplos de R$ 10 ou R$ 50)
        const precoRecomendado = this._roundCommercial(precoCalculado);
        const precoMinimo = this._roundCommercial(precoRecomendado * 0.82);
        const precoPremium = this._roundCommercial(precoRecomendado * 1.25);

        // 4. Sinal Recomendado (30% a 40%)
        const pctSinal = parseFloat(params.percentualSinal) || this.config.percentualSinalPadrao;
        let valorSinal = this._roundCommercial((precoRecomendado * pctSinal) / 100);
        // Garantir que o sinal seja no mínimo R$ 80 se a tattoo for > R$ 250
        if (precoRecomendado >= 250 && valorSinal < 80) valorSinal = 80;
        if (valorSinal > precoRecomendado) valorSinal = precoRecomendado;

        const valorRestante = Math.max(precoRecomendado - valorSinal, 0);

        // 5. Formatação do tempo
        const horasInteiras = Math.floor(tempoMinutos / 60);
        const minutosRestantes = tempoMinutos % 60;
        let tempoFormatado = '';
        if (horasInteiras > 0 && minutosRestantes > 0) {
            tempoFormatado = `${horasInteiras}h ${minutosRestantes}min`;
        } else if (horasInteiras > 0) {
            tempoFormatado = `${horasInteiras}h`;
        } else {
            tempoFormatado = `${minutosRestantes} minutos`;
        }

        let sessoesInfo = '1 sessão';
        if (horasTotais > 5.5) {
            const numSessoes = Math.ceil(horasTotais / 4);
            sessoesInfo = `${numSessoes} sessões (aprox. ${(horasTotais / numSessoes).toFixed(1)}h cada)`;
        }

        return {
            largura,
            altura,
            areaCm2,
            tempoMinutos,
            horasTotais,
            tempoFormatado,
            sessoesInfo,
            custoMateriais,
            precoMinimo,
            precoRecomendado,
            precoPremium,
            valorSinal,
            valorRestante,
            percentualSinal: pctSinal
        };
    },

    _roundCommercial(valor) {
        if (valor < 300) {
            return Math.round(valor / 10) * 10;
        } else {
            return Math.round(valor / 20) * 20;
        }
    },

    // ── Gerador de Proposta para WhatsApp ──
    async generateWhatsAppMessage(calcData, extraInfo = {}) {
        let waConfig = { chavePix: '', nomeEstudio: 'GH Studio', instagram: '@ghstudio' };
        if (typeof window !== 'undefined' && window.DataStore && typeof DataStore.getWhatsAppConfig === 'function') {
            waConfig = await DataStore.getWhatsAppConfig();
        }

        const clienteNome = extraInfo.clienteNome ? extraInfo.clienteNome.trim() : 'amigo(a)';
        const primeiroNome = clienteNome.split(' ')[0];
        const projetoDesc = extraInfo.projetoDesc ? extraInfo.projetoDesc.trim() : 'Sua ideia de tatuagem';
        const estiloLabel = this.estilos[extraInfo.estilo]?.nome.replace(/^[^\s]+\s/, '') || 'Blackwork';
        const localLabel = this.locais[extraInfo.local]?.nome.split(' (')[0] || 'Local escolhido';

        const pixTexto = waConfig.chavePix 
            ? `🔑 *Chave PIX:* \`${waConfig.chavePix}\`` 
            : `🔑 *Chave PIX:* (solicite ao confirmar)`;

        return `Olá, *${primeiroNome}*! Tudo bem? 🎨✨\n\n` +
`Fiz a análise da sua ideia para o projeto no *${waConfig.nomeEstudio}*. Segue a proposta detalhada:\n\n` +
`📌 *Projeto:* ${projetoDesc}\n` +
`📐 *Tamanho:* aprox. ${calcData.largura}cm x ${calcData.altura}cm\n` +
`📍 *Local:* ${localLabel}\n` +
`🎨 *Estilo:* ${estiloLabel}\n` +
`⏳ *Tempo estimado:* ${calcData.tempoFormatado} (${calcData.sessoesInfo})\n\n` +
`━━━━━━━━━━━━━━━━━━━━\n` +
`💰 *VALOR DO INVESTIMENTO:* *${this.formatBRL(calcData.precoRecomendado)}*\n` +
`━━━━━━━━━━━━━━━━━━━━\n\n` +
`💳 *Formas de Pagamento:*\n` +
`• *Sinal de reserva:* *${this.formatBRL(calcData.valorSinal)}* (garante o seu dia e horário na agenda exclusiva)\n` +
`• *Restante:* *${this.formatBRL(calcData.valorRestante)}* no dia da sessão (PIX, Débito ou Cartão de Crédito)\n\n` +
`${pixTexto}\n\n` +
`*Todos os nossos materiais são 100% descartáveis e de alta qualidade (agulhas estéreis, tintas aprovadas pela ANVISA e biossegurança total).* 🛡️\n\n` +
`Podemos agendar a sua data? Me avise qual dia fica melhor para você! 💪🖤`;
    },

    formatBRL(val) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
    },

    // ── Preenchimento de Clientes ──
    async populateClientSelect() {
        const selCliente = document.getElementById('calcClienteSelect');
        if (!selCliente) return;

        let clientes = [];
        try {
            if (typeof window !== 'undefined' && window.DataStore && typeof DataStore.getClientes === 'function') {
                clientes = await DataStore.getClientes();
            }
        } catch (e) {
            console.warn('Erro ao carregar clientes do DataStore:', e);
        }

        // Fallback 1: localStorage gh_clientes
        if ((!clientes || clientes.length === 0) && typeof localStorage !== 'undefined') {
            try {
                const local = localStorage.getItem('gh_clientes');
                if (local) clientes = JSON.parse(local);
            } catch (e) {}
        }

        // Fallback 2: opções já carregadas em agClienteSelect ou txClienteSelect
        if (!clientes || clientes.length === 0) {
            const existingSelect = document.getElementById('agClienteSelect') || document.getElementById('txClienteSelect');
            if (existingSelect && existingSelect.options.length > 1) {
                clientes = Array.from(existingSelect.options)
                    .filter(opt => opt.value && opt.value !== '+novo')
                    .map(opt => ({
                        id: opt.value,
                        nome: opt.getAttribute('data-nome') || opt.textContent.split(' (')[0].trim(),
                        telefone: opt.getAttribute('data-tel') || ''
                    }));
            }
        }

        const currentVal = selCliente.value;
        const optionsHtml = [
            '<option value="">Cliente Avulso (novo contato WhatsApp)</option>'
        ];

        (clientes || []).forEach(c => {
            if (!c || !c.nome) return;
            const telPart = c.telefone ? ` (${c.telefone})` : '';
            optionsHtml.push(`<option value="${c.id}" data-nome="${c.nome}" data-tel="${c.telefone || ''}">${c.nome}${telPart}</option>`);
        });

        selCliente.innerHTML = optionsHtml.join('');
        if (currentVal) selCliente.value = currentVal;
    },

    // ── Abrir e Fechar Modal ──
    async openModal(presetKey = null, prefillData = {}) {
        const overlay = document.getElementById('modalCalculadoraOverlay');
        if (!overlay) return;

        // Preencher lista de clientes no select
        await this.populateClientSelect();

        // Carregar configurações nos inputs
        const inputHora = document.getElementById('calcValorHora');
        if (inputHora) inputHora.value = this.config.valorHoraBase;

        // Se veio preset ou prefill
        if (presetKey && this.presets[presetKey]) {
            this.applyPreset(presetKey);
        } else if (prefillData && Object.keys(prefillData).length > 0) {
            if (prefillData.largura) document.getElementById('calcLargura').value = prefillData.largura;
            if (prefillData.altura) document.getElementById('calcAltura').value = prefillData.altura;
            if (prefillData.estilo) document.getElementById('calcEstilo').value = prefillData.estilo;
            if (prefillData.local) document.getElementById('calcLocal').value = prefillData.local;
            if (prefillData.descricao) document.getElementById('calcDescricao').value = prefillData.descricao;
            if (prefillData.clienteNome) document.getElementById('calcClienteNome').value = prefillData.clienteNome;
            if (prefillData.clienteTel) document.getElementById('calcClienteTel').value = prefillData.clienteTel;
        }

        this.updateCalculation();

        overlay.classList.add('active');
        if (typeof document !== 'undefined' && document.body) {
            document.body.classList.add('modal-open');
            document.body.style.overflow = 'hidden';
        }
    },

    closeModal() {
        const overlay = document.getElementById('modalCalculadoraOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            const activeOverlays = document.querySelectorAll('.modal-overlay.active, .lightbox-overlay.active');
            if (activeOverlays.length === 0 && typeof document !== 'undefined' && document.body) {
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
            }
        }
    },

    applyPreset(key) {
        const p = this.presets[key];
        if (!p) return;
        document.getElementById('calcLargura').value = p.largura;
        document.getElementById('calcAltura').value = p.altura;
        document.getElementById('calcEstilo').value = p.estilo;
        document.getElementById('calcLocal').value = p.local;
        document.getElementById('calcComplexidade').value = p.complexidade;
        if (p.descricao && !document.getElementById('calcDescricao').value) {
            document.getElementById('calcDescricao').value = p.descricao;
        }

        // Highlight preset button
        document.querySelectorAll('.calc-preset-chip').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === key);
        });

        this.updateCalculation();
    },

    async updateCalculation() {
        const largura = parseFloat(document.getElementById('calcLargura')?.value) || 10;
        const altura = parseFloat(document.getElementById('calcAltura')?.value) || 10;
        const estilo = document.getElementById('calcEstilo')?.value || 'blackwork';
        const local = document.getElementById('calcLocal')?.value || 'braco';
        const complexidade = document.getElementById('calcComplexidade')?.value || 'media';
        const valorHora = parseFloat(document.getElementById('calcValorHora')?.value) || this.config.valorHoraBase;
        const insumoExtra = parseFloat(document.getElementById('calcInsumoExtra')?.value) || 0;
        const pctSinal = parseFloat(document.getElementById('calcPercentualSinal')?.value) || 30;

        const res = this.calculate({
            largura,
            altura,
            estilo,
            local,
            complexidade,
            valorHora,
            insumoExtra,
            percentualSinal: pctSinal
        });

        // Atualizar visualização
        const elArea = document.getElementById('calcAreaDisplay');
        const elTempo = document.getElementById('calcTempoDisplay');
        const elSessoes = document.getElementById('calcSessoesDisplay');
        const elCustoMat = document.getElementById('calcCustoMatDisplay');
        const elValMin = document.getElementById('calcValMinDisplay');
        const elValRec = document.getElementById('calcValRecDisplay');
        const elValPrem = document.getElementById('calcValPremDisplay');
        const elSinal = document.getElementById('calcSinalDisplay');
        const elRestante = document.getElementById('calcRestanteDisplay');

        if (elArea) elArea.textContent = `${res.areaCm2.toFixed(0)} cm² (${res.largura}x${res.altura}cm)`;
        if (elTempo) elTempo.textContent = res.tempoFormatado;
        if (elSessoes) elSessoes.textContent = res.sessoesInfo;
        if (elCustoMat) elCustoMat.textContent = this.formatBRL(res.custoMateriais);
        if (elValMin) elValMin.textContent = this.formatBRL(res.precoMinimo);
        if (elValRec) elValRec.textContent = this.formatBRL(res.precoRecomendado);
        if (elValPrem) elValPrem.textContent = this.formatBRL(res.precoPremium);
        if (elSinal) elSinal.textContent = this.formatBRL(res.valorSinal);
        if (elRestante) elRestante.textContent = this.formatBRL(res.valorRestante);

        // Atualizar mensagem do WhatsApp
        const clienteNome = document.getElementById('calcClienteNome')?.value || '';
        const projetoDesc = document.getElementById('calcDescricao')?.value || '';
        const msgTexto = await this.generateWhatsAppMessage(res, {
            clienteNome,
            projetoDesc,
            estilo,
            local
        });

        const txtArea = document.getElementById('calcMensagemWhatsApp');
        if (txtArea) txtArea.value = msgTexto;

        // Salvar referência global do último cálculo
        this.lastCalculation = {
            ...res,
            clienteNome,
            clienteTel: document.getElementById('calcClienteTel')?.value || '',
            clienteId: document.getElementById('calcClienteId')?.value || '',
            projetoDesc,
            estilo,
            local
        };
    },

    bindEvents() {
        // Inputs change listeners para cálculo reativo
        const watchIds = [
            'calcLargura', 'calcAltura', 'calcEstilo', 'calcLocal', 
            'calcComplexidade', 'calcValorHora', 'calcInsumoExtra', 
            'calcPercentualSinal', 'calcDescricao', 'calcClienteNome'
        ];

        watchIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => this.updateCalculation());
                el.addEventListener('change', () => this.updateCalculation());
            }
        });

        // Cliente Select change & auto-populate
        const selCliente = document.getElementById('calcClienteSelect');
        if (selCliente) {
            selCliente.addEventListener('focus', () => {
                if (selCliente.options.length <= 1) this.populateClientSelect();
            });
            selCliente.addEventListener('click', () => {
                if (selCliente.options.length <= 1) this.populateClientSelect();
            });
            selCliente.addEventListener('change', (e) => {
                const opt = selCliente.selectedOptions[0];
                if (opt && opt.value) {
                    const nome = opt.getAttribute('data-nome') || opt.textContent.split(' (')[0].trim();
                    const tel = opt.getAttribute('data-tel') || '';
                    document.getElementById('calcClienteNome').value = nome;
                    document.getElementById('calcClienteTel').value = tel;
                    document.getElementById('calcClienteId').value = opt.value;
                } else {
                    document.getElementById('calcClienteId').value = '';
                }
                this.updateCalculation();
            });
        }

        // Presets chips click
        document.querySelectorAll('.calc-preset-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyPreset(btn.dataset.preset);
            });
        });

        // Botão Salvar Preferência de Valor/Hora
        document.getElementById('btnSalvarValorHora')?.addEventListener('click', () => {
            const vh = parseFloat(document.getElementById('calcValorHora')?.value) || 180;
            this.saveConfig({ valorHoraBase: vh });
            if (window.showToast) showToast(`Valor base de ${this.formatBRL(vh)}/hora salvo!`, 'success');
        });

        // Botão Copiar Mensagem
        document.getElementById('btnCopiarPropostaCalc')?.addEventListener('click', () => {
            const txtArea = document.getElementById('calcMensagemWhatsApp');
            if (txtArea && txtArea.value) {
                navigator.clipboard.writeText(txtArea.value).then(() => {
                    if (window.showToast) showToast('Proposta copiada para a área de transferência! 📋', 'success');
                }).catch(() => {
                    txtArea.select();
                    document.execCommand('copy');
                    if (window.showToast) showToast('Proposta copiada! 📋', 'success');
                });
            }
        });

        // Botão Enviar no WhatsApp
        document.getElementById('btnEnviarWhatsAppCalc')?.addEventListener('click', () => {
            const tel = document.getElementById('calcClienteTel')?.value || '';
            const msg = document.getElementById('calcMensagemWhatsApp')?.value || '';
            if (!tel) {
                if (window.showToast) showToast('Informe o número de WhatsApp do cliente!', 'warning');
                document.getElementById('calcClienteTel')?.focus();
                return;
            }
            const cleanPhone = tel.replace(/\D/g, '');
            const fullPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
            const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');
        });

        // Trigger de abertura da Calculadora (Topbar e WhatsApp Hub)
        document.getElementById('btnAbrirCalculadora')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal();
        });
        document.getElementById('btnAbrirCalculadoraWa')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.openModal();
        });

        // Trigger de fechamento
        const modalOverlay = document.getElementById('modalCalculadoraOverlay');
        document.getElementById('modalCalculadoraClose')?.addEventListener('click', () => {
            this.closeModal();
        });
        modalOverlay?.addEventListener('click', (e) => {
            if (e.target === modalOverlay) this.closeModal();
        });

        // Botão "📅 Agendar com este Orçamento"
        document.getElementById('btnAgendarComOrcamento')?.addEventListener('click', async () => {
            // Garantir cálculos atualizados
            await this.updateCalculation();
            const calc = this.lastCalculation || this.calculate({
                largura: parseFloat(document.getElementById('calcLargura')?.value) || 10,
                altura: parseFloat(document.getElementById('calcAltura')?.value) || 10,
                estilo: document.getElementById('calcEstilo')?.value || 'blackwork',
                local: document.getElementById('calcLocal')?.value || 'braco',
                complexidade: document.getElementById('calcComplexidade')?.value || 'media',
                valorHora: parseFloat(document.getElementById('calcValorHora')?.value) || this.config.valorHoraBase,
                insumoExtra: parseFloat(document.getElementById('calcInsumoExtra')?.value) || 0,
                percentualSinal: parseFloat(document.getElementById('calcPercentualSinal')?.value) || 30
            });

            // Obter dados do cliente do formulário da calculadora
            const inputNome = document.getElementById('calcClienteNome');
            const selCliente = document.getElementById('calcClienteSelect');
            let clienteNome = (inputNome?.value || '').trim();
            let clienteTel = (document.getElementById('calcClienteTel')?.value || '').trim();
            let clienteId = document.getElementById('calcClienteId')?.value || (selCliente ? selCliente.value : '') || '';

            if (!clienteNome && selCliente && selCliente.value) {
                const opt = selCliente.selectedOptions[0];
                if (opt) {
                    clienteNome = opt.getAttribute('data-nome') || opt.textContent.split(' (')[0].trim();
                    if (!clienteTel) clienteTel = opt.getAttribute('data-tel') || '';
                }
            }

            // Tentar localizar cliente cadastrado no DataStore por ID ou Nome
            let allClientes = [];
            try {
                if (typeof window !== 'undefined' && window.DataStore && typeof DataStore.getClientes === 'function') {
                    allClientes = await DataStore.getClientes();
                }
            } catch (err) {}

            let matchedClient = null;
            if (clienteId) {
                matchedClient = allClientes.find(c => c.id === clienteId);
            }
            if (!matchedClient && clienteNome) {
                const lowerNome = clienteNome.toLowerCase();
                matchedClient = allClientes.find(c => c.nome && c.nome.toLowerCase() === lowerNome);
                if (matchedClient) {
                    clienteId = matchedClient.id;
                    clienteNome = matchedClient.nome;
                    if (!clienteTel) clienteTel = matchedClient.telefone || '';
                }
            }

            // Fechar modal da calculadora
            this.closeModal();

            // Abrir modal de agendamento pré-preenchido
            const modalAgendaOverlay = document.getElementById('modalAgendaOverlay');
            if (modalAgendaOverlay) {
                document.getElementById('formAgenda')?.reset();
                if (window.resetAgDropzone) window.resetAgDropzone();

                const title = document.getElementById('modalAgendaTitle');
                if (title) title.textContent = 'Agendar com Orçamento Calculado';

                // Garantir que a lista de clientes do agendamento está populada no DOM!
                if (typeof window.populateAgClients === 'function') {
                    await window.populateAgClients(clienteId || (matchedClient ? matchedClient.id : null));
                }

                const agSelect = document.getElementById('agClienteSelect');
                const newFields = document.getElementById('newAgClienteFields');
                const badge = document.getElementById('agClienteBadge');

                if (matchedClient || clienteId) {
                    if (agSelect) {
                        agSelect.value = clienteId;
                        if (typeof handleAgClienteSelectChange === 'function') {
                            handleAgClienteSelectChange();
                        }
                    }
                    if (newFields) newFields.style.display = 'none';
                    document.getElementById('agCliente').value = clienteNome;
                    document.getElementById('agClienteId').value = clienteId;
                } else if (clienteNome) {
                    // Cliente avulso / novo
                    if (agSelect) {
                        agSelect.value = '+novo';
                        if (typeof handleAgClienteSelectChange === 'function') {
                            handleAgClienteSelectChange();
                        }
                    }
                    if (newFields) newFields.style.display = 'block';
                    if (badge) badge.style.display = 'none';
                    const newNomeEl = document.getElementById('newAgClienteNome');
                    const newTelEl = document.getElementById('newAgClienteTel');
                    if (newNomeEl) newNomeEl.value = clienteNome;
                    if (newTelEl && clienteTel) newTelEl.value = clienteTel;
                    document.getElementById('agCliente').value = clienteNome;
                    document.getElementById('agClienteId').value = '';
                } else {
                    if (agSelect) {
                        agSelect.value = '';
                        if (typeof handleAgClienteSelectChange === 'function') {
                            handleAgClienteSelectChange();
                        }
                    }
                    if (newFields) newFields.style.display = 'none';
                }

                const projetoDesc = (document.getElementById('calcDescricao')?.value || '').trim();
                const estilo = document.getElementById('calcEstilo')?.value || 'blackwork';
                const local = document.getElementById('calcLocal')?.value || 'braco';
                const largura = parseFloat(document.getElementById('calcLargura')?.value) || 10;
                const altura = parseFloat(document.getElementById('calcAltura')?.value) || 10;
                const localNome = this.locais[local]?.nome?.split(' (')[0] || local;

                document.getElementById('agDescricao').value = projetoDesc 
                    ? `${projetoDesc} (${largura}x${altura}cm - ${localNome})`
                    : `Tatuagem ${largura}x${altura}cm (${localNome})`;

                document.getElementById('agValorTotal').value = calc.precoRecomendado;
                document.getElementById('agValorSinal').value = calc.valorSinal;
                document.getElementById('agSinalPago').value = 'pendente';
                document.getElementById('agStatus').value = 'agendado';

                const agDataEl = document.getElementById('agData');
                if (agDataEl && !agDataEl.value) {
                    agDataEl.value = typeof TODAY !== 'undefined' ? TODAY : new Date().toISOString().split('T')[0];
                }
                const agInicioEl = document.getElementById('agInicio');
                if (agInicioEl && !agInicioEl.value) agInicioEl.value = '14:00';
                const agFimEl = document.getElementById('agFim');
                if (agFimEl && !agFimEl.value) agFimEl.value = '17:00';
                
                if (window.calcAgRestante) window.calcAgRestante();
                if (window.openModal) window.openModal(modalAgendaOverlay);
                else {
                    modalAgendaOverlay.classList.add('active');
                    document.body.classList.add('modal-open');
                    document.body.style.overflow = 'hidden';
                }
                if (window.showToast) {
                    const clientMsg = clienteNome ? ` do cliente "${clienteNome}"` : '';
                    showToast(`Orçamento${clientMsg} carregado no agendamento!`, 'info');
                }
            }
        });

        // Botão "💾 Salvar em Orçamentos"
        document.getElementById('btnSalvarCentralOrcamento')?.addEventListener('click', () => {
            this.saveOrcamento();
        });
    },

    // ── Salvar Orçamento na Central ──
    async saveOrcamento() {
        // Garantir que os cálculos estão atualizados
        await this.updateCalculation();
        const calc = this.lastCalculation || this.calculate({
            largura: parseFloat(document.getElementById('calcLargura')?.value) || 10,
            altura: parseFloat(document.getElementById('calcAltura')?.value) || 10,
            estilo: document.getElementById('calcEstilo')?.value || 'blackwork',
            local: document.getElementById('calcLocal')?.value || 'braco',
            complexidade: document.getElementById('calcComplexidade')?.value || 'media',
            valorHora: parseFloat(document.getElementById('calcValorHora')?.value) || this.config.valorHoraBase,
            insumoExtra: parseFloat(document.getElementById('calcInsumoExtra')?.value) || 0,
            percentualSinal: parseFloat(document.getElementById('calcPercentualSinal')?.value) || 30
        });

        // Pegar nome do cliente (do input, do select ou fallback amigável)
        const inputNome = document.getElementById('calcClienteNome');
        const selCliente = document.getElementById('calcClienteSelect');
        let clienteNome = (inputNome?.value || '').trim();

        if (!clienteNome && selCliente && selCliente.value) {
            const opt = selCliente.selectedOptions[0];
            if (opt) clienteNome = opt.getAttribute('data-nome') || opt.textContent.split(' (')[0].trim();
        }

        if (!clienteNome) {
            clienteNome = 'Cliente WhatsApp (' + new Date().toLocaleDateString('pt-BR') + ')';
        }

        const clienteTel = (document.getElementById('calcClienteTel')?.value || '').trim();
        const clienteId = document.getElementById('calcClienteId')?.value || (selCliente ? selCliente.value : '') || '';
        const projetoDesc = (document.getElementById('calcDescricao')?.value || '').trim();
        const estilo = document.getElementById('calcEstilo')?.value || 'blackwork';
        const local = document.getElementById('calcLocal')?.value || 'braco';
        const largura = parseFloat(document.getElementById('calcLargura')?.value) || 10;
        const altura = parseFloat(document.getElementById('calcAltura')?.value) || 10;
        const localNome = this.locais[local]?.nome?.split(' (')[0] || local;

        const orcData = {
            cliente: clienteNome,
            clienteId: clienteId,
            telefone: clienteTel,
            descricao: projetoDesc 
                ? `${projetoDesc} (${largura}x${altura}cm - ${localNome})` 
                : `Tatuagem ${largura}x${altura}cm (${localNome})`,
            estilo: estilo,
            valorEstimado: calc.precoRecomendado || 200,
            status: 'pendente',
            data: new Date().toISOString().split('T')[0],
            notas: `Tempo estimado: ${calc.tempoFormatado || '2h'} • Local: ${localNome} • Sinal sugerido: ${this.formatBRL(calc.valorSinal || 60)}`
        };

        try {
            if (typeof window !== 'undefined' && window.DataStore && typeof DataStore.addOrcamento === 'function') {
                await DataStore.addOrcamento(orcData);
            } else {
                const local = JSON.parse(localStorage.getItem('gh_orcamentos') || '[]');
                local.unshift({ ...orcData, id: 'orc_' + Date.now() });
                localStorage.setItem('gh_orcamentos', JSON.stringify(local));
            }

            if (typeof showToast === 'function') {
                showToast(`Orçamento de "${clienteNome}" salvo com sucesso! 🎉`, 'success');
            } else if (window.showToast) {
                window.showToast(`Orçamento de "${clienteNome}" salvo com sucesso! 🎉`, 'success');
            }

            this.closeModal();

            if (typeof window !== 'undefined' && window.WhatsAppService && typeof WhatsAppService.renderHub === 'function') {
                await WhatsAppService.renderHub();
            }
            if (typeof refreshAll === 'function') {
                await refreshAll();
            } else if (typeof window !== 'undefined' && window.refreshAll) {
                await window.refreshAll();
            }
        } catch (e) {
            console.error('Error saving orcamento:', e);
            if (window.showToast) showToast('Erro ao salvar orçamento: ' + e.message, 'error');
        }
    }
};

// Exportar globalmente
if (typeof window !== 'undefined') {
    window.TattooCalculator = TattooCalculator;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TattooCalculator;
}

// Auto-inicializar no navegador
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => TattooCalculator.init());
    } else {
        TattooCalculator.init();
    }
}
