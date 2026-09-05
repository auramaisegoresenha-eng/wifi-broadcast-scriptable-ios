// WiFi Broadcast Messenger para iOS - Scriptable
// Versão 1.0
// Use este script no aplicativo Scriptable do iOS

const fm = FileManager.local();
const documentsPath = fm.documentsDirectory();
const historyFile = fm.joinPath(documentsPath, "broadcast_history.json");

// Carregar histórico
function loadHistory() {
  try {
    if (fm.fileExists(historyFile)) {
      const content = fm.readString(historyFile);
      return JSON.parse(content);
    }
  } catch (e) {
    console.log("Erro ao carregar histórico: " + e);
  }
  return [];
}

// Salvar histórico
function saveHistory(history) {
  try {
    fm.writeString(historyFile, JSON.stringify(history, null, 2));
  } catch (e) {
    console.log("Erro ao salvar histórico: " + e);
  }
}

// Função para enviar mensagem broadcast
async function sendBroadcastMessage(message, serverUrl) {
  try {
    const request = new Request(serverUrl + "/api/send");
    request.method = "POST";
    request.headers = { "Content-Type": "application/json" };
    request.body = JSON.stringify({ message: message });
    
    const response = await request.loadJSON();
    
    // Adicionar ao histórico local
    let history = loadHistory();
    const timestamp = new Date().toLocaleTimeString();
    history.push({
      type: "sent",
      message: message,
      timestamp: timestamp,
      status: "enviada"
    });
    saveHistory(history);
    
    return {
      success: response.success,
      message: response.message || "Mensagem enviada"
    };
  } catch (error) {
    console.log("Erro ao enviar: " + error);
    return {
      success: false,
      message: "Erro ao enviar mensagem: " + error
    };
  }
}

// Função para buscar histórico do servidor
async function fetchMessages(serverUrl) {
  try {
    const request = new Request(serverUrl + "/api/messages");
    const response = await request.loadJSON();
    
    if (response.success) {
      saveHistory(response.messages);
      return response.messages;
    }
  } catch (error) {
    console.log("Erro ao buscar mensagens: " + error);
  }
  return loadHistory();
}

// Interface principal
async function showMainMenu(serverUrl) {
  const alert = new Alert();
  alert.title = "📡 WiFi Broadcast Messenger";
  alert.message = "Escolha uma opção:";
  
  alert.addAction("📤 Enviar Mensagem");
  alert.addAction("📨 Ver Histórico");
  alert.addAction("🔄 Sincronizar");
  alert.addDestructiveAction("❌ Sair");
  
  const action = await alert.presentSheet();
  
  if (action === 0) {
    await sendMessageUI(serverUrl);
  } else if (action === 1) {
    await showHistory(serverUrl);
  } else if (action === 2) {
    await syncMessages(serverUrl);
  }
}

// UI para enviar mensagem
async function sendMessageUI(serverUrl) {
  const alert = new Alert();
  alert.title = "Enviar Mensagem";
  alert.message = "Digite sua mensagem:";
  alert.addTextField("", "Digite aqui... (máx 1000 caracteres)");
  alert.addAction("Enviar");
  alert.addCancelAction("Cancelar");
  
  const result = await alert.presentAlert();
  
  if (result === 0) {
    const message = alert.textFieldValue(0).trim();
    
    if (message.length === 0) {
      const errorAlert = new Alert();
      errorAlert.title = "Erro";
      errorAlert.message = "Mensagem não pode estar vazia";
      errorAlert.addAction("OK");
      await errorAlert.presentAlert();
      return;
    }
    
    if (message.length > 1000) {
      const errorAlert = new Alert();
      errorAlert.title = "Erro";
      errorAlert.message = "Mensagem muito longa (máx 1000 caracteres)";
      errorAlert.addAction("OK");
      await errorAlert.presentAlert();
      return;
    }
    
    const response = await sendBroadcastMessage(message, serverUrl);
    
    const resultAlert = new Alert();
    resultAlert.title = response.success ? "✓ Sucesso" : "✗ Erro";
    resultAlert.message = response.message;
    resultAlert.addAction("OK");
    await resultAlert.presentAlert();
    
    if (response.success) {
      await showMainMenu(serverUrl);
    }
  }
}

