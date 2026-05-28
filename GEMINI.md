# Instruções para IA - Fluxo de Atualização Automática

Este documento serve como guia para que qualquer Inteligência Artificial (como o Gemini CLI) entenda como gerenciar e publicar novas versões deste sistema.

## 🚀 Arquitetura de Atualização
O sistema utiliza **`electron-updater`** para buscar atualizações no **GitHub Releases**.
- **Configuração:** Localizada no `package.json` sob a chave `build.publish`.
- **Lógica Principal:** No arquivo `src/main/main.ts`, o sistema checa atualizações 3 segundos após o boot e notifica o usuário via `dialog` quando o download termina.
- **Automação:** O arquivo `.github/workflows/publish.yml` gera os instaladores automaticamente quando uma nova **Tag** de versão é enviada para o GitHub.

## 🛠️ Como realizar uma nova atualização (Diretivas para IA)

Sempre que o usuário solicitar "Publicar uma nova versão" ou "Lançar atualização", a IA deve seguir rigorosamente estes passos:

1. **Confirmar Alterações:** Verificar se todos os arquivos editados foram salvos.
2. **Incrementar Versão:** 
   - Ler o `version` atual no `package.json`.
   - Aumentar o número seguindo o padrão SemVer (ex: 1.0.0 -> 1.0.1).
3. **Commit e Push:**
   - Realizar o commit das mudanças: `git add . && git commit -m "feat: descrição da nova versão"`.
   - Fazer o push: `git push`.
4. **Criar e Enviar Tag:**
   - Criar a tag correspondente à nova versão: `git tag v1.0.1` (exemplo).
   - Enviar a tag para o servidor: `git push origin v1.0.1`.
5. **Verificação:** Informar ao usuário que o processo no GitHub Actions foi iniciado e que em alguns minutos a atualização estará disponível.

## 📝 Observações Importantes
- **Versão Única:** Nunca repita uma versão que já foi publicada.
- **Permissões:** O repositório precisa ter permissões de escrita habilitadas para o `GITHUB_TOKEN` nas configurações de Actions do GitHub.
- **Ambiente:** O processo de build roda em `windows-latest` no GitHub Actions para gerar o `.exe`.

---
*Este documento foi gerado para facilitar a colaboração entre humanos e IAs no projeto SDG Controle.*
