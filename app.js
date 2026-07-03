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

// Export background color (matches the chart pane) used for both PNG and SVG.
const EXPORT_BG_COLOR = '#f8fafc';
const SVG_NS = 'http://www.w3.org/2000/svg';
const EXPORT_FONT = "'Plus Jakarta Sans','Outfit',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Helper: create a namespaced SVG element with attributes (and optional text).
function svgEl(tag, attrs, text) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (text != null) el.textContent = text;
    return el;
}

// Truncate text with an ellipsis so it fits inside maxWidth for the given font.
const _measureCtx = document.createElement('canvas').getContext('2d');
function fitText(text, cssFont, maxWidth) {
    _measureCtx.font = cssFont;
    if (_measureCtx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && _measureCtx.measureText(t + '…').width > maxWidth) {
        t = t.slice(0, -1);
    }
    return t + '…';
}

// Render one org-chart card using NATIVE SVG primitives (rect/image/text) rather
// than HTML in a <foreignObject>. foreignObject is only reliably rendered by
// Chromium — Preview/Quick Look, Safari, Illustrator, Figma, Inkscape and
// librsvg all drop or mangle it — so native shapes are what make the exported
// SVG portable across viewers. Appends the card into `group` (a <g class="node">
// positioned in the chart's coordinate space) and any clip defs into `defs`.
function renderNativeCard(group, defs, idx, rec, W, H, accent, base64Image) {
    const PAD = 16;
    const name = rec.name || 'Unknown Name';
    const role = rec.role || 'Staff Member';
    const department = rec.department || 'General';
    const reports = currentData.filter(item => item.parentId === rec.id).length;

    // Card background + rounded-corner clip (used to round the accent bar).
    const clipId = `cardclip-${idx}`;
    const clip = svgEl('clipPath', { id: clipId });
    clip.appendChild(svgEl('rect', { x: 0, y: 0, width: W, height: H, rx: 12, ry: 12 }));
    defs.appendChild(clip);

    group.appendChild(svgEl('rect', {
        x: 0.5, y: 0.5, width: W - 1, height: H - 1, rx: 12, ry: 12,
        fill: '#ffffff', stroke: '#e2e8f0', 'stroke-width': 1, filter: 'url(#cardShadow)'
    }));
    // Accent bar across the top, clipped to the card's rounded corners.
    group.appendChild(svgEl('rect', {
        x: 0, y: 0, width: W, height: 6, fill: accent, 'clip-path': `url(#${clipId})`
    }));

    // Avatar (48x48 circle) at the top-left of the header.
    const avX = PAD, avY = PAD + 4, avR = 24;
    const cx = avX + avR, cy = avY + avR;
    if (base64Image) {
        const avClipId = `avclip-${idx}`;
        const avClip = svgEl('clipPath', { id: avClipId });
        avClip.appendChild(svgEl('circle', { cx, cy, r: avR }));
        defs.appendChild(avClip);
        group.appendChild(svgEl('image', {
            x: avX, y: avY, width: 48, height: 48,
            href: base64Image, preserveAspectRatio: 'xMidYMid slice',
            'clip-path': `url(#${avClipId})`
        }));
        group.appendChild(svgEl('circle', { cx, cy, r: avR - 1, fill: 'none', stroke: '#ffffff', 'stroke-width': 2 }));
    } else {
        const initials = name.split(' ').map(n => n[0] || '').join('').substring(0, 2).toUpperCase();
        group.appendChild(svgEl('circle', { cx, cy, r: avR, fill: 'url(#initialsGrad)', stroke: '#ffffff', 'stroke-width': 2 }));
        group.appendChild(svgEl('text', {
            x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'central',
            'font-family': EXPORT_FONT, 'font-size': 16, 'font-weight': 600, fill: '#475569'
        }, initials));
    }

    // Name + role, to the right of the avatar.
    const textX = avX + 48 + 12;
    const textMaxW = W - textX - PAD;
    group.appendChild(svgEl('text', {
        x: textX, y: cy - 4, 'font-family': EXPORT_FONT, 'font-size': 14, 'font-weight': 600, fill: '#0f172a'
    }, fitText(name, `600 14px ${EXPORT_FONT}`, textMaxW)));
    group.appendChild(svgEl('text', {
        x: textX, y: cy + 12, 'font-family': EXPORT_FONT, 'font-size': 11, 'font-weight': 500, fill: '#475569'
    }, fitText(role, `500 11px ${EXPORT_FONT}`, textMaxW)));

    // Footer: top divider, department chip (left), reports count (right).
    const lineY = H - 34;
    const chipCY = H - 20;
    group.appendChild(svgEl('line', { x1: PAD, y1: lineY, x2: W - PAD, y2: lineY, stroke: '#f1f5f9', 'stroke-width': 1 }));

    const deptText = department.toUpperCase();
    _measureCtx.font = `600 10px ${EXPORT_FONT}`;
    const chipW = Math.ceil(_measureCtx.measureText(deptText).width) + 16;
    group.appendChild(svgEl('rect', { x: PAD, y: chipCY - 9, width: chipW, height: 18, rx: 4, ry: 4, fill: '#f1f5f9' }));
    group.appendChild(svgEl('text', {
        x: PAD + 8, y: chipCY, 'dominant-baseline': 'central',
        'font-family': EXPORT_FONT, 'font-size': 10, 'font-weight': 600, fill: '#475569',
        'letter-spacing': 0.3
    }, deptText));

    if (reports > 0) {
        const reportsStr = reports === 1 ? '1 Report' : `${reports} Reports`;
        group.appendChild(svgEl('text', {
            x: W - PAD, y: chipCY, 'text-anchor': 'end', 'dominant-baseline': 'central',
            'font-family': EXPORT_FONT, 'font-size': 10, 'font-weight': 500, fill: '#475569'
        }, reportsStr));
    }
}

