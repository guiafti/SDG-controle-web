# Guia de Implementação: Atualização Remota (Auto-Updater)

Este documento descreve detalhadamente como configurar e utilizar o sistema de atualização automática para o "SDG Controle", permitindo gerenciar as versões das 5 lojas remotamente.

## 1. O Conceito

O sistema utiliza o pacote `electron-updater` em conjunto com o `electron-builder`. A arquitetura funciona da seguinte maneira:
1.  **Hospedagem:** Os arquivos de instalação (releases) são hospedados no **GitHub Releases**.
2.  **Verificação:** O aplicativo instalado nas lojas checa o GitHub regularmente para ver se há uma versão (`version` no `package.json`) maior do que a que ele está rodando.
3.  **Download e Instalação:** Se houver uma nova versão, o sistema baixa em segundo plano e notifica o operador para reiniciar e aplicar a atualização.

## 2. Pré-requisitos (O que deve estar configurado no repositório)

### A. Configuração no `package.json`
Certifique-se de que a sessão `build.publish` está apontando corretamente para o seu repositório:
```json
"build": {
  "publish": [
    {
      "provider": "github",
      "owner": "seu-usuario",
      "repo": "nome-do-repositorio"
    }
  ]
}
```

### B. Personal Access Token (PAT) do GitHub
Se o seu repositório for **privado**, os clientes (lojas) precisarão de um token de leitura para verificar atualizações. Se for **público**, não precisa.
Para o processo de publicação (via GitHub Actions ou máquina local), você precisará criar um token:
1. Vá no GitHub: *Settings > Developer settings > Personal access tokens > Tokens (classic)*.
2. Gere um token com as permissões de `repo`.
3. Guarde este token com segurança.

## 3. Implementação no Código (`src/main/main.ts`)

A lógica de verificação deve ser injetada no processo principal do Electron.

**Importe o módulo:**
```typescript
import { autoUpdater } from 'electron-updater';
import { dialog } from 'electron';
```

**Configure o comportamento (dentro da função que inicia o App, após o `createWindow`):**
```typescript
  // Configuração do Updater
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  // Busca atualizações 3 segundos após abrir o sistema
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);

  // Eventos de feedback para o usuário
  autoUpdater.on('update-available', () => {
    console.log('Atualização encontrada. Baixando...');
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Atualização Pronta',
      message: 'Uma nova versão do SDG Controle foi baixada. O sistema será reiniciado para aplicar as melhorias.',
      buttons: ['Reiniciar Agora']
    }).then(() => {
      autoUpdater.quitAndInstall();
    });
  });
```

## 4. O Processo de Publicação (Lançando uma nova versão)

Quando você quiser enviar uma melhoria para todas as lojas, siga **exatamente** este passo a passo (ou peça para a IA fazer isso seguindo as diretrizes do `GEMINI.md`):

### Passo 1: Incrementar a versão
Abra o `package.json` e aumente o número da versão.
Exemplo: `"version": "1.1.1"` -> `"version": "1.1.2"`

### Passo 2: Salvar e fazer o Commit
Adicione as mudanças e crie um commit.
```bash
git add .
git commit -m "feat: Adicionada nova funcionalidade X"
```

### Passo 3: Criar uma Tag
O `electron-builder` e o GitHub Releases usam Tags para identificar o que é uma "Release oficial". O nome da Tag deve bater com a versão do `package.json`.
```bash
git tag v1.1.2
```

### Passo 4: Enviar para o GitHub
Envie o código e a Tag para o servidor.
```bash
git push
git push origin v1.1.2
```

## 5. Automação com GitHub Actions (Recomendado)

A melhor forma de publicar o `.exe` é deixar os servidores do GitHub compilarem o programa.

Crie um arquivo na pasta `.github/workflows/publish.yml`:
```yaml
name: Publish Release

on:
  push:
    tags:
      - 'v*' # Aciona apenas quando enviar uma tag começando com "v"

jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Instalar Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Instalar Dependências
        run: npm install
        
      - name: Construir e Publicar
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm run dist -p always
```

**Nota sobre permissões do Actions:**
No GitHub, vá em *Settings > Actions > General*. Procure por "Workflow permissions" e marque **"Read and write permissions"**. Isso permite que o GitHub Actions crie a release automaticamente usando o `GITHUB_TOKEN` padrão.

---
**Fluxo Final Resumido para o Dia a Dia:**
Codificou -> Aumentou a versão -> `git commit` -> `git tag vX.X.X` -> `git push && git push --tags` -> Esperar 5 minutos -> As lojas receberão o aviso de atualização.