// Mostrar histórico
async function showHistory(serverUrl) {
  const messages = await fetchMessages(serverUrl);
  
  const table = new UITable();
  table.showSeparators = true;
  
  if (messages.length === 0) {
    const row = new UITableRow();
    row.addText("Nenhuma mensagem no histórico");
    table.addRow(row);
  } else {
    // Mostrar mensagens em ordem reversa (mais recentes primeiro)
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const row = new UITableRow();
      
      const timeCell = row.addText(msg.timestamp || "");
      timeCell.widthWeight = 1;
      
      const typeEmoji = msg.type === "sent" ? "📤" : "📥";
      const statusCell = row.addText(`${typeEmoji} ${msg.message.substring(0, 40)}...`);
      statusCell.widthWeight = 4;
      
      table.addRow(row);
    }
  }
  
  await table.present(false);
}

// Sincronizar mensagens
async function syncMessages(serverUrl) {
  const alert = new Alert();
  alert.title = "Sincronizando...";
  alert.message = "Buscando mensagens do servidor...";
  
  const messages = await fetchMessages(serverUrl);
  
  alert.title = "✓ Sincronizado";
  alert.message = `${messages.length} mensagens carregadas`;
  alert.addAction("OK");
  await alert.presentAlert();
  
  await showMainMenu(serverUrl);
}

// Configurar URL do servidor
async function setupServerURL() {
  const prefsFile = fm.joinPath(documentsPath, "prefs.json");
  
  let prefs_data = {};
  try {
    if (fm.fileExists(prefsFile)) {
      prefs_data = JSON.parse(fm.readString(prefsFile));
    }
  } catch (e) {}
  
  const alert = new Alert();
  alert.title = "Configurar Servidor";
  alert.message = "URL do servidor (ex: http://192.168.1.100:5000):";
  alert.addTextField("URL", prefs_data.serverUrl || "http://192.168.1.100:5000");
  alert.addAction("Salvar");
  alert.addCancelAction("Cancelar");
  
  const result = await alert.presentAlert();
  
  if (result === 0) {
    const serverUrl = alert.textFieldValue(0).trim();
    
    if (!serverUrl) {
      const errorAlert = new Alert();
      errorAlert.title = "Erro";
      errorAlert.message = "URL não pode estar vazia";
      errorAlert.addAction("OK");
      await errorAlert.presentAlert();
      return null;
    }
    
    prefs_data.serverUrl = serverUrl;
    fm.writeString(prefsFile, JSON.stringify(prefs_data));
    
    return serverUrl;
  }
  
  return prefs_data.serverUrl || null;
}

// Obter URL do servidor
function getServerURL() {
  const prefsFile = fm.joinPath(documentsPath, "prefs.json");
  
  try {
    if (fm.fileExists(prefsFile)) {
      const prefs_data = JSON.parse(fm.readString(prefsFile));
      return prefs_data.serverUrl;
    }
  } catch (e) {}
  
  return null;
}

// Programa principal
async function main() {
  let serverUrl = getServerURL();
  
  if (!serverUrl) {
    serverUrl = await setupServerURL();
    if (!serverUrl) return;
  }
  
  // Verificar conexão
  try {
    const request = new Request(serverUrl + "/api/status");
    await request.loadJSON();
  } catch (e) {
    const alert = new Alert();
    alert.title = "⚠️ Erro de Conexão";
    alert.message = `Não conseguiu conectar a ${serverUrl}\n\nDeseja configurar outro servidor?`;
    alert.addAction("Sim, configurar");
    alert.addCancelAction("Não");
    
    const result = await alert.presentAlert();
    if (result === 0) {
      serverUrl = await setupServerURL();
      if (!serverUrl) return;
    } else {
      return;
    }
  }
  
  await showMainMenu(serverUrl);
}

// Executar
main();