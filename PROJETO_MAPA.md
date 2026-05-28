# 🚀 Mapa Estratégico: Sistema Romafre - SDG Controle 2.0

## 1. Visão Geral
Este é um sistema de **Comando e Controle Operacional** desenvolvido para gerenciar uma rede de **5 lojas** de eletrônicos e assistência técnica. O foco é minimalismo, alta performance e sincronização em tempo real entre a Matriz e as Filiais.

---

## 2. Arquitetura do Sistema
*   **Frontend:** React + Tailwind CSS (Estética Premium/Dark Mode).
*   **Backend Local:** Electron + SQLite (Garante funcionamento offline).
*   **Sincronização:** Supabase (PostgreSQL) - Motor de PULL/PUSH a cada 30s.
*   **Protocolo de Segurança:** Guardian Protocol (Importação inteligente de XML).

---

## 3. Módulos Principais

### A. Gestão de Rede (Hub Central)
*   **Comando de Missões:** O patrão dita ordens (checklists) para funcionários ou lojas.
*   **Sigilo Total:** Cada funcionário vê APENAS as suas tarefas.
*   **Cobrabilidade:** Exigência de foto e justificativa para conclusão de processos críticos.
*   **Controle de Acessos:** Gestão centralizada de logins, senhas e status de lojas.

### B. PDV & CRM Integrado
*   **Caixa Rápido:** Busca unificada (Código de barras ou Nome).
*   **Identificação de Cliente:** Vínculo imediato da venda ao CPF/WhatsApp do cliente.
*   **Histórico de Fidelidade:** O CRM mostra automaticamente o que o cliente comprou, quando e com quem.

### C. Fluxo Financeiro Inteligente
*   **Fluxo de Caixa Real:** Consolidação automática de Vendas (Entradas) e Despesas (Saídas).
*   **Análise de Margem:** Cálculo em tempo real de lucro líquido e custo de mercadoria.
*   **Gestão de Comissões:** Cálculo automático por vendedor.

### D. Assistência Técnica (Repairs)
*   **Protocolo de Entrada:** Registro com fotos, defeitos e prioridades.
*   **Status de Rede:** Acompanhamento de qual loja está com o aparelho no momento.

### E. Automação de Impressão (Novidade)
*   **Motor Híbrido:** Suporte nativo a ESC/POS (USB Direto) com fallback automático para Windows Spooler.
*   **Auto-Detecção:** Identificação automática de hardware via VID/PID para configuração zero-touch.

---

## 4. Guia para a Inteligência Artificial (IA)
Para manter a agilidade e o padrão "Luxo" do sistema:

1.  **Priorize `src/main` e `src/presentation`**: A inteligência está aqui.
2.  **Ignore Pastas Pesadas**: `node_modules`, `dist` e `release` são apenas arquivos compilados.
3.  **Regra de UI**: Nunca use `alert()` ou `confirm()` nativos. Use o sistema de Toasts e Modais customizados para não travar a digitação.
4.  **Banco de Dados**: Sempre verifique o `database.ts` (local) e as tabelas do Supabase (nuvem) antes de criar novas funções.

---
**Status Atual:** Sistema estabilizado com sincronização de tarefas por nome de usuário e fluxo financeiro unificado.
