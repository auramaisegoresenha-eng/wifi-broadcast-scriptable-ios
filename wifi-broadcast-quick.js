// WiFi Broadcast - Versão Shortcut automática
// Cole este código no Scriptable e execute como Shortcut

const fm = FileManager.local();
const documentsPath = fm.documentsDirectory();
const prefsFile = fm.joinPath(documentsPath, "prefs.json");

function getServerURL() {
  try {
    if (fm.fileExists(prefsFile)) {
      const data = JSON.parse(fm.readString(prefsFile));
      return data.serverUrl;
    }
  } catch (e) {}
  return null;
}

async function sendQuickMessage(message) {
  const serverUrl = getServerURL();
  
  if (!serverUrl) {
    return { success: false, message: "Servidor não configurado" };
  }
  
  try {
    const request = new Request(serverUrl + "/api/send");
    request.method = "POST";
    request.headers = { "Content-Type": "application/json" };
    request.body = JSON.stringify({ message: message });
    
    const response = await request.loadJSON();
    return response;
  } catch (error) {
    return {
      success: false,
      message: "Erro ao enviar: " + error
    };
  }
}

// Obter mensagem do argumento Shortcut
const args = args || {};
const message = args.message || args.input || "";

if (message) {
  const result = await sendQuickMessage(message);
  console.log(JSON.stringify(result));
} else {
  console.log(JSON.stringify({ success: false, message: "Nenhuma mensagem fornecida" }));
}
