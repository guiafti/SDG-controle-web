import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { usePrinter } from '../hooks/usePrinter';
import { repairService } from '../services/repairService';
import { storeService } from '../services/storeService';
import { customerService } from '../services/customerService';
import { customSuggestionService, settingService } from '../services/miscService';

interface RepairOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CHECKLIST_OPTIONS = [
  'Carregador',
  'Cabo USB',
  'Capa de Proteção',
  'Cartão SIM',
  'Cartão de Memória',
  'Caixa Original',
  'Nota Fiscal'
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  { value: 'high', label: 'Alta', color: 'bg-orange-100 text-orange-600' },
  { value: 'urgent', label: 'Urgente', color: 'bg-red-100 text-red-600' }
];

const RepairOrderModal: React.FC<RepairOrderModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPhoneSecondary, setCustomerPhoneSecondary] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [devicePassword, setDevicePassword] = useState('');
  const [visualCondition, setVisualCondition] = useState('');
  const [issue, setIssue] = useState('');
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [priority, setPriority] = useState('normal');
  const [price, setPrice] = useState('');
  const [destStoreId, setDestStoreId] = useState('');
  const [returnStoreId, setReturnStoreId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);
  const { printRepair } = usePrinter();

  // Autocomplete states
  const [suggestions, setSuggestions] = useState<{
    brands: string[];
    models: string[];
    conditions: string[];
    issues: string[];
    notes: string[];
    customItems: { field: string; value: string }[];
  }>({ brands: [], models: [], conditions: [], issues: [], notes: [], customItems: [] });
  const [activeSuggestionField, setActiveSuggestionField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchStores();
      resetForm();
      loadSuggestions();
      loadCustomers();
    }
  }, [isOpen]);

  const loadCustomers = async () => {
    try {
      const data = await customerService.getAll();
      setCustomers(data || []);
    } catch (e) {
      console.error('[DATABASE] Erro ao carregar clientes:', e);
    }
  };

  const loadSuggestions = async () => {
    try {
      const customData = await customSuggestionService.getAll();
      const defaultBrands = ['Samsung', 'Apple', 'Motorola', 'Xiaomi', 'LG', 'Asus', 'Lenovo', 'Realme', 'Positivo', 'Nokia'];
      const defaultConditions = [
        'Excelente (sem marcas de uso)',
        'Bom (riscos leves na tela/carcaça)',
        'Regular (riscos profundos, marcas nas quinas)',
        'Tela trincada',
        'Vidro traseiro trincado',
        'Botão power quebrado',
        'Lateral descascada'
      ];
      const defaultIssues = [
        'Tela quebrada / Não exibe imagem',
        'Não liga / Sem sinal de vida',
        'Não carrega / Conector com mau contato',
        'Bateria descarregando rápido / Estufada',
        'Sem sinal de chip / Rede oscilando',
        'Câmera traseira/frontal não funciona',
        'Microfone / Alto-falante sem som',
        'Formatado / Travado na conta Google/iCloud',
        'Reiniciando sozinho / Loop infinito',
        'Botões laterais travados/quebrados'
      ];
      const defaultNotes = [
        'Aparelho em bom estado, película de vidro aplicada',
        'Com marcas de uso nas quinas, sem película',
        'Tampa traseira com marcas de cola, película trincada',
        'Aparelho descarregado / Não foi possível testar funções',
        'Aparelho molhado / Oxidação interna aparente'
      ];

      const customBrands = customData.filter((c: any) => c.field === 'brand').map((c: any) => c.value);
      const customModels = customData.filter((c: any) => c.field === 'model').map((c: any) => c.value);
      const customConditions = customData.filter((c: any) => c.field === 'condition').map((c: any) => c.value);
      const customIssues = customData.filter((c: any) => c.field === 'issue').map((c: any) => c.value);
      const customNotes = customData.filter((c: any) => c.field === 'notes').map((c: any) => c.value);

      setSuggestions({
        brands: Array.from(new Set([...customBrands, ...defaultBrands])),
        models: customModels,
        conditions: Array.from(new Set([...customConditions, ...defaultConditions])),
        issues: Array.from(new Set([...customIssues, ...defaultIssues])),
        notes: Array.from(new Set([...customNotes, ...defaultNotes])),
        customItems: customData || []
      });
    } catch (e) {
      console.error('[AUTOCOMPLETE] Erro ao buscar sugestões:', e);
    }
  };

  const handleSaveCustomSuggestion = async (field: string, value: string) => {
    if (!value || !value.trim()) return;
    const cleanValue = value.trim();
    
    let isAlreadySuggested = false;
    if (field === 'brand') isAlreadySuggested = suggestions.brands.map(b => b.toLowerCase()).includes(cleanValue.toLowerCase());
    if (field === 'model') isAlreadySuggested = suggestions.models.map(m => m.toLowerCase()).includes(cleanValue.toLowerCase());
    if (field === 'condition') isAlreadySuggested = suggestions.conditions.map(c => c.toLowerCase()).includes(cleanValue.toLowerCase());
    if (field === 'issue') isAlreadySuggested = suggestions.issues.map(i => i.toLowerCase()).includes(cleanValue.toLowerCase());
    if (field === 'notes') isAlreadySuggested = suggestions.notes.map(n => n.toLowerCase()).includes(cleanValue.toLowerCase());
    
    if (isAlreadySuggested) {
      toast.success('Esta sugestão já está disponível!');
      return;
    }

    const result = await customSuggestionService.save({ field, value: cleanValue });
    if (result.success) {
      toast.success('Sugestão salva com sucesso!');
      await loadSuggestions();
    } else {
      toast.error('Erro ao salvar sugestão: ' + (result.error || 'Erro desconhecido'));
    }
  };

  const handleDeleteCustomSuggestion = async (field: string, value: string) => {
    try {
      const result = await customSuggestionService.delete({ field, value });
      if (result.success) {
        toast.success('Sugestão removida com sucesso!');
        await loadSuggestions();
      } else {
        toast.error('Erro ao remover sugestão: ' + (result.error || 'Erro desconhecido'));
      }
    } catch (e: any) {
      console.error('[AUTOCOMPLETE] Erro ao deletar sugestão:', e);
      toast.error('Erro de comunicação');
    }
  };

  const fetchStores = async () => {
    try {
      const data = await storeService.getAll(false);
      setStores(data || []);
      if (data && data.length > 0) {
        setDestStoreId(data[0].id);
        const current = localStorage.getItem('selectedStoreId') || data[0].id;
        setReturnStoreId(current);
      }
    } catch (e) { console.error(e); }
  };

  const maskPhone = (val: string) => {
    const cleaned = val.replace(/\D/g, '').substring(0, 11);
    if (cleaned.length <= 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setCustomerPhoneSecondary('');
    setCustomerEmail('');
    setBrand('');
    setModel('');
    setSerialNumber('');
    setDevicePassword('');
    setVisualCondition('');
    setIssue('');
    setTechnicalNotes('');
    setPriority('normal');
    setPrice('');
    setPhoto(null);
    setDeliveryDate('');
    setChecklist([]);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleChecklist = (item: string) => {
    setChecklist(prev => 
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !brand || !model || !destStoreId || !returnStoreId) {
      toast.error('Preencha os campos obrigatórios!');
      return;
    }

    setLoading(true);
    const loadingId = toast.loading('Gerando Ordem de Serviço...');

    try {
      const id = crypto.randomUUID();
      let finalPhotoUrl = null;

      if (photo) {
        const uploadResult = await repairService.uploadImage({ id, base64Data: photo });
        if (uploadResult.success) {
          finalPhotoUrl = uploadResult.url;
        }
      }

      const repairData = {
        id,
        customer_name: customerName,
        customer_phone: customerPhone.replace(/\D/g, ''),
        customer_phone_secondary: customerPhoneSecondary.replace(/\D/g, ''),
        customer_email: customerEmail,
        device_brand: brand,
        device_model: model,
        serial_number: serialNumber,
        device_password: devicePassword,
        visual_condition: visualCondition,
        issue_description: issue,
        technical_notes: technicalNotes,
        checklist: checklist.join(', '),
        priority,
        photo_url: finalPhotoUrl,
        price: Number(price) || 0,
        entry_store_id: localStorage.getItem('selectedStoreId') || '1',
        maintenance_store_id: destStoreId,
        return_store_id: returnStoreId,
        delivery_date: deliveryDate,
        status: 'Recebido na Loja'
      };

      const result = await repairService.save(repairData);

      if (result.success) {
        // Auto-save suggestions so they are remembered next time
        if (brand.trim()) customSuggestionService.save({ field: 'brand', value: brand.trim() }).catch(console.error);
        if (model.trim()) customSuggestionService.save({ field: 'model', value: model.trim() }).catch(console.error);
        if (visualCondition.trim()) customSuggestionService.save({ field: 'condition', value: visualCondition.trim() }).catch(console.error);
        if (issue.trim()) customSuggestionService.save({ field: 'issue', value: issue.trim() }).catch(console.error);
        if (technicalNotes.trim()) customSuggestionService.save({ field: 'notes', value: technicalNotes.trim() }).catch(console.error);

        toast.success('ORDEM DE SERVIÇO GERADA!', { id: loadingId });
        
        try {
          const settings = await settingService.getAll();
          const storeName = settings.find((s: any) => s.key === 'company_name')?.value || 'SDG CONTROLE';
          const logo = settings.find((s: any) => s.key === 'logo')?.value;
          await printRepair(repairData, storeName, logo);
        } catch (printErr) {
          console.warn('Erro ao imprimir recibo na Web:', printErr);
        }

        onSuccess();
        onClose();
      } else {
        toast.error(`ERRO: ${result.error}`, { id: loadingId });
      }
    } catch (error: any) {
      toast.error(`ERRO CRÍTICO: ${error.message || JSON.stringify(error)}`, { id: loadingId });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = (customers || []).filter(c => 
    (c.name || '').toLowerCase().includes((customerName || '').toLowerCase())
  ).slice(0, 8);

  const filteredBrands = (suggestions.brands || []).filter(b => 
    b.toLowerCase().includes((brand || '').toLowerCase())
  ).slice(0, 8);

  const filteredModels = (suggestions.models || []).filter(m => 
    m.toLowerCase().includes((model || '').toLowerCase())
  ).slice(0, 8);

  const filteredConditions = (suggestions.conditions || []).filter(c => 
    c.toLowerCase().includes((visualCondition || '').toLowerCase())
  ).slice(0, 8);

  const filteredIssues = (suggestions.issues || []).filter(i => 
    i.toLowerCase().includes((issue || '').toLowerCase())
  ).slice(0, 8);

  const filteredNotes = (suggestions.notes || []).filter(n => 
    n.toLowerCase().includes((technicalNotes || '').toLowerCase())
  ).slice(0, 8);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <i className="ph ph-wrench text-xl"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Nova Ordem de Manutenção</h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Assistência Técnica</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <i className="ph ph-x text-xl"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Esquerda: Cliente e Equipamento */}
            <div className="lg:col-span-8 space-y-4">
              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Informações do Cliente</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-0.5 relative">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Nome Completo *</label>
                    <div className="relative">
                      <input 
                        type="text" required value={customerName} 
                        onChange={e => setCustomerName(e.target.value)}
                        onFocus={() => setActiveSuggestionField('customer')}
                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                        placeholder="Nome do Cliente"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pr-8 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                        autoComplete="off"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setActiveSuggestionField(activeSuggestionField === 'customer' ? null : 'customer');
                          }}
                          className="text-slate-400 hover:text-brand-500 transition-colors flex items-center justify-center p-1"
                          title="Ver clientes cadastrados"
                        >
                          <i className={`ph ${activeSuggestionField === 'customer' ? 'ph-caret-up' : 'ph-caret-down'} text-xs`}></i>
                        </button>
                      </div>
                    </div>
                    {activeSuggestionField === 'customer' && filteredCustomers.length > 0 && (
                      <div className="absolute z-[300] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar py-1">
                        {filteredCustomers.map(c => (
                          <button
                            key={c.id} type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setCustomerName(c.name);
                              if (c.phone) setCustomerPhone(maskPhone(c.phone));
                              if (c.email) setCustomerEmail(c.email);
                              setActiveSuggestionField(null);
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex flex-col"
                          >
                            <span className="font-bold uppercase">{c.name}</span>
                            {c.phone && <span className="text-[10px] text-slate-400 font-normal">{maskPhone(c.phone)}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Telefone Principal (WhatsApp)</label>
                    <input 
                      type="text" value={customerPhone} 
                      onChange={e => setCustomerPhone(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Telefone Secundário (Contato)</label>
                    <input 
                      type="text" value={customerPhoneSecondary} 
                      onChange={e => setCustomerPhoneSecondary(maskPhone(e.target.value))}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">E-mail do Cliente</label>
                    <input 
                      type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                      placeholder="exemplo@email.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Equipamento</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-0.5 relative">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Marca *</label>
                    <div className="relative">
                      <input 
                        type="text" required value={brand} 
                        onChange={e => setBrand(e.target.value)}
                        onFocus={() => setActiveSuggestionField('brand')}
                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                        placeholder="Ex: Samsung, Apple"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pr-8 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setActiveSuggestionField(activeSuggestionField === 'brand' ? null : 'brand');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500 p-1"
                      >
                        <i className={`ph ${activeSuggestionField === 'brand' ? 'ph-caret-up' : 'ph-caret-down'} text-xs`}></i>
                      </button>
                    </div>
                    {activeSuggestionField === 'brand' && filteredBrands.length > 0 && (
                      <div className="absolute z-[300] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar py-1">
                        {filteredBrands.map(b => (
                          <div key={b} className="flex items-center justify-between hover:bg-slate-50 group">
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setBrand(b);
                                setActiveSuggestionField(null);
                              }}
                              className="flex-1 text-left px-3 py-1.5 text-slate-700 font-semibold text-xs uppercase truncate"
                            >
                              {b}
                            </button>
                            {suggestions.customItems.some(c => c.field === 'brand' && c.value.toLowerCase() === b.toLowerCase()) && (
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleDeleteCustomSuggestion('brand', b);
                                }}
                                className="px-2 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Excluir sugestão customizada"
                              >
                                <i className="ph ph-trash text-xs"></i>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5 relative">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Modelo *</label>
                    <div className="relative">
                      <input 
                        type="text" required value={model} 
                        onChange={e => setModel(e.target.value)}
                        onFocus={() => setActiveSuggestionField('model')}
                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                        placeholder="Ex: A54, iPhone 13"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pr-8 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setActiveSuggestionField(activeSuggestionField === 'model' ? null : 'model');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500 p-1"
                      >
                        <i className={`ph ${activeSuggestionField === 'model' ? 'ph-caret-up' : 'ph-caret-down'} text-xs`}></i>
                      </button>
                    </div>
                    {activeSuggestionField === 'model' && filteredModels.length > 0 && (
                      <div className="absolute z-[300] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar py-1">
                        {filteredModels.map(m => (
                          <div key={m} className="flex items-center justify-between hover:bg-slate-50 group">
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setModel(m);
                                setActiveSuggestionField(null);
                              }}
                              className="flex-1 text-left px-3 py-1.5 text-slate-700 font-semibold text-xs uppercase truncate"
                            >
                              {m}
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleDeleteCustomSuggestion('model', m);
                              }}
                              className="px-2 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <i className="ph ph-trash text-xs"></i>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Nº de Série / IMEI</label>
                    <input 
                      type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)}
                      placeholder="Identificador Único"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Senha do Aparelho / Desenho</label>
                    <input 
                      type="text" value={devicePassword} onChange={e => setDevicePassword(e.target.value)}
                      placeholder="PIN, Senha ou Desenho de Desbloqueio"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                    />
                  </div>

                  <div className="space-y-0.5 relative">
                    <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Estado Visual / Marcas de Uso</label>
                    <div className="relative">
                      <input 
                        type="text" value={visualCondition} 
                        onChange={e => setVisualCondition(e.target.value)}
                        onFocus={() => setActiveSuggestionField('condition')}
                        onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                        placeholder="Ex: Tela riscada, marca de queda"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pr-8 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setActiveSuggestionField(activeSuggestionField === 'condition' ? null : 'condition');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500 p-1"
                      >
                        <i className={`ph ${activeSuggestionField === 'condition' ? 'ph-caret-up' : 'ph-caret-down'} text-xs`}></i>
                      </button>
                    </div>
                    {activeSuggestionField === 'condition' && filteredConditions.length > 0 && (
                      <div className="absolute z-[300] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar py-1">
                        {filteredConditions.map(c => (
                          <div key={c} className="flex items-center justify-between hover:bg-slate-50 group">
                            <button
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                setVisualCondition(c);
                                setActiveSuggestionField(null);
                              }}
                              className="flex-1 text-left px-3 py-1.5 text-slate-700 font-semibold text-xs truncate"
                            >
                              {c}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Defeito e Diagnóstico</h3>
                </div>

                <div className="space-y-0.5 relative">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Relato do Cliente (Defeito Informado) *</label>
                  <div className="relative">
                    <input 
                      type="text" required value={issue} 
                      onChange={e => setIssue(e.target.value)}
                      onFocus={() => setActiveSuggestionField('issue')}
                      onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                      placeholder="Descrição do problema relatado"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pr-8 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setActiveSuggestionField(activeSuggestionField === 'issue' ? null : 'issue');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-500 p-1"
                    >
                      <i className={`ph ${activeSuggestionField === 'issue' ? 'ph-caret-up' : 'ph-caret-down'} text-xs`}></i>
                    </button>
                  </div>
                  {activeSuggestionField === 'issue' && filteredIssues.length > 0 && (
                    <div className="absolute z-[300] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar py-1">
                      {filteredIssues.map(i => (
                        <button
                          key={i} type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setIssue(i);
                            setActiveSuggestionField(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors block truncate"
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 relative">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Observações Técnicas Iniciais</label>
                  <div className="relative">
                    <textarea 
                      rows={2} value={technicalNotes} 
                      onChange={e => setTechnicalNotes(e.target.value)}
                      onFocus={() => setActiveSuggestionField('notes')}
                      onBlur={() => setTimeout(() => setActiveSuggestionField(null), 200)}
                      placeholder="Testes realizados no balcão, riscos, avarias prévias..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700 resize-none"
                    ></textarea>
                  </div>
                  {activeSuggestionField === 'notes' && filteredNotes.length > 0 && (
                    <div className="absolute z-[300] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar py-1">
                      {filteredNotes.map(n => (
                        <button
                          key={n} type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setTechnicalNotes(n);
                            setActiveSuggestionField(null);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors block truncate"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                  <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Acessórios Deixados (Checklist)</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CHECKLIST_OPTIONS.map(item => {
                    const isChecked = checklist.includes(item);
                    return (
                      <button
                        key={item} type="button" onClick={() => toggleChecklist(item)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${isChecked ? 'bg-brand-500 text-white border-brand-500 shadow-md shadow-brand-500/20' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                      >
                        {isChecked ? '✓ ' : '+ '} {item}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Direita: Fotos, Lojas, Prioridade e Valores */}
            <div className="lg:col-span-4 space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <div className="space-y-4">
                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Foto do Estado do Aparelho</h3>
                  </div>

                  <div className="relative border-2 border-dashed border-slate-200 rounded-2xl p-2 text-center hover:border-brand-400 transition-colors bg-white group min-h-[120px] flex items-center justify-center">
                    {photo ? (
                      <div className="relative w-full h-28 rounded-xl overflow-hidden group">
                        <img src={photo} alt="Aparelho" className="w-full h-full object-cover" />
                        <button 
                          type="button" onClick={() => setPhoto(null)}
                          className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-lg hover:bg-red-600 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center gap-1 w-full py-3">
                        <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform">
                          <i className="ph ph-camera text-base"></i>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">Tirar foto / Enviar Imagem</span>
                        <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
                      </label>
                    )}
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Roteamento entre Lojas</h3>
                  </div>

                  <div className="space-y-2">
                    <div className="space-y-0.5">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Enviar Para Assistência em *</label>
                      <select 
                        required value={destStoreId} onChange={e => setDestStoreId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                      >
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-0.5">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Devolver Na Loja *</label>
                      <select 
                        required value={returnStoreId} onChange={e => setReturnStoreId(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                      >
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Prioridade e Prazo</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Prioridade</label>
                      <select 
                        value={priority} onChange={e => setPriority(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                      >
                        {PRIORITY_OPTIONS.map(p => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-0.5">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase ml-1">Previsão Entrega</label>
                      <input 
                        type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 outline-none focus:border-brand-500 transition-all font-semibold text-xs text-slate-700"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-3 bg-brand-500 rounded-full"></div>
                    <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Orçamento Estimado (R$)</h3>
                  </div>
                  <input 
                    type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                    placeholder="0,00"
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-brand-500 font-mono font-bold text-lg text-slate-800"
                  />
                </section>
              </div>

              <div className="pt-4 border-t border-slate-200 flex gap-2">
                <button 
                  type="button" onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-slate-200 text-slate-600 font-bold hover:bg-slate-300 transition-colors uppercase text-xs tracking-wider"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/20 uppercase text-xs tracking-wider flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <i className="ph ph-spinner animate-spin text-lg"></i>
                  ) : (
                    <>
                      <i className="ph ph-check text-lg"></i>
                      Gerar OS
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RepairOrderModal;
