// ===================================
// Presidential Election Turnout Visualization
// ===================================

// Configuration
const PRESIDENTIAL_YEARS = [1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020];
const TRANSITION_DURATION = 600;

// Candidate data by year (D = Democrat, R = Republican)
const CANDIDATES = {
    1980: { dem: 'Carter', rep: 'Reagan', winner: 'R' },
    1984: { dem: 'Mondale', rep: 'Reagan', winner: 'R' },
    1988: { dem: 'Dukakis', rep: 'Bush', winner: 'R' },
    1992: { dem: 'Clinton', rep: 'Bush', winner: 'D' },
    1996: { dem: 'Clinton', rep: 'Dole', winner: 'D' },
    2000: { dem: 'Gore', rep: 'Bush', winner: 'R' },
    2004: { dem: 'Kerry', rep: 'Bush', winner: 'R' },
    2008: { dem: 'Obama', rep: 'McCain', winner: 'D' },
    2012: { dem: 'Obama', rep: 'Romney', winner: 'D' },
    2016: { dem: 'Clinton', rep: 'Trump', winner: 'R' },
    2020: { dem: 'Biden', rep: 'Trump', winner: 'D' }
};

// Manual label offset adjustments for better readability
const LABEL_OFFSETS = {
    // States with simple offsets
    'New York': { x: 10, y: 8 },
    'Michigan': { x: 10, y: 20 },
    'Pennsylvania': { x: 5, y: 4 },
    'West Virginia': { x: -5, y: 10 },
    'Virginia': { x: 0, y: 8 },
    'Kentucky': { x: 0, y: 10 },
    'Tennessee': { x: 0, y: 10 },
    'Louisiana': { x: -8, y: 16 },
    'Mississippi': { x: 2, y: 0 },
    'California': { x: -15, y: -10 },
    'Florida': { x: 20, y: 8 },
    'Texas': { x: 10, y: -10 },
    'Idaho': { x: 0, y: 10 },
    'Hawaii': { x: 15, y: -10 }
};

// States that need leader lines (moved to ocean/empty space)
const LEADER_LINE_STATES = {
    // Northern states (moved north into Canadian space)
    'Vermont': { x: 820, y: 95 },
    'New Hampshire': { x: 850, y: 70 },

    // Eastern seaboard (moved east into Atlantic)
    'Massachusetts': { x: 880, y: 200 },
    'Connecticut': { x: 880, y: 230 },
    'Rhode Island': { x: 880, y: 260 },
    'New Jersey': { x: 880, y: 280 },
    'Delaware': { x: 880, y: 305 },
    'Maryland': { x: 880, y: 330 },
    'District of Columbia': { x: 880, y: 360 }
};

// Color scale for turnout percentages
const colorScale = d3.scaleQuantize()
    .domain([40, 80])  // Typical turnout range
    .range([
        '#C85450',  // Red - lowest turnout
        '#D4745C',
        '#D89468',
        '#D4B074',
        '#C4C080',
        '#A4B87C',
        '#84A878',
        '#649874'   // Green - highest turnout
    ]);

// State
let currentYearIndex = PRESIDENTIAL_YEARS.length - 1;  // Start with 2020
let turnoutData = [];
let usStates = null;
let showAllLabels = false;

// SVG dimensions
const width = 960;
const height = 600;

// D3 projection for US map
const projection = d3.geoAlbersUsa()
    .scale(1280)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// Zoom behavior
const zoom = d3.zoom()
    .scaleExtent([1, 8])  // Allow zoom from 1x to 8x
    .on('zoom', handleZoom);

// ===================================
// Data Loading
// ===================================

