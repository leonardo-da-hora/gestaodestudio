# 🖤 GH Studio — Gestão Inteligente para Estúdios de Tatuagem

<div align="center">

![GH Studio Logo](gh_studio_logo.jpg)

**Sistema completo de gestão operacional, financeira e de agendamentos desenvolvido sob medida para tatuadores e estúdios profissionais.**

[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-Modern-E34F26?logo=html5&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-Glassmorphism-1572B6?logo=css3&logoColor=white)](https://developer.mozilla.org/pt-BR/docs/Web/CSS)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

</div>

---

## ✨ Principais Funcionalidades

### 📅 1. Agenda Semanal & Controle de Sessões
- **Sincronização em Tempo Real**: Atualiza automaticamente para a semana vigente de acordo com o calendário do sistema.
- **Navegação Inteligente**: Botões para avançar/retroceder semanas ou retornar ao dia atual com o botão rápido **"Hoje"**.
- **Destaque Visual**: Marcação dourada no dia atual e cartões diferenciados por status (agendado, concluído, cancelado).
- **Visualização Dupla**: Alterne entre a grade semanal estilo planner e a visualização em lista detalhada.

### 🎨 2. Calculadora Inteligente de Orçamentos
- **Precificação Paramétrica**:
  - Estilos de tatuagem (Fine Line, Blackwork, Realismo, Old School, Geek/Aquarela, Oriental).
  - Dimensões reais da arte (largura × altura em cm²).
  - Nível de complexidade e preenchimento (linhas simples, sombreado suave, cobertura/colorido total).
  - Localização anatômica do corpo com multiplicadores de dificuldade.
- **Divisão Financeira Automática**: Estipulação automática do valor de sinal (ex: 30%) e saldo restante.
- **Integração com Clientes**: Vinculação direta a clientes cadastrados ou criação de novos contatos direto na simulação.
- **Histórico de Orçamentos**: Salve propostas para consulta e acompanhamento posterior.

### 📊 3. Dashboard Financeiro com Seletor Mensal
- **Filtro Mensal Interativo**: Botão e seletor com calendário para visualizar os números consolidados de qualquer mês (passado, presente ou futuro).
- **Indicadores Chave (KPIs)**:
  - Faturamento líquido do mês selecionado.
  - Despesas operacionais apuradas no período.
  - Lucro real e margem de rentabilidade.
  - Valores a receber e régua de cobrança de saldos pendentes.
- **Metas Mensais com Run-Rate**: Defina a meta financeira do mês, acompanhe a barra de progresso visual e saiba o ritmo diário necessário para bater o objetivo.

### 💬 4. Central WhatsApp & Automações
- **Templates Profissionais com 1 Clique**:
  - Confirmação de agendamento com orientações pré-sessão.
  - Lembrete de pagamento de sinal com chave PIX.
  - Notificação de saldo restante a pagar.
  - Guia completo de cuidados pós-sessão e cicatrização da tatuagem.
- Disparo direto via `https://wa.me/` sem necessidade de planos pagos ou APIs complexas.

### 📄 5. Relatórios & Comprovantes em PDF
- Exportação instantânea de demonstrativos financeiros e balancetes detalhados.
- Geração de recibos e comprovantes profissionais com layout elegante e branding do estúdio via `jsPDF`.

### 📦 6. Controle de Estoque & Materiais
- Gestão de agulhas, cartuchos, tintas, batoques, transfer e EPIs descartáveis.
- Registro de movimentações de entrada e saída com integração opcional às despesas do mês.

### 📱 7. Pareamento com Celular (Acesso em Rede Local)
- Conecte o smartphone ou tablet do tatuador à mesma rede Wi-Fi do computador através de QR Code dinâmico.

### 🔒 8. Arquitetura Híbrida e Resiliente (Cloud + Offline)
- **Modo Nuvem**: Integração com Google Firebase (Authentication e Cloud Firestore) com persistência offline ativada.
- **Modo Demo / Fallback Local**: Funciona perfeitamente mesmo sem internet ou sem configurar o Firebase, utilizando `LocalStorage` e `IndexedDB` com isolamento por usuário.

---

## 🚀 Como Executar o Projeto Localmente

Como o projeto é construído em tecnologia web nativa (HTML5, CSS3 moderno e Vanilla JavaScript), **não é necessário compilar nem instalar dependências pesadas**:

### Pré-requisitos
- Um navegador web moderno (Google Chrome, Edge, Firefox, Brave ou Safari).
- Um servidor HTTP local simples (como a extensão *Live Server* do VS Code, `npx serve` ou Python).

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/leonardo-da-hora/gestaodestudio.git
   cd gestaodestudio
   ```

2. **Inicie um servidor local:**
   - Com Node.js / npx:
     ```bash
     npx serve .
     ```
   - Ou com Python:
     ```bash
     python -m http.server 3000
     ```

3. **Abra no seu navegador:**
   - Acesse `http://localhost:3000` (ou a porta indicada pelo seu servidor).
   - O sistema iniciará imediatamente pronto para uso.

---

## ⚙️ Configuração do Firebase (Opcional para Nuvem)

Por padrão de segurança, o arquivo `js/firebase-config.js` é ignorado no repositório. O sistema roda normalmente em **Modo Offline/Demo** caso não seja configurado.

Para ativar a sincronização na nuvem com o seu próprio projeto:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/) e crie um projeto gratuito.
2. Ative o **Firebase Authentication** (Método Email/Senha) e o **Cloud Firestore**.
3. Na pasta `js/`, duplique o arquivo `firebase-config.example.js` e renomeie-o para `firebase-config.js`:
   ```bash
   cp js/firebase-config.example.js js/firebase-config.js
   ```
