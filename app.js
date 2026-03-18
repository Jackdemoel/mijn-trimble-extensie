let API;
let accessToken = null;
let currentProjectId = null;
let activeClashItems = [];
const API_BASE_URL = "https://app21.connect.trimble.com/tc/api/2.0";

// 1. Initialisatie van de Workspace API
async function init() {
    try {
        API = await TrimbleConnectWorkspace.connect(window.parent, (event, data) => {});
        const project = await API.project.getCurrentProject();
        currentProjectId = project.id;
    } catch (error) { 
        console.error("Start error:", error); 
    }
}

// Koppel de zoekbalk aan de filterfunctie
document.getElementById('product-filter').oninput = renderFilteredItems;

// 2. Open een specifieke Clash Set en haal de items op
async function openClashSet(clashId) {
    document.getElementById('set-selection-area').classList.add('hidden');
    document.getElementById('detail-area').classList.remove('hidden');
    
    const list = document.getElementById('clash-items-list');
    list.innerHTML = "Clashes laden...";

    try {
        // GECORRIGEERD: De URL is nu een geldige template string zonder onnodige spaties of backslashes
        const response = await fetch(`${API_BASE_URL}/clashsets/${clashId}/items`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        
        activeClashItems = await response.json();
        renderFilteredItems();
    } catch (err) { 
        list.innerHTML = "Fout bij laden van clashes."; 
        console.error("Fetch error:", err);
    }
}

// 3. Render de items en pas het zoekfilter toe
function renderFilteredItems() {
    const filterTxt = document.getElementById('product-filter').value.toLowerCase();
    const list = document.getElementById('clash-items-list');
    
    // GECORRIGEERD: Fallback naar lege strings (`|| ""`) toegevoegd om crashes te voorkomen 
    // als elementName1 of elementName2 toevallig null of undefined is vanuit Trimble.
    const filtered = activeClashItems.filter(i =>
        (i.elementName1 || "").toLowerCase().includes(filterTxt) ||
        (i.elementName2 || "").toLowerCase().includes(filterTxt)
    );
    
    list.innerHTML = filtered.map(i => `
        <div class="clash-item" id="item-${i.id}" onclick="focusClash('${i.id}')" style="cursor:pointer; border-bottom:1px solid #ccc; padding:5px;">
            <strong>${i.label || 'Geen label'}</strong><br />
            <small>A: ${i.elementName1 || 'Onbekend'}</small><br />
            <small>B: ${i.elementName2 || 'Onbekend'}</small>
        </div>
    `).join('');
}

// 4. Focus op een specifieke clash in de 3D Viewer
async function focusClash(clashItemId) {
    const item = activeClashItems.find(i => i.id === clashItemId);
    if (!item || !API) return;
    
    // Markeer het actieve item in de lijst
    document.querySelectorAll('.clash-item').forEach(el => el.classList.remove('active'));
    const activeEl = document.getElementById(`item-${clashItemId}`);
    if (activeEl) activeEl.classList.add('active');
    
    try {
        // GECORRIGEERD: Bouw de juiste ModelObjectIds structuur op
        const selectionData = [];
        
        if (item.sourceId1 && item.sourceId1.versionId && item.sourceId1.sourceId) {
            selectionData.push({
                modelId: item.sourceId1.versionId,
                objectIds: [item.sourceId1.sourceId]
            });
        }
        
        if (item.sourceId2 && item.sourceId2.versionId && item.sourceId2.sourceId) {
            selectionData.push({
                modelId: item.sourceId2.versionId,
                objectIds: [item.sourceId2.sourceId]
            });
        }

        // Selecteer specifiek de objecten, niet de hele modellen
        await API.viewer.setSelection(selectionData);

        // Isoleer de objecten (verberg de rest)
        await API.viewer.setObjectsVisibility([], true); 
        await API.viewer.setObjectsVisibility(selectionData, false); 

        // Camera focus toepassen indien coördinaten aanwezig zijn
        if (item.center) {
            await API.viewer.setCameraTarget(item.center.x, item.center.y, item.center.z);
            await API.viewer.setCameraDistance(3000);
        }
    } catch (e) { 
        console.error("Viewer error:", e); 
    }
}

// 5. Navigatie terug naar het overzicht
function backToSets() {
    document.getElementById('set-selection-area').classList.remove('hidden');
    document.getElementById('detail-area').classList.add('hidden');
}

// Start de extensie
init();