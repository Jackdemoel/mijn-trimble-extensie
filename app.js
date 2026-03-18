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
    } catch (error) { console.error(error); }
}

document.getElementById('btn-load-sets').onclick = async () => {
    if (!accessToken) accessToken = await API.extension.requestPermission("accesstoken");
    loadClashSets();
};

async function loadClashSets() {
    const list = document.getElementById('clash-sets-list');
    list.innerHTML = "Laden...";
    const response = await fetch(`${API_BASE_URL}/clashsets?projectId=${currentProjectId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const sets = await response.json();
    list.innerHTML = sets.map(s => `
        <div class="clash-set-card" onclick="openClashSet('${s.id}')">
            <h4>${s.name}</h4>
            <div style="font-size:11px;">Aantal: ${s.count}</div>
        </div>
    `).join('');
}

async function openClashSet(clashId) {
    document.getElementById('set-selection-area').classList.add('hidden');
    document.getElementById('detail-area').classList.remove('hidden');
    const response = await fetch(`${API_BASE_URL}/clashsets/${clashId}/items`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    activeClashItems = await response.json();
    populateFilter(activeClashItems);
    renderFilteredItems();
}

function renderFilteredItems() {
    const selectedType = document.getElementById('type-filter').value;
    const list = document.getElementById('clash-items-list');
    const filtered = activeClashItems.filter(i => selectedType === "ALL" || i.elementType1 === selectedType || i.elementType2 === selectedType);

    list.innerHTML = filtered.map(i => `
        <div class="clash-item" id="item-${i.id}" onclick="focusClash('${i.id}')">
            <span class="clash-label">${i.label}</span>
            <span class="clash-types">${i.elementType1} ↔ ${i.elementType2}</span>
        </div>
    `).join('');
}

async function focusClash(clashItemId) {
    // Vind de data van het aangeklikte item
    const item = activeClashItems.find(i => i.id === clashItemId);
    if (!item || !API) return;

    // UI Feedback: highlight in lijst
    document.querySelectorAll('.clash-item').forEach(el => el.classList.remove('active-clash'));
    document.getElementById(`item-${clashItemId}`).classList.add('active-clash');

    try {
        const id1 = item.sourceId1.sourceId;
        const id2 = item.sourceId2.sourceId;

        // 1. Selecteer de objecten
        await API.viewer.setSelection([id1, id2]);

        // 2. Isoleer de objecten (maak de rest transparant of verberg ze)
        // We gebruiken de 'presentation' logica uit de spec
        await API.viewer.setObjectsVisibility([], true); // Verberg alles
        await API.viewer.setObjectsVisibility([id1, id2], false); // Toon alleen deze twee

        // 3. Zoom naar de clash
        // De 'center' uit de API-spec geeft de exacte locatie
        if (item.center) {
            await API.viewer.setCameraTarget(item.center.x, item.center.y, item.center.z);
            // Een kleine afstand om de clash heen
            await API.viewer.setCameraDistance(2000); 
        } else {
            await API.viewer.zoomToSelection();
        }

    } catch (e) { console.error("Viewer actie mislukt:", e); }
}

function populateFilter(items) {
    const select = document.getElementById('type-filter');
    const types = new Set();
    items.forEach(i => { types.add(i.elementType1); types.add(i.elementType2); });
    select.innerHTML = '<option value="ALL">Alle types</option>' + 
        Array.from(types).sort().map(t => `<option value="${t}">${t}</option>`).join('');
}

function backToSets() {
    document.getElementById('set-selection-area').classList.remove('hidden');
    document.getElementById('detail-area').classList.add('hidden');
}
document.getElementById('type-filter').onchange = renderFilteredItems;
init();