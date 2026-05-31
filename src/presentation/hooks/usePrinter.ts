import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { printerService } from '../services/printerService';
import { settingService } from '../services/miscService';

export const usePrinter = () => {
  const getPrinterSettings = async () => {
    try {
      const settings = await settingService.getAll();
      return {
        interface: settings.find((s: any) => s.key === 'printer_interface')?.value || 'printer:POS-58',
        type: settings.find((s: any) => s.key === 'printer_type')?.value || 'escpos'
      };
    } catch (e) {
      return { interface: 'printer:POS-58', type: 'escpos' };
    }
  };

  const printSale = useCallback(async (sale: any, storeName: string, logo?: string) => {
    try {
      const settings = await getPrinterSettings();

      // Prioridade para USB Direto no PDV (Mais rápido e estável)
      if (settings.interface.toUpperCase().startsWith('USB:')) {
        const parts = settings.interface.split(':');
        const vid = parseInt(parts[1], 16) || 0x28E9;
        const pid = parseInt(parts[2], 16) || 0x0289;

        const rawData = {
          type: 'SALE' as const,
          storeName,
          items: sale.items.map((item: any) => ({
            name: item.nome,
            qtd: item.qtd,
            total: item.preco * item.qtd
          })),
          total: sale.total,
          paymentMethod: sale.payment_method,
          id: sale.id,
          date: new Date(sale.created_at || new Date()).toLocaleString('pt-BR')
        };

        const res = await printerService.printUSB(vid, pid, rawData);
        if (res.success) {
          toast.success("Cupom de Venda impresso!");
          return;
        }
      }

      // Fallback para HTML (Driver do Sistema)
      await printerService.printReceipt({ 
        sale, 
        storeName, 
        logo, 
        deviceName: settings.interface.replace('printer:', '') 
      });
      toast.success("Impressão enviada!");
    } catch (error) {
      console.error("Erro ao imprimir venda:", error);
      toast.error("Erro ao processar impressão.");
    }
  }, []);

  const printRepair = useCallback(async (repair: any, storeName: string, logo?: string) => {
    try {
      const settings = await getPrinterSettings();

      // Se a interface for USB direta (Modo Knup/Padrão que funciona no seu teste)
      if (settings.interface.toUpperCase().startsWith('USB:')) {
        const parts = settings.interface.split(':');
        const vid = parseInt(parts[1], 16) || 0x28E9;
        const pid = parseInt(parts[2], 16) || 0x0289;

        const rawData = {
          type: 'OS' as const,
          storeName,
          items: [{ name: `${repair.device_brand} ${repair.device_model}` }],
          total: repair.price,
          customer: repair.customer_name,
          customer_phone: repair.customer_phone,
          id: repair.id?.substring(0, 8),
          date: new Date(repair.created_at || new Date()).toLocaleString('pt-BR'),
          serial_number: repair.serial_number,
          device_password: repair.device_password,
          visual_condition: repair.visual_condition,
          issue_description: repair.issue_description,
          checklist: repair.checklist,
          delivery_date: repair.delivery_date
        };

        const res = await printerService.printUSB(vid, pid, rawData);
        if (res.success) {
          toast.success("O.S. Impressa (USB Direto)");
          return;
        }
      }

      // Se não for USB ou falhar, tenta o método HTML (Driver do Sistema)
      await printerService.printRepairReceipt({ repair, storeName, logo });
      toast.success("O.S. enviada para impressão!");
    } catch (error) {
      console.error("Erro ao imprimir OS:", error);
      toast.error("Erro ao processar impressão.");
    }
  }, []);

  return { printSale, printRepair };
};
