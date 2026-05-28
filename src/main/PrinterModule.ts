import * as path from 'path';

export interface PrintData {
  type: 'SALE' | 'OS';
  storeName: string;
  items: any[];
  total: number;
  paymentMethod?: string;
  customer?: string;
  id?: string;
  date?: string;
}

export class PrinterModule {

  /**
   * MODO RAW / ESC-POS:
   * Usado quando a impressora está em rede (IP:porta 9100).
   * Para USB/COM3 no Windows, o comando `print /D:` do CMD
   * NÃO aceita dados binários ESC/POS — por isso foi removido.
   * Para USB, use sempre o método HTML via main.ts (print-receipt / print-repair-receipt).
   */
  public static async printUSB(vid: number, pid: number, data: PrintData | string) {
    console.log(`[PRINTER] >>> COMUNICACAO DIRETA USB (0x${vid.toString(16)}:0x${pid.toString(16)})`);
    try {
      const usb = require('usb');
      const device = usb.findByIds(vid, pid);

      if (!device) {
        return { success: false, error: "Impressora nao encontrada fisicamente." };
      }

      device.open();
      const iface = device.interfaces[0];

      // No Linux, precisamos soltar o driver do kernel (usblp)
      try {
        if (iface.isKernelDriverActive()) {
          iface.detachKernelDriver();
        }
      } catch (e) {}

      iface.claim();
      const outEndpoint = iface.endpoints.find((e: any) => e.direction === 'out');

      if (!outEndpoint) {
        iface.release(true, () => device.close());
        return { success: false, error: "Ponto de saida USB nao encontrado." };
      }

      // Prepara os comandos ESC/POS manuais (Super estável)
      const init = Buffer.from([0x1b, 0x40]);
      const boldOn = Buffer.from([0x1b, 0x45, 0x01]);
      const boldOff = Buffer.from([0x1b, 0x45, 0x00]);
      const center = Buffer.from([0x1b, 0x61, 0x01]);
      const left = Buffer.from([0x1b, 0x61, 0x00]);
      const feed = Buffer.from([0x0a, 0x0a, 0x0a]); // 3 linhas
      const cut = Buffer.from([0x1d, 0x56, 0x41, 0x03]);

      let buffer = Buffer.concat([init]);

      if (typeof data === 'string') {
        const cleanText = data.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        buffer = Buffer.concat([buffer, center, boldOn, Buffer.from(cleanText + "\n"), boldOff, feed, cut]);
      } else if (data.type === 'SALE') {
        const cleanStore = data.storeName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase();
        
        buffer = Buffer.concat([buffer, center, boldOn, Buffer.from(cleanStore + "\n"), boldOff]);
        buffer = Buffer.concat([buffer, center, Buffer.from("CUPOM DE VENDA (NAO E FISCAL)\n")]);
        buffer = Buffer.concat([buffer, left, Buffer.from("--------------------------------\n")]);
        buffer = Buffer.concat([buffer, Buffer.from(`DATA: ${data.date || new Date().toLocaleString()}\n`)]);
        buffer = Buffer.concat([buffer, Buffer.from(`VENDA: #${(data.id || '').substring(0,8).toUpperCase()}\n`)]);
        buffer = Buffer.concat([buffer, left, Buffer.from("--------------------------------\n")]);

        // Cabeçalho dos Itens
        buffer = Buffer.concat([buffer, left, boldOn, Buffer.from("ITEM            QTD    VALOR\n"), boldOff]);
        
        data.items.forEach((i: any) => {
          const name = (i.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").substring(0, 15).padEnd(16);
          const qtd = String(i.qtd).padStart(3);
          const val = Number(i.total).toFixed(2).padStart(8);
          buffer = Buffer.concat([buffer, left, Buffer.from(`${name}${qtd}${val}\n`)]);
        });

        buffer = Buffer.concat([buffer, left, Buffer.from("--------------------------------\n")]);
        
        // Totais
        buffer = Buffer.concat([buffer, left, boldOn, Buffer.from(`TOTAL: R$ ${data.total.toFixed(2)}\n`), boldOff]);
        if (data.paymentMethod) {
          buffer = Buffer.concat([buffer, left, Buffer.from(`PAGAMENTO: ${data.paymentMethod.toUpperCase()}\n`)]);
        }

        buffer = Buffer.concat([buffer, left, Buffer.from("--------------------------------\n")]);
        buffer = Buffer.concat([buffer, center, Buffer.from("Obrigado pela preferencia!\n"), feed, cut]);
      } else if (data.type === 'OS') {
        const cleanStore = data.storeName.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toUpperCase();
        const r: any = data;
        
        buffer = Buffer.concat([buffer, center, boldOn, Buffer.from(cleanStore + "\n"), boldOff]);
        buffer = Buffer.concat([buffer, center, Buffer.from("ORDEM DE SERVICO\n"), boldOn, Buffer.from(`#${(r.id || '').toUpperCase()}\n`), boldOff]);
        buffer = Buffer.concat([buffer, left, Buffer.from("--------------------------------\n")]);
        
        if (r.customer) buffer = Buffer.concat([buffer, boldOn, Buffer.from("CLIENTE: "), boldOff, Buffer.from(`${r.customer.toUpperCase()}\n`)]);
        if (r.customer_phone) buffer = Buffer.concat([buffer, Buffer.from(`FONE: ${r.customer_phone}\n`)]);
        buffer = Buffer.concat([buffer, left, Buffer.from("--------------------------------\n")]);

        buffer = Buffer.concat([buffer, boldOn, Buffer.from("EQUIPAMENTO:\n"), boldOff]);
        r.items.forEach((i: any) => {
          buffer = Buffer.concat([buffer, Buffer.from(`${i.name.toUpperCase()}\n`)]);
        });
        if (r.serial_number) buffer = Buffer.concat([buffer, Buffer.from(`S/N: ${r.serial_number}\n`)]);
        if (r.device_password) buffer = Buffer.concat([buffer, Buffer.from(`SENHA: ${r.device_password}\n`)]);
        if (r.visual_condition) buffer = Buffer.concat([buffer, Buffer.from(`ESTADO: ${r.visual_condition}\n`)]);
        
        buffer = Buffer.concat([buffer, left, Buffer.from("--------------------------------\n")]);
        buffer = Buffer.concat([buffer, boldOn, Buffer.from("DEFEITO RELATADO:\n"), boldOff]);
        buffer = Buffer.concat([buffer, Buffer.from(`${r.issue_description || 'N/A'}\n`)]);
        
        if (r.checklist) {
          buffer = Buffer.concat([buffer, boldOn, Buffer.from("CHECKLIST:\n"), boldOff, Buffer.from(`${r.checklist}\n`)]);
        }

        buffer = Buffer.concat([buffer, left, Buffer.from("--------------------------------\n")]);
        buffer = Buffer.concat([buffer, Buffer.from(`ENTRADA: ${r.date || new Date().toLocaleString()}\n`)]);
        if (r.delivery_date) buffer = Buffer.concat([buffer, Buffer.from(`PREVISAO: ${r.delivery_date}\n`)]);
        buffer = Buffer.concat([buffer, boldOn, Buffer.from(`TOTAL: R$ ${Number(r.total).toFixed(2)}\n`), boldOff]);
        
        buffer = Buffer.concat([buffer, left, Buffer.from("--------------------------------\n")]);
        buffer = Buffer.concat([buffer, feed, center, Buffer.from("________________________________\n"), Buffer.from("ASSINATURA DO CLIENTE\n"), feed]);
        buffer = Buffer.concat([buffer, center, Buffer.from("SDG CONTROL - Gestao Assistencia\n"), feed, cut]);
      }

      return new Promise((resolve) => {
        outEndpoint.transfer(buffer, (err: any) => {
          iface.release(true, () => {
            device.close();
            if (err) resolve({ success: false, error: err.message });
            else resolve({ success: true });
          });
        });
      });

    } catch (e: any) {
      console.error("[PRINTER] Erro Critico USB:", e);
      return { success: false, error: e.message };
    }
  }

  public static async printRaw(data: PrintData, interfaceName: string = 'POS-58') {
    try {
      const { ThermalPrinter, PrinterTypes, CharacterSet } = require('node-thermal-printer');
      const fs = require('fs');
      const os = require('os');

      const printer = new ThermalPrinter({
        type: PrinterTypes.EPSON,
        interface: 'none',
        characterSet: CharacterSet.WPC1252,
        removeSpecialCharacters: false,
        width: 32,
      });

      // --- MONTAGEM DO CUPOM ESC/POS ---
      printer.alignCenter();
      printer.bold(true);
      printer.setTextDoubleHeight();
      printer.setTextDoubleWidth();
      printer.println(data.storeName.toUpperCase());
      printer.setTextNormal();
      printer.bold(false);
      printer.drawLine();
      printer.alignLeft();

      if (data.type === 'SALE') {
        printer.println(`CUPOM DE VENDA: ${data.id?.substring(0, 8)}`);
      } else {
        printer.println(`ORDEM DE SERVICO: ${data.id}`);
        if (data.customer) printer.println(`CLIENTE: ${data.customer.toUpperCase()}`);
      }

      printer.println(`DATA: ${data.date || new Date().toLocaleString('pt-BR')}`);
      printer.drawLine();

      data.items.forEach(item => {
        const name = item.name || item.device_model || 'PRODUTO';
        const qtd = item.qtd || 1;
        const total = item.total || item.price || 0;
        printer.tableCustom([
          { text: name.substring(0, 15), align: "LEFT", width: 0.5 },
          { text: qtd.toString(), align: "CENTER", width: 0.2 },
          { text: total.toFixed(2), align: "RIGHT", width: 0.3 }
        ]);
      });

      printer.drawLine();
      printer.alignRight();
      printer.bold(true);
      printer.println(`TOTAL: R$ ${data.total.toFixed(2)}`);
      printer.bold(false);
      if (data.paymentMethod) printer.println(`PAGAMENTO: ${data.paymentMethod}`);
      printer.newLine();
      printer.alignCenter();
      printer.println("Obrigado pela preferencia!");
      printer.newLine();
      printer.newLine();
      try { printer.openCashDrawer(); } catch (e) {}
      printer.cut();

      const buffer = printer.getBuffer();

      // --- NOVO: ENVIO DIRETO VIA USB (BAIXO NÍVEL) ---
      // Formato esperado no interfaceName: "USB:VID:PID", "USB:28E9:0289" ou "USB:AUTO"
      if (interfaceName && interfaceName.toUpperCase().startsWith('USB:')) {
        try {
          const usb = require('usb');
          let vid = 0x28e9;
          let pid = 0x0289;

          if (interfaceName.toUpperCase() !== 'USB:AUTO') {
            const parts = interfaceName.split(':');
            vid = parseInt(parts[1], 16) || vid;
            pid = parseInt(parts[2], 16) || pid;
          }

          let device = usb.findByIds(vid, pid);
          
          // Se for AUTO e não achou o padrão Knup, tenta procurar por qualquer impressora genérica
          if (!device && interfaceName.toUpperCase() === 'USB:AUTO') {
            const devices = usb.getDeviceList();
            // Procura por dispositivos que costumam ser impressoras (Class 7) ou VIDs comuns (0x0fe6, 0x0483, etc)
            device = devices.find((d: any) => 
              d.deviceDescriptor.idVendor === 0x0fe6 || 
              d.deviceDescriptor.idVendor === 0x0416 ||
              d.deviceDescriptor.idVendor === 0x1a86
            );
          }

          if (!device) {
            return { success: false, error: `Impressora USB nao encontrada (VID:${vid.toString(16)}).` };
          }

          return new Promise((resolve) => {
            try {
              device.open();

              // LOGICA "MODO PYTHON": Tenta forçar a configuração do dispositivo
              // Isso ajuda a "destravar" a impressora se o Windows estiver segurando.
              device.setConfiguration(1, (configErr: any) => {
                const iface = device.interfaces[0];
                
                try {
                  if (iface.isKernelDriverActive()) {
                    iface.detachKernelDriver();
                  }
                } catch (e) {}

                try {
                  iface.claim();
                  const outEndpoint = iface.endpoints.find((e: any) => e.direction === 'out');

                  if (!outEndpoint) {
                    iface.release(true, () => device.close());
                    return resolve({ success: false, error: "Endpoint de saida nao encontrado." });
                  }

                  // Limpa a impressora antes de começar
                  const initCommand = Buffer.from([0x1b, 0x40]);
                  outEndpoint.transfer(initCommand, () => {
                    outEndpoint.transfer(buffer, (err: any) => {
                      iface.release(true, () => {
                        device.close();
                        if (err) resolve({ success: false, error: `Erro na transferencia: ${err.message}` });
                        else resolve({ success: true });
                      });
                    });
                  });
                } catch (usbErr: any) {
                  try { device.close(); } catch (e) {}
                  
                  // FALLBACK INTELIGENTE: Se o modo USB Direto der erro de acesso, tenta o Spooler do Windows
                  if (usbErr.message.includes('ACCESS') || usbErr.message.includes('NOT_SUPPORTED')) {
                    console.warn("Acesso USB Direto negado. Tentando via Spooler do Windows...");
                    const fallbackData = typeof data === 'string' ? { 
                      type: 'SALE' as const, storeName: 'RECIBO', items: [{ name: data, qtd: 1, total: 0 }], total: 0 
                    } : data;
                    return resolve(PrinterModule.printRaw(fallbackData, "printer:POS58 Printer"));
                  }
                  resolve({ success: false, error: `Falha USB: ${usbErr.message}` });
                }
              });
            } catch (openErr: any) {
              try { device.close(); } catch (e) {}
              resolve({ success: false, error: `Erro ao abrir: ${openErr.message}` });
            }
          });
        } catch (e: any) {
          return { success: false, error: `Erro no modulo USB: ${e.message}` };
        }
      }

      // --- ENVIO VIA REDE (IP:9100) ---
      // Funciona para impressoras conectadas via cabo de rede ou Wi-Fi.
      if (interfaceName && !interfaceName.startsWith('printer:') && interfaceName.includes('.')) {
        const net = require('net');
        return new Promise((resolve) => {
          const client = new net.Socket();
          const host = interfaceName.trim();
          client.setTimeout(5000);
          client.connect(9100, host, () => {
            client.write(buffer, () => {
              client.end();
              resolve({ success: true });
            });
          });
          client.on('error', (err: any) => {
            client.destroy();
            resolve({ success: false, error: `Nao foi possivel conectar em ${host}:9100. Verifique o IP e a rede.` });
          });
          client.on('timeout', () => {
            client.destroy();
            resolve({ success: false, error: "Tempo esgotado ao conectar na impressora de rede." });
          });
        });
      }

      // --- ENVIO DIRETO VIA PORTA SERIAL/USB (Windows) ---
      // Funciona para impressoras em portas como COM3, COM4, etc.
      // Tenta escrever diretamente na porta serial emulada pelo driver USB.
      if (interfaceName && (interfaceName.toUpperCase().startsWith('COM') || interfaceName.startsWith('printer:'))) {
        const portName = interfaceName.replace('printer:', '').trim();
        const actualTmpPath = path.join(os.tmpdir(), `escpos_${Date.now()}.bin`);
        fs.writeFileSync(actualTmpPath, buffer);

        // O comando 'print /d:' é o padrão do Windows para enviar arquivos brutos para o spooler.
        // Colocamos o nome da impressora entre aspas para suportar espaços (ex: "POS58 Printer")
        const { exec } = require('child_process');
        return new Promise((resolve) => {
          const command = `cmd /c print /d:"${portName}" "${actualTmpPath}"`;
          exec(command, (error: any) => {
            // Remove o arquivo temporário após um tempo
            setTimeout(() => { try { fs.unlinkSync(actualTmpPath); } catch (e) {} }, 5000);
            
            if (error) {
              console.error(`Erro no comando print: ${error.message}`);
              resolve({
                success: false,
                error: `Falha ao enviar para ${portName}. Use o Metodo HTML se o driver nao aceitar comandos brutos.`
              });
            } else {
              resolve({ success: true });
            }
          });
        });
      }

      // --- SEM INTERFACE RECONHECIDA ---
      return {
        success: false,
        error: 'Interface nao reconhecida. Use um IP de rede, uma porta COM (ex: COM3) ou mude para o Metodo HTML nas configuracoes.'
      };

    } catch (error: any) {
      console.error("Erro Geral no PrinterModule:", error);
      return { success: false, error: error.message };
    }
  }
}
