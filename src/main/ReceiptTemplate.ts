export const generateRepairReceiptHTML = (repair: any, storeName: string, logo?: string) => {
  const dateStr = repair.created_at ? new Date(repair.created_at).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');
  const deliveryDate = repair.delivery_date ? new Date(repair.delivery_date).toLocaleDateString('pt-BR') : 'Não Definido';
  const price = Number(repair.price) || 0;
  
  const priorityMap: any = {
    'low': 'BAIXA',
    'normal': 'NORMAL',
    'high': 'ALTA',
    'urgent': 'URGENTE'
  };

  const renderCopy = (title: string) => `
    <div class="copy-container">
      <div class="header text-center">
        ${logo ? `<img src="${logo}" class="logo" />` : ''}
        <div class="store-name">${storeName}</div>
        <div style="font-size: 14px; font-weight: bold; margin-top: 5px; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 2px 0;">ORDEM DE SERVIÇO</div>
        <div style="font-size: 20px; font-weight: bold; margin: 5px 0;">#${(repair.id || '00000000').substring(0, 8).toUpperCase()}</div>
        <div style="font-size: 10px; background: #000; color: #fff; display: inline-block; padding: 2px 8px; border-radius: 4px; margin-bottom: 5px;">VIA ${title}</div>
      </div>

      <div class="section">
        <div class="section-title">CLIENTE</div>
        <div style="font-size: 11px; font-weight: bold;">${repair.customer_name || 'N/A'}</div>
        <div>FONE: ${repair.customer_phone || 'N/A'}</div>
      </div>

      <div class="section">
        <div class="section-title">EQUIPAMENTO</div>
        <div style="font-size: 12px; font-weight: bold;">${repair.device_brand || ''} ${repair.device_model || ''}</div>
        <div class="grid-2">
           <div>S/N: ${repair.serial_number || 'N/A'}</div>
           <div>SENHA: ${repair.device_password || 'N/A'}</div>
        </div>
        ${repair.visual_condition ? `<div style="margin-top: 3px; font-size: 9px;"><strong>ESTADO:</strong> ${repair.visual_condition}</div>` : ''}
      </div>

      <div class="section">
        <div class="section-title">DESCRIÇÃO DO PROBLEMA</div>
        <div style="font-style: italic; font-size: 10px; border: 1px solid #eee; padding: 4px; border-radius: 3px;">${repair.issue_description || 'N/A'}</div>
      </div>

      ${repair.checklist ? `
        <div class="section">
          <div class="section-title">CHECKLIST / ACESSÓRIOS</div>
          <div style="font-size: 9px;">${repair.checklist}</div>
        </div>
      ` : ''}

      <div class="divider"></div>

      <table class="info-table">
        <tr>
          <td>DATA ENTRADA:</td>
          <td style="text-align: right;">${dateStr}</td>
        </tr>
        <tr>
          <td>PREVISÃO:</td>
          <td style="text-align: right; font-weight: bold;">${deliveryDate}</td>
        </tr>
        <tr>
          <td>PRIORIDADE:</td>
          <td style="text-align: right; font-weight: bold;">${priorityMap[repair.priority] || 'NORMAL'}</td>
        </tr>
        <tr style="font-size: 16px; font-weight: bold; border-top: 1px dashed #000;">
          <td style="padding-top: 5px;">ORÇAMENTO:</td>
          <td style="text-align: right; padding-top: 5px;">R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
        </tr>
      </table>

      <div class="divider"></div>

      <div class="section" style="margin-top: 15px;">
        <div class="text-center" style="font-size: 8px; margin-bottom: 20px;">
          <p style="margin-bottom: 10px;">TERMOS E CONDIÇÕES:</p>
          <p style="text-align: justify; margin: 5px 0;">1. A garantia cobre apenas o serviço executado (90 dias). 2. Aparelhos molhados ou com tentativa de reparo anterior não possuem garantia de sucesso. 3. O cliente autoriza a abertura do aparelho e testes necessários. 4. Após 90 dias do aviso de pronto, o aparelho será vendido para cobrir custos de armazenamento.</p>
        </div>
        
        <div style="border-top: 1px solid #000; margin-top: 20px; text-align: center; font-size: 10px; padding-top: 5px;">
          ASSINATURA DO CLIENTE
        </div>
      </div>

      <div class="footer text-center">
        <div style="font-weight: bold; margin-bottom: 10px;">ACOMPANHE SEU PEDIDO:</div>
        
        <!-- QR Code dinâmico com o ID da OS -->
        <div style="margin: 10px auto;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://sualoja.com.br/os/${repair.id}" style="width: 35mm; height: 35mm;" />
        </div>
        
        <div style="font-size: 8px; margin-top: 5px;">ID: ${repair.id}</div>
        <div style="font-weight: bold; margin-top: 5px;">SDG CONTROL - Gestão Assistência</div>
      </div>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: 'Courier New', Courier, monospace; 
          width: 58mm; 
          margin: 0; 
          padding: 0;
          font-size: 10px;
          line-height: 1.2;
          color: #000;
        }
        .copy-container {
          padding: 5px;
          page-break-after: always;
          border-bottom: 1px dashed #ccc;
          margin-bottom: 15px;
        }
        .text-center { text-align: center; }
        .header { margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 8px; }
        .logo { max-width: 40mm; margin-bottom: 8px; }
        .store-name { font-weight: bold; font-size: 16px; text-transform: uppercase; }
        .divider { border-top: 1px dashed #000; margin: 10px 0; }
        .section { margin-bottom: 10px; }
        .section-title { font-weight: bold; background: #f0f0f0; border: 1px solid #ddd; padding: 2px 4px; margin-bottom: 4px; font-size: 9px; text-transform: uppercase; }
        .info-table { width: 100%; border-collapse: collapse; }
        .footer { margin-top: 20px; font-size: 9px; border-top: 1px solid #eee; padding-top: 10px; }
        .grid-2 { display: flex; justify-content: space-between; font-size: 9px; margin-top: 2px; }
        @media print {
          @page { margin: 0; }
          body { margin: 0; }
          .copy-container:last-child { border-bottom: none; page-break-after: auto; }
        }
      </style>
    </head>
    <body>
      ${renderCopy('CLIENTE')}
      <div style="height: 20px;"></div>
      ${renderCopy('LABORATÓRIO')}
    </body>
    </html>
  `;
};

