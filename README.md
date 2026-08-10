# ✨ I Lash Studio — Luxury Agenda System

<p align="center">
  <img src="https://raw.githubusercontent.com/droidmarx/ilash-studio-oficial/main/public/logo.png" alt="I Lash Studio Logo" width="220" />
</p>

<p align="center">
  <strong>Sistema de gestão premium para Lash Designers</strong><br/>
  Agenda inteligente · Anamnese digital · Notificações via Telegram · Assinatura digital
</p>

<p align="center">
  <a href="https://ilash-studio-oficial.vercel.app" target="_blank">
    <img src="https://img.shields.io/badge/🚀_Live_Demo-ilash--studio--oficial.vercel.app-pink?style=for-the-badge" alt="Live Demo" />
  </a>
  &nbsp;
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-Backend-green?style=for-the-badge&logo=supabase" alt="Supabase" />
</p>

---

## 🎯 Para que serve?

O **I Lash Studio** é um ecossistema completo de gestão feito sob medida para profissionais de extensão de cílios.

Ele resolve o problema real de Lash Designers que perdem tempo com:
- Agenda desorganizada (WhatsApp + papel)
- Fichas de anamnese em PDF ou caderno
- Esquecer de cobrar ou de lembrar a cliente
- Não ter visão clara do faturamento do mês

O sistema cuida da burocracia para que a profissional foque no que realmente importa: **transformar olhares**.

---

## ✨ Funcionalidades Principais

### 👨‍💻 Portal da Lash Designer (Admin)
| Módulo | O que faz |
|--------|-----------|
| **Calendário VIP** | Visualização mensal com marcadores coloridos por tipo de procedimento (Aplicação, Manutenção, Remoção) |
| **Dashboard Financeiro** | Calcula automaticamente ganhos da semana e faturamento total do mês |
| **Gestão de Clientes** | Base completa com edição de agendamentos, exclusão e fichas de saúde |
| **Configurações** | Personalização de horários, preços, logo e integrações |

### 📱 Experiência da Cliente (Link de Agendamento)
Link exclusivo (ex: bio do Instagram) onde a cliente agenda sozinha:
1. Identificação (nome + WhatsApp)
2. Escolha do procedimento e técnica
3. Seleção de data e horário disponível
4. **Anamnese digital** com autorização de imagem e **assinatura na tela do celular**

### 🤖 Robô Assistente (Telegram)
- Notificação em tempo real a cada novo agendamento
- Resumo da manhã às 08:00 com a agenda do dia
- Lembrete 2 horas antes de cada atendimento
- Comandos interativos (`/hoje`, `/semana`, `/mes`)

### 💰 Outros diferenciais
- Temas **Rose Gold (Light)** e **Anthracite & Gold (Dark)**
- Integração com **Mercado Pago** (assinaturas)
- Painel Super Admin (multi-tenant)
- Automações via GitHub Actions (cron de lembretes)

---

## 🖼️ Identidade Visual

<p align="center">
  <img src="https://raw.githubusercontent.com/droidmarx/ilash-studio-oficial/main/public/logo.png" alt="Logo I Lash Studio" width="180" />
</p>

O sistema alterna entre dois temas luxuosos:

- **Light** — Off-White & Rose Gold (sofisticação diurna)
- **Dark** — Anthracite & Gold (visual Luxury Night)

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | Next.js 15 (App Router + Turbopack), React 19, TypeScript |
| **UI** | Tailwind CSS, shadcn/ui (Radix), Lucide Icons, Recharts |
| **Backend / DB** | Supabase (Auth + PostgreSQL + Storage) |
| **Pagamentos** | Mercado Pago |
| **Notificações** | Telegram Bot API |
| **Automações** | GitHub Actions (cron) |
| **Deploy** | Vercel |

---

## 🚀 Como rodar localmente

```bash
# 1. Clone o repositório
git clone https://github.com/droidmarx/ilash-studio-oficial.git
cd ilash-studio-oficial

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
# (Supabase URL/Key, Telegram Token, Mercado Pago, etc.)

# 4. Rode em desenvolvimento
npm run dev
```

Acesse: [http://localhost:9002](http://localhost:9002)

---

## 📂 Estrutura principal

```text
src/
├── app/
│   ├── page.tsx              # Dashboard da Lash Designer
│   ├── login/                # Autenticação
│   ├── s/[slug]/             # Link público de agendamento da cliente
│   ├── anamnese/[id]/        # Ficha de anamnese digital
│   ├── subscription/         # Planos e pagamento
│   ├── super-admin/          # Painel multi-tenant
│   └── api/                  # Telegram, Mercado Pago, Cron, Upload
├── components/
│   ├── agenda/               # Calendário, formulários, clientes
│   ├── auth/
│   └── ui/                   # shadcn/ui
└── lib/                      # Supabase, API helpers, Mercado Pago
```

---

## 📱 Live Demo

🔗 **[https://ilash-studio-oficial.vercel.app](https://ilash-studio-oficial.vercel.app)**

---

## 👨‍💻 Autor

**Guilherme Marques Santos**  
Front-end Developer  
[GitHub](https://github.com/droidmarx)

---

*Desenvolvido para Lash Designers que não aceitam nada menos que a perfeição.*
