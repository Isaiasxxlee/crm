const CHANNEL_LABELS = { INSTAGRAM: "Instagram", MESSENGER: "Messenger", WHATSAPP: "WhatsApp" };
const TYPE_LABELS = {
  IMAGE: "[Imagem]",
  AUDIO: "[Áudio]",
  VIDEO: "[Vídeo]",
  FILE: "[Arquivo]",
  UNKNOWN: "[Conteúdo não suportado]",
};
const ERRORS = {
  not_found: "Conversa não encontrada.",
  invalid_conversation_id: "Conversa não encontrada.",
  company_required: "Sua conta ainda não pertence a uma empresa.",
};
const TIME_FORMAT = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function createInbox(root, onUnauthorized) {
  const status = root.querySelector("[data-inbox-status]");
  const refresh = root.querySelector("[data-inbox-refresh]");
  const list = root.querySelector("[data-inbox-conversations]");
  const threadTitle = root.querySelector("[data-inbox-thread-title]");
  const threadMeta = root.querySelector("[data-inbox-thread-meta]");
  const thread = root.querySelector("[data-inbox-messages]");
  let controller;
  let selectedId = null;
  let conversations = [];

  function node(tag, text, className) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  }

  function clearThread() {
    threadTitle.textContent = "Conversa";
    threadMeta.textContent = "Selecione uma conversa para ver as mensagens.";
    thread.replaceChildren();
  }

  function reset() {
    controller?.abort();
    selectedId = null;
    conversations = [];
    list.replaceChildren();
    clearThread();
    status.textContent = "";
    root.removeAttribute("aria-busy");
  }

  async function request(url, signal) {
    const response = await fetch(url, { credentials: "same-origin", cache: "no-store", signal });
    if (response.status === 401) {
      onUnauthorized();
      throw new Error("Entre novamente para consultar a caixa de entrada.");
    }
    const result = await response.json();
    signal.throwIfAborted();
    if (!response.ok) throw new Error(ERRORS[result.error] || "Não foi possível carregar a caixa de entrada. Tente novamente.");
    return result.data;
  }

  function participantLabel(conversation) {
    const contact = conversation.contact;
    if (contact) return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
    if (conversation.participantName) return conversation.participantName;
    const suffix = conversation.externalConversationId.slice(-4);
    return `Contato do ${CHANNEL_LABELS[conversation.channel.type] || "canal"} ···${suffix}`;
  }

  function preview(message) {
    if (!message) return "Sem mensagens";
    return message.text || TYPE_LABELS[message.messageType] || TYPE_LABELS.UNKNOWN;
  }

  function formatTime(value) {
    return value ? TIME_FORMAT.format(new Date(value)) : "";
  }

  function renderList() {
    const items = conversations.map((conversation) => {
      const item = node("li");
      const button = node("button", "", "inbox-conversation");
      button.type = "button";
      if (conversation.id === selectedId) button.setAttribute("aria-current", "true");
      const head = node("span", "", "inbox-conversation-head");
      head.append(
        node("span", CHANNEL_LABELS[conversation.channel.type] || conversation.channel.type, "dash-card-tag"),
        node("time", formatTime(conversation.lastMessageAt)),
      );
      const last = conversation.lastMessage;
      const prefix = last?.direction === "OUTBOUND" ? "Empresa: " : "";
      button.append(
        head,
        node("strong", participantLabel(conversation)),
        node("span", `${prefix}${preview(last)}`, "inbox-preview"),
      );
      button.addEventListener("click", () => select(conversation.id));
      item.append(button);
      return item;
    });
    list.replaceChildren(...items);
  }

  function renderThread(conversation, messages) {
    threadTitle.textContent = participantLabel(conversation);
    const channel = CHANNEL_LABELS[conversation.channel.type] || conversation.channel.type;
    const count = conversation.messageCount === 1 ? "1 mensagem" : `${conversation.messageCount} mensagens`;
    threadMeta.textContent = `${channel} · ${conversation.channel.name} · ${count}`;
    const items = messages.map((message) => {
      const inbound = message.direction === "INBOUND";
      const item = node("li", "", `inbox-message ${inbound ? "is-inbound" : "is-outbound"}`);
      item.append(
        node("span", inbound ? "Cliente" : "Empresa", "inbox-message-author"),
        node("p", message.text || TYPE_LABELS[message.messageType] || TYPE_LABELS.UNKNOWN),
        node("time", formatTime(message.sentAt)),
      );
      return item;
    });
    if (!items.length) items.push(node("li", "Nenhuma mensagem nesta conversa.", "tagline"));
    thread.replaceChildren(...items);
  }

  async function loadConversations(signal) {
    conversations = await request("/api/inbox/conversations", signal);
    renderList();
    if (!conversations.length) {
      clearThread();
      return "Nenhuma conversa recebida ainda. As mensagens enviadas ao Instagram conectado aparecem aqui.";
    }
    if (selectedId && conversations.some((conversation) => conversation.id === selectedId)) {
      await loadThread(selectedId, signal);
    } else {
      selectedId = null;
      clearThread();
    }
    return `${conversations.length} conversa(s).`;
  }

  async function loadThread(id, signal) {
    const [conversation, messages] = await Promise.all([
      request(`/api/inbox/conversations/${encodeURIComponent(id)}`, signal),
      request(`/api/inbox/conversations/${encodeURIComponent(id)}/messages`, signal),
    ]);
    renderThread(conversation, messages);
  }

  async function run(action, loading) {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    root.setAttribute("aria-busy", "true");
    status.textContent = loading;
    refresh.disabled = true;
    try {
      const message = await action(current.signal);
      if (!current.signal.aborted) status.textContent = message || "";
    } catch (error) {
      if (!current.signal.aborted) status.textContent = error.message;
    } finally {
      if (!current.signal.aborted) {
        root.removeAttribute("aria-busy");
        refresh.disabled = false;
      }
    }
  }

  function select(id) {
    selectedId = id;
    renderList();
    run(async (signal) => {
      await loadThread(id, signal);
      return "";
    }, "Carregando mensagens…");
  }

  refresh.addEventListener("click", () => run(loadConversations, "Atualizando conversas…"));

  function open() {
    reset();
    run(loadConversations, "Carregando conversas…");
  }

  return { open, reset };
}
