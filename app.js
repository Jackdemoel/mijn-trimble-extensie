let API;
let accessToken = null;
let currentProjectId = null;
let activeClashItems = [];
const API_BASE_URL = "https://app21.connect.trimble.com/tc/api/2.0";

async function init() {
    try {
        // Maak verbinding met Trimble Connect [cite: 28, 68]
        API = await TrimbleConnectWorkspace.connect(window.parent, (event, args) => {
            console.log("Event van Viewer:", event, args);
            // Optioneel: reageer direct op camera veranderingen die we in de logs zagen
        });

        // Projectgegevens ophalen [cite: 53, 187]
        const project = await API.project.getCurrentProject();
        currentProjectId = project.id;
        const label = document.getElementById('project-label');
        if (label) label.innerText = project.name.toUpperCase();
        
        console.log("Systeem gereed. Project ID:", currentProjectId);
    } catch (error) {
        console.error("Initialisatie fout:", error);
    }
}

// Hoofdactie knop
const mainBtn = document.getElementById('btn-main-action');
if (mainBtn) {
    mainBtn.onclick = async () => {
        try {
            if (!accessToken) {
                // Vraag toestemming voor token [cite: 71, 198]
                accessToken = await API.extension.requestPermission("accesstoken");
                if (accessToken === "pending") return; 
            }
            loadClashSets();
        } catch (err) {
            console.error("Fout bij ophalen token/sets:", err);
        }
    };
}

async function loadClashSets() {
    const container = document.getElementById('content-area');
    if (!container) return;
    
    container.innerHTML = "Laden...";
    try {
        const response = await fetch(`${API_BASE_URL}/clashsets?projectId=${currentProjectId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const sets = await response.json();
        
        container.innerHTML = sets.map(s => `
            <div style="border:1px solid #ddd; padding:10px; margin-bottom:5px; cursor:pointer; border-left: 4px solid #333;" onclick="openClashSet('${s.id}')">
                <strong style="font-size:13px;">${s.name}</strong><br>
                <small>${s.count} clashes</small>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = "Fout bij laden van clashsets.";
    }
}

async function openClashSet(clashId) {
    const setArea = document.getElementById('set-selection-area');
    const detailArea = document.getElementById('detail-area');
    const list = document.getElementById('clash-items-list');

    if (setArea) setArea.classList.add('hidden');
    if (detailArea) detailArea.classList.remove('hidden');
    if (list) list.innerHTML = "Items ophalen...";

    try {
        const response = await fetch(`${API_BASE_URL}/clashsets/${clashId}/items`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        activeClashItems = await response.json();
        renderFilteredItems();
    } catch (err) {
        if (list) list.innerHTML = "Fout bij ophalen items.";
    }
}

function renderFilteredItems() {
    const filterInput = document.getElementById('product-filter');
    const filterTxt = filterInput ? filterInput.value.toLowerCase() : "";
    const list = document.getElementById('clash-items-list');
    if (!list) return;

    const filtered = activeClashItems.filter(i => 
        (i.elementName1 && i.elementName1.toLowerCase().includes(filterTxt)) || 
        (i.elementName2 && i.elementName2.toLowerCase().includes(filterTxt))
    );

    list.innerHTML = filtered.map(i => `
        <div class="clash-item" id="item-${i.id}" onclick="focusClash('${i.id}')" style="border-bottom:1px solid #eee; padding:10px; cursor:pointer;">
            <span style="font-weight:bold; color:#0078d4;">${i.label}</span><br>
            <span style="font-size:11px; color:#666;">A: ${i.elementName1}</span><br>
            <span style="font-size:11px; color:#666;">B: ${i.elementName2}</span>
        </div>
    `).join('');
}

async function focusClash(clashItemId) {
    const item = activeClashItems.find(i => i.id === clashItemId);
    if (!item || !API) return;

    try {
        const selectionData = [];
        if (item.sourceId1) {
            selectionData.push({ modelId: item.sourceId1.versionId, objectIds: [item.sourceId1.sourceId] });
        }
        if (item.sourceId2) {
            selectionData.push({ modelId: item.sourceId2.versionId, objectIds: [item.sourceId2.sourceId] });
        }

        // Voer de acties uit in de viewer
        await API.viewer.setSelection(selectionData);
        await API.viewer.setObjectsVisibility([], true); // Verberg rest
        await API.viewer.setObjectsVisibility(selectionData, false); // Toon selectie

        if (item.center) {
            // Gebruik de center data uit de API [cite: 730, 2562]
            await API.viewer.setCameraTarget(item.center.x, item.center.y, item.center.z);
            await API.viewer.setCameraDistance(2000);
        }
    } catch (e) {
        console.error("Viewer error bij focussen:", e);
    }
}

function backToSets() {
    const setArea = document.getElementById('set-selection-area');
    const detailArea = document.getElementById('detail-area');
    if (setArea) setArea.classList.remove('hidden');
    if (detailArea) detailArea.classList.add('hidden');
}

// Initialisatie starten
init();