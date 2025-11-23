// ===================================
// Presidential Election Turnout Visualization
// ===================================

// Configuration
const PRESIDENTIAL_YEARS = [1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020, 2024];
const PRESIDENTIAL_YEAR_SET = new Set(PRESIDENTIAL_YEARS);
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
    2020: { dem: 'Biden', rep: 'Trump', winner: 'D' },
    2024: { dem: 'Harris', rep: 'Trump', winner: 'R' }
};

// Manual label offset adjustments for better readability
const LABEL_OFFSETS = {
    // States with simple offsets
    'New York': { x: 6, y: 8 },
    'Michigan': { x: 12, y: 26 },
    'Illinois': { x: 0, y: -8 },
    'Indiana': { x: 0, y: 12 },
    'Alabama': { x: 0, y: 16 },
    'Pennsylvania': { x: 5, y: 4 },
    'West Virginia': { x: -5, y: 10 },
    'Virginia': { x: 2, y: 8 },
    'Kentucky': { x: 0, y: 10 },
    'Tennessee': { x: 0, y: 6 },
    'Louisiana': { x: 4, y: 16 },
    'Mississippi': { x: 2, y: -8 },
    'California': { x: -15, y: -10 },
    'Florida': { x: 18, y: 8 },
    'Texas': { x: 10, y: -10 },
    'Idaho': { x: 0, y: 10 },
    'Hawaii': { x: 15, y: -10 },
    'North Carolina': { x: 0, y: 5 }
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

// Color scale for years (1980-2020)
const yearColorScale = d3.scaleOrdinal()
    .domain(PRESIDENTIAL_YEARS)
    .range([
        '#8B5A3C',  // 1980 - Brown
        '#A67C52',  // 1984 - Tan
        '#C19A6B',  // 1988 - Camel
        '#D4B896',  // 1992 - Wheat
        '#9B8B7E',  // 1996 - Warm gray
        '#7A9B8E',  // 2000 - Sage green
        '#6B8E9B',  // 2004 - Steel blue
        '#5A7B9B',  // 2008 - Slate blue
        '#4A6B8B',  // 2012 - Ocean blue
        '#6B5A7B',  // 2016 - Muted purple
        '#8B6B7A',  // 2020 - Dusty rose
        '#7A5A6B'   // 2024 - Deep mauve
    ]);

// State
let currentYearIndex = PRESIDENTIAL_YEARS.length - 1;  // Start with 2020
let turnoutData = [];
let turnoutIndex = null;
let usStates = null;
let primaryMapView = null;
let highestTurnoutMapView = null;
let lowestTurnoutMapView = null;
let highestTurnoutDataset = null;
let lowestTurnoutDataset = null;

// SVG dimensions
const width = 960;
const height = 600;

// D3 projection for US map
const projection = d3.geoAlbersUsa()
    .scale(1280)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

class MapView {
    constructor({
        svgSelector,
        statesGeoJson,
        pathGenerator,
        colorScale,
        labelOffsets = {},
        leaderLinePositions = {}
    }) {
        this.svg = d3.select(svgSelector);
        this.statesGeoJson = statesGeoJson;
        this.path = pathGenerator;
        this.colorScale = colorScale;
        this.labelOffsets = labelOffsets;
        this.leaderLinePositions = leaderLinePositions;
        this.showAllLabels = false;

        this.zoomableGroup = this.svg.append('g')
            .attr('class', 'zoomable-group');

        this.statesGroup = this.zoomableGroup.append('g')
            .attr('class', 'states');

        this.leaderLinesGroup = this.zoomableGroup.append('g')
            .attr('class', 'leader-lines');

        this.labelsGroup = this.zoomableGroup.append('g')
            .attr('class', 'state-labels');

        this.statePaths = this.statesGroup.selectAll('.state')
            .data(this.statesGeoJson)
            .join('path')
            .attr('class', 'state')
            .attr('d', this.path)
            .style('--state-index', (d, i) => i)
            .on('mouseenter', (event, d) => this.handleStateHover(event, d))
            .on('mouseleave', () => this.handleStateLeave());

        const zoomBehavior = d3.zoom()
            .scaleExtent([0.85, 8])
            .on('zoom', (event) => {
                this.zoomableGroup.attr('transform', event.transform);
            });

        this.svg.call(zoomBehavior);
    }

    update({
        dataByState,
        labelFormatter,
        numericLabelFormatter,
        getFillColor
    } = {}) {
        const dataset = dataByState || new Map();
        const fillAccessor = getFillColor || ((stateName, entry) => entry ? this.colorScale(entry.value) : '#E0E0E0');
        const formatLabel = labelFormatter || ((entry) => {
            if (!entry || typeof entry.value !== 'number') {
                return '';
            }
            return `${entry.value.toFixed(1)}%`;
        });
        const formatNumeric = numericLabelFormatter || ((value) => `${value.toFixed(1)}%`);

        this.statePaths
            .transition()
            .duration(TRANSITION_DURATION)
            .style('fill', d => {
                const stateName = getStateName(d.id);
                const entry = dataset.get(stateName);
                return fillAccessor(stateName, entry);
            })
            .style('opacity', d => {
                const stateName = getStateName(d.id);
                return dataset.has(stateName) ? 1 : 0.3;
            });

        const labelData = this.statesGeoJson
            .map(feature => {
                const stateName = getStateName(feature.id);
                const entry = dataset.get(stateName);

                if (!entry) {
                    return null;
                }

                const centroid = this.path.centroid(feature);
                const leaderLinePos = this.leaderLinePositions[stateName];
                const offset = this.labelOffsets[stateName] || { x: 0, y: 0 };
                const labelX = leaderLinePos ? leaderLinePos.x : centroid[0] + offset.x;
                const labelY = leaderLinePos ? leaderLinePos.y : centroid[1] + offset.y;

                return {
                    name: stateName,
                    value: entry.value,
                    displayValue: formatLabel(entry, stateName),
                    numericValue: typeof entry.value === 'number' ? entry.value : null,
                    centroidX: centroid[0],
                    centroidY: centroid[1],
                    labelX,
                    labelY,
                    hasLeaderLine: !!leaderLinePos
                };
            })
            .filter(Boolean);

        this.leaderLinesGroup
            .selectAll('.leader-line')
            .data(labelData.filter(d => d.hasLeaderLine), d => d.name)
            .join(
                enter => enter.append('line')
                    .attr('class', 'leader-line')
                    .attr('data-state', d => d.name),
                update => update,
                exit => exit.remove()
            )
            .attr('x1', d => d.centroidX)
            .attr('y1', d => d.centroidY)
            .attr('x2', d => d.labelX)
            .attr('y2', d => d.labelY);

        this.labelsGroup
            .selectAll('.state-label')
            .data(labelData, d => d.name)
            .join(
                enter => enter.append('text')
                    .attr('class', 'state-label')
                    .attr('data-state', d => d.name)
                    .attr('x', d => d.labelX)
                    .attr('y', d => d.labelY),
                update => update,
                exit => exit.remove()
            )
            .attr('x', d => d.labelX)
            .attr('y', d => d.labelY)
            .transition()
            .duration(TRANSITION_DURATION)
            .tween('text', function(d) {
                if (typeof d.numericValue !== 'number') {
                    const node = this;
                    return function() {
                        node.textContent = d.displayValue || '';
                    };
                }

                const currentValue = parseFloat(this.textContent) || 0;
                const interpolator = d3.interpolateNumber(currentValue, d.numericValue);
                return function(t) {
                    const interpolated = interpolator(t);
                    this.textContent = formatNumeric(interpolated, d);
                };
            });

        this.applyLabelVisibility();
    }

    setShowAllLabels(show) {
        this.showAllLabels = show;
        this.applyLabelVisibility();
    }

    applyLabelVisibility() {
        if (this.showAllLabels) {
            this.labelsGroup.selectAll('.state-label').classed('visible', true);
            this.leaderLinesGroup.selectAll('.leader-line').classed('visible', true);
            this.statePaths.style('opacity', 1);
        } else {
            this.labelsGroup.selectAll('.state-label').classed('visible', false);
            this.leaderLinesGroup.selectAll('.leader-line').classed('visible', false);
            this.statePaths.style('opacity', 1);
        }
    }

    handleStateHover(event, feature) {
        const stateName = getStateName(feature.id);

        if (!this.showAllLabels) {
            this.labelsGroup.selectAll('.state-label')
                .classed('visible', d => d && d.name === stateName);

            this.leaderLinesGroup.selectAll('.leader-line')
                .classed('visible', d => d && d.name === stateName);

            this.statePaths
                .style('opacity', d => getStateName(d.id) === stateName ? 1 : 0.3);
        } else {
            this.statePaths
                .style('opacity', d => getStateName(d.id) === stateName ? 1 : 0.6);
        }
    }

    handleStateLeave() {
        if (!this.showAllLabels) {
            this.labelsGroup.selectAll('.state-label').classed('visible', false);
            this.leaderLinesGroup.selectAll('.leader-line').classed('visible', false);
        }

        this.statePaths
            .style('opacity', 1);
    }
}

function buildTurnoutIndex(records) {
    const byYear = new Map();
    const byState = new Map();

    records.forEach(record => {
        const year = record.year;
        const state = record.state;
        const turnout = record.turnout;

        if (!PRESIDENTIAL_YEAR_SET.has(year)) {
            return;
        }

        if (!byYear.has(year)) {
            byYear.set(year, new Map());
        }
        byYear.get(year).set(state, turnout);

        if (!byState.has(state)) {
            byState.set(state, []);
        }
        byState.get(state).push({ year, turnout });
    });

    byState.forEach(entries => {
        entries.sort((a, b) => a.year - b.year);
    });

    return { byYear, byState };
}

function getStateDatasetForYear(year) {
    if (!turnoutIndex || !turnoutIndex.byYear.has(year)) {
        return new Map();
    }

    const yearData = turnoutIndex.byYear.get(year);
    const dataset = new Map();

    yearData.forEach((turnout, state) => {
        dataset.set(state, { value: turnout });
    });

    return dataset;
}

function buildExtremaDatasets() {
    const highest = new Map();
    const lowest = new Map();

    if (!turnoutIndex) {
        return { highest, lowest };
    }

    turnoutIndex.byState.forEach((entries, state) => {
        let maxEntry = null;
        let minEntry = null;

        entries.forEach(entry => {
            if (!maxEntry || entry.turnout > maxEntry.turnout ||
                (entry.turnout === maxEntry.turnout && entry.year > maxEntry.year)) {
                maxEntry = entry;
            }

            if (!minEntry || entry.turnout < minEntry.turnout ||
                (entry.turnout === minEntry.turnout && entry.year > minEntry.year)) {
                minEntry = entry;
            }
        });

        if (maxEntry) {
            highest.set(state, { value: maxEntry.turnout, year: maxEntry.year });
        }

        if (minEntry) {
            lowest.set(state, { value: minEntry.turnout, year: minEntry.year });
        }
    });

    return { highest, lowest };
}

// ===================================
// Data Loading
// ===================================

Promise.all([
    d3.json('data/election_turnout_normalized.json'),
    d3.json('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json')
])
.then(([turnoutJson, usTopoJson]) => {
    // Store turnout data
    turnoutData = turnoutJson;
    turnoutIndex = buildTurnoutIndex(turnoutData);

    // Convert TopoJSON to GeoJSON
    usStates = topojson.feature(usTopoJson, usTopoJson.objects.states);

    primaryMapView = new MapView({
        svgSelector: '#map',
        statesGeoJson: usStates.features,
        pathGenerator: path,
        colorScale,
        labelOffsets: LABEL_OFFSETS,
        leaderLinePositions: LEADER_LINE_STATES
    });

    updatePrimaryMap();
    initializeSummaryMaps();
    setupTimeline();
    setupSettingsMenus();
    setupShowAllControls();
    setupHideLegendToggle();
})
.catch(error => {
    console.error('Error loading data:', error);
    document.querySelector('.map-container').innerHTML =
        '<p style="padding: 2rem; text-align: center; color: #C87941;">Error loading data. Please ensure you\'re running from a web server.</p>';
});

// ===================================
// Primary Map Updates
// ===================================

function updatePrimaryMap() {
    if (!primaryMapView) {
        return;
    }

    const year = PRESIDENTIAL_YEARS[currentYearIndex];
    d3.select('#currentYear').text(year);

    const dataByState = getStateDatasetForYear(year);

    primaryMapView.update({
        dataByState,
        labelFormatter: (entry) => {
            if (!entry || typeof entry.value !== 'number') {
                return '';
            }
            return `${entry.value.toFixed(1)}%`;
        },
        numericLabelFormatter: (value) => `${value.toFixed(1)}%`
    });
}

function initializeSummaryMaps() {
    const { highest, lowest } = buildExtremaDatasets();
    highestTurnoutDataset = highest;
    lowestTurnoutDataset = lowest;

    if (document.querySelector('#highestTurnoutMap')) {
        highestTurnoutMapView = new MapView({
            svgSelector: '#highestTurnoutMap',
            statesGeoJson: usStates.features,
            pathGenerator: path,
            colorScale,
            labelOffsets: LABEL_OFFSETS,
            leaderLinePositions: LEADER_LINE_STATES
        });

        highestTurnoutMapView.update({
            dataByState: highestTurnoutDataset,
            labelFormatter: (entry) => {
                if (!entry) {
                    return '';
                }
                return `${entry.year} · ${entry.value.toFixed(0)}%`;
            },
            numericLabelFormatter: (value, d) => d.displayValue,
            getFillColor: (stateName, entry) => entry ? yearColorScale(entry.year) : '#E0E0E0'
        });
    }

    if (document.querySelector('#lowestTurnoutMap')) {
        lowestTurnoutMapView = new MapView({
            svgSelector: '#lowestTurnoutMap',
            statesGeoJson: usStates.features,
            pathGenerator: path,
            colorScale,
            labelOffsets: LABEL_OFFSETS,
            leaderLinePositions: LEADER_LINE_STATES
        });

        lowestTurnoutMapView.update({
            dataByState: lowestTurnoutDataset,
            labelFormatter: (entry) => {
                if (!entry) {
                    return '';
                }
                return `${entry.year} · ${entry.value.toFixed(0)}%`;
            },
            numericLabelFormatter: (value, d) => d.displayValue,
            getFillColor: (stateName, entry) => entry ? yearColorScale(entry.year) : '#E0E0E0'
        });
    }
}

// ===================================
// Timeline Setup
// ===================================

function setupTimeline() {
    const slider = document.getElementById('yearSlider');
    const labelsContainer = document.getElementById('timelineLabels');
    const datalist = document.getElementById('yearMarkers');

    // Programmatically set slider bounds based on available years
    slider.min = 0;
    slider.max = PRESIDENTIAL_YEARS.length - 1;
    slider.value = currentYearIndex;

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
        const maxIndex = Math.max(1, PRESIDENTIAL_YEARS.length - 1);
        labelWrapper.style.left = `calc(14px + ((100% - 28px) * ${index} / ${maxIndex}))`;

        // Year
        const yearDiv = document.createElement('div');
        yearDiv.className = 'timeline-year';
        yearDiv.textContent = year;
        labelWrapper.appendChild(yearDiv);

        // Candidates
        const candidatesDiv = document.createElement('div');
        candidatesDiv.className = 'timeline-candidates';

        const candidates = CANDIDATES[year];

        if (candidates && candidates.winner) {
            // Determine winner and loser when winner is known
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
        } else if (candidates) {
            // No winner specified; show both names without emphasis
            const demSpan = document.createElement('div');
            demSpan.className = 'candidate';
            demSpan.textContent = candidates.dem;

            const repSpan = document.createElement('div');
            repSpan.className = 'candidate';
            repSpan.textContent = candidates.rep;

            candidatesDiv.appendChild(demSpan);
            candidatesDiv.appendChild(repSpan);
        }
        labelWrapper.appendChild(candidatesDiv);

        if (index === currentYearIndex) {
            labelWrapper.classList.add('active');
            yearDiv.style.display = 'block';
            candidatesDiv.style.display = 'flex';
        } else {
            yearDiv.style.display = 'none';
            candidatesDiv.style.display = 'none';
        }

        labelWrapper.addEventListener('click', () => {
            currentYearIndex = index;
            slider.value = index;
            updatePrimaryMap();
            updateActiveLabel();
        });

        labelsContainer.appendChild(labelWrapper);
    });

    // Slider event listener
    slider.addEventListener('input', (e) => {
        currentYearIndex = parseInt(e.target.value);
        updatePrimaryMap();
        updateActiveLabel();
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' && currentYearIndex > 0) {
            currentYearIndex--;
            slider.value = currentYearIndex;
            updatePrimaryMap();
            updateActiveLabel();
        } else if (e.key === 'ArrowRight' && currentYearIndex < PRESIDENTIAL_YEARS.length - 1) {
            currentYearIndex++;
            slider.value = currentYearIndex;
            updatePrimaryMap();
            updateActiveLabel();
        }
    });
}

