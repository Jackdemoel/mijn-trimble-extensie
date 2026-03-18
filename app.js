let API;
let accessToken = null;
let currentProjectId = null;
let activeClashItems = [];
const API_BASE_URL = "https://app21.connect.trimble.com/tc/api/2.0";

/**
 * Initialiseert de verbinding met Trimble Connect Workspace [cite: 28, 68]
 */
async function init() {
    try {
        API = await TrimbleConnectWorkspace.connect(window.parent, (event, data) => {
            console.log("Trimble Event:", event, data);
        });

        // Haal projectgegevens op bij start [cite: 52, 187]
        const project = await API.project.getCurrentProject();
        currentProjectId = project.id;
        document.getElementById('project-name').innerText = "Project: " + project.name;
    } catch (error) {
        console.error("Initialisatie fout:", error);
    }
}

/**
 * Hoofdactie: Token regelen en dan sets laden [cite: 71, 75]
 */
document.getElementById('btn-main-action').onclick = async () => {
    try {
        if (!accessToken) {
            const token = await API.extension.requestPermission("accesstoken");
            if (token && token !== "pending") {
                accessToken = token;
                loadClashSets();
            } else {
                console.log("Wachten op token toestemming...");
            }
        } else {
            loadClashSets();
        }
    } catch (err) {
        console.error("Token error:", err);
    }
};

/**
 * Haalt alle clashsets van het project op [cite: 718, 719]
 */
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
    } catch (err) {
        list.innerHTML = "Fout bij laden sets.";
    }
}

/**
 * Haalt individuele clash items op [cite: 729, 730]
 */
async function openClashSet(clashId) {
    document.getElementById('set-selection-area').classList.add('hidden');
    document.getElementById('detail-area').classList.remove('hidden');
    const list = document.getElementById('clash-items-list');
    list.innerHTML = "Clashes laden...";

    try {
        const response = await fetch(`${API_BASE_URL}/clashsets/${clashId}/items`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        activeClashItems = await response.json();
        renderFilteredItems();
    } catch (err) {
        list.innerHTML = "Fout bij laden items.";
    }
}

/**
 * Filtert en toont de clashes op basis van productnaam
 */
function renderFilteredItems() {
    const filterInput = document.getElementById('product-filter');
    const filterTxt = filterInput ? filterInput.value.toLowerCase() : "";
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

/**
 * Selecteert en isoleert de objecten in de 3D viewer [cite: 50, 90]
 */
async function focusClash(clashItemId) {
    const item = activeClashItems.find(i => i.id === clashItemId);
    if (!item || !API) return;

    // UI Visuele feedback
    document.querySelectorAll('.clash-item').forEach(el => el.classList.remove('active'));
    const element = document.getElementById(`item-${clashItemId}`);
    if (element) element.classList.add('active');

    try {
        // Gebruik de specifieke object-structuur die jij voorstelde
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

        // 1. Selectie uitvoeren
        await API.viewer.setSelection(selectionData);

        // 2. Isolatie: verberg de rest, toon selectie
        await API.viewer.setObjectsVisibility([], true); // Verberg alles
        await API.viewer.setObjectsVisibility(selectionData, false); // Toon deze objecten

        // 3. Camera focus op het botspunt [cite: 2562, 2563]
        if (item.center) {
            await API.viewer.setCameraTarget(item.center.x, item.center.y, item.center.z);
            await API.viewer.setCameraDistance(3000);
        }
    } catch (e) {
        console.error("Viewer error:", e);
    }
}

/**
 * Navigatie terug naar hoofdmenu
 */
function backToSets() {
    document.getElementById('set-selection-area').classList.remove('hidden');
    document.getElementById('detail-area').classList.add('hidden');
}

// Event listener voor het filter veld
const filterElem = document.getElementById('product-filter');
if (filterElem) {
    filterElem.oninput = renderFilteredItems;
}

// Start de boel
init();