Promise.all([
    d3.json('/data/election_turnout_normalized.json'),
    d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
])
.then(([turnoutJson, usTopoJson]) => {
    // Store turnout data
    turnoutData = turnoutJson;

    // Convert TopoJSON to GeoJSON
    usStates = topojson.feature(usTopoJson, usTopoJson.objects.states);

    // Initialize visualization
    initVisualization();
    updateMap(PRESIDENTIAL_YEARS[currentYearIndex]);
    setupTimeline();
    setupShowAllToggle();
    setupHideLegendToggle();
    setupHamburgerMenu();
})
.catch(error => {
    console.error('Error loading data:', error);
    document.querySelector('.map-container').innerHTML =
        '<p style="padding: 2rem; text-align: center; color: #C87941;">Error loading data. Please ensure you\'re running from a web server.</p>';
});

// ===================================
// Visualization Initialization
// ===================================

function initVisualization() {
    const svg = d3.select('#map');

    // Attach zoom behavior to the SVG
    svg.call(zoom);

    // Create a group for all zoomable content
    const g = svg.append('g')
        .attr('class', 'zoomable-group');

    // Draw states inside the zoomable group
    g.selectAll('.state')
        .data(usStates.features)
        .join('path')
        .attr('class', 'state')
        .attr('d', path)
        .style('--state-index', (d, i) => i)
        .on('mouseenter', handleStateHover)
        .on('mouseleave', handleStateLeave);

    // Create groups for labels and leader lines inside the zoomable group
    // Leader lines should render before labels so they appear behind
    g.append('g')
        .attr('class', 'leader-lines');

    g.append('g')
        .attr('class', 'state-labels');
}

// ===================================
// Map Updates
// ===================================

function updateMap(year) {
    // Update year display
    d3.select('#currentYear').text(year);

    // Create lookup map for turnout by state name
    const turnoutByState = new Map();

    turnoutData
        .filter(d => d.year === year)
        .forEach(d => {
            turnoutByState.set(d.state, d.turnout);
        });

    // Update state colors with transition
    d3.selectAll('.state')
        .transition()
        .duration(TRANSITION_DURATION)
        .style('fill', d => {
            const stateName = getStateName(d.id);
            const turnout = turnoutByState.get(stateName);
            return turnout ? colorScale(turnout) : '#E0E0E0';
        })
        .style('opacity', d => {
            const stateName = getStateName(d.id);
            const turnout = turnoutByState.get(stateName);
            return turnout ? 1 : 0.3;
        });

    // Prepare label data for all states
    const labelData = usStates.features.map(feature => {
        const stateName = getStateName(feature.id);
        const turnout = turnoutByState.get(stateName);
        const centroid = path.centroid(feature);

        // Check if state needs a leader line
        const leaderLinePos = LEADER_LINE_STATES[stateName];

        let labelX, labelY;
        if (leaderLinePos) {
            // Use absolute positioning for leader line states
            labelX = leaderLinePos.x;
            labelY = leaderLinePos.y;
        } else {
            // Apply manual offsets if defined for this state
            const offset = LABEL_OFFSETS[stateName] || { x: 0, y: 0 };
            labelX = centroid[0] + offset.x;
            labelY = centroid[1] + offset.y;
        }

        return {
            name: stateName,
            turnout: turnout,
            centroidX: centroid[0],
            centroidY: centroid[1],
            labelX: labelX,
            labelY: labelY,
            hasLeaderLine: !!leaderLinePos
        };
    }).filter(d => d.turnout); // Only show labels for states with data

    // Draw leader lines (in separate group so they appear behind labels)
    const leaderLineData = labelData.filter(d => d.hasLeaderLine);

    d3.select('.leader-lines')
        .selectAll('.leader-line')
        .data(leaderLineData, d => d.name)
        .join('line')
        .attr('class', d => showAllLabels ? 'leader-line visible' : 'leader-line')
        .attr('data-state', d => d.name)
        .attr('x1', d => d.centroidX)
        .attr('y1', d => d.centroidY)
        .attr('x2', d => d.labelX)
        .attr('y2', d => d.labelY);

    // Draw labels with transition
    d3.select('.state-labels')
        .selectAll('.state-label')
        .data(labelData, d => d.name)
        .join('text')
        .attr('class', d => showAllLabels ? 'state-label visible' : 'state-label')
        .attr('data-state', d => d.name)
        .attr('x', d => d.labelX)
        .attr('y', d => d.labelY)
        .transition()
        .duration(TRANSITION_DURATION)
        .textTween(function(d) {
            const currentText = this.textContent;
            const currentValue = parseFloat(currentText) || 0;
            const targetValue = d.turnout;
            const interpolator = d3.interpolateNumber(currentValue, targetValue);
            return function(t) {
                return `${interpolator(t).toFixed(1)}%`;
            };
        });
}

