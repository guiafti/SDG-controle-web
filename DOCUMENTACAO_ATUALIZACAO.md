# 🚀 Documentação: Sistema de Atualização Automática - SDG Controle

Este documento detalha a arquitetura e o funcionamento do sistema de atualização automática implementado para garantir que todas as lojas do grupo recebam novas versões de forma fluida e segura.

---

## 🏗️ 1. Arquitetura de Repositórios (Privado vs. Público)

Para proteger o código-fonte e facilitar a distribuição, dividimos o projeto em dois:
- **Repositório Privado (`SDG_Controle_Gui`):** Contém todo o código-fonte, lógica de negócio e configurações. Apenas desenvolvedores autorizados têm acesso.
- **Repositório Público (`sdg-releases`):** Atua apenas como um servidor de arquivos para os instaladores (`.exe`) e metadados de atualização (`latest.yml`). É onde o aplicativo das lojas busca as novas versões.

---

## 🤖 2. Fluxo de CI/CD (GitHub Actions)

O processo de compilação e publicação é 100% automatizado através do arquivo `.github/workflows/publish.yml`.

- **Gatilho:** Sempre que uma nova **Tag de Git** (ex: `v1.1.8`) é enviada para o repositório privado.
- **Segurança:** Utilizamos um `GH_RELEASES_TOKEN` (Personal Access Token) configurado nos Secrets para permitir que o repositório privado "escreva" no repositório público.
- **Ação:** O robô instala as dependências, compila o app para Windows, gera o instalador e publica diretamente na aba **Releases** do repositório público.

---

## 💻 3. Implementação no Aplicativo (Client-side)

### 🛰️ Detecção e Download
O sistema utiliza o `electron-updater` configurado no `src/main/main.ts`.
- **Check Automático:** 3 segundos após o boot.
- **Check Manual:** Disponível na aba Chatbot das Configurações.
- **Download em Segundo Plano:** O download inicia silenciosamente ao detectar uma versão superior no repo público.

### 🎨 Interface de Progresso (UX)
Implementamos uma barra de progresso em tempo real na `TitleBar.tsx`:
- **Status Disponível:** Ícone ✨ com número da versão.
- **Status Baixando:** Ícone de download animado e barra de progresso com porcentagem (ex: 45%).
- **Status Concluído:** Mensagem de "Atualização Pronta" e diálogo para reinicialização.

---

## 🛠️ 4. Como Lançar uma Nova Versão (Guia do Desenvolvedor)

Não é necessário editar o `package.json` ou criar tags manualmente. Criamos um comando de automação:

### Comando Único:
```powershell
npm run release -- 1.1.9
```

**O que este comando faz:**
1. Atualiza a versão no `package.json`.
2. Cria um commit com a alteração.
3. Faz o push para o repositório privado.
4. Cria uma Tag de Git (ex: `v1.1.9`).
5. Faz o push da Tag, disparando o build no GitHub.

---

## 📝 5. Observações de Segurança
- O arquivo `.env` e o banco de dados `local.db` estão no `.gitignore` e **nunca** são enviados para os repositórios.
- O Token de acesso ao GitHub deve ser mantido em segredo e renovado se houver suspeita de vazamento.

---
*Documentação gerada em 28 de maio de 2026 para o projeto SDG Controle.*
