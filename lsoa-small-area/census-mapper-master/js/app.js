// API url
const urlnomis = [
  'https://www.nomisweb.co.uk/api/v01/dataset/NM_618_1.data.tsv?date=latest&geography=1249902593...1249937345&rural_urban=0&cell=',
  '&measures=20301&select=geography_code,obs_value&uid=0x3cfb19ead752b37bb90da0eb3a0fe78baa9fa055'
];
const urlstatic = [
  './data/',
  '.tsv'
];

const options = {
  'House, Detached': 7,
  'House, Semi-detached': 8,
  'House, Terraced': 9,
  'Flat in block/tenement': 10,
  'Flat in shared house': 11,
  'Flat in commercial building': 12,
  'Caravan/mobile/temporary home': 13
};

const colors = [
  'rgb(127, 205, 187)',
  'rgb(65, 182, 196)',
  'rgb(29, 145, 192)',
  'rgb(34, 94, 168)',
  'rgb(12, 44, 132)'
];

// Get DOM objects
const selector = document.getElementById('selector');
const spinner = document.getElementById('loader');
const legend = document.getElementById('legend');
const source = document.getElementById('nomis');

// Set null variables
var data = {};
var breaks = [];
var store = {};

// Create popup class for map tooltips
var popup = new mapboxgl.Popup({
  closeButton: false,
  closeOnClick: false
});

// Function to turn CSV (string) into array of objects
function tsv2json(string) {
  let json = {};
  string = string.replace(/['"]+/g, '');
  let array = string.split('\n');
  for (var i = 1; i < array.length; i++) {
    let keyval = array[i].split('\t');
    if (keyval[1]) {
      json[keyval[0]] = parseFloat(keyval[1]);
    }
  }
  return json;
}

// Function to get data
function getData(dim, text) {
  spinner.style.display = 'flex';
  let url = source.checked ? urlnomis : urlstatic;
  if (!store[text]) {
    let apiurl = url[0] + dim + url[1];
    fetch(apiurl)
      .then((response) => {
        return response.text();
      })
      .then((tsvdata) => {
        data = tsv2json(tsvdata);
        return data;
      })
      .then((jsondata) => {
        store[text] = {
          'data': jsondata,
          'breaks': []
        };
        breaks = getBreaks(jsondata);
        return breaks;
      })
      .then((breaksdata) => {
        store[text].breaks = breaksdata;
        setProperties(data, breaks);
        spinner.style.display = 'none';
        return true;
      });
  } else {
    data = store[text].data;
    breaks = store[text].breaks;
    setProperties(data, breaks);
    spinner.style.display = 'none';
  }
}

// Function to get breaks
function getBreaks(data) {
  let values = Object.values(data);
  let len = values.length;
  values.sort((a, b) => a - b);
  let breaks = [
    values[Math.round(len * 0.2) - 1],
    values[Math.round(len * 0.4) - 1],
    values[Math.round(len * 0.6) - 1],
    values[Math.round(len * 0.8) - 1]
  ];
  return breaks;
}

// Function to generate options + set event listener
function genOptions(options) {
  let keys = Object.keys(options);
  let values = Object.values(options);
  let html = ""
  for (i in keys) {
    let selected = i == 0 ? ' selected="selected"' : "";
    let option = '<option value="' + values[i] + '"' + selected + '>' + keys[i] + '</option>';
    html += option;
  }
  selector.innerHTML = html;
  selector.onchange = () => {
    getData(selector.value, selector.selectedOptions[0].text);
  }
}

// Function to get color for a value based on breaks
function getColor(value, breaks) {
  for (i in breaks) {
    if (value < breaks[i]) {
      return colors[i];
    }
  }
  return colors[4];
}

// Function to add layers to mapp
function makeLayers() {

  // Add boundaries tileset
  map.addSource('lsoa-tiles', {
    type: 'vector',
    "tiles": ['https://cdn.ons.gov.uk/maptiles/t26/tiles/{z}/{x}/{y}.pbf'],
    "promoteId": { "seventyplus": "lsoa11cd" },
    "buffer": 0,
    "maxzoom": 13,
  });

  // Add layer from the vector tile source with data-driven style
  map.addLayer({
    id: 'lsoa-join',
    type: 'fill',
    source: 'lsoa-tiles',
    'source-layer': 'seventyplus',
    paint: {
      'fill-color':
        ['case',
          ['!=', ['feature-state', 'color'], null],
          ['feature-state', 'color'],
          'rgba(255, 255, 255, 0)'
        ],
        'fill-opacity': 0.8
    }
  }, 'tunnel_motorway_casing');

  // Add tooltips on hover
  map.on('mousemove', 'lsoa-join', function (e) {
    // Change the cursor style as a UI indicator.
    map.getCanvas().style.cursor = 'pointer';

    var value = data[e.features[0].properties.lsoa11cd];
    var description = '<strong>' + e.features[0].properties.lsoa11nm + '</strong><br>' + value + '%';

    // Populate the popup and set its coordinates
    // based on the feature found.
    popup
      .setLngLat(e.lngLat)
      .setHTML(description)
      .addTo(map);
  });

  // Remove tooltips on mouseleave
  map.on('mouseleave', 'lsoa-join', function (e) {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
}

// Function to add data properties to map layer
function setProperties(data, breaks) {
  for (key in data) {
    map.setFeatureState({
      source: 'lsoa-tiles',
      sourceLayer: 'seventyplus',
      id: key
    }, {
      value: data[key],
      color: getColor(data[key], breaks)
    });
  }
  genLegend(breaks);
}

// Function to add legend scale
function genLegend(breaks) {
  let html = '';
  for (i in breaks) {
    html += '<div style="background-color:' + colors[i] + '; color: #ffffff;" class="col"><small>&lt;' + breaks[i] + '%</small></div>';
  }
  html += '<div style="background-color:' + colors[4] + '; color: #ffffff;" class="col"><small>&lt;100%</small></div>';
  legend.innerHTML = html;
}

// INITIALISE MAP
mapboxgl.accessToken = 'pk.eyJ1IjoiYXJrYmFyY2xheSIsImEiOiJjamdxeDF3ZXMzN2IyMnFyd3EwdGcwMDVxIn0.P2bkpp8HGNeY3-FOsxXVvA';
var map = new mapboxgl.Map({
  container: 'map',
  style: './data/style-omt.json',
  center: [-1.2471735, 50.8625412],
  zoom: 12
});

// ADD LAYERS + DATA ONCE MAP IS INITIALISED
map.on('load', function () {
  genOptions(options);
  makeLayers();
  getData(selector.value, selector.selectedOptions[0].text);
});