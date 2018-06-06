
//test if browser supports webGL

if(Modernizr.webgl) {
	
	//Load data and config file
	d3.queue()
		.defer(d3.csv, "data/chnglem.csv")
		.defer(d3.json, "data/config.json")
		.defer(d3.json, "data/geog.json")
		.await(ready);
		
	
	function ready (error, data, config, geog){
		
		//Set up global variables
		dvc = {};
		dvc.time = "yr1";
		
		//Mapbox key (must hide)
		//mapboxgl.accessToken = 'pk.eyJ1Ijoib25zZGF0YXZpcyIsImEiOiJjamMxdDduNnAwNW9kMzJyMjQ0bHJmMnI1In0.3PkmH-GL8jBbiWlFB1IQ7Q';
		
		//set max bounds (stops loading unnessary tiles
		var bounds = [
			[-19.8544921875, 40.82380908513249], // Southwest coordinates
			[10.021484375, 68.478568831926395]  // Northeast coordinates
		];
		
		//set up basemap
		var map = new mapboxgl.Map({
		  container: 'map', // container id
		  style: 'https://free.tilehosting.com/styles/positron/style.json?key=ZBXiR1SHvcgszCLwyOFe', //stylesheet location
		  center: [-2.5, 54], // starting position
		  zoom: 4.5, // starting zoom
		  pitch: 40,
   		  bearing: 20,
		  maxBounds: bounds //set maximum boundaries
		});
		
		// Add zoom and rotation controls to the map.
		map.addControl(new mapboxgl.NavigationControl());
		
		// Add geolocation controls to the map.
		map.addControl(new mapboxgl.GeolocateControl({
			positionOptions: {
				enableHighAccuracy: true
			},
			trackUserLocation: true
		}));
		
		
		//set up d3 color scales
		
		console.log(colorbrewer.YlGn[5]);
		
		color = d3.scaleThreshold()
				.domain([0,10,20,30,40,50])
				.range(colorbrewer.YlGn[5]);
				
		rateById = {};
		areaById = {};

		data.forEach(function(d) { rateById[d.AREACD] = +eval("d." + dvc.time); areaById[d.AREACD] = d.AREANM});	
						
		//convert topojson to geojson
		var areas = topojson.feature(geog, geog.objects.LA2014merc);
		
		areas.features.map(function(d,i) {
			
		  d.properties.fill = color(rateById[d.properties.AREACD])
		  d.properties.height = rateById[d.properties.AREACD]*1000;
		   
		  console.log(d.properties.height);
		});

		//cb(districts)
		
		map.on('load', function() {
		  
		
			map.addSource('area', { 'type': 'geojson', 'data': areas });
		
			
			  map.addLayer({
				  'id': 'area',
				  'type': 'fill-extrusion',
				  'source': 'area',
				  'layout': {},
				  'paint': {
					  	'fill-extrusion-color': {
                // Get the fill-extrusion-color from the source 'color' property.
							'property': 'fill',
							'type': 'identity'
						},
						'fill-extrusion-height': {
							// Get fill-extrusion-height from the source 'height' property.
							'property': 'height',
							'type': 'identity'
						},
						'fill-extrusion-base': 0,
					    'fill-extrusion-opacity': 0.7
				  }
			  });
			
			
			map.addLayer({
				'id': 'areaOutline',
				'type': 'fill',
				'source': 'area',
				'layout': {},
				'paint': {
					'fill-color': 'rgba(0,0,0,0)',
					'fill-opacity': 0.2,
					'fill-outline-color': '#ccc'
				},
			});
			
			map.addLayer({
				"id": "state-fills-hover",
				"type": "line",
				"source": "area",
				"layout": {},
				"paint": {
					"line-color": "#000",
					"line-width": 2
				},
				"filter": ["==", "AREACD", ""]
			});
		
			//Highlight stroke on mouseover (and show area information)
			map.on("mousemove", "areaOutline", function(e) {
				console.log(e.features[0].properties.AREACD);
				map.setFilter("state-fills-hover", ["==", "AREACD", e.features[0].properties.AREACD]);
				showAreaInfo(e.features[0].properties.AREANM, rateById[e.features[0].properties.AREACD]);
				
			});
	
			// Reset the state-fills-hover layer's filter when the mouse leaves the layer.
			map.on("mouseleave", "areaOutline", function() {
				map.setFilter("state-fills-hover", ["==", "AREACD", ""]);
			});
		
	
		});
		
		
		function showAreaInfo(name, rate) {
			console.log(rate);
			d3.select("#header").text(name + ": " + rate)
			
			
				
		}
		
	}

} else {
	
	//provide fallback for browsers that don't support webGL	

}