// ===================================
// Timeline Setup
// ===================================

function setupTimeline() {
    const slider = document.getElementById('yearSlider');
    const labelsContainer = document.getElementById('timelineLabels');
    const datalist = document.getElementById('yearMarkers');

    // Create datalist options for slider tick marks
    PRESIDENTIAL_YEARS.forEach((year, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.label = year.toString();
        datalist.appendChild(option);
    });

    // Create year labels
    PRESIDENTIAL_YEARS.forEach((year, index) => {
        const labelWrapper = document.createElement('div');
        labelWrapper.className = 'timeline-label';
        labelWrapper.dataset.index = index;

        // Position to match slider thumb travel (thumb center goes from 14px to calc(100% - 14px))
        // 14px = half of thumb width (24px + 4px border = 28px total)
        labelWrapper.style.left = `calc(14px + ((100% - 28px) * ${index} / 10))`;

        // Year
        const yearDiv = document.createElement('div');
        yearDiv.className = 'timeline-year';
        yearDiv.textContent = year;
        labelWrapper.appendChild(yearDiv);

        // Candidates
        const candidatesDiv = document.createElement('div');
        candidatesDiv.className = 'timeline-candidates';

        const candidates = CANDIDATES[year];

        // Determine winner and loser
        const winnerName = candidates.winner === 'D' ? candidates.dem : candidates.rep;
        const loserName = candidates.winner === 'D' ? candidates.rep : candidates.dem;

        const winnerSpan = document.createElement('div');
        winnerSpan.className = 'candidate winner';
        winnerSpan.textContent = winnerName;

        const loserSpan = document.createElement('div');
        loserSpan.className = 'candidate';
        loserSpan.textContent = loserName;

        candidatesDiv.appendChild(winnerSpan);
        candidatesDiv.appendChild(loserSpan);
        labelWrapper.appendChild(candidatesDiv);

        if (index === currentYearIndex) {
            labelWrapper.classList.add('active');
            candidatesDiv.style.display = 'flex';
        } else {
            candidatesDiv.style.display = 'none';
        }

        labelWrapper.addEventListener('click', () => {
            currentYearIndex = index;
            slider.value = index;
            updateMap(year);
            updateActiveLabel();
        });

        labelsContainer.appendChild(labelWrapper);
    });

    // Slider event listener
    slider.addEventListener('input', (e) => {
        currentYearIndex = parseInt(e.target.value);
        updateMap(PRESIDENTIAL_YEARS[currentYearIndex]);
        updateActiveLabel();
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && currentYearIndex > 0) {
            currentYearIndex--;
            slider.value = currentYearIndex;
            updateMap(PRESIDENTIAL_YEARS[currentYearIndex]);
            updateActiveLabel();
        } else if (e.key === 'ArrowRight' && currentYearIndex < PRESIDENTIAL_YEARS.length - 1) {
            currentYearIndex++;
            slider.value = currentYearIndex;
            updateMap(PRESIDENTIAL_YEARS[currentYearIndex]);
            updateActiveLabel();
        }
    });
}

function updateActiveLabel() {
    document.querySelectorAll('.timeline-label').forEach((label, index) => {
        const candidatesDiv = label.querySelector('.timeline-candidates');
        if (index === currentYearIndex) {
            label.classList.add('active');
            candidatesDiv.style.display = 'flex';
        } else {
            label.classList.remove('active');
            candidatesDiv.style.display = 'none';
        }
    });
}

