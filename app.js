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

document.getElementById('btn-main-action').onclick = async () => {
    if (!accessToken) {
        accessToken = await API.extension.requestPermission("accesstoken");
    }
    loadClashSets();
};

async function loadClashSets() {
    const container = document.getElementById('content-area');
    container.innerHTML = "Laden...";
    try {
        const response = await fetch(`${API_BASE_URL}/clashsets?projectId=${currentProjectId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const sets = await response.json();
        container.innerHTML = sets.map(s => `
            <div style="border:1px solid #eee; padding:8px; margin-bottom:5px; border-radius:4px;">
                <strong>${s.name}</strong> (${s.count})
                <button style="padding:4px; font-size:0.7em; margin-top:5px;" onclick="loadClashItems('${s.id}')">Bekijk Clashes</button>
            </div>
        `).join('');
    } catch (err) { container.innerHTML = "Fout bij laden."; }
}

async function loadClashItems(clashId) {
    const list = document.getElementById('items-list');
    document.getElementById('items-container').style.display = "block";
    document.getElementById('filter-section').classList.remove('hidden');
    list.innerHTML = "Items ophalen...";

    try {
        const response = await fetch(`${API_BASE_URL}/clashsets/${clashId}/items`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const items = await response.json();
        renderItems(items);
    } catch (err) { list.innerHTML = "Fout bij ophalen."; }
}

function renderItems(items) {
    const list = document.getElementById('items-list');
    const hideIsolatie = document.getElementById('hide-isolatie').checked;
    
    // Simpele filter op basis van de naam die uit de Clash API komt
    const filtered = items.filter(i => {
        if (!hideIsolatie) return true;
        const hasIsolatie = i.elementName1.toLowerCase().includes('isolatie') || 
                            i.elementName2.toLowerCase().includes('isolatie');
        return !hasIsolatie;
    });

    list.innerHTML = filtered.map(i => `
        <div class="clash-item" onclick="zoomToClash('${i.sourceId1.sourceId}', '${i.sourceId2.sourceId}')">
            <strong>${i.label}</strong><br>
            <span style="font-size:0.9em;">${i.elementName1}<br>↔ ${i.elementName2}</span>
        </div>
    `).join('');
    
    document.getElementById('filter-status').innerText = `${filtered.length} van de ${items.length} clashes getoond.`;
}

// Luister naar de checkbox
document.getElementById('hide-isolatie').onchange = () => {
    // Opnieuw renderen is nodig om de filter toe te passen
    // In een echte app zouden we de 'items' variabele globaal opslaan
    alert("Vinkje veranderd! Klik opnieuw op 'Bekijk Clashes' om de filter toe te passen.");
};

async function zoomToClash(id1, id2) {
    if (!API) return;
    try {
        // We sturen een array van sourceId's naar de viewer
        // Dit zou specifiekere objecten moeten selecteren dan voorheen
        await API.viewer.setSelection([id1, id2]);
        console.log("Geselecteerd voor zoom:", id1, id2);
    } catch (e) {
        console.error("Selectie fout:", e);
    }
}

init();