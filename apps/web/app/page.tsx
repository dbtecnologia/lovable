"use client";

import { useMemo, useState } from "react";
import {
  Archive, Bell, Bot, Check, ChevronDown, CircleHelp, Clock3, Ellipsis, FileText,
  Headphones, Image, Inbox, LayoutDashboard, LockKeyhole, Menu, MessageSquare,
  MoreHorizontal, Paperclip, Phone, Plus, Radio, Search, Send, Settings2,
  Sparkles, Tag, UserRound, Users, Wifi, X, Zap
} from "lucide-react";

type ConversationStatus = "Bot ativo" | "Aguardando humano" | "Humano" | "Finalizado";
type Conversation = {
  id: number; name: string; initials: string; color: string; preview: string; time: string;
  unread: number; status: ConversationStatus; labels: string[]; phone: string; online?: boolean;
};
type Message = { id: number; text: string; time: string; from: "them" | "me" | "system"; kind?: string };

const initialConversations: Conversation[] = [
  { id: 1, name: "Marina Costa", initials: "MC", color: "coral", preview: "Perfeito, aguardo o orçamento então", time: "10:42", unread: 2, status: "Aguardando humano", labels: ["novo lead", "comercial"], phone: "+55 11 99841-2033", online: true },
  { id: 2, name: "Rafael Mendes", initials: "RM", color: "blue", preview: "Quero acompanhar o pedido #4821", time: "10:31", unread: 0, status: "Bot ativo", labels: ["pedido"], phone: "+55 11 98871-4410" },
  { id: 3, name: "Clínica Aurora", initials: "CA", color: "lilac", preview: "A nota fiscal chegou com os dados...", time: "09:58", unread: 1, status: "Humano", labels: ["financeiro"], phone: "+55 21 99834-1091", online: true },
  { id: 4, name: "João Victor", initials: "JV", color: "green", preview: "Obrigado pelo atendimento!", time: "Ontem", unread: 0, status: "Finalizado", labels: ["suporte"], phone: "+55 31 99770-2844" },
  { id: 5, name: "Ana Beatriz", initials: "AB", color: "yellow", preview: "Tem desconto no plano anual?", time: "Ontem", unread: 0, status: "Bot ativo", labels: ["comercial"], phone: "+55 41 99902-7851" }
];

const initialMessages: Record<number, Message[]> = {
  1: [
    { id: 1, text: "Oi! Vi o plano Essencial no site e queria entender melhor.", time: "10:38", from: "them" },
    { id: 2, text: "Olá, Marina! Que bom ter você por aqui. 😊\n\nPara eu encaminhar você certinho, escolha uma opção:\n1 — Conhecer os planos\n2 — Suporte técnico\n3 — Falar com alguém", time: "10:38", from: "me" },
    { id: 3, text: "1", time: "10:39", from: "them" },
    { id: 4, text: "Ótimo! Nosso time comercial pode te ajudar com uma recomendação. Já vou chamar alguém.\n\nEnquanto isso, o que você mais valoriza em uma solução de atendimento?", time: "10:39", from: "me" },
    { id: 5, text: "Perfeito, aguardo o orçamento então", time: "10:42", from: "them" }
  ],
  2: [{ id: 1, text: "Olá! Quero acompanhar o pedido #4821", time: "10:31", from: "them" }, { id: 2, text: "Vou consultar o status para você. Um instante!", time: "10:31", from: "me" }],
  3: [{ id: 1, text: "A nota fiscal chegou com os dados errados.", time: "09:55", from: "them" }, { id: 2, text: "Entendi. Vou conferir os dados e ajustar para você.", time: "09:58", from: "me" }],
  4: [{ id: 1, text: "Obrigado pelo atendimento!", time: "18:12", from: "them" }],
  5: [{ id: 1, text: "Tem desconto no plano anual?", time: "17:44", from: "them" }]
};

const navItems = [
  { label: "Visão geral", icon: LayoutDashboard }, { label: "Atendimento", icon: Inbox, count: 12 },
  { label: "Automação", icon: Bot }, { label: "Contatos", icon: Users }, { label: "Relatórios", icon: Radio }
];

