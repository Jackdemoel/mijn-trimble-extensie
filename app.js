let API;
let accessToken = null;
let currentProjectId = null;
const API_BASE_URL = "https://app21.connect.trimble.com/tc/api/2.0";

async function init() {
    try {
        API = await TrimbleConnectWorkspace.connect(window.parent, (event, data) => {});
        const project = await API.project.getCurrentProject();
        currentProjectId = project.id;
        document.getElementById('project-name').innerText = "Project: " + project.name;
    } catch (error) {
        console.error("Fout bij start:", error);
    }
}

// Hoofdknop: Token check + Laden
document.getElementById('btn-main-action').onclick = async () => {
    if (!accessToken) {
        const token = await API.extension.requestPermission("accesstoken");
        if (token && token !== "pending") {
            accessToken = token;
            loadClashSets();
        }
    } else {
        loadClashSets();
    }
};

async function loadClashSets() {
    const container = document.getElementById('content-area');
    container.innerHTML = "<p style='font-size:0.8em;'>Laden...</p>";

    try {
        const response = await fetch(`${API_BASE_URL}/clashsets?projectId=${currentProjectId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const sets = await response.json();
        
        container.innerHTML = sets.map(s => `
            <div class="clash-card">
                <h4>${s.name}</h4>
                <p>Clashes: ${s.count} | Status: ${s.status}%</p>
                <button class="view-btn" onclick="loadClashItems('${s.id}')">Toon individuele clashes</button>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = "Fout bij laden sets.";
    }
}

async function loadClashItems(clashId) {
    const list = document.getElementById('items-list');
    const container = document.getElementById('items-container');
    container.style.display = "block";
    list.innerHTML = "<p style='font-size:0.8em;'>Clashes ophalen...</p>";

    try {
        // Gebruik /clashsets/{clashId}/items endpoint [cite: 730]
        const response = await fetch(`${API_BASE_URL}/clashsets/${clashId}/items`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const items = await response.json();

        if (items.length === 0) {
            list.innerHTML = "Geen individuele clashes gevonden (run eerst de check in Connect).";
        } else {
            // Toon de eerste 20 clashes om de lijst behapbaar te houden
            list.innerHTML = items.slice(0, 20).map(i => `
                <div class="clash-item" onclick="zoomToClash('${i.sourceId1.sourceId}', '${i.sourceId2.sourceId}')">
                    <strong>${i.label}</strong><br>
                    ${i.elementName1} ↔ ${i.elementName2}
                </div>
            `).join('');
        }
    } catch (err) {
        list.innerHTML = "Fout bij ophalen items.";
    }
}

// Functie om de viewer aan te sturen
async function zoomToClash(id1, id2) {
    if (!API) return;
    try {
        // Selecteer beide objecten in de viewer
        await API.viewer.setSelection([id1, id2]);
        // Focus de camera op de selectie
        // Let op: afhankelijk van viewer versie is dit soms API.viewer.zoomToSelection()
        console.log("Zoom naar objecten:", id1, id2);
    } catch (e) {
        console.error("Zoom fout:", e);
    }
}

init();