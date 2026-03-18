let API;
let accessToken = null;
let currentProjectId = null;
let allClashItems = []; // Buffer voor alle clashes van de geselecteerde set
const API_BASE_URL = "https://app21.connect.trimble.com/tc/api/2.0";

async function init() {
    try {
        API = await TrimbleConnectWorkspace.connect(window.parent, (event, data) => {});
        const project = await API.project.getCurrentProject();
        currentProjectId = project.id;
        document.getElementById('content-area').innerHTML = "<p style='font-size:0.8em;'>Verbonden met project. Klik op de knop om te starten.</p>";
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
                <span style="font-size:0.9em; font-weight:bold;">${s.name}</span>
                <button style="padding:4px; font-size:0.7em; margin-top:5px;" onclick="loadClashItems('${s.id}')">Selecteer Set</button>
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
        allClashItems = await response.json();
        renderItems(allClashItems);
    } catch (err) { list.innerHTML = "Fout bij ophalen."; }
}

function renderItems(items) {
    const list = document.getElementById('items-list');
    list.innerHTML = items.map(i => `
        <div class="clash-item" id="item-${i.id}" onclick="zoomToClash('${i.sourceId1.sourceId}', '${i.sourceId2.sourceId}')">
            <strong>${i.label}</strong><br>
            <span class="names">${i.elementName1} ↔ ${i.elementName2}</span>
        </div>
    `).join('');
    document.getElementById('filter-status').innerText = `${items.length} clashes getoond.`;
}

// De Filter Functie
document.getElementById('filter-input').oninput = function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const items = document.querySelectorAll('.clash-item');
    let count = 0;

    items.forEach(item => {
        const text = item.querySelector('.names').innerText.toLowerCase();
        if (text.includes(searchTerm)) {
            item.classList.remove('hidden');
            count++;
        } else {
            item.classList.add('hidden');
        }
    });
    document.getElementById('filter-status').innerText = `${count} resultaten gevonden voor "${searchTerm}"`;
};

async function zoomToClash(id1, id2) {
    if (!API) return;
    await API.viewer.setSelection([id1, id2]);
}

init();