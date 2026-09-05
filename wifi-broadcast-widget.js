// WiFi Broadcast Widget - Para Home Screen do iOS
// Use este script como widget no Scriptable

const fm = FileManager.local();
const documentsPath = fm.documentsDirectory();
const prefsFile = fm.joinPath(documentsPath, "prefs.json");
const historyFile = fm.joinPath(documentsPath, "broadcast_history.json");

// Carregar preferências
function getServerURL() {
  try {
    if (fm.fileExists(prefsFile)) {
      const data = JSON.parse(fm.readString(prefsFile));
      return data.serverUrl;
    }
  } catch (e) {}
  return null;
}

// Carregar histórico
function loadHistory() {
  try {
    if (fm.fileExists(historyFile)) {
      return JSON.parse(fm.readString(historyFile));
    }
  } catch (e) {}
  return [];
}

// Buscar mensagens do servidor
async function fetchMessages(serverUrl) {
  try {
    const request = new Request(serverUrl + "/api/messages");
    request.timeoutInterval = 10;
    const response = await request.loadJSON();
    return response.messages || [];
  } catch (e) {
    return loadHistory();
  }
}

// Criar widget
async function createWidget() {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#667eea");
  widget.setPadding(15, 15, 15, 15);
  
  const serverUrl = getServerURL();
  
  // Título
  const title = widget.addText("📡 WiFi Broadcast");
  title.font = Font.boldSystemFont(16);
  title.textColor = Color.white();
  title.centerAlignText();
  
  widget.addSpacer(10);
  
  if (!serverUrl) {
    const configText = widget.addText("⚙️ Configure na app");
    configText.font = Font.systemFont(12);
    configText.textColor = new Color("#fff", 0.8);
    configText.centerAlignText();
  } else {
    try {
      // Buscar mensagens
      const messages = await fetchMessages(serverUrl);
      
      if (messages.length === 0) {
        const emptyText = widget.addText("Aguardando mensagens...");
        emptyText.font = Font.systemFont(12);
        emptyText.textColor = new Color("#fff", 0.8);
        emptyText.centerAlignText();
      } else {
        // Mostrar últimas 3 mensagens
        const recentMessages = messages.slice(-3).reverse();
        
        for (const msg of recentMessages) {
          const time = msg.timestamp || "??:??";
          const preview = msg.message.substring(0, 35);
          const msgText = widget.addText(`${time} • ${preview}...`);
          msgText.font = Font.systemFont(10);
          msgText.textColor = new Color("#fff", 0.9);
          msgText.lineLimit = 1;
        }
      }
    } catch (e) {
      const errorText = widget.addText("Erro de conexão");
      errorText.font = Font.systemFont(12);
      errorText.textColor = new Color("#fff", 0.8);
      errorText.centerAlignText();
    }
  }
  
  widget.addSpacer(8);
  
  // Rodapé
  const footer = widget.addText("Mensagens: " + loadHistory().length);
  footer.font = Font.systemFont(9);
  footer.textColor = new Color("#fff", 0.6);
  footer.centerAlignText();
  
  return widget;
}

// Executar
const widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}