function updateActiveLabel() {
    document.querySelectorAll('.timeline-label').forEach((label, index) => {
        const candidatesDiv = label.querySelector('.timeline-candidates');
        const yearDiv = label.querySelector('.timeline-year');
        if (index === currentYearIndex) {
            label.classList.add('active');
            yearDiv.style.display = 'block';
            candidatesDiv.style.display = 'flex';
        } else {
            label.classList.remove('active');
            yearDiv.style.display = 'none';
            candidatesDiv.style.display = 'none';
        }
    });
}

// ===================================
// Settings Menus & Show-All Controls
// ===================================

function setupSettingsMenus() {
    document.querySelectorAll('.settings-menu').forEach(menu => {
        const hamburgerBtn = menu.querySelector('.hamburger-btn');
        const settingsPanel = menu.querySelector('.settings-panel');

        if (!hamburgerBtn || !settingsPanel) {
            return;
        }

        hamburgerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            hamburgerBtn.classList.toggle('active');
            settingsPanel.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) {
                hamburgerBtn.classList.remove('active');
                settingsPanel.classList.remove('open');
            }
        });
    });
}

function setupShowAllControls() {
    const mapLookup = {
        primary: primaryMapView,
        highest: highestTurnoutMapView,
        lowest: lowestTurnoutMapView
    };

    document.querySelectorAll('.show-all-checkbox').forEach(checkbox => {
        const targetKey = checkbox.dataset.mapTarget;
        const mapView = mapLookup[targetKey];

        if (!mapView) {
            checkbox.disabled = true;
            return;
        }

        checkbox.addEventListener('change', (e) => {
            mapView.setShowAllLabels(e.target.checked);
        });
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
