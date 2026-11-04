'use strict';

// ========== CANVAS SETUP ==========
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
var center = 200;    // center of 400x400 canvas
var R_PX   = 150;    // how many pixels = R on canvas

// ========== Y AND R RADIO BUTTONS ==========
var Y_VALUES = [-3, -2, -1, 0, 1, 2, 3, 4, 5];
var R_VALUES = [1, 1.5, 2, 2.5, 3];

// Build Y radio buttons
var yContainer = document.getElementById('y-radios');
Y_VALUES.forEach(function(val) {
    var label = document.createElement('label');
    var input = document.createElement('input');
    input.type = 'radio';
    input.name = 'y';
    input.value = val;
    var span = document.createElement('span');
    span.textContent = val;
    label.appendChild(input);
    label.appendChild(span);
    yContainer.appendChild(label);
});

// Build R radio buttons
var rContainer = document.getElementById('r-radios');
R_VALUES.forEach(function(val) {
    var label = document.createElement('label');
    var input = document.createElement('input');
    input.type = 'radio';
    input.name = 'r';
    input.value = val;
    var span = document.createElement('span');
    span.textContent = val;
    label.appendChild(input);
    label.appendChild(span);
    rContainer.appendChild(label);

    // Redraw region when R changes
    input.addEventListener('change', function() {
        redraw();
    });
});

// ========== VALIDATION ==========
var X_MIN = -5;
var X_MAX = 5;

function parseX(text) {
    var cleaned = text.trim().replace(',', '.');
    if (!/^-?(0|[1-9]\d*)(\.\d+)?$/.test(cleaned)) return null;
    var x = Number(cleaned);
    if (x <= X_MIN || x >= X_MAX) return null;
    return cleaned;
}

// ========== HIT CHECK (client-side, for drawing points) ==========
function isHit(x, y, r) {
    // Rectangle in Q2: x ∈ [-R/2, 0], y ∈ [0, R]
    var inRect = (x >= -r / 2 && x <= 0 && y >= 0 && y <= r);
    // Quarter circle in Q3: x ≤ 0, y ≤ 0, x²+y² ≤ R²
    var inCircle = (x <= 0 && y <= 0 && x * x + y * y <= r * r);
    // Triangle in Q4: vertices (0,0), (R/2,0), (0,-R)
    var inTriangle = (x >= 0 && y <= 0 && y >= 2 * x - r);
    return inRect || inCircle || inTriangle;
}

