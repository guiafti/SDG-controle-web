import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { settingService } from '../services/miscService';

export const WhatsAppControl: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'messages' | 'config' | 'ai'>('messages');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    accountSid: '',
    authToken: '',
    senderNumber: 'whatsapp:+14155238886',
    aiApiKey: '',
    isConfigured: false,
    webhookPort: 3001,
    webhookUrl: ''
  });

  const [messages, setMessages] = useState<any[]>([]);
  
  // Envio de teste
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Form de configuração
  const [formSid, setFormSid] = useState('');
  const [formToken, setFormToken] = useState('');
  const [formSender, setFormSender] = useState('');
  const [formAiKey, setFormAiKey] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (window.api?.getWhatsAppConfig) {
        const cfg = await window.api.getWhatsAppConfig();
        setConfig(cfg);
        setFormSid(cfg.accountSid || '');
        setFormToken(cfg.authToken || '');
        setFormSender(cfg.senderNumber || 'whatsapp:+14155238886');
        setFormAiKey(cfg.aiApiKey || '');
      } else {
        const settings = await settingService.getAll();
        const getVal = (k: string) => settings.find((s: any) => s.key === k)?.value || '';
        const sid = getVal('twilio_account_sid');
        const token = getVal('twilio_auth_token');
        const sender = getVal('twilio_sender_number') || 'whatsapp:+14155238886';
        const aiKey = getVal('ai_api_key');
        setConfig({
          accountSid: sid,
          authToken: token,
          senderNumber: sender,
          aiApiKey: aiKey,
          isConfigured: !!(sid && token),
          webhookPort: 3001,
          webhookUrl: 'https://seu-servidor-cloud.com/api/whatsapp-webhook'
        });
        setFormSid(sid);
        setFormToken(token);
        setFormSender(sender);
        setFormAiKey(aiKey);
      }

      if (window.api?.getWhatsAppMessages) {
        const history = await window.api.getWhatsAppMessages(50);
        setMessages(history || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do WhatsApp:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      if (window.api?.getWhatsAppMessages) {
        window.api.getWhatsAppMessages(50).then(h => setMessages(h || []));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (window.api?.saveWhatsAppConfig) {
        await window.api.saveWhatsAppConfig({
          accountSid: formSid.trim(),
          authToken: formToken.trim(),
          senderNumber: formSender.trim(),
          aiApiKey: formAiKey.trim()
        });
      } else {
        await settingService.save([
          { key: 'twilio_account_sid', value: formSid.trim() },
          { key: 'twilio_auth_token', value: formToken.trim() },
          { key: 'twilio_sender_number', value: formSender.trim() },
          { key: 'ai_api_key', value: formAiKey.trim() }
        ]);
      }
      toast.success('Configurações salvas com sucesso!');
      await loadData();
    } catch (err: any) {
      toast.error('Erro ao salvar configurações: ' + (err.message || err));
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone || !testMessage) {
      toast.error('Preencha o número de destino e a mensagem');
      return;
    }
    setSendingMessage(true);
    try {
      if (window.api?.sendWhatsAppMessage) {
        const res = await window.api.sendWhatsAppMessage(testPhone, testMessage);
        if (res.success) {
          toast.success('Mensagem enviada com sucesso!');
          setTestMessage('');
          await loadData();
        } else {
          toast.error('Falha no envio: ' + (res.error || 'Erro desconhecido'));
        }
      } else {
        toast.success('Envio de mensagem solicitada (Modo Nuvem)');
        setTestMessage('');
      }
    } catch (err: any) {
      toast.error('Erro ao enviar: ' + (err.message || err));
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header com título e status */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <i className="ph ph-whatsapp-logo text-3xl"></i>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              WhatsApp & Inteligência Artificial
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-semibold tracking-wider">
                Romafre Hub
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Envie notificações, consulte o banco de dados e responda clientes automaticamente com IA
            </p>
          </div>
        </div>

        {/* Status de Conexão */}
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            config.isConfigured 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${config.isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            {config.isConfigured ? 'Twilio Conectado' : 'Twilio Não Configurado'}
          </div>

          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            config.aiApiKey 
              ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' 
              : 'bg-slate-800 text-slate-400 border-white/10'
          }`}>
            <i className="ph ph-sparkle"></i>
            {config.aiApiKey ? 'IA Chatbot Ativo' : 'IA Sem Chave'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'messages'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <i className="ph ph-chat-circle-dots text-lg"></i>
          Mensagens & Testes
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'config'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <i className="ph ph-gear text-lg"></i>
          Configuração Twilio / Webhook
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'ai'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <i className="ph ph-brain text-lg"></i>
          Assistente de IA / Chatbot
        </button>
      </div>

      {/* TAB 1: Mensagens & Testes */}
      {activeTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <i className="ph ph-paper-plane-tilt text-emerald-400"></i>
                Enviar Mensagem Rápida
              </h2>

              <form onSubmit={handleSendTestMessage} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Número do Destinatário (WhatsApp)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 5533999998888 ou (33) 99999-8888"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 text-sm"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Adicione o DDD. O sistema formata automaticamente.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                    Conteúdo da Mensagem
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Digite a mensagem para enviar ao cliente ou dono..."
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-emerald-500 text-sm resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={sendingMessage || !config.isConfigured}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                    config.isConfigured
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {sendingMessage ? (
                    <>
                      <i className="ph ph-spinner animate-spin text-lg"></i>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <i className="ph ph-paper-plane-right text-lg"></i>
                      Enviar via WhatsApp
                    </>
                  )}
                </button>

                {!config.isConfigured && (
                  <p className="text-xs text-amber-400 text-center font-medium bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    ⚠️ Configure o SID e Auth Token na aba de configurações antes de enviar.
                  </p>
                )}
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <i className="ph ph-clock-counter-clockwise text-emerald-400"></i>
                Histórico de Mensagens Recentes
              </h2>
              <button
                onClick={loadData}
                className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
              >
                <i className="ph ph-arrows-clockwise"></i>
                Atualizar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[500px] space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  Nenhuma mensagem registrada no histórico até o momento.
                </div>
              ) : (
                messages.map((m) => {
                  const isInbound = m.direction === 'inbound';
                  return (
                    <div
                      key={m.id}
                      className={`p-4 rounded-xl border flex flex-col gap-1 transition-all ${
                        isInbound
                          ? 'bg-slate-950/80 border-blue-500/20 text-slate-200'
                          : 'bg-emerald-950/30 border-emerald-500/20 text-emerald-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold flex items-center gap-2">
                          <i className={`ph ${isInbound ? 'ph-arrow-down-left text-blue-400' : 'ph-arrow-up-right text-emerald-400'}`}></i>
                          {isInbound ? `De: ${m.contact_name || m.from_phone}` : `Para: ${m.contact_name || m.to_phone}`}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(m.created_at).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap font-sans">{m.message_text}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Configuração Twilio / Webhook */}
      {activeTab === 'config' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <i className="ph ph-sliders text-emerald-400"></i>
              Credenciais do Twilio
            </h2>

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  TWILIO_ACCOUNT_SID
                </label>
                <input
                  type="text"
                  value={formSid}
                  onChange={(e) => setFormSid(e.target.value)}
                  placeholder="Ex: ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  TWILIO_AUTH_TOKEN
                </label>
                <input
                  type="password"
                  value={formToken}
                  onChange={(e) => setFormToken(e.target.value)}
                  placeholder="Seu Auth Token do Twilio"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">
                  TWILIO_SENDER_NUMBER (Remetente)
                </label>
                <input
                  type="text"
                  value={formSender}
                  onChange={(e) => setFormSender(e.target.value)}
                  placeholder="whatsapp:+14155238886"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/20 text-sm transition-all"
              >
                Salvar Configurações do Twilio
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <i className="ph ph-globe-hemisphere-west text-blue-400"></i>
                Status do Servidor Webhook Local
              </h2>

              <div className="bg-slate-950 p-4 rounded-xl border border-white/10 space-y-3 font-mono text-xs text-slate-300">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400 font-sans">URL do Webhook:</span>
                  <span className="text-emerald-400 font-bold">{config.webhookUrl}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans">Porta de Escuta:</span>
                  <span className="text-blue-400 font-bold">{config.webhookPort}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3 text-xs text-slate-400">
                <h3 className="font-bold text-white text-sm">Como conectar com o Twilio:</h3>
                <ol className="list-decimal pl-4 space-y-2">
                  <li>No painel do Twilio, vá em <strong>Messaging {'>'} Settings {'>'} WhatsApp Sandbox</strong>.</li>
                  <li>No campo <strong>"WHEN A MESSAGE COMES IN"</strong>, insira o link do seu Webhook.</li>
                  <li>Método HTTP: selecione <strong>POST</strong>.</li>
                  <li>Quando qualquer pessoa enviar WhatsApp para o número, o sistema Romafre responderá instantaneamente!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Assistente de IA / Chatbot */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 text-2xl">
                <i className="ph ph-robot"></i>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Chatbot & Inteligência Artificial no WhatsApp</h2>
                <p className="text-xs text-slate-400">Responda automaticamente perguntas sobre vendas, ordens de serviço e estoque</p>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-white/10">
              <div>
                <label className="block text-xs font-semibold text-purple-400 uppercase mb-1 flex items-center gap-2">
                  <i className="ph ph-key text-base"></i>
                  Chave de API da IA (Gemini API Key)
                </label>
                <input
                  type="password"
                  value={formAiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormAiKey(e.target.value)}
                  placeholder="Cole sua API Key do Google Gemini ou OpenAI aqui..."
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Você pode obter uma chave gratuita no Google AI Studio (aistudio.google.com).
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-purple-600/20 text-sm transition-all"
              >
                Salvar Chave da IA
              </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                <i className="ph ph-wrench text-amber-400 text-2xl mb-1 block"></i>
                <h4 className="font-bold text-white text-xs">Assistência Técnica</h4>
                <p className="text-[11px] text-slate-400">Consulta status da OS do cliente pelo número de telefone automaticamente.</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                <i className="ph ph-package text-emerald-400 text-2xl mb-1 block"></i>
                <h4 className="font-bold text-white text-xs">Estoque & Preços</h4>
                <p className="text-[11px] text-slate-400">Verifica se um produto está disponível no banco e informa os preços.</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-white/5 space-y-1">
                <i className="ph ph-chart-line-up text-purple-400 text-2xl mb-1 block"></i>
                <h4 className="font-bold text-white text-xs">Resumo para o Dono</h4>
                <p className="text-[11px] text-slate-400">O dono da loja pode perguntar total de vendas do dia e ordens abertas.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-white text-base mb-3 flex items-center gap-2">
                <i className="ph ph-sparkle text-purple-400"></i>
                Como Funciona a Integração
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mb-4">
                Quando uma mensagem chega no WhatsApp, o sistema analisa quem é o contato. Se o usuário perguntar sobre o conserto ou produtos, o sistema responde via WhatsApp com os dados exatos da loja.
              </p>
              <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300">
                🚀 A estrutura do <strong>autoescola-sistema</strong> foi migrada e expandida para suportar o contexto completo do Romafre/SDG Controle!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhatsAppControl;
