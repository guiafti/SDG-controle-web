import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { settingService } from '../services/miscService';
import { printerService } from '../services/printerService';
import { financialService } from '../services/financialService';
import { systemService } from '../services/systemService';

const adjustColor = (color: string, amount: number) => {
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
};

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'visual' | 'financeiro' | 'impressao' | 'chatbot'>('visual');
  const [primaryColor, setPrimaryColor] = useState('#3b82f6'); 
  const [logoBase64, setLogoBase64] = useState('');
  const [appZoom, setAppZoom] = useState(1.0);
  const [printerInterface, setPrinterInterface] = useState('printer:POS-58');
  const [printerType, setPrinterType] = useState('escpos');
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
    fetchCategories();
  }, []);

  const fetchSettings = async () => {
    try {
      const [settings, printers] = await Promise.all([
        settingService.getAll(),
        printerService.getPrinters()
      ]);
      setAvailablePrinters(printers || []);
      
      const colorSetting = settings.find((s: any) => s.key === 'primary_color');
      const logoSetting = settings.find((s: any) => s.key === 'logo');
      const zoomSetting = settings.find((s: any) => s.key === 'app_zoom');
      const pInterface = settings.find((s: any) => s.key === 'printer_interface');
      const pType = settings.find((s: any) => s.key === 'printer_type');

      if (colorSetting) setPrimaryColor(colorSetting.value);
      if (logoSetting) setLogoBase64(logoSetting.value);
      if (zoomSetting) setAppZoom(parseFloat(zoomSetting.value) || 1.0);
      if (pInterface) setPrinterInterface(pInterface.value);
      if (pType) setPrinterType(pType.value);
    } catch (e) { console.error(e); }
  };

  const fetchCategories = async () => {
    try {
      const cats = await financialService.getCategories();
      setCategories(cats || []);
    } catch (e) { console.error(e); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => setLogoBase64(event.target.result);
    reader.readAsDataURL(file);
  };

  const handleSaveVisual = async () => {
    const loadingId = toast.loading('Salvando identidade visual...');
    try {
      await settingService.save([
        { key: 'primary_color', value: primaryColor }, 
        { key: 'logo', value: logoBase64 },
        { key: 'app_zoom', value: appZoom.toString() }
      ]);
      document.documentElement.style.setProperty('--brand-500', primaryColor);
      toast.success('Configurações salvas!', { id: loadingId });
      window.dispatchEvent(new CustomEvent('settings-updated', { detail: { logo: logoBase64 } }));
    } catch (e) { toast.error('Erro de comunicação', { id: loadingId }); }
  };

  const handleSavePrinter = async () => {
    const loadingId = toast.loading('Salvando configurações de impressão...');
    try {
      await settingService.save([
        { key: 'printer_interface', value: printerInterface },
        { key: 'printer_type', value: printerType }
      ]);
      toast.success('Configurações de impressão salvas!', { id: loadingId });
    } catch (e) { toast.error('Erro de comunicação', { id: loadingId }); }
  };

  const handleAddCategory = async () => {
    if (!newCategory) return;
    try {
      await financialService.saveCategory(newCategory);
      toast.success('Categoria adicionada');
      setNewCategory('');
      fetchCategories();
    } catch (e) { toast.error('Erro de comunicação'); }
  };

  return (
    <section className="p-8 max-w-5xl mx-auto w-full flex flex-col gap-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Configurações</h2>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Gerenciamento Global do Sistema</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('visual')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'visual' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Identidade Visual
          </button>
          <button 
            onClick={() => setActiveTab('financeiro')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'financeiro' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Controle Financeiro
          </button>
          <button 
            onClick={() => setActiveTab('impressao')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'impressao' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Impressão
          </button>
          <button 
            onClick={() => setActiveTab('chatbot')}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'chatbot' ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
          >
            Chatbot
          </button>
        </div>
      </div>

      {activeTab === 'visual' && (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Logo da Empresa</h3>
            <div className="flex items-center gap-8">
              <div className="w-40 h-40 rounded-[32px] border-4 border-dashed border-slate-100 flex items-center justify-center bg-slate-50 overflow-hidden relative group">
                {logoBase64 ? <img src={logoBase64} className="w-full h-full object-contain p-4" /> : <i className="ph ph-image text-5xl text-slate-200"></i>}
                <div className="absolute inset-0 bg-brand-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <i className="ph ph-upload-simple text-white text-4xl"></i>
                </div>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              </div>
              <div className="flex-1 space-y-4">
                <p className="text-slate-500 font-medium text-sm leading-relaxed">Personalize o visual do seu PDV. O logo enviado aparecerá na barra superior, no menu lateral e nos relatórios de venda.</p>
                <div className="flex gap-3">
                  <button onClick={() => fileInputRef.current?.click()} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Alterar Imagem</button>
                  {logoBase64 && <button onClick={() => setLogoBase64('')} className="px-6 py-3 bg-red-50 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all">Remover</button>}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-50" />

          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Paleta de Cores</h3>
            <div className="flex gap-10 items-center">
              <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-24 h-24 rounded-full cursor-pointer border-8 border-white shadow-xl" />
              <div className="flex-1">
                <p className="text-slate-500 font-medium text-sm mb-4">Escolha a cor principal. O sistema gerará automaticamente os tons de destaque e interação.</p>
                <div className="flex gap-3">
                  {[160, 40, 0, -40, -120].map(amt => (
                    <div key={amt} className="w-12 h-12 rounded-2xl shadow-sm" style={{ backgroundColor: adjustColor(primaryColor, amt), border: amt === 0 ? '4px solid #1e293b' : 'none' }}></div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-50" />

          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Escala do Sistema (Zoom)</h3>
            <div className="flex gap-10 items-center">
              <div className="flex-1">
                <p className="text-slate-500 font-medium text-sm mb-6">Ajuste o tamanho da interface para melhor se adaptar ao seu monitor.</p>
                <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                  <button 
                    onClick={() => {
                      const newZoom = Math.max(0.7, appZoom - 0.1);
                      setAppZoom(newZoom);
                      systemService.setZoom(newZoom);
                    }}
                    className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                  >
                    <i className="ph ph-minus font-bold"></i>
                  </button>
                  
                  <div className="flex-1 flex flex-col items-center">
                    <span className="text-2xl font-black text-brand-600 italic">{(appZoom * 100).toFixed(0)}%</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escala Atual</span>
                  </div>

                  <button 
                    onClick={() => {
                      const newZoom = Math.min(1.5, appZoom + 0.1);
                      setAppZoom(newZoom);
                      systemService.setZoom(newZoom);
                    }}
                    className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
                  >
                    <i className="ph ph-plus font-bold"></i>
                  </button>
                </div>
                
                <div className="flex gap-2 mt-4">
                  {[0.8, 0.9, 1.0, 1.1, 1.2].map(zoom => (
                    <button 
                      key={zoom}
                      onClick={() => {
                        setAppZoom(zoom);
                        systemService.setZoom(zoom);
                      }}

                      className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all border ${appZoom === zoom ? 'bg-brand-600 text-white border-brand-600 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
                    >
                      {(zoom * 100).toFixed(0)}%
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="w-48 bg-brand-50 rounded-[32px] p-6 border border-brand-100">
                <i className="ph ph-monitor text-3xl text-brand-500 mb-3 block"></i>
                <p className="text-[11px] font-bold text-brand-900 leading-tight">DICA: Se os botões estiverem fugindo da tela, tente 90% ou 80%.</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 flex justify-end">
            <button onClick={handleSaveVisual} className="px-12 py-5 bg-brand-600 text-white font-black rounded-3xl hover:bg-brand-700 shadow-xl shadow-brand-500/30 active:scale-95 transition-all text-sm uppercase tracking-widest">Salvar Alterações Visuais</button>
          </div>
        </div>
      )}

      {activeTab === 'financeiro' && (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Categorias de Despesas</h3>
            <div className="flex gap-4 mb-8">
              <input 
                type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)}
                placeholder="Nova categoria (ex: IMPOSTOS)"
                className="flex-1 p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-black uppercase outline-none focus:border-brand-500"
              />
              <button 
                onClick={handleAddCategory}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
              >
                Adicionar
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {categories.map(cat => (
                <div key={cat.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center group relative">
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>

          <hr className="border-slate-50" />

          <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden">
            <i className="ph ph-info absolute -right-4 -bottom-4 text-8xl opacity-10"></i>
            <h4 className="text-lg font-black uppercase tracking-tighter italic mb-2">Dica de Gestão</h4>
            <p className="text-slate-400 text-sm leading-relaxed">
              Mantenha suas categorias organizadas para gerar relatórios precisos. O Controle Financeiro permite que você veja onde o dinheiro está saindo e tome decisões melhores para sua empresa.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'impressao' && (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div>
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Configuração de Impressora Térmica</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Método de Impressão</label>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setPrinterType('escpos')}
                    className={`flex-1 p-4 rounded-2xl border-2 transition-all text-left ${printerType === 'escpos' ? 'border-brand-500 bg-brand-50' : 'border-slate-100'}`}
                  >
                    <div className="text-[10px] font-black uppercase mb-1">ESC/POS (Direto)</div>
                    <div className="text-slate-400 text-[9px]">Recomendado para Knup/Epson USB</div>
                  </button>
                  <button 
                    onClick={() => setPrinterType('html')}
                    className={`flex-1 p-4 rounded-2xl border-2 transition-all text-left ${printerType === 'html' ? 'border-brand-500 bg-brand-50' : 'border-slate-100'}`}
                  >
                    <div className="text-[10px] font-black uppercase mb-1">HTML (Windows)</div>
                    <div className="text-slate-400 text-[9px]">Usa o gerenciador do Windows</div>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Selecionar Impressora (Windows)</label>
                <select 
                  value={printerInterface.startsWith('printer:') ? printerInterface.replace('printer:', '') : ''} 
                  onChange={e => {
                    if (e.target.value) setPrinterInterface(`printer:${e.target.value}`);
                  }}
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-black uppercase outline-none focus:border-brand-500 appearance-none"
                >
                  <option value="">USAR ENDEREÇO ABAIXO</option>
                  {availablePrinters.map(p => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 italic">Escolha uma impressora da lista ou digite o endereço manual abaixo.</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Endereço de Rede ou USB Direto</label>
                  <button 
                    onClick={async () => {
                      const devices = await printerService.listUsbDevices();
                      const printer = devices.find((d: any) => d.vendorId === 0x28E9 || d.vendorId === 0x0fe6 || d.vendorId === 0x0416);
                      if (printer) {
                        const addr = `USB:${printer.vendorId.toString(16).toUpperCase().padStart(4, '0')}:${printer.productId.toString(16).toUpperCase().padStart(4, '0')}`;
                        setPrinterInterface(addr);
                        toast.success(`Impressora detectada: ${addr}`);
                      } else {
                        toast.error('Nenhuma impressora USB compatível encontrada.');
                      }
                    }}
                    className="text-[9px] font-black text-brand-600 uppercase hover:underline"
                  >
                    Detectar USB
                  </button>
                </div>
                <input 
                  type="text" 
                  value={printerInterface.startsWith('printer:') ? '' : printerInterface} 
                  onChange={e => setPrinterInterface(e.target.value)}
                  placeholder="Ex: 192.168.1.100 ou USB:28E9:0289"
                  className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-black uppercase outline-none focus:border-brand-500"
                />
                <p className="text-[9px] text-slate-400 italic">IP para rede, COM para Serial ou USB:VID:PID para direto.</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 flex justify-between items-center gap-4">
            <div className="flex gap-4">
              <button 
                onClick={async () => {
                  const loadingId = toast.loading('Configurando Linux...');
                  try {
                    const res = await printerService.runSetup();
                    if (res.success) {
                      toast.success('Permissões configuradas! Reinicie o cabo USB.', { id: loadingId, duration: 6000 });
                    } else {
                      toast.error(`Erro: ${res.error}\nVerifique o terminal.`, { id: loadingId });
                    }
                  } catch (e) {
                    toast.error('Verifique o terminal para digitar a senha.', { id: loadingId });
                  }
                }}
                className="px-6 py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-black transition-all text-[10px] uppercase tracking-widest flex items-center gap-2"
              >
                <i className="ph ph-linux-logo text-lg"></i>
                Configurar Permissão USB (Linux)
              </button>
              
              <button 
                onClick={async () => {
                  const loadingId = toast.loading('Enviando teste...');
                  try {
                    const res = await printerService.testPrinter({ deviceName: printerInterface.replace('printer:', '') });
                    if (res.success) toast.success('Teste enviado!', { id: loadingId });
                    else toast.error(`Erro: ${res.error}`, { id: loadingId });
                  } catch (e) {
                    toast.error('Erro ao conectar', { id: loadingId });
                  }
                }}
                className="px-8 py-5 bg-slate-100 text-slate-600 font-black rounded-3xl hover:bg-slate-200 transition-all text-sm uppercase tracking-widest"
              >
                Testar Impressora
              </button>
            </div>
            
            <button onClick={handleSavePrinter} className="px-12 py-5 bg-brand-600 text-white font-black rounded-3xl hover:bg-brand-700 shadow-xl shadow-brand-500/30 active:scale-95 transition-all text-sm uppercase tracking-widest">Salvar Impressão</button>
          </div>
        </div>
      )}

      {activeTab === 'chatbot' && (
        <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
            <div className="w-24 h-24 bg-brand-50 text-brand-500 rounded-3xl flex items-center justify-center shadow-inner">
              <i className="ph ph-robot text-5xl"></i>
            </div>
            <div className="max-w-md space-y-2">
              <h3 className="text-xl font-black text-slate-800 uppercase italic">Configuração de Chatbot</h3>
              <p className="text-slate-500 text-sm font-medium">
                Esta área está sendo preparada para receber a inteligência artificial de atendimento ao cliente. 
                Em breve você poderá configurar respostas automáticas e triagem de vendas.
              </p>
            </div>
            <div className="px-6 py-2 bg-slate-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest">
              Em Desenvolvimento
            </div>
            
            <div className="pt-10 border-t border-slate-50 w-full">
              <button 
                onClick={async () => {
                  const loadingId = toast.loading('Buscando atualizações...');
                  try {
                    const res = await systemService.checkForUpdates();
                    if (res.success) {
                      toast.success('Busca finalizada!', { id: loadingId });
                    } else {
                      toast.error(res.error || 'Erro ao buscar', { id: loadingId });
                    }
                  } catch (e) {
                    toast.error('Erro de conexão', { id: loadingId });
                  }
                }}
                className="flex items-center gap-2 mx-auto px-6 py-3 bg-brand-50 text-brand-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-100 transition-all"
              >
                <i className="ph ph-arrows-clockwise text-sm"></i>
                Verificar Atualizações Manuais
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Settings;