// ========== CANVAS DRAWING ==========
function drawArea(r) {
    var scale = R_PX / r;
    ctx.fillStyle = 'rgba(30, 100, 220, 0.25)';
    ctx.strokeStyle = 'rgba(30, 100, 220, 0.6)';
    ctx.lineWidth = 1.5;

    // Rectangle in Q2: (-R/2, 0) to (0, R)
    ctx.beginPath();
    ctx.rect(
        center - (r / 2) * scale,        // x
        center - r * scale,              // y (canvas: top)
        (r / 2) * scale,                 // width
        r * scale                        // height
    );
    ctx.fill();
    ctx.stroke();

    // Quarter circle in Q3
    ctx.beginPath();
    ctx.moveTo(center, center);                        // origin
    ctx.lineTo(center - r * scale, center);            // (-R, 0)
    ctx.arc(center, center, r * scale, Math.PI, Math.PI / 2, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Triangle in Q4: (0,0) → (R/2, 0) → (0, -R)
    ctx.beginPath();
    ctx.moveTo(center, center);                        // (0, 0)
    ctx.lineTo(center + (r / 2) * scale, center);     // (R/2, 0)
    ctx.lineTo(center, center + r * scale);            // (0, -R)
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawAxes() {
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.font = '11px Arial';
    ctx.fillStyle = '#333';

    // X axis
    ctx.beginPath();
    ctx.moveTo(0, center);
    ctx.lineTo(400, center);
    ctx.stroke();
    // Arrow
    ctx.beginPath();
    ctx.moveTo(395, center - 4);
    ctx.lineTo(400, center);
    ctx.lineTo(395, center + 4);
    ctx.stroke();
    ctx.fillText('x', 388, center - 8);

    // Y axis
    ctx.beginPath();
    ctx.moveTo(center, 400);
    ctx.lineTo(center, 0);
    ctx.stroke();
    // Arrow
    ctx.beginPath();
    ctx.moveTo(center - 4, 5);
    ctx.lineTo(center, 0);
    ctx.lineTo(center + 4, 5);
    ctx.stroke();
    ctx.fillText('y', center + 8, 12);
}

function drawLabels(r) {
    var scale = R_PX / r;
    ctx.fillStyle = '#555';
    ctx.font = '10px Arial';

    var labels = [
        { text: 'R',    px: center + r * scale,       py: center + 14 },
        { text: 'R/2',  px: center + (r/2) * scale,   py: center + 14 },
        { text: '-R',   px: center - r * scale - 12,  py: center + 14 },
        { text: '-R/2', px: center - (r/2) * scale - 16, py: center + 14 },
        { text: 'R',    px: center + 6,   py: center - r * scale + 4 },
        { text: 'R/2',  px: center + 6,   py: center - (r/2) * scale + 4 },
        { text: '-R',   px: center + 6,   py: center + r * scale + 12 },
        { text: '-R/2', px: center + 6,   py: center + (r/2) * scale + 12 }
    ];

    labels.forEach(function(l) {
        ctx.fillText(l.text, l.px, l.py);
    });

    // Tick marks
    var ticks = [r, r/2, -r, -r/2];
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 0.5;
    ticks.forEach(function(val) {
        var px = center + val * scale;
        ctx.beginPath(); ctx.moveTo(px, center - 3); ctx.lineTo(px, center + 3); ctx.stroke();
        var py = center - val * scale;
        ctx.beginPath(); ctx.moveTo(center - 3, py); ctx.lineTo(center + 3, py); ctx.stroke();
    });
}

// ========== DRAW POINTS ==========
var results = []; // stored results from server

function drawPoint(item) {
    var r = Number(item.r);
    var scale = R_PX / r;
    var px = center + Number(item.x) * scale;
    var py = center - Number(item.y) * scale;
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, 2 * Math.PI);
    ctx.fillStyle = item.hit ? 'lime' : 'red';
    ctx.fill();
    ctx.strokeStyle = item.hit ? '#090' : '#900';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawPoints() {
    results.forEach(drawPoint);
}

function redraw() {
    ctx.clearRect(0, 0, 400, 400);
    var rInput = document.querySelector('input[name="r"]:checked');
    var r = rInput ? Number(rInput.value) : 2;
    drawArea(r);
    drawAxes();
    drawLabels(r);
    drawPoints();
}

// ========== TABLE ==========
function renderTable() {
    var tbody = document.querySelector('#results-table tbody');
    tbody.innerHTML = '';
    results.forEach(function(item) {
        var tr = document.createElement('tr');

        var tdX = document.createElement('td');
        tdX.textContent = item.x;
        tr.appendChild(tdX);

        var tdY = document.createElement('td');
        tdY.textContent = item.y;
        tr.appendChild(tdY);

        var tdR = document.createElement('td');
        tdR.textContent = item.r;
        tr.appendChild(tdR);

        var tdHit = document.createElement('td');
        tdHit.textContent = item.hit ? 'попадание' : 'промах';
        tdHit.className = item.hit ? 'hit' : 'miss';
        tr.appendChild(tdHit);

        var tdTime = document.createElement('td');
        tdTime.textContent = item.time || '';
        tr.appendChild(tdTime);

        var tdExec = document.createElement('td');
        tdExec.textContent = item.execTime || '';
        tr.appendChild(tdExec);

        tbody.appendChild(tr);
    });
}

// ========== AJAX: send POST to FastCGI server ==========
var API_URL = '/api/check';  // Apache proxies this to FastCGI

function sendPoint(x, y, r) {
    var errorDiv = document.getElementById('error');
    errorDiv.textContent = '';

    // Build POST body: x=...&y=...&r=...
    var body = 'x=' + encodeURIComponent(x)
             + '&y=' + encodeURIComponent(y)
             + '&r=' + encodeURIComponent(r);

    // AJAX with fetch (ES6) — demonstrates understanding of AJAX
    fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('Ошибка сервера: ' + response.status);
        }
        return response.json();
    })
    .then(function(data) {
        if (data.error) {
            errorDiv.textContent = data.error;
            return;
        }
        // Server returns all results
        results = data.results || [];
        renderTable();
        redraw();
    })
    .catch(function(err) {
        errorDiv.textContent = 'Ошибка соединения: ' + err.message;
    });
}

// ========== FORM SUBMIT ==========
document.getElementById('point-form').addEventListener('submit', function(e) {
    e.preventDefault();  // prevent page reload
    var errorDiv = document.getElementById('error');
    errorDiv.textContent = '';

    // Get X
    var xText = parseX(document.getElementById('x-input').value);
    if (xText === null) {
        errorDiv.textContent = 'X должен быть числом строго от -5 до 5';
        return;
    }

    // Get Y (radio)
    var yInput = document.querySelector('input[name="y"]:checked');
    if (!yInput) {
        errorDiv.textContent = 'Выберите значение Y';
        return;
    }
    var y = Number(yInput.value);

    // Get R (radio)
    var rInput = document.querySelector('input[name="r"]:checked');
    if (!rInput) {
        errorDiv.textContent = 'Выберите значение R';
        return;
    }
    var r = Number(rInput.value);

    // Send to server via AJAX POST
    sendPoint(xText, y, r);
});

// ========== INIT ==========
redraw();
