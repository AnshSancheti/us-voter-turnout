// ===================================
// Presidential Election Turnout Visualization
// ===================================

// Configuration
const PRESIDENTIAL_YEARS = [1980, 1984, 1988, 1992, 1996, 2000, 2004, 2008, 2012, 2016, 2020];
const TRANSITION_DURATION = 600;

// Color scale for turnout percentages
const colorScale = d3.scaleQuantize()
    .domain([40, 80])  // Typical turnout range
    .range([
        '#E8DCC4',  // Lightest - lowest turnout
        '#D4C9A8',
        '#C0B68A',
        '#A8A060',
        '#D4A356',
        '#C89050',
        '#C87941',
        '#9D5C3F'   // Darkest - highest turnout
    ]);

// State
let currentYearIndex = PRESIDENTIAL_YEARS.length - 1;  // Start with 2020
let turnoutData = [];
let usStates = null;

// SVG dimensions
const width = 960;
const height = 600;

// D3 projection for US map
const projection = d3.geoAlbersUsa()
    .scale(1280)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

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

    // Draw states
    svg.selectAll('.state')
        .data(usStates.features)
        .join('path')
        .attr('class', 'state')
        .attr('d', path)
        .style('--state-index', (d, i) => i)
        .on('mouseenter', handleStateHover)
        .on('mouseleave', handleStateLeave);

    // Create text label group (will be populated on hover)
    svg.append('g')
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
}

// ===================================
// Timeline Setup
// ===================================

function setupTimeline() {
    const slider = document.getElementById('yearSlider');
    const labelsContainer = document.getElementById('timelineLabels');

    // Create year labels
    PRESIDENTIAL_YEARS.forEach((year, index) => {
        const label = document.createElement('div');
        label.className = 'timeline-label';
        label.textContent = year;
        label.dataset.index = index;

        if (index === currentYearIndex) {
            label.classList.add('active');
        }

        label.addEventListener('click', () => {
            currentYearIndex = index;
            slider.value = index;
            updateMap(year);
            updateActiveLabel();
        });

        labelsContainer.appendChild(label);
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
        if (index === currentYearIndex) {
            label.classList.add('active');
        } else {
            label.classList.remove('active');
        }
    });
}

// ===================================
// State Hover Interactions
// ===================================

function handleStateHover(event, d) {
    const stateName = getStateName(d.id);
    const year = PRESIDENTIAL_YEARS[currentYearIndex];

    // Find turnout data for this state and year
    const stateData = turnoutData.find(
        item => item.state === stateName && item.year === year
    );

    if (stateData) {
        // Get the centroid of the state for label positioning
        const centroid = path.centroid(d);

        // Add text label on the state
        d3.select('.state-labels')
            .append('text')
            .attr('class', 'state-label visible')
            .attr('x', centroid[0])
            .attr('y', centroid[1])
            .text(`${stateData.turnout.toFixed(1)}%`);
    }

    // Dim other states
    d3.selectAll('.state')
        .style('opacity', state => state === d ? 1 : 0.3);
}

function handleStateLeave() {
    // Remove text label
    d3.selectAll('.state-label').remove();

    // Restore all states opacity
    d3.selectAll('.state')
        .style('opacity', 1);
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
