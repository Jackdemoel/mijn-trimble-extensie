let API;
let accessToken = null;
let currentProjectId = null;
let activeClashItems = [];
const API_BASE_URL = "https://app21.connect.trimble.com/tc/api/2.0";

async function init() {
    try {
        API = await TrimbleConnectWorkspace.connect(window.parent, (event, data) => {});
        const project = await API.project.getCurrentProject();
        currentProjectId = project.id;
        document.getElementById('project-label').innerText = project.name.toUpperCase();
    } catch (error) {
        console.error("Start-up error:", error);
    }
}

document.getElementById('btn-load-sets').onclick = async () => {
    if (!accessToken) {
        accessToken = await API.extension.requestPermission("accesstoken");
    }
    loadClashSets();
};

async function loadClashSets() {
    const list = document.getElementById('clash-sets-list');
    list.innerHTML = "<p style='font-size:12px;'>Bezig met ophalen...</p>";
    try {
        const response = await fetch(`${API_BASE_URL}/clashsets?projectId=${currentProjectId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const sets = await response.json();
        list.innerHTML = sets.map(s => `
            <div class="clash-set-card" onclick="openClashSet('${s.id}')">
                <h4>${s.name}</h4>
                <div style="font-size:11px; color:#666;">Aantal clashes: ${s.count}</div>
            </div>
        `).join('');
    } catch (err) { list.innerHTML = "Fout bij laden."; }
}

async function openClashSet(clashId) {
    document.getElementById('set-selection-area').classList.add('hidden');
    document.getElementById('detail-area').classList.remove('hidden');
    const list = document.getElementById('clash-items-list');
    list.innerHTML = "<p style='font-size:12px;'>Items laden...</p>";

    try {
        const response = await fetch(`${API_BASE_URL}/clashsets/${clashId}/items`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        activeClashItems = await response.json();
        
        // Dropdown vullen met unieke types
        populateFilter(activeClashItems);
        renderFilteredItems();
    } catch (err) { list.innerHTML = "Fout bij ophalen items."; }
}

function populateFilter(items) {
    const select = document.getElementById('type-filter');
    const types = new Set();
    
    items.forEach(i => {
        if(i.elementType1) types.add(i.elementType1);
        if(i.elementType2) types.add(i.elementType2);
    });

    select.innerHTML = '<option value="ALL">Alle types tonen</option>' + 
        Array.from(types).sort().map(t => `<option value="${t}">${t}</option>`).join('');
}

document.getElementById('type-filter').onchange = renderFilteredItems;

function renderFilteredItems() {
    const selectedType = document.getElementById('type-filter').value;
    const list = document.getElementById('clash-items-list');
    
    const filtered = activeClashItems.filter(i => {
        if (selectedType === "ALL") return true;
        return i.elementType1 === selectedType || i.elementType2 === selectedType;
    });

    list.innerHTML = filtered.map(i => `
        <div class="clash-item" onclick="zoomToClash('${i.sourceId1.sourceId}', '${i.sourceId2.sourceId}')">
            <div class="clash-info">
                <span class="clash-label">${i.label}</span>
                <span class="clash-types">${i.elementType1} ↔ ${i.elementType2}</span>
            </div>
            <div class="clash-dist">${i.distance} mm</div>
        </div>
    `).join('');
    
    document.getElementById('filter-count').innerText = `${filtered.length} clashes gevonden.`;
}

function backToSets() {
    document.getElementById('set-selection-area').classList.remove('hidden');
    document.getElementById('detail-area').classList.add('hidden');
}

async function zoomToClash(id1, id2) {
    if (!API) return;
    await API.viewer.setSelection([id1, id2]);
}

init();