// Build a fully self-contained, PORTABLE SVG string of the ENTIRE chart. Each
// node is redrawn with native SVG primitives and avatars are embedded as Base64,
// so the file renders identically in any viewer (not just Chromium). Shared by
// both the SVG and PNG exports so they always match the on-screen chart.
async function buildExportSVG() {
    const svgElement = document.querySelector('#chart-container svg');
    if (!svgElement) throw new Error("Chart SVG element not found");

    // d3-org-chart applies pan/zoom to the top-level <g class="chart"> group.
    // Measure the untransformed bounding box of ALL content so the export covers
    // the whole tree regardless of the current zoom/scroll position on screen.
    const contentGroup = svgElement.querySelector('g.chart') || svgElement.querySelector('g');
    if (!contentGroup) throw new Error("Chart content group not found");
    const bbox = contentGroup.getBBox();

    const PAD = 40;
    const width = Math.ceil(bbox.width + PAD * 2);
    const height = Math.ceil(bbox.height + PAD * 2);

    // Clone so we never mutate the live chart.
    const svgClone = svgElement.cloneNode(true);
    svgClone.setAttribute('xmlns', SVG_NS);
    svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    svgClone.setAttribute('width', width);
    svgClone.setAttribute('height', height);
    svgClone.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svgClone.removeAttribute('font-family');
    svgClone.style.removeProperty('width');
    svgClone.style.removeProperty('height');

    // Normalize the content transform so the top-left of the tree sits at (PAD, PAD).
    const clonedGroup = svgClone.querySelector('g.chart') || svgClone.querySelector('g');
    clonedGroup.setAttribute('transform', `translate(${PAD - bbox.x}, ${PAD - bbox.y})`);

    // Strip interactive UI chrome (expand/collapse buttons).
    svgClone.querySelectorAll('.node-button-g, .node-button-foreign-object').forEach(el => el.remove());

    // Shared defs: soft card shadow + the initials-avatar gradient.
    const defs = svgEl('defs', {});
    const shadow = svgEl('filter', { id: 'cardShadow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    shadow.appendChild(svgEl('feDropShadow', { dx: 0, dy: 6, stdDeviation: 6, 'flood-color': '#000000', 'flood-opacity': 0.06 }));
    defs.appendChild(shadow);
    const grad = svgEl('linearGradient', { id: 'initialsGrad', x1: 0, y1: 0, x2: 1, y2: 1 });
    grad.appendChild(svgEl('stop', { offset: '0%', 'stop-color': '#e2e8f0' }));
    grad.appendChild(svgEl('stop', { offset: '100%', 'stop-color': '#cbd5e1' }));
    defs.appendChild(grad);

    // Recolor the connector links (d3-org-chart draws them as native <path>s).
    svgClone.querySelectorAll('path.link').forEach(p => {
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', '#cbd5e1');
        p.setAttribute('stroke-width', 2);
        p.removeAttribute('display');
    });

    // Redraw each node with native primitives. Live and cloned node lists share
    // the same order, so we read data/positions from the live node and mutate the
    // matching clone. Avatar images are converted to Base64 up front.
    const liveNodes = svgElement.querySelectorAll('g.node');
    const cloneNodes = svgClone.querySelectorAll('g.node');
    const cards = await Promise.all(Array.from(liveNodes).map(async (liveNode) => {
        const datum = d3.select(liveNode).datum() || {};
        const rec = datum.data || {};
        const rect = liveNode.querySelector('.node-rect');
        const W = rect ? parseFloat(rect.getAttribute('width')) : 260;
        const H = rect ? parseFloat(rect.getAttribute('height')) : 110;
        const imgEl = liveNode.querySelector('img');
        const base64Image = imgEl ? await urlToBase64(imgEl.src) : '';
        return { rec, W, H, base64Image };
    }));

    cloneNodes.forEach((cloneNode, idx) => {
        // Remove the HTML-based content; keep the <g> and its positioning transform.
        cloneNode.querySelectorAll('foreignObject, .node-rect').forEach(el => el.remove());
        cloneNode.removeAttribute('style');
        const { rec, W, H, base64Image } = cards[idx];
        renderNativeCard(cloneNode, defs, idx, rec, W, H, currentThemeAccent, base64Image);
    });

    svgClone.insertBefore(defs, svgClone.firstChild);

    // Solid background rect so the exported chart isn't transparent.
    svgClone.insertBefore(svgEl('rect', { x: 0, y: 0, width, height, fill: EXPORT_BG_COLOR }), svgClone.firstChild);

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svgClone);
    if (!svgString.startsWith('<?xml')) {
        svgString = '<?xml version="1.0" standalone="no"?>\r\n' + svgString;
    }

    return { svgString, width, height };
}

// Export Commands
async function exportPNG() {
    if (!chart) return;
    const scale = parseInt(document.getElementById('export-scale').value) || 2;

    const exportBtn = document.querySelector('button[onclick="exportPNG()"]');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting PNG...';
    exportBtn.disabled = true;

    try {
        const { svgString, width, height } = await buildExportSVG();

        // Rasterize the self-contained SVG onto a canvas at the chosen scale.
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = Math.max(1, Math.round(width * scale));
                    canvas.height = Math.max(1, Math.round(height * scale));
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = EXPORT_BG_COLOR;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        if (!blob) { reject(new Error("Canvas could not be encoded to PNG")); return; }
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.download = `org-chart-${new Date().toISOString().slice(0, 10)}.png`;
                        link.href = url;
                        link.click();
                        URL.revokeObjectURL(url);
                        resolve();
                    }, 'image/png');
                } catch (err) {
                    reject(err);
                }
            };
            img.onerror = () => reject(new Error("Failed to render chart SVG for rasterization"));
            img.src = dataUrl;
        });
    } catch (err) {
        console.error("PNG Export failed:", err);
        alert("PNG Export failed: " + err.message);
    } finally {
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
    }
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
        const { svgString } = await buildExportSVG();

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
