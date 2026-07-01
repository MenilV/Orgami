// Error Boundary Logger
window.onerror = function(message, source, lineno, colno, error) {
    const banner = document.getElementById('error-boundary-banner');
    const msgEl = document.getElementById('error-boundary-msg');
    if (banner && msgEl) {
        msgEl.innerText = `Runtime Error: ${message} (at ${source}:${lineno}:${colno})`;
        banner.style.display = 'flex';
    }
    console.error(error);
    return false;
};

// Check for script loading issues
function checkDependencies() {
    if (typeof d3 === 'undefined') {
        throw new Error("D3.js library failed to load. Check your internet connection or CDN accessibility.");
    }
    if (typeof d3.OrgChart === 'undefined') {
        throw new Error("d3-org-chart library failed to load. Check your internet connection.");
    }
}

// Sanitize and Normalize Data Types
function sanitizeData(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(node => {
        let parentId = "";
        if (node.parentId !== undefined && node.parentId !== null && node.parentId !== "") {
            parentId = String(node.parentId).trim();
        }
        return {
            ...node,
            id: node.id !== undefined && node.id !== null ? String(node.id).trim() : Math.random().toString(36).substr(2, 9),
            parentId: parentId,
            name: node.name !== undefined && node.name !== null ? String(node.name).trim() : "Unknown Name",
            role: node.role !== undefined && node.role !== null ? String(node.role).trim() : "Staff Member",
            department: node.department !== undefined && node.department !== null ? String(node.department).trim() : "General",
            imageUrl: node.imageUrl !== undefined && node.imageUrl !== null ? String(node.imageUrl).trim() : ""
        };
    });
}

// Resolve Proxy URL for Cross-Origin Images (to prevent Canvas Tainting during Export)
function getProxyUrl(url) {
    if (!url) return "";
    if (url.startsWith('http://') || url.startsWith('https://')) {
        // Skip if already proxied or is same origin
        if (url.includes('/proxy?url=')) return url;
        const currentOrigin = window.location.origin;
        if (url.startsWith(currentOrigin)) return url;
        
        return `/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
}

// Default Sample Org Data
const DEFAULT_DATA = [
    {
        "id": "1",
        "parentId": "",
        "name": "Sarah Jenkins",
        "role": "Chief Executive Officer",
        "department": "Executive",
        "imageUrl": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop"
    },
    {
        "id": "2",
        "parentId": "1",
        "name": "Marcus Vance",
        "role": "VP of Engineering",
        "department": "Engineering",
        "imageUrl": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop"
    },
    {
        "id": "3",
        "parentId": "1",
        "name": "Elena Rostova",
        "role": "VP of Product & Design",
        "department": "Product",
        "imageUrl": "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=150&auto=format&fit=crop"
    },
    {
        "id": "4",
        "parentId": "1",
        "name": "David Kim",
        "role": "Chief Financial Officer",
        "department": "Finance",
        "imageUrl": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop"
    },
    {
        "id": "5",
        "parentId": "2",
        "name": "Lina Zhang",
        "role": "DevOps Manager",
        "department": "Engineering",
        "imageUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop"
    },
    {
        "id": "6",
        "parentId": "2",
        "name": "Alex Mercer",
        "role": "Senior Frontend Engineer",
        "department": "Engineering",
        "imageUrl": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=150&auto=format&fit=crop"
    },
    {
        "id": "7",
        "parentId": "3",
        "name": "Oliver Twist",
        "role": "Senior UI/UX Designer",
        "department": "Product",
        "imageUrl": ""
    },
    {
        "id": "8",
        "parentId": "3",
        "name": "Sofia Loren",
        "role": "Product Manager",
        "department": "Product",
        "imageUrl": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop"
    }
];

// Global State
let chart = null;
let currentData = [];
let currentThemeAccent = '#4f46e5';
let expandAllState = false;

// DOM Elements
const jsonInput = document.getElementById('json-input');
const jsonStatus = document.getElementById('json-status');
const searchInput = document.getElementById('search-input');
const emptyState = document.getElementById('empty-state');
const chartContainer = document.getElementById('chart-container');
const nodeWidthInput = document.getElementById('node-width');
const nodeWidthVal = document.getElementById('node-width-val');

// Init App
window.addEventListener('DOMContentLoaded', () => {
    // Validate libs
    try {
        checkDependencies();
    } catch (err) {
        window.onerror(err.message, 'app.js', 20, 0, err);
        return;
    }

    // Load from LocalStorage or use default
    const savedData = localStorage.getItem('org_chart_data');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            if (Array.isArray(parsed)) {
                currentData = sanitizeData(parsed);
                jsonInput.value = JSON.stringify(currentData, null, 4);
            } else {
                throw new Error("Stored data is not a valid array");
            }
        } catch (e) {
            currentData = sanitizeData(DEFAULT_DATA);
            jsonInput.value = JSON.stringify(currentData, null, 4);
            localStorage.setItem('org_chart_data', JSON.stringify(currentData));
        }
    } else {
        currentData = sanitizeData(DEFAULT_DATA);
        jsonInput.value = JSON.stringify(currentData, null, 4);
    }
    
    // Initial UI settings load
    const savedTheme = localStorage.getItem('org_chart_theme');
    if (savedTheme) {
        currentThemeAccent = savedTheme;
        document.documentElement.style.setProperty('--primary-color', savedTheme);
        // Set active dot
        const dots = document.querySelectorAll('.theme-dot');
        dots.forEach(dot => {
            if (dot.style.backgroundColor === savedTheme || rgbToHex(dot.style.backgroundColor) === savedTheme) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // Bind event listeners
    jsonInput.addEventListener('input', handleJSONInput);

    // Initialize Chart
    initChart();
});

// Convert RGB from CSS style to Hex format
function rgbToHex(rgb) {
    if (!rgb) return '';
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;
    function hex(x) {
        return ("0" + parseInt(x).toString(16)).slice(-2);
    }
    return "#" + hex(match[1]) + hex(match[2]) + hex(match[3]);
}

// Switch Sidebar Tabs
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.getElementById(`tab-${tabId}`).classList.add('active');
    document.getElementById(`content-${tabId}`).classList.add('active');
}

// Handle JSON input modifications
function handleJSONInput() {
    const rawVal = jsonInput.value.trim();
    if (!rawVal) {
        setJSONStatus(false, 'Empty Data');
        showEmptyState(true);
        return;
    }

    try {
        const parsed = JSON.parse(rawVal);
        if (!Array.isArray(parsed)) {
            setJSONStatus(false, 'Must be a JSON Array');
            return;
        }

        // Basic validation of fields
        const valid = parsed.every(node => node.hasOwnProperty('id') && node.hasOwnProperty('parentId'));
        if (!valid) {
            setJSONStatus(false, 'Objects must contain "id" and "parentId"');
            return;
        }

        // Save & Render
        setJSONStatus(true);
        showEmptyState(false);
        currentData = sanitizeData(parsed);
        localStorage.setItem('org_chart_data', JSON.stringify(currentData));
        
        // Re-render chart
        renderChart();
    } catch (err) {
        setJSONStatus(false, `Invalid JSON Syntax: ${err.message}`);
    }
}

// Set JSON valid / invalid status message
function setJSONStatus(isValid, errMsg = '') {
    if (isValid) {
        jsonStatus.className = 'status-indicator valid';
        jsonStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Valid JSON';
    } else {
        jsonStatus.className = 'status-indicator invalid';
        jsonStatus.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${errMsg}`;
    }
}

