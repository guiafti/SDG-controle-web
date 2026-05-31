# Resumo de Atividades - Sistema Romafre (SDG Controle)

Este documento detalha as investigações e melhorias realizadas no sistema para garantir a estabilidade da conexão com o banco de dados e a sincronização em nuvem.

## 1. Investigação da Conexão com o Banco de Dados
- **Status Local:** O banco de dados SQLite (`local.db`) foi verificado e está íntegro, operando corretamente em modo WAL.
- **Identificação de Erro:** Detectamos um erro de incompatibilidade de versão do Node.js ao tentar rodar scripts de diagnóstico externos, confirmando que o ambiente de execução do Electron é isolado e requer configurações específicas.

## 2. Diagnóstico de Falha na Sincronização (Máquinas Novas)
Identificamos por que o sistema não sincronizava em instalações limpas:
- **Ausência do `.env`:** O arquivo `.env` (contendo as chaves do Supabase) é ignorado pelo Git e não estava sendo incluído no build gerado pelo GitHub Actions.
- **Volatilidade da Pasta de Instalação:** Arquivos colocados manualmente na pasta de instalação do programa são removidos ou perdidos durante atualizações automáticas do `electron-updater`.

## 3. Implementação de Solução Resiliente
Modificamos o carregamento de configurações para tornar o sistema mais robusto:
- **Localização Dual:** O sistema agora busca o arquivo `.env` em dois locais:
    1.  **Pasta de Instalação** (Resources).
    2.  **Pasta de Dados do Usuário** (`%APPDATA%/SDG Controle`).
- **Persistência:** Ao colocar o `.env` na pasta de dados do usuário, a configuração **não é apagada** durante as atualizações automáticas.

## 4. Arquivos Modificados
- `src/main/SyncEngine.ts`: Atualizada a lógica de inicialização para suportar o fallback em `userData`.
- `src/main/main.ts`: Sincronizada a lógica de carregamento de variáveis de ambiente no boot do sistema.

## 5. Como Configurar Novas Máquinas
Para ativar a sincronização em uma nova instalação:
1.  Navegue até `%APPDATA%/SDG Controle`.
2.  Cole o arquivo `.env` contendo as credenciais do Supabase.
3.  Reinicie o aplicativo.

---
*Gerado em: 31 de maio de 2026*
