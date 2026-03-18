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
    } catch (error) { console.error("Start error:", error); }
}

document.getElementById('product-filter').oninput = renderFilteredItems;

document.getElementById('btn-load-sets').onclick = async () => {
    if (!accessToken) {
        accessToken = await API.extension.requestPermission("accesstoken");
    }
    loadClashSets();
};

async function loadClashSets() {
    const list = document.getElementById('clash-sets-list');
    list.innerHTML = "Laden...";
    try {
        const response = await fetch(`${API_BASE_URL}/clashsets?projectId=${currentProjectId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const sets = await response.json();
        list.innerHTML = sets.map(s => `
            <div style="border:1px solid #ddd; padding:10px; margin-bottom:5px; cursor:pointer;" onclick="openClashSet('${s.id}')">
                <strong>${s.name}</strong><br><small>${s.count} clashes</small>
            </div>
        `).join('');
    } catch (err) { list.innerHTML = "Fout bij laden."; }
}

async function openClashSet(clashId) {
    document.getElementById('set-selection-area').classList.add('hidden');
    document.getElementById('detail-area').classList.remove('hidden');
    const list = document.getElementById('clash-items-list');
    list.innerHTML = "Clashes laden...";

    const response = await fetch(`${API_BASE_URL}/clashsets/${clashId}/items`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    activeClashItems = await response.json();
    renderFilteredItems();
}

function renderFilteredItems() {
    const filterTxt = document.getElementById('product-filter').value.toLowerCase();
    const list = document.getElementById('clash-items-list');
    
    const filtered = activeClashItems.filter(i => 
        i.elementName1.toLowerCase().includes(filterTxt) || 
        i.elementName2.toLowerCase().includes(filterTxt)
    );

    list.innerHTML = filtered.map(i => `
        <div class="clash-item" id="item-${i.id}" onclick="focusClash('${i.id}')">
            <span class="product-name">${i.label}</span>
            <div class="meta-info">
                A: ${i.elementName1}<br>
                B: ${i.elementName2}
            </div>
        </div>
    `).join('');
}

// JOUW GECORRIGEERDE FUNCTIE
async function focusClash(clashItemId) {
    const item = activeClashItems.find(i => i.id === clashItemId);
    if (!item || !API) return;

    document.querySelectorAll('.clash-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`item-${clashItemId}`).classList.add('active');

    try {
        const selectionData = [];

        if (item.sourceId1) {
            selectionData.push({
                modelId: item.sourceId1.versionId,
                objectIds: [item.sourceId1.sourceId]
            });
        }

        if (item.sourceId2) {
            selectionData.push({
                modelId: item.sourceId2.versionId,
                objectIds: [item.sourceId2.sourceId]
            });
        }

        // 1. Selecteer specifiek de objecten
        await API.viewer.setSelection(selectionData);

        // 2. Isoleer: verberg de rest
        await API.viewer.setObjectsVisibility([], true); 
        await API.viewer.setObjectsVisibility(selectionData, false);

        // 3. Camera focus
        if (item.center) {
            await API.viewer.setCameraTarget(item.center.x, item.center.y, item.center.z);
            await API.viewer.setCameraDistance(3000);
        }
    } catch (e) { console.error("Viewer error:", e); }
}

function backToSets() {
    document.getElementById('set-selection-area').classList.remove('hidden');
    document.getElementById('detail-area').classList.add('hidden');
}

init();