function showEmptyState(show) {
    if (show) {
        emptyState.style.display = 'block';
        chartContainer.style.visibility = 'hidden';
    } else {
        emptyState.style.display = 'none';
        chartContainer.style.visibility = 'visible';
    }
}

// JSON Editor Toolbar Options
function formatJSON() {
    try {
        const parsed = JSON.parse(jsonInput.value);
        jsonInput.value = JSON.stringify(parsed, null, 4);
        setJSONStatus(true);
    } catch (e) {
        // Leave unformatted if invalid
    }
}

function resetToSample() {
    if (confirm('Are you sure you want to reset to sample organizational data? This will overwrite your current changes.')) {
        currentData = DEFAULT_DATA;
        jsonInput.value = JSON.stringify(DEFAULT_DATA, null, 4);
        localStorage.setItem('org_chart_data', JSON.stringify(DEFAULT_DATA));
        setJSONStatus(true);
        showEmptyState(false);
        renderChart();
    }
}

// Import / Export JSON Files
function triggerFileInput() {
    document.getElementById('file-input').click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        jsonInput.value = e.target.result;
        handleJSONInput();
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
}

function exportJSONFile() {
    const blob = new Blob([JSON.stringify(currentData, null, 4)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `company-org-chart-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Config Panel Updates
function updateConfig() {
    const nodeWidth = parseInt(nodeWidthInput.value);
    nodeWidthVal.textContent = `${nodeWidth}px`;
    
    if (chart) {
        const orientation = document.querySelector('input[name="orientation"]:checked').value;
        chart.compact(false) // Disable compact layout to keep it clean and readable
             .nodeWidth(() => nodeWidth)
             .layout(orientation);
             
        renderChart();
    }
}

function changeTheme(color, btnEl) {
    currentThemeAccent = color;
    document.documentElement.style.setProperty('--primary-color', color);
    localStorage.setItem('org_chart_theme', color);
    
    document.querySelectorAll('.theme-dot').forEach(dot => dot.classList.remove('active'));
    btnEl.classList.add('active');
    
    renderChart();
}

// Initialize D3 Org Chart
function initChart() {
    const orientation = document.querySelector('input[name="orientation"]:checked').value;
    const nodeWidth = parseInt(nodeWidthInput.value);
    
    chart = new d3.OrgChart()
        .container('#chart-container')
        .nodeWidth(() => nodeWidth)
        .nodeHeight(() => 110)
        .layout(orientation)
        .compact(false)
        .initialExpandLevel(99)
        .nodeButtonHeight(20)
        .nodeButtonWidth(20)
        .buttonContent(({ node }) => {
            return `<div class="node-button-div"><i class="fa-solid ${node.children ? 'fa-chevron-up' : 'fa-chevron-down'}"></i></div>`;
        })
        .nodeContent(function(d, i, arr, state) {
            try {
                const dataObj = d.data;
                const name = dataObj.name || 'Unknown Name';
                const role = dataObj.role || 'Staff Member';
                const department = dataObj.department || 'General';
                
                // Calculate direct reports from dataset
                const directReports = currentData.filter(item => item.parentId === dataObj.id).length;
                const reportsStr = directReports === 1 ? '1 Report' : `${directReports} Reports`;
                
                // Set initials for avatars if no image URL is provided
                const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                const proxyUrl = getProxyUrl(dataObj.imageUrl);
                const avatarHtml = proxyUrl 
                    ? `<img class="node-avatar" crossorigin="anonymous" src="${proxyUrl}" alt="${name}"/>` 
                    : `<div class="node-initials">${initials}</div>`;
                    
                // Accent border style
                const borderAccent = `background-color: ${currentThemeAccent}`;

                return `
                    <div class="custom-node">
                        <div class="node-accent" style="${borderAccent}"></div>
                        <div class="node-header">
                            <div class="node-avatar-container">
                                ${avatarHtml}
                            </div>
                            <div class="node-details">
                                <div class="node-name">${name}</div>
                                <div class="node-role">${role}</div>
                            </div>
                        </div>
                        <div class="node-footer">
                            <div class="node-dept">${department}</div>
                            ${directReports > 0 ? `
                                <div class="node-reports">
                                    <i class="fa-solid fa-users"></i>
                                    <span>${reportsStr}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            } catch (err) {
                console.error("Error rendering node:", err, d);
                return `
                    <div class="custom-node" style="border: 2px solid #ef4444; background-color: #fef2f2; height: 110px;">
                        <div class="node-accent" style="background-color: #ef4444"></div>
                        <div style="color: #991b1b; padding: 4px;">
                            <div style="font-weight: bold; font-size: 12px; margin-bottom: 2px;">
                                <i class="fa-solid fa-triangle-exclamation"></i> Card Render Error
                            </div>
                            <div style="font-size: 10px; font-family: monospace; line-height: 1.2;">
                                ${err.message}<br/>
                                ID: ${d.data ? d.data.id : 'N/A'}
                            </div>
                        </div>
                    </div>
                `;
            }
        });

    renderChart();
}

// Render chart with latest data
function renderChart() {
    if (!chart || currentData.length === 0) return;
    
    chart.data(currentData)
         .render()
         .expandAll()
         .fit();
}

// Floating Panel Controls
function zoomIn() {
    if (chart) chart.zoomIn();
}

function zoomOut() {
    if (chart) chart.zoomOut();
}

function fitChart() {
    if (chart) chart.fit();
}

function toggleExpandAll() {
    if (!chart) return;
    const btn = document.getElementById('expand-all-btn');
    expandAllState = !expandAllState;
    
    if (expandAllState) {
        chart.expandAll().fit();
        btn.innerHTML = '<i class="fa-solid fa-minus-square"></i>';
        btn.title = "Collapse All";
    } else {
        chart.collapseAll().fit();
        btn.innerHTML = '<i class="fa-solid fa-network-wired"></i>';
        btn.title = "Expand All";
    }
}

function handleSearch(val) {
    if (!chart || !val) {
        chart.clearHighlighting();
        return;
    }
    
    const searchVal = val.toLowerCase();
    const matches = currentData.filter(node => 
        (node.name && node.name.toLowerCase().includes(searchVal)) || 
        (node.role && node.role.toLowerCase().includes(searchVal)) ||
        (node.department && node.department.toLowerCase().includes(searchVal))
    );
    
    if (matches.length > 0) {
        // Highlight matching nodes
        chart.clearHighlighting();
        matches.forEach(node => chart.setUpToTheRootHighlighted(node.id));
        // Center on the first match
        chart.fit({
            nodes: matches.map(n => n.id),
            animate: true
        });
    } else {
        chart.clearHighlighting();
    }
}

// Export Commands
function exportPNG() {
    if (!chart) return;
    const scale = parseInt(document.getElementById('export-scale').value);
    
    // Smooth loading indicator during canvas rendering
    const exportBtn = document.querySelector('button[onclick="exportPNG()"]');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting PNG...';
    exportBtn.disabled = true;

    // Reset zoom before export to capture everything cleanly
    chart.fit();
    
    // Let layout transition settle, then trigger D3 native export
    setTimeout(() => {
        try {
            chart.exportImg({
                full: true,
                scale: scale,
                backgroundColor: '#f8fafc',
                onLoad: () => {
                    exportBtn.innerHTML = originalText;
                    exportBtn.disabled = false;
                }
            });
        } catch (err) {
            console.error("PNG Export failed:", err);
            alert("PNG Export failed: " + err.message);
            exportBtn.innerHTML = originalText;
            exportBtn.disabled = false;
        }

        // Safety fallback: re-enable button after 3 seconds in case onLoad is not fired by this version of the library
        setTimeout(() => {
            if (exportBtn.disabled) {
                exportBtn.innerHTML = originalText;
                exportBtn.disabled = false;
            }
        }, 3000);
    }, 500);
}

// Convert Image URL to Base64 (CORS compliant)
function urlToBase64(url) {
    return new Promise((resolve) => {
        if (!url) {
            resolve("");
            return;
        }
        if (url.startsWith('data:')) {
            resolve(url);
            return;
        }
        
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = function() {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } catch (err) {
                resolve(url); // fallback to original
            }
        };
        img.onerror = function() {
            resolve(url); // fallback to original
        };
        img.src = url;
    });
}

// Export SVG Vector File (Self-Contained with Base64 Images and Styles)
async function exportSVG() {
    if (!chart) return;
    
    const exportBtn = document.querySelector('button[onclick="exportSVG()"]');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting SVG...';
    exportBtn.disabled = true;

    try {
        const svgElement = document.querySelector('#chart-container svg');
        if (!svgElement) throw new Error("SVG element not found");

        // Clone the SVG
        const svgClone = svgElement.cloneNode(true);

        // Inline critical styles inside the SVG clone so it renders styled on its own
        const customStyles = `
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
            @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
            
            .custom-node {
                box-sizing: border-box;
                font-family: 'Plus Jakarta Sans', sans-serif;
                width: 100%;
                height: 100%;
                background-color: #ffffff;
                border-radius: 12px;
                border: 1px solid #e2e8f0;
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05);
                display: flex;
                flex-direction: column;
                padding: 16px;
                position: relative;
            }
            .node-accent {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 6px;
                border-radius: 12px 12px 0 0;
            }
            .node-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-top: 4px;
            }
            .node-avatar-container {
                position: relative;
            }
            .node-avatar {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid #ffffff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .node-initials {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
                color: #475569;
                font-weight: 600;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid #ffffff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .node-details {
                display: flex;
                flex-direction: column;
                min-width: 0;
            }
            .node-name {
                font-size: 14px;
                font-weight: 600;
                color: #0f172a;
            }
            .node-role {
                font-size: 11px;
                color: #475569;
                font-weight: 500;
            }
            .node-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: auto;
                padding-top: 10px;
                border-top: 1px solid #f1f5f9;
            }
            .node-dept {
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                padding: 2px 8px;
                border-radius: 4px;
                background-color: #f1f5f9;
                color: #475569;
            }
            .node-reports {
                font-size: 10px;
                color: #475569;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            .link {
                stroke: #cbd5e1 !important;
                stroke-width: 2px !important;
            }
        `;
        
        const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleElement.textContent = customStyles;
        svgClone.insertBefore(styleElement, svgClone.firstChild);

        // Find all <img> tags inside foreignObjects and convert them to Base64 URLs
        const images = svgClone.querySelectorAll('img');
        const conversionPromises = Array.from(images).map(async (img) => {
            const base64 = await urlToBase64(img.src);
            img.src = base64;
        });
        await Promise.all(conversionPromises);

        // Serialize the SVG clone
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svgClone);
        if (!svgString.startsWith('<?xml')) {
            svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;
        }

        // Trigger file download
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `org-chart-${new Date().toISOString().slice(0, 10)}.svg`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error("SVG Export failed:", err);
        alert("SVG Export failed: " + err.message);
    } finally {
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
    }
}
