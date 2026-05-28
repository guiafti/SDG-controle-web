# 📘 Diário de Desenvolvimento e Configuração - SDG Controle

Este documento consolida todas as intervenções técnicas realizadas para estabilizar o sistema e configurar o hardware no ambiente Linux.

---

## 🏗️ 1. Estabilização Inicial (Correção do Boot)
*   **Problema:** O sistema abria com tela branca e travava na sincronização inicial.
*   **Solução:** 
    *   Ajustado o script `electron:dev` no `package.json` para esperar o Vite estar 100% pronto antes de abrir a janela.
    *   Fixado erro de sintaxe no arquivo `ProductSearchModal.tsx` que impedia o carregamento do JavaScript.
    *   Habilitado a abertura automática do **DevTools** para diagnóstico rápido.

---

## 🖨️ 2. Revolução da Impressora Térmica (Knup KP-1029)
Este foi o maior desafio técnico, resolvido com uma abordagem de baixo nível.

*   **Identificação:** Detectamos o hardware via `lsusb` (**VID: 28e9, PID: 0289**).
*   **Permissões Linux (UDEV):** Criamos o script `setup-impressora.sh` que:
    1. Cria regras de acesso em `/etc/udev/rules.d/`.
    2. Adiciona o usuário aos grupos de hardware (`lp`, `dialout`).
    3. Desativa o driver conflitante `usblp` do kernel.
*   **Mudança de Arquitetura:** 
    *   Abandonamos a biblioteca `escpos-usb` (que dava erro de `usb.on is not a function`).
    *   Refatoramos o `PrinterModule.ts` para usar **Bulk Transfer direto** via módulo `usb` do Node.js.
    *   **Resultado:** Impressão instantânea e estável de Vendas e Ordens de Serviço.

---

## 🛠️ 3. Correção de Interface e Janela
*   **Controles de Janela:** Corrigido o `preload.ts` e o `main.ts` para que os botões de Minimizar, Maximizar e Fechar voltassem a funcionar.
*   **Segurança e Hardware:** Desativado o `sandbox` no Electron para permitir que o processo principal acesse a porta USB sem bloqueios do sistema.
*   **Menu Lateral:** Renomeado o botão "Personalização" para **"Configurações"** e adicionada rolagem automática para telas pequenas.

---

## 🔄 4. Correção de Banco e Sincronização
*   **Erro PGRST204:** Corrigido o erro de sincronização com o Supabase removendo o campo `delivery_date` do envio (coluna que só existe localmente).
*   **Restauro de Handlers:** Re-inseridos todos os "recebedores" (IPC Handlers) que haviam sumido, restaurando as funções de:
    *   Login de usuários.
    *   Gerenciamento de Tarefas.
    *   Lançamento de Vendas e Baixa de Estoque.
    *   Cadastro de Clientes.

---

## 🚀 Como prosseguir agora?
Sempre que o sistema for instalado em um novo Linux:
1. Rode `npm run rebuild` para compilar os módulos de hardware.
2. Rode o botão **"Configurar Permissão USB (Linux)"** dentro de Configurações.
3. Reinicie o cabo USB da impressora.

---
*Documento gerado por Gemini CLI em 17 de Maio de 2026.*
