# 🚀 Guia de Inicialização - SDG Controle (Linux)

Este documento descreve os passos realizados para configurar o ambiente e fazer a impressora térmica Knup KP-1029 funcionar via USB no Linux.

## 🛠️ 1. Dependências do Sistema
O sistema utiliza módulos nativos. No Linux (Ubuntu/Debian), instale:

```bash
sudo apt-get update
sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 build-essential
```

## 📦 2. Instalação e Preparação
```bash
npm install
npm run rebuild   # Recompila SQLite e USB para o Electron
npm run build:main # Gera os arquivos de execução do processo principal
```

## 🖨️ 3. Configuração da Impressora Knup (O "Pulo do Gato")

A impressora Knup KP-1029 (VID: `28e9`, PID: `0289`) exige permissões especiais no Linux para ser acessada sem `sudo`.

### Passo A: Permissões UDEV
Criamos uma regra para que o Linux libere o acesso ao hardware para o seu usuário:
1. O sistema agora possui um botão **"Configurar Permissão USB (Linux)"** em Configurações.
2. Manualmente, isso equivale a criar o arquivo `/etc/udev/rules.d/99-knup.rules` com:
   `SUBSYSTEM=="usb", ATTR{idVendor}=="28e9", ATTR{idProduct}=="0289", MODE="0666", GROUP="lp"`

### Passo B: Conflito de Driver (`usblp`)
O Linux costuma "sequestrar" a impressora com o driver `usblp`. Nosso sistema desativa esse driver para permitir o envio de comandos **ESC/POS brutos**:
```bash
sudo modprobe -r usblp
```

### Passo C: Implementação Técnica (Bulk Transfer)
Descobrimos que bibliotecas como `escpos-usb` falham no Electron recente por buscarem eventos (`usb.on`) que não existem mais.
**Solução:** Refatoramos o `PrinterModule.ts` para usar a API de baixo nível do Node-USB:
- Localizamos o dispositivo por VID/PID.
- Abrimos a porta e assumimos o controle (`iface.claim()`).
- Enviamos os dados via **`outEndpoint.transfer()`** usando um Buffer de comandos ESC/POS manuais.

## 🔧 4. Ajustes de Desenvolvimento
- **Correção da Tela Branca:** O script `electron:dev` espera o Vite subir.
- **Botões da Janela:** Corrigidos no `preload.ts` e configurados com `sandbox: false` no `main.ts` para permitir acesso ao hardware.
- **Sincronização:** Campo `delivery_date` removido do push para o Supabase para evitar erros de esquema.

## 🚀 5. Como Rodar
```bash
npm run electron:dev
```

---
*Documentação técnica atualizada após implementação bem-sucedida da impressão direta via USB.*
