let API;
let accessToken = null;
let currentProjectId = null;

// De EU API endpoint uit de specificatie
const API_BASE_URL = "https://app21.connect.trimble.com/tc/api/2.0";

async function init() {
    try {
        API = await TrimbleConnectWorkspace.connect(
            window.parent, 
            (event, data) => { console.log("Viewer Event:", event, data); }
        );

        const project = await API.project.getCurrentProject();
        currentProjectId = project.id;
        document.getElementById('project-name').innerText = "Project: " + project.name;
    } catch (error) {
        console.error("Initialisatie fout:", error);
    }
}

// 1. Token ophalen en opslaan
document.getElementById('btn-token').onclick = async () => {
    if (!API) return;
    accessToken = await API.extension.requestPermission("accesstoken");
    
    if (accessToken && accessToken !== "pending") {
        document.getElementById('token-status').style.display = "block";
        document.getElementById('content').innerText = "Token ontvangen. Je kunt nu clashes ophalen.";
    }
};

// 2. Clashsets ophalen via de REST API (v2.0)
document.getElementById('btn-load-clashes').onclick = async () => {
    if (!accessToken) {
        alert("Activeer eerst het token!");
        return;
    }

    const container = document.getElementById('content');
    container.innerHTML = "Bezig met ophalen van clashsets uit database...";

    try {
        // We roepen de /clashsets endpoint aan met het Bearer token
        const response = await fetch(`${API_BASE_URL}/clashsets?projectId=${currentProjectId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`API Fout: ${response.status}`);

        const clashSets = await response.json();
        
        if (clashSets && clashSets.length > 0) {
            container.innerHTML = clashSets.map(c => `
                <div class="item-box">
                    <strong>${c.name}</strong><br>
                    <span>Status: ${c.status}%</span><br>
                    <span>Aantal Clashes: ${c.count}</span><br>
                    <small>ID: ${c.id}</small>
                </div>
            `).join('');
        } else {
            container.innerHTML = "Geen clashsets gevonden in dit project.";
        }
    } catch (err) {
        container.innerHTML = `<span class="error">Fout bij laden: ${err.message}</span>`;
        console.error("Clash API Fout:", err);
    }
};

init();