export const generateReceiptHTML = (sale: any, storeName: string, logo?: string) => {
  const date = new Date().toLocaleString('pt-BR');
  const itemsHTML = sale.items.map((item: any) => `
    <tr>
      <td style="padding: 5px 0;">${item.nome}<br/><small>${item.qtd}x ${item.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</small></td>
      <td style="text-align: right; vertical-align: top; padding: 5px 0;">${(item.qtd * item.preco).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
    </tr>
  `).join('');

  const subtotal = sale.items.reduce((acc: number, item: any) => acc + (item.preco * item.qtd), 0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { 
          font-family: 'Courier New', Courier, monospace; 
          width: 58mm; 
          margin: 0; 
          padding: 5px;
          font-size: 10px;
          line-height: 1.2;
        }
        .text-center { text-align: center; }
        .header { margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 8px; }
        .logo { max-width: 35mm; margin-bottom: 5px; }
        .store-name { font-weight: bold; font-size: 14px; text-transform: uppercase; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; }
        .totals { margin-top: 8px; font-weight: bold; }
        .footer { margin-top: 15px; font-size: 9px; }
        @media print {
          @page { margin: 0; }
          body { margin: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header text-center">
        ${logo ? `<img src="${logo}" class="logo" />` : ''}
        <div class="store-name">${storeName}</div>
        <div>Comprovante de Venda</div>
        <div>Data: ${date}</div>
      </div>

      <table>
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align: left;">DESCRIÇÃO</th>
            <th style="text-align: right;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHTML}
        </tbody>
      </table>

      <div class="divider"></div>

      <table class="totals">
        <tr>
          <td>SUBTOTAL:</td>
          <td style="text-align: right;">${subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        </tr>
        ${sale.discount > 0 ? `
          <tr>
            <td>DESCONTO:</td>
            <td style="text-align: right;">- ${sale.discount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
          </tr>
        ` : ''}
        <tr style="font-size: 18px;">
          <td>TOTAL PAGO:</td>
          <td style="text-align: right;">${sale.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
        </tr>
      </table>

      <div class="divider"></div>
      
      <div class="text-center">
        <div>Forma de Pagamento: <strong>${sale.payment_method}</strong></div>
        <div>Vendedor: ${sale.vendedor}</div>
      </div>

      <div class="footer text-center">
        <div>Obrigado pela preferência!</div>
        <div>SDG CONTROL Enterprise</div>
        <div style="margin-top: 5px;">${sale.id.substring(0, 8)}</div>
      </div>
    </body>
    </html>
  `;
};