4. Abra o `js/firebase-config.js` e cole as credenciais do seu aplicativo web:
   ```javascript
   const firebaseConfig = {
       apiKey: "SUA_API_KEY",
       authDomain: "seu-estudio.firebaseapp.com",
       projectId: "seu-estudio",
       storageBucket: "seu-estudio.firebasestorage.app",
       messagingSenderId: "123456789",
       appId: "1:123456789:web:abcdef"
   };
   ```

---

## 📁 Estrutura do Repositório

```plaintext
├── index.html                   # Painel principal do estúdio (Dashboard, Agenda, Financeiro)
├── login.html                   # Tela de login e cadastro de tatuador
├── styles.css                   # Sistema de design, variáveis HSL, glassmorphism e responsividade
├── app.js                       # Controlador principal, roteamento e lógica da interface
├── gh_studio_logo.jpg           # Identidade visual da marca
├── .gitignore                   # Arquivos ignorados pelo Git (segredos e temporários)
├── assets/                      # Imagens de portfólio, logos e referências visuais
│   ├── logo.jpg
│   ├── tattoo_dragon.jpg
│   ├── tattoo_floral.jpg
│   └── tattoo_lion.jpg
├── css/
│   └── login.css                # Estilos dedicados da tela de login
└── js/
    ├── auth.js                  # Módulo de autenticação e perfil do tatuador
    ├── calculator.js            # Engine de orçamentos e precificação inteligente
    ├── db.js                    # Camada de banco de dados híbrida (Firestore + LocalStorage)
    ├── firebase-config.example.js # Modelo seguro de configuração do Firebase
    ├── notifications.js         # Central de notificações de pendências e agendamentos
    ├── pdf.js                   # Geração e formatação de relatórios em PDF
    ├── storage.js               # Gerenciador de armazenamento de mídia
    └── whatsapp.js              # Central de automações e templates do WhatsApp
```

---

## 📄 Licença

Este projeto é disponibilizado sob a licença [MIT](LICENSE).

---

<div align="center">
Desenvolvido com 🖤 para tatuadores que buscam excelência artística e organização profissional.
</div>