// ===================================
// Hamburger Menu Toggle
// ===================================

function setupHamburgerMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const settingsPanel = document.getElementById('settingsPanel');

    hamburgerBtn.addEventListener('click', () => {
        hamburgerBtn.classList.toggle('active');
        settingsPanel.classList.toggle('open');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        const settingsMenu = document.querySelector('.settings-menu');
        if (!settingsMenu.contains(e.target)) {
            hamburgerBtn.classList.remove('active');
            settingsPanel.classList.remove('open');
        }
    });
}

// ===================================
// Show All Labels Toggle
// ===================================

function setupShowAllToggle() {
    const checkbox = document.getElementById('showAllCheckbox');

    checkbox.addEventListener('change', (e) => {
        showAllLabels = e.target.checked;

        if (showAllLabels) {
            // Show all labels and leader lines
            d3.selectAll('.state-label').classed('visible', true);
            d3.selectAll('.leader-line').classed('visible', true);

            // Don't dim any states
            d3.selectAll('.state').style('opacity', 1);
        } else {
            // Hide all labels and leader lines
            d3.selectAll('.state-label').classed('visible', false);
            d3.selectAll('.leader-line').classed('visible', false);
        }
    });
}

// ===================================
// Hide Legend Toggle
// ===================================

function setupHideLegendToggle() {
    const checkbox = document.getElementById('hideLegendCheckbox');
    const legend = document.querySelector('.legend');

    checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            legend.classList.add('hidden');
        } else {
            legend.classList.remove('hidden');
        }
    });
}

// ===================================
// State Hover Interactions
// ===================================

function handleStateHover(event, d) {
    const stateName = getStateName(d.id);

    if (!showAllLabels) {
        // Show label and leader line for this state only when not showing all
        d3.selectAll('.state-label')
            .classed('visible', function() {
                return this.getAttribute('data-state') === stateName;
            });

        d3.selectAll('.leader-line')
            .classed('visible', function() {
                return this.getAttribute('data-state') === stateName;
            });

        // Dim other states
        d3.selectAll('.state')
            .style('opacity', state => state === d ? 1 : 0.3);
    } else {
        // When showing all, just highlight the hovered state
        d3.selectAll('.state')
            .style('opacity', state => state === d ? 1 : 0.6);
    }
}

function handleStateLeave() {
    if (!showAllLabels) {
        // Hide all labels and leader lines when not showing all
        d3.selectAll('.state-label').classed('visible', false);
        d3.selectAll('.leader-line').classed('visible', false);
    }

    // Restore all states opacity
    d3.selectAll('.state')
        .style('opacity', 1);
}

// ===================================
// Zoom Interaction
// ===================================

function handleZoom(event) {
    // Apply the zoom transform to all zoomable content
    d3.select('.zoomable-group')
        .attr('transform', event.transform);
}

// ===================================
// Helper Functions
// ===================================

// Map FIPS state ID to state name
function getStateName(fipsId) {
    const stateNames = {
        '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas',
        '06': 'California', '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware',
        '11': 'District of Columbia', '12': 'Florida', '13': 'Georgia', '15': 'Hawaii',
        '16': 'Idaho', '17': 'Illinois', '18': 'Indiana', '19': 'Iowa',
        '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine',
        '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota',
        '28': 'Mississippi', '29': 'Missouri', '30': 'Montana', '31': 'Nebraska',
        '32': 'Nevada', '33': 'New Hampshire', '34': 'New Jersey', '35': 'New Mexico',
        '36': 'New York', '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio',
        '40': 'Oklahoma', '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island',
        '45': 'South Carolina', '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas',
        '49': 'Utah', '50': 'Vermont', '51': 'Virginia', '53': 'Washington',
        '54': 'West Virginia', '55': 'Wisconsin', '56': 'Wyoming'
    };

    // Convert numeric ID to string with leading zero
    const fipsString = String(fipsId).padStart(2, '0');
    return stateNames[fipsString] || 'Unknown';
}