export default function Home() {
  const [activeNav, setActiveNav] = useState("Atendimento");
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(1);
  const [messages, setMessages] = useState(initialMessages);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"Todas" | "Abertas" | "Bot ativo">("Todas");
  const [composer, setComposer] = useState("");
  const [noteMode, setNoteMode] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [toast, setToast] = useState("");
  const [mobilePanel, setMobilePanel] = useState<"list" | "chat" | "contact">("chat");
  const selected = conversations.find((item) => item.id === selectedId) ?? conversations[0];
  const selectedMessages = messages[selected.id] ?? [];

  const visibleConversations = useMemo(() => conversations.filter((item) => {
    const matchesQuery = `${item.name} ${item.preview} ${item.labels.join(" ")}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === "Todas" || (filter === "Abertas" ? item.status !== "Finalizado" : item.status === filter);
    return matchesQuery && matchesFilter;
  }), [conversations, filter, query]);

  function notify(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  function chooseConversation(id: number) { setSelectedId(id); setConversations((items) => items.map((item) => item.id === id ? { ...item, unread: 0 } : item)); setMobilePanel("chat"); }
  function sendMessage() {
    const text = composer.trim(); if (!text) return;
    const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setMessages((items) => ({ ...items, [selected.id]: [...(items[selected.id] ?? []), { id: Date.now(), text, time: now, from: noteMode ? "system" : "me", kind: noteMode ? "Nota interna" : undefined }] }));
    setComposer(""); notify(noteMode ? "Nota interna adicionada" : "Mensagem enfileirada para envio");
  }
  function updateStatus(status: ConversationStatus, message: string) { setConversations((items) => items.map((item) => item.id === selected.id ? { ...item, status } : item)); notify(message); }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><span /></div><span>botzap</span><small>OPERATIONS</small></div>
      <div className="workspace-switcher"><div className="company-avatar">A</div><div><strong>Brito</strong><span>Workspace principal</span></div><ChevronDown size={15} /></div>
      <nav className="main-nav">{navItems.map(({ label, icon: Icon, count }) => <button key={label} className={activeNav === label ? "nav-item active" : "nav-item"} onClick={() => setActiveNav(label)}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{count && <em>{count}</em>}</button>)}</nav>
      <div className="sidebar-section-label">Workspace</div>
      <nav className="main-nav"><button className="nav-item"><Settings2 size={17} /><span>Configurações</span></button><button className="nav-item"><CircleHelp size={17} /><span>Ajuda e atalhos</span><kbd>?</kbd></button></nav>
      <div className="sidebar-bottom"><div className="plan-chip"><div className="plan-icon"><Zap size={14} /></div><div><span>Plano atual</span><strong>Pro · 18 dias restantes</strong></div><ChevronDown size={14} /></div><div className="user-row"><div className="avatar avatar-user">LF</div><div><strong>Lucas Ferreira</strong><span>Administrador</span></div><MoreHorizontal size={17} /></div></div>
    </aside>

    <section className="main-area">
      <header className="topbar"><div className="breadcrumbs"><button className="mobile-menu"><Menu size={20} /></button><span>Workspace</span><b>/</b><strong>{activeNav}</strong></div><div className="top-actions"><div className="system-status"><i className="pulse-dot" /> WhatsApp conectado <span>+55 11 4004-2024</span></div><button className="icon-button" aria-label="Notificações"><Bell size={18} /><i className="notification-dot" /></button><div className="avatar avatar-user">LF</div></div></header>
      {activeNav !== "Atendimento" ? activeNav === "Visão geral" ? <OverviewPage /> : activeNav === "Automação" ? <AutomationPage onBack={() => setActiveNav("Atendimento")} /> : <PlaceholderPage activeNav={activeNav} onBack={() => setActiveNav("Atendimento")} /> : <div className="workspace-grid">
        <section className={`conversation-panel ${mobilePanel === "list" ? "mobile-visible" : ""}`}>
          <div className="panel-heading"><div><h1>Atendimento</h1><p>12 conversas precisam de atenção</p></div><button className="new-button" onClick={() => notify("Nova conversa: selecione um contato para começar")}><Plus size={16} /> Nova</button></div>
          <div className="search-box"><Search size={16} /><input placeholder="Buscar conversas" value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></div>
          <div className="filter-row"><div className="segmented">{(["Todas", "Abertas", "Bot ativo"] as const).map((item) => <button key={item} className={filter === item ? "selected" : ""} onClick={() => setFilter(item)}>{item}{item === "Abertas" && <span>8</span>}</button>)}</div><button className="filter-button"><Tag size={14} /> Filtros</button></div>
          <div className="conversation-list">{visibleConversations.map((item) => <ConversationRow key={item.id} item={item} selected={item.id === selected.id} onClick={() => chooseConversation(item.id)} />)}{visibleConversations.length === 0 && <div className="empty-state"><Search size={22} /><strong>Nada por aqui</strong><span>Tente buscar por outro nome.</span></div>}</div>
          <div className="simulator-strip"><div className="simulator-icon"><Bot size={15} /></div><div><strong>Simulador ativo</strong><span>Ambiente sem número real</span></div><button onClick={() => notify("Mensagem simulada recebida em Marina Costa")}>Testar</button></div>
        </section>

        <section className={`chat-panel ${mobilePanel === "chat" ? "mobile-visible" : ""}`}>
          <header className="chat-header"><button className="back-mobile" onClick={() => setMobilePanel("list")}><ChevronDown size={18} /></button><div className={`avatar avatar-${selected.color}`}>{selected.initials}</div><div className="chat-title"><div><h2>{selected.name}</h2>{selected.online && <span className="online-label"><i /> online agora</span>}</div><p>{selected.phone} <span>·</span> visto por último hoje, 10:42</p></div><div className="chat-header-actions"><button className="icon-button"><Phone size={17} /></button><button className="icon-button"><Search size={17} /></button><button className="icon-button"><Ellipsis size={18} /></button></div></header>
          <div className="conversation-banner"><div className="status-symbol"><Bot size={15} /></div><span><strong>{selected.status}</strong> <span>· {selected.status === "Aguardando humano" ? "aguardando alguém assumir" : "fluxo da automação em andamento"}</span></span><button onClick={() => updateStatus("Humano", "Você assumiu esta conversa")}>{selected.status === "Humano" ? "Assumido por você" : "Assumir conversa"}</button></div>
          <div className="messages-area"><div className="day-divider"><span>Hoje</span></div>{selectedMessages.map((message) => <MessageBubble key={message.id} message={message} />)}<div className="typing-indicator"><span /><span /><span /> Marina está digitando</div></div>
          <div className="composer-area"><div className="composer-tools"><div className="composer-mode"><button className={!noteMode ? "active" : ""} onClick={() => setNoteMode(false)}><MessageSquare size={14} /> Mensagem</button><button className={noteMode ? "active note" : ""} onClick={() => setNoteMode(true)}><LockKeyhole size={13} /> Nota interna</button></div><button className="quick-reply" onClick={() => setComposer("Olá! Já vou verificar isso para você.")}><Sparkles size={14} /> Resposta rápida</button></div><div className={noteMode ? "composer note-composer" : "composer"}><button className="icon-button"><Paperclip size={18} /></button><textarea value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder={noteMode ? "Escreva uma nota que só o time verá..." : "Escreva uma mensagem..."} rows={1} /><button className={composer.trim() ? "send-button ready" : "send-button"} onClick={sendMessage}><Send size={16} /></button></div><div className="composer-hint">Enter para enviar <span>·</span> Shift + Enter para nova linha</div></div>
        </section>

        <aside className={`contact-panel ${mobilePanel === "contact" ? "mobile-visible" : ""}`}><header className="contact-header"><h2>Contato</h2><button className="icon-button"><Ellipsis size={18} /></button></header><div className="contact-hero"><div className={`avatar avatar-${selected.color} avatar-large`}>{selected.initials}</div><h2>{selected.name}</h2><p>{selected.phone}</p><div className="contact-actions"><button onClick={() => notify("Ligação iniciada (simulação)")}><Phone size={15} /> Ligar</button><button onClick={() => notify("Contato aberto em nova conversa")}><MessageSquare size={15} /> Mensagem</button></div></div><div className="contact-block"><div className="block-heading"><h3>Etiquetas</h3><button onClick={() => notify("Editor de etiquetas aberto")}><Plus size={15} /></button></div><div className="tags">{selected.labels.map((label) => <span key={label} className="tag">{label}</span>)}</div></div><div className="contact-block"><div className="block-heading"><h3>Responsável</h3><button onClick={() => notify("Responsável atualizado")}>Editar</button></div><div className="assignee"><div className="mini-avatar">LF</div><div><strong>Lucas Ferreira</strong><span>Atendimento humano</span></div><Check size={15} /></div></div><div className="contact-block"><div className="block-heading"><h3>Setor</h3><button onClick={() => notify("Setor atualizado")}>Editar</button></div><div className="sector-row"><span className="sector-dot" /> Comercial <ChevronDown size={14} /></div></div><div className="contact-block"><div className="block-heading"><h3>Detalhes do contato</h3><button><ChevronDown size={15} /></button></div><div className="detail-row"><span>Email</span><strong>marina@exemplo.com</strong></div><div className="detail-row"><span>Cliente desde</span><strong>12 ago 2024</strong></div></div><div className="contact-footer-actions"><button onClick={() => updateStatus("Finalizado", "Conversa finalizada")}><Archive size={15} /> Finalizar conversa</button><button onClick={() => notify("Histórico de atendimento aberto")}><Clock3 size={15} /> Ver histórico</button></div></aside>
      </div>}
      <nav className="mobile-tabs"><button className={mobilePanel === "list" ? "active" : ""} onClick={() => setMobilePanel("list")}><Inbox size={18} /><span>Conversas</span></button><button className={mobilePanel === "chat" ? "active" : ""} onClick={() => setMobilePanel("chat")}><MessageSquare size={18} /><span>Chat</span></button><button className={mobilePanel === "contact" ? "active" : ""} onClick={() => setMobilePanel("contact")}><UserRound size={18} /><span>Contato</span></button></nav>
    </section>
    {showQr && <QrModal close={() => setShowQr(false)} />}
    {toast && <div className="toast"><Check size={15} /> {toast}</div>}
    <button className="floating-connection" onClick={() => setShowQr(true)}><Wifi size={15} /> Conexão</button>
  </main>;
}

function ConversationRow({ item, selected, onClick }: { item: Conversation; selected: boolean; onClick: () => void }) {
  return <button className={selected ? "conversation-row selected" : "conversation-row"} onClick={onClick}><div className={`avatar avatar-${item.color}`}>{item.initials}{item.online && <i className="online-badge" />}</div><div className="row-content"><div className="row-top"><strong>{item.name}</strong><time>{item.time}</time></div><div className="row-bottom"><span>{item.preview}</span>{item.unread > 0 && <em>{item.unread}</em>}</div><div className="row-meta"><span className={`status-mini ${item.status === "Humano" ? "human" : item.status === "Finalizado" ? "closed" : ""}`}>{item.status}</span>{item.labels[0] && <span className="meta-label">{item.labels[0]}</span>}</div></div></button>;
}

function MessageBubble({ message }: { message: Message }) {
  if (message.from === "system") return <div className="internal-note"><LockKeyhole size={13} /><span><strong>{message.kind}</strong> · {message.text}</span><time>{message.time}</time></div>;
  return <div className={message.from === "me" ? "message-row mine" : "message-row"}><div className="bubble">{message.text.split("\n").map((line, index) => <span key={`${message.id}-${index}`}>{line}{index < message.text.split("\n").length - 1 && <br />}</span>)}<div className="message-meta"><time>{message.time}</time>{message.from === "me" && <Check size={13} />}</div></div></div>;
}

function PlaceholderPage({ activeNav, onBack }: { activeNav: string; onBack: () => void }) {
  const details: Record<string, { icon: typeof Bot; title: string; description: string }> = { "Visão geral": { icon: LayoutDashboard, title: "Visão geral", description: "Os sinais do seu atendimento, em um só lugar." }, Automação: { icon: Bot, title: "Automação", description: "Desenhe caminhos que resolvem antes de virar fila." }, Contatos: { icon: Users, title: "Contatos", description: "A memória de cada conversa com seus clientes." }, Relatórios: { icon: Radio, title: "Relatórios", description: "Veja onde seu time ganha tempo e onde perde contexto." } };
  const info = details[activeNav] ?? details["Visão geral"]; const Icon = info.icon;
  return <div className="placeholder-page"><div className="placeholder-orbit"><div className="orbit-ring ring-a" /><div className="orbit-ring ring-b" /><div className="placeholder-icon"><Icon size={28} /></div></div><h1>{info.title}</h1><p>{info.description}</p><button onClick={onBack}>Voltar para atendimento</button></div>;
}

function OverviewPage() {
  const bars = [34, 48, 41, 67, 54, 78, 72, 91, 64, 83, 76, 88];
  return <div className="overview-page"><div className="overview-heading"><div><span className="eyebrow">QUARTA, 09 DE OUTUBRO</span><h1>Bom dia, Lucas.</h1><p>O atendimento está respirando bem hoje.</p></div><button className="date-filter"><Clock3 size={14} /> Últimos 7 dias <ChevronDown size={14} /></button></div><div className="metric-grid"><MetricCard label="Conversas abertas" value="28" delta="+12,5%" note="vs. período anterior" icon={<MessageSquare size={16} />} tone="green" /><MetricCard label="Aguardando cliente" value="07" delta="-8,3%" note="vs. período anterior" icon={<Clock3 size={16} />} tone="yellow" /><MetricCard label="Finalizadas" value="142" delta="+18,2%" note="vs. período anterior" icon={<Check size={16} />} tone="lilac" /><MetricCard label="1ª resposta humana" value="04:12" delta="-21s" note="tempo médio" icon={<Zap size={16} />} tone="blue" /></div><div className="overview-grid"><section className="chart-card"><div className="card-heading"><div><h2>Volume de mensagens</h2><p>Recebidas e enviadas por hora</p></div><div className="chart-legend"><span><i className="legend-received" /> Recebidas</span><span><i className="legend-sent" /> Enviadas</span></div></div><div className="bar-chart">{bars.map((height, index) => <div className="bar-group" key={index}><div className="bar-pair"><i className="bar-received" style={{ height: `${height}%` }} /><i className="bar-sent" style={{ height: `${Math.max(18, height - 22)}%` }} /></div><span>{`${8 + index}h`}</span></div>)}</div></section><section className="connection-card"><div className="card-heading"><div><h2>Conexões</h2><p>Estado dos números ativos</p></div><button className="card-action">Gerenciar</button></div><div className="connection-item"><div className="connection-logo"><Wifi size={17} /></div><div><strong>Brito</strong><span>+55 11 4004-2024</span></div><em><i /> conectado</em></div><div className="connection-item muted"><div className="connection-logo"><Wifi size={17} /></div><div><strong>Brito Suporte</strong><span>aguardando pareamento</span></div><em>QR Code</em></div><div className="mini-insight"><Sparkles size={14} /><span><strong>O bot resolveu 64%</strong> das conversas sem intervenção humana.</span></div></section></div></div>;
}

function MetricCard({ label, value, delta, note, icon, tone }: { label: string; value: string; delta: string; note: string; icon: React.ReactNode; tone: string }) {
  return <div className={`metric-card tone-${tone}`}><div className="metric-top"><span>{label}</span><i>{icon}</i></div><div className="metric-value">{value}</div><div className="metric-bottom"><strong>{delta}</strong><span>{note}</span></div></div>;
}

function AutomationPage({ onBack }: { onBack: () => void }) {
  const [enabled, setEnabled] = useState(true);
  const [hours, setHours] = useState(true);
  const [saved, setSaved] = useState(false);
  const [welcome, setWelcome] = useState("Olá! Como podemos ajudar?");
  const options = [{ key: "1", label: "Conhecer os planos", route: "Comercial" }, { key: "2", label: "Suporte técnico", route: "Suporte" }, { key: "3", label: "Falar com atendente", route: "Atendimento humano" }];
  return <div className="automation-page"><div className="automation-heading"><div><span className="eyebrow">AUTOMAÇÃO DE ATENDIMENTO</span><h1>O bot trabalha. Seu time decide.</h1><p>Configure os primeiros passos da conversa sem escrever código.</p></div><div className="automation-actions"><button className="secondary-button" onClick={onBack}>Ver atendimento</button><button className="save-button" onClick={() => { setSaved(true); window.setTimeout(() => setSaved(false), 2200); }}>{saved ? <><Check size={14} /> Salvo</> : "Salvar alterações"}</button></div></div><div className="automation-layout"><section className="flow-card"><div className="flow-header"><div><h2>Fluxo principal</h2><p>O caminho que cada cliente percorre</p></div><Toggle checked={enabled} onChange={setEnabled} /></div><div className="flow-step start"><div className="step-node"><MessageSquare size={15} /></div><div><span>Quando uma mensagem chegar</span><strong>Iniciar conversa</strong></div><MoreHorizontal size={16} /></div><div className="flow-line" /><div className="flow-step"><div className="step-node welcome"><Sparkles size={15} /></div><div className="flow-step-field"><span>Mensagem de boas-vindas</span><input value={welcome} onChange={(event) => setWelcome(event.target.value)} /></div><MoreHorizontal size={16} /></div><div className="flow-line" /><div className="menu-step"><div className="step-node menu"><Menu size={15} /></div><div className="menu-content"><span>Menu de opções</span>{options.map((option) => <div className="option-row" key={option.key}><b>{option.key}</b><strong>{option.label}</strong><span><i /> {option.route}</span><Ellipsis size={14} /></div>)}<button className="add-option" onClick={() => setSaved(false)}><Plus size={14} /> Adicionar opção</button></div></div><div className="flow-line" /><div className="flow-step"><div className="step-node human"><Headphones size={15} /></div><div><span>Se o cliente pedir uma pessoa</span><strong>Transferir para atendimento humano</strong></div><Check size={16} className="green-check" /></div></section><aside className="automation-settings"><section className="settings-card"><div className="settings-title"><div className="settings-symbol"><Clock3 size={16} /></div><div><h2>Horário de atendimento</h2><p>Como o bot se comporta fora do expediente</p></div></div><div className="setting-switch-row"><span>Usar horário comercial</span><Toggle checked={hours} onChange={setHours} /></div><div className={hours ? "hours-table" : "hours-table disabled"}>{["Segunda a sexta", "Sábado", "Domingo"].map((day, index) => <div key={day}><span>{day}</span><strong>{index === 2 ? "Fechado" : index === 1 ? "09:00 — 13:00" : "09:00 — 18:00"}</strong></div>)}</div><label className="select-label">Fuso horário<select defaultValue="America/Sao_Paulo"><option value="America/Sao_Paulo">São Paulo (GMT−03:00)</option><option value="America/Manaus">Manaus (GMT−04:00)</option></select></label></section><section className="settings-card"><div className="settings-title"><div className="settings-symbol fallback"><Zap size={16} /></div><div><h2>Quando não entender</h2><p>Uma saída clara evita loops</p></div></div><textarea defaultValue="Não entendi. Escolha uma opção do menu para continuar." rows={3} /><div className="settings-footnote"><Check size={13} /> O bot pausa quando um atendente assume</div></section></aside></div></div>;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) { return <button aria-label="Alternar" className={checked ? "toggle on" : "toggle"} onClick={() => onChange(!checked)}><i /></button>; }

function QrModal({ close }: { close: () => void }) {
  return <div className="modal-backdrop" onClick={close}><div className="qr-modal" onClick={(event) => event.stopPropagation()}><header><div><span className="eyebrow">CONEXÃO WHATSAPP</span><h2>Parear um novo número</h2></div><button className="icon-button" onClick={close}><X size={18} /></button></header><div className="qr-layout"><div className="fake-qr"><div className="qr-corner one" /><div className="qr-corner two" /><div className="qr-corner three" /><div className="qr-noise">▦ ▪ ▦ ▪<br />▪ ▦ ▪ ▦<br />▦ ▪ ▦ ▪</div></div><div className="qr-instructions"><div className="step"><b>1</b><span>Abra o WhatsApp no seu celular</span></div><div className="step"><b>2</b><span>Toque em <strong>Configurações → Aparelhos conectados</strong></span></div><div className="step"><b>3</b><span>Escaneie este código para conectar</span></div><div className="secure-note"><LockKeyhole size={14} /> Suas credenciais ficam protegidas e nunca aparecem no navegador.</div></div></div><footer><span><i className="pulse-dot" /> Aguardando leitura do QR Code</span><button onClick={close}>Cancelar</button></footer></div></div>;
}
