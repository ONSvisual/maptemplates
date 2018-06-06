
//test if browser supports webGL

if(Modernizr.webgl) {

	//setup pymjs
	var pymChild = new pym.Child();

	//first load config file


	//Load data and config file
	d3.queue()
		.defer(d3.csv, "data/data0.csv")
		.defer(d3.json, "data/config.json")
		.defer(d3.json, "data/geog.json")
		.await(ready);


	function ready (error, data, config, geog){

		//Set up global variables
		dvc = config.ons;
		oldAREACD = "";
		selected = false;
		firsthover = true;
		chartDrawn = false;

		overallwidth = d3.select("body").node().getBoundingClientRect().width;

		if(overallwidth < 600) {
			mobile = true;
		} else {
			mobile = false;
		} ;



		//Get column names and number
		variables = [];
		for (var column in data[0]) {
			if (column == 'AREACD') continue;
			if (column == 'AREANM') continue;
			variables.push(column);
		}

		b=0;

		if(dvc.timeload == "last") {
			a = variables.length -1;
		} else {
			a = dvc.timeload;
		}


		//BuildNavigation
		if(dvc.varlabels.length > 1)	{
			buildNav();
		} else {
			d3.select("#topNav").attr("display","none")
		}
		//set title of page
		//Need to test that this shows up in GA
		document.title = dvc.maptitle;

		//Fire design functions
		selectlist(data);

		//Set up number formats
		displayformat = d3.format("." + dvc.displaydecimals + "f");
		legendformat = d3.format("." + dvc.legenddecimals + "f");

		//set up basemap
		map = new mapboxgl.Map({
		  container: 'map', // container id
		  style: 'data/style.json', //stylesheet location //includes key for API
		  center: [-2.5, 54], // starting position
		  minZoom: 3.5,//
		  zoom: 4.5, // starting zoom
		  maxZoom: 13, //
		  attributionControl: false
		});
		//add fullscreen option
		//map.addControl(new mapboxgl.FullscreenControl());

		// Add zoom and rotation controls to the map.
		map.addControl(new mapboxgl.NavigationControl());

		// Disable map rotation using right click + drag
		map.dragRotate.disable();

		// Disable map rotation using touch rotation gesture
		map.touchZoomRotate.disableRotation();

		// Add geolocation controls to the map.
		map.addControl(new mapboxgl.GeolocateControl({
			positionOptions: {
				enableHighAccuracy: true
			}
		}));

		//add compact attribution
		map.addControl(new mapboxgl.AttributionControl({
			compact: true
		}));

		//get location on click
		d3.select(".mapboxgl-ctrl-geolocate").on("click",geolocate);

		//addFullscreen();

		setRates(data);

		defineBreaks(data);

		setupScales(data);

		setTimeLabel(a);

		//now ranges are set we can call draw the key
		createKey(config);

		//convert topojson to geojson
		for(key in geog.objects){
			var areas = topojson.feature(geog, geog.objects[key])
		}

		//Work out extend of loaded geography file so we can set map to fit total extent
		bounds = turf.extent(areas);

		//set map to total extent
		setTimeout(function(){
			map.fitBounds([[bounds[0],bounds[1]], [bounds[2], bounds[3]]])
		},1000);



		//and add properties to the geojson based on the csv file we've read in
		areas.features.map(function(d,i) {

		  d.properties.fill = color(rateById[d.properties.AREACD])
		});


		map.on('load', defineLayers);

		setButtons();
		setSource();

		//setInterval(function(){animate()}, 3000);


		function buildNav() {

			formgroup = d3.select('#nav')
						.append('form')
						.attr('class','form-group-fullwidth')
						.attr('role','radiogroup')
						.selectAll('div')
						.data(dvc.varlabels)
						.enter()
						.append('div')
						.attr("class",'form-group-fullwidth')
						.attr("role","radio")
						.attr("tabindex","1");

			formgroup.append('input')
				.attr("id",function(d,i){return "button" + i})
				.attr('class','radio-primary-fullwidth')
				.attr("type","radio")
				.attr("name","button")
				.attr("value",function(d,i){return i})
				.attr("aria-checked", function(d,i){if(i == b){return true}})
				.property("checked", function(d, i) {return i===b;})

			formgroup.append('label')
				.attr('class','label-primary-fullwidth')
				.attr("for",function(d,i){return "button" + i})
				.text(function(d,i){return dvc.varlabels[i]})
				.on('click',function(d,i){onchange(i)})


			selectgroup = d3.select('#selectnav')
							.append('select')
							.attr('class','dropdown')
							.on('change', onselect)
							.selectAll("option")
							.data(dvc.varlabels)
							.enter()
							.append('option')
							.attr("value", function(d,i){return i})
							.property("selected", function(d, i) {return i===b;})
							.text(function(d,i){return dvc.varlabels[i]});




		}

		function setRates(data){

			rateById = {};
			areaById = {};

			data.forEach(function(d) { rateById[d.AREACD] = +eval("d." + variables[a]); areaById[d.AREACD] = d.AREANM});

		}

		function setTimeLabel(){
			d3.select("#timePeriod").text(dvc.timepoints[a]);
		}

		function checkIfFirstorLast() {
			if(a=0) {

			}


		}


		function defineBreaks(data){
			//Flatten data values and work out breaks
			var values =  data.map(function(d) { return +eval("d." + variables[a]); }).filter(function(d) {return !isNaN(d)}).sort(d3.ascending);

			//If jenks or equal then flatten data so we can work out what the breaks need to be

			// Work out how many timepoints we have in our dataset; number of rows - area name & code // Look at linechart templates to see how?
	    	// parse data into columns
			if(config.ons.breaks =="jenks" || config.ons.breaks =="equal") {
					var values = [];
					allvalues = [];

					for (var column in data[0]) {
						if (column != 'AREANM' && column != 'AREACD') {
						values[column] =  data.map(function(d) { return +eval("d." + column); }).filter(function(d) {return !isNaN(d)}).sort(d3.ascending);
						allvalues = allvalues.concat(values[column]);
						}

					}

					allvalues.sort(d3.ascending);

			}

			if(config.ons.breaks =="jenks") {
				breaks = [];

				ss.ckmeans(allvalues, (dvc.numberBreaks)).map(function(cluster,i) {
					if(i<dvc.numberBreaks-1) {
						breaks.push(cluster[0]);
					} else {
						breaks.push(cluster[0])
						//if the last cluster take the last max value
						breaks.push(cluster[cluster.length-1]);
					}
				});
			}
			else if (config.ons.breaks == "equal") {
				breaks = ss.equalIntervalBreaks(allvalues, dvc.numberBreaks);
			}
			else {breaks = config.ons.breaks;};


			//round breaks to specified decimal places
			breaks = breaks.map(function(each_element){
				return Number(each_element.toFixed(dvc.legenddecimals));
			});

			//work out halfway point (for no data position)
			midpoint = breaks[0] + ((breaks[dvc.numberBreaks] - breaks[0])/2)

		}

		function setupScales() {
			//set up d3 color scales
			//Load colours
			if(typeof dvc.varcolour === 'string') {
				colour = colorbrewer[dvc.varcolour][dvc.numberBreaks];
			} else {
				colour = dvc.varcolour;
			}

			//set up d3 color scales
			color = d3.scaleThreshold()
					.domain(breaks.slice(1))
					.range(colour);

		}

		function defineLayers() {

			map.addSource('area', { 'type': 'geojson', 'data': areas });

			  map.addLayer({
				  'id': 'area',
				  'type': 'fill',
				  'source': 'area',
				  'layout': {},
				  'paint': {
					  'fill-color': {
							type: 'identity',
							property: 'fill'
					   },
					  'fill-opacity': 0.7,
					  'fill-outline-color': '#fff'
				  }
			  }, 'place_city');


			//Get current year for copyright
			today = new Date();
			copyYear = today.getFullYear();
			map.style.sourceCaches['area']._source.attribution = "Contains OS data &copy; Crown copyright and database right " + copyYear;

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
			}, 'place_city');


			  map.addLayer({
				  'id': 'area_labels',
				  'type': 'symbol',
				  'source': 'area',
				  'minzoom': 10,
				  'layout': {
					  "text-field": '{AREANM}',
					  "text-font": ["Open Sans","Arial Unicode MS Regular"],
					  "text-size": 14
				  },
				  'paint': {
					  "text-color": "#666",
					  "text-halo-color": "#fff",
					  "text-halo-width": 1,
					  "text-halo-blur": 1
				  }
			  });


			//test whether ie or not
			function detectIE() {
				  var ua = window.navigator.userAgent;

				  var msie = ua.indexOf('MSIE ');
				  if (msie > 0) {
					// IE 10 or older => return version number
					return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
				  }

				  var trident = ua.indexOf('Trident/');
				  if (trident > 0) {
					// IE 11 => return version number
					var rv = ua.indexOf('rv:');
					return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
				  }

				  var edge = ua.indexOf('Edge/');
				  if (edge > 0) {
					// Edge (IE 12+) => return version number
					return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
				  }

				  // other browser
				  return false;
			}


			if(detectIE()){
				onMove = onMove.debounce(200);
				onLeave = onLeave.debounce(200);
			};

			//Highlight stroke on mouseover (and show area information)
			map.on("mousemove", "area", onMove);

			// Reset the state-fills-hover layer's filter when the mouse leaves the layer.
			map.on("mouseleave", "area", onLeave);

			//Add click event
			map.on("click", "area", onClick);




		}


		function updateLayers() {

			//update properties to the geojson based on the csv file we've read in
			areas.features.map(function(d,i) {

			  d.properties.fill = color(rateById[d.properties.AREACD])
			});

			//Reattach geojson data to area layer
			map.getSource('area').setData(areas);

			//set up style object
			styleObject = {
									type: 'identity',
									property: 'fill'
						}
			//repaint area layer map usign the styles above
			map.setPaintProperty('area', 'fill-color', styleObject);

		}


		function onchange(i) {

			chartDrawn = false;

			//load new csv file

			filepth = "data/data" + i + ".csv"

			d3.csv(filepth, function(data) {

				setRates(data);
				defineBreaks(data);
				setupScales(data);
				createKey(config);

				if(selected) {
					setAxisVal($("#areaselect").val());
					if(mobile == false) {
						updateChart($("#areaselect").val());
					}
				}
				updateLayers();

				dataLayer.push({
            'event': 'navSelect',
            'selected': i
        })
			});



		}


		function setButtons() {
			d3.select("#play").on("click", function() {
				dataLayer.push({
            'event': 'playButton',
            'selected': 'play'
        })

				animating = setInterval(function(){animate()}, 2000);
				d3.selectAll(".btn--neutral").classed("btn--neutral-disabled",true)

				d3.select("#playImage").attr("src","images/pause.svg");

				d3.select("#play").attr("id","pause");

				d3.select("#pause").on("click", function(){
					dataLayer.push({
							'event': 'playButton',
							'selected': 'pause'
					})

						d3.select("#pause").attr("id","play")
						d3.select("#playImage").attr("src","images/play.svg");
						setButtons();
						clearInterval(animating);
						d3.selectAll(".btn--neutral").classed("btn--neutral-disabled",false)
				});


			})

			d3.select("#forward").on("click", animate);

			d3.select("#back").on("click", rev_animate);

		}

		function animate() {

			if(a < variables.length -1) {
				a = a + 1;
				setRates(data);
				updateLayers();
				updateTimeLabel();

				if(selected) {
					setAxisVal($("#areaselect").val());
					if(mobile == false) {
						updateChart($("#areaselect").val());
					}
				}
			} else {
				a = 0;
				setRates(data);
				updateLayers();
				updateTimeLabel();

				if(selected) {
					setAxisVal($("#areaselect").val());
					if(mobile == false) {
						updateChart($("#areaselect").val());
					}
				}
			}

		}

		function rev_animate() {

			if(a > 0 ) {
				a = a - 1;
				setRates(data);
				updateLayers();
				updateTimeLabel();

				if(selected) {
					setAxisVal($("#areaselect").val());
					if(mobile == false) {
						updateChart($("#areaselect").val());
					}
				}
			} else {
				a = variables.length-1;
				setRates(data);
				updateLayers();
				updateTimeLabel();

				if(selected) {
					setAxisVal($("#areaselect").val());
					if(mobile == false) {
						updateChart($("#areaselect").val());
					}
				}
			}

		}

		function updateTimeLabel(){

			d3.select("#timePeriod").text(dvc.timepoints[a])

		}

		function onselect() {
			b = $(".dropdown").val();
			onchange(b);

		}


		function onMove(e) {
				map.getCanvasContainer().style.cursor = 'pointer';

				newAREACD = e.features[0].properties.AREACD;

				if(firsthover) {
            dataLayer.push({
                'event': 'mapHoverSelect',
                'selected': newAREACD
            })

            firsthover = false;
        }

				if(newAREACD != oldAREACD) {
					oldAREACD = e.features[0].properties.AREACD;
					map.setFilter("state-fills-hover", ["==", "AREACD", e.features[0].properties.AREACD]);

					selectArea(e.features[0].properties.AREACD);
					setAxisVal(e.features[0].properties.AREACD);
					if(mobile == false) {
						updateChart(e.features[0].properties.AREACD);
					}
				}
		};


		function onLeave() {
				map.getCanvasContainer().style.cursor = null;
				map.setFilter("state-fills-hover", ["==", "AREACD", ""]);
				oldAREACD = "";
				$("#areaselect").val(null).trigger('change.select2');
				hideaxisVal();
		};

		function onClick(e) {
				disableMouseEvents();
				newAREACD = e.features[0].properties.AREACD;

				if(newAREACD != oldAREACD) {
					oldAREACD = e.features[0].properties.AREACD;
					map.setFilter("state-fills-hover", ["==", "AREACD", e.features[0].properties.AREACD]);

					selectArea(e.features[0].properties.AREACD);
					setAxisVal(e.features[0].properties.AREACD);
					if(mobile == false) {
						updateChart(e.features[0].properties.AREACD);
					}
				}

				dataLayer.push({
            'event':'mapClickSelect',
            'selected': newAREACD
        })

		};

		function disableMouseEvents() {
				map.off("mousemove", "area", onMove);
				map.off("mouseleave", "area", onLeave);

				selected = true;
		}

		function enableMouseEvents() {
				map.on("mousemove", "area", onMove);
				map.on("click", "area", onClick);
				map.on("mouseleave", "area", onLeave);

				selected = false;
		}

		function selectArea(code) {
			$("#areaselect").val(code).trigger('change.select2');
		}

		$('#areaselect').on('select2:unselect', function () {
            dataLayer.push({
                'event': 'deselectCross',
                'selected': 'deselect'
            })
    });

		function zoomToArea(code) {

			specificpolygon = areas.features.filter(function(d) {return d.properties.AREACD == code})

			specific = turf.extent(specificpolygon[0].geometry);

			map.fitBounds([[specific[0],specific[1]], [specific[2], specific[3]]], {
  				padding: {top: 150, bottom:150, left: 100, right: 100}
			});

		}

		function resetZoom() {

			map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]]);

		}


		function setAxisVal(code) {
			if(mobile == false) {
				d3.select("#currLine")
					.style("opacity", function(){if(!isNaN(rateById[code])) {return 1} else{return 0}})
					.transition()
					.duration(300)
					.attr("y1", function(){if(!isNaN(rateById[code])) {return y(rateById[code])} else{return y(midpoint)}})
					.attr("y2", function(){if(!isNaN(rateById[code])) {return y(rateById[code])} else{return y(midpoint)}});

				d3.select("#currVal")
					.text(function(){if(!isNaN(rateById[code]))  {return displayformat(rateById[code])} else {return "Data unavailable"}})
					.style("opacity",1)
					.transition()
					.duration(300)
					.attr("y", function(){if(!isNaN(rateById[code])) {return y(rateById[code])+5} else{return y(midpoint)}});

				d3.select("#currPoint")
					.text(function(){if(!isNaN(rateById[code]))  {return displayformat(rateById[code])} else {return "Data unavailable"}})
					.style("opacity", function(){if(!isNaN(rateById[code]))  {return 1} else {return 0}})
					.transition()
					.duration(300)
					.attr("cx", x(dvc.timepoints[a]))
					.attr("cy", function(){if(!isNaN(rateById[code])) {return y(rateById[code])} else{return 0}});
			} else {

			d3.select("#currLine")
				.style("opacity", function(){if(!isNaN(rateById[code])) {return 1} else{return 0}})
				.transition()
				.duration(400)
				.attr("x1", function(){if(!isNaN(rateById[code])) {return xkey(rateById[code])} else{return xkey(midpoint)}})
				.attr("x2", function(){if(!isNaN(rateById[code])) {return xkey(rateById[code])} else{return xkey(midpoint)}});


			d3.select("#currVal")
				.text(function(){if(!isNaN(rateById[code]))  {return displayformat(rateById[code])} else {return "Data unavailable"}})
				.style("opacity",1)
				.transition()
				.duration(400)
				.attr("x", function(){if(!isNaN(rateById[code])) {return xkey(rateById[code])} else{return xkey(midpoint)}});
			}

		}

		function updateChart(code) {

			if(chartDrawn == false) {

				chartDrawn = true;


				selectedarea = data.filter(function(d) {return d.AREACD == code});

				selectedarea.forEach(function(d) {
					  valuesx = variables.map(function(name) { return +d[name]});
				});

				values = valuesx.slice(0);

				linedata = d3.zip(dvc.timepoints,values);

				line1 = d3.line()
					.defined(function(linedata) { return !isNaN(linedata[1]); })
					.x(function(d,i) { return x(linedata[i][0]); })
					.y(function(d,i) { return y(linedata[i][1]); });

				svgkey.append("g")
					.attr("transform", "translate(45,10)")
					.attr("id","chartgroup")
					.append("path")
					.attr("id","line1")
					.style("opacity",1)
					.attr("d", line1(linedata))
					.attr("stroke", "#666")
					.attr("stroke-width", "2px")
					.attr("fill","none");



			} else {

				selectedarea = data.filter(function(d) {return d.AREACD == code});

				selectedarea.forEach(function(d) {
					  valuesx = variables.map(function(name) { return +d[name]});
				});

				values = valuesx.slice(0);

				linedata = d3.zip(dvc.timepoints,values);

				d3.select("#line1")
					.style("opacity",1)
					.transition()
					.duration(300)
					.attr("d", line1(linedata))

			}

		}

		function hideaxisVal() {
			d3.select("#line1")
				.style("opacity",0);

			d3.select("#currPoint")
				.style("opacity",0);

			d3.select("#currLine")
				.style("opacity",0);

			d3.select("#currVal").text("")
				.style("opacity",0);
		}

		function createKey(config){

			d3.select("#keydiv").selectAll("*").remove();

			var color = d3.scaleThreshold()
			   .domain(breaks)
			   .range(colour);

			if(mobile == false) {

				d3.select("#keydiv").append("p").attr("id","keyunit").style("margin-top","25px").style("margin-left","10px").text(dvc.varunit[b]);

				keyheight = 150;

				keywidth = d3.select("#keydiv").node().getBoundingClientRect().width;

				svgkey = d3.select("#keydiv")
					.append("svg")
					.attr("id", "key")
					.attr("width", keywidth)
					.attr("height",keyheight + 30);

				// Set up scales for legend
				y = d3.scaleLinear()
					.domain([breaks[0], breaks[dvc.numberBreaks]]) /*range for data*/
					.range([keyheight, 0]); /*range for pixels*/

				// Set up scales for chart
				x = d3.scalePoint()
					.domain(dvc.timepoints) /*range for data*/
					.range([0,keywidth-60])
					.align(0.5); /*range for pixels*/


				var yAxis = d3.axisLeft(y)
					.tickSize(15)
					.tickValues(color.domain())
					.tickFormat(legendformat);

				var xAxisTime = d3.axisBottom(x)
					.tickSize(5)
					.tickValues([dvc.timepoints[0], dvc.timepoints[dvc.timepoints.length-1]])
					.tickFormat(legendformat);

				var g = svgkey.append("g").attr("id","vert")
					.attr("transform", "translate(45,10)")
					.attr("font-weight","600")
					.style("font-family","'open sans'")
					.style("font-size","12px");


				g.selectAll("rect")
				.data(color.range().map(function(d, i) {
				  return {
					y0: i ? y(color.domain()[i]) : y.range()[0],
					y1: i < color.domain().length ? y(color.domain()[i+1]) : y.range()[1],
					z: d
				  };
				}))
				.enter().append("rect")
				.attr("width", 8)
				.attr("x", -8)
				.attr("y", function(d) {return d.y1; })
				.attr("height", function(d) {return d.y0 - d.y1; })
				.style("fill", function(d) {return d.z; });

				g.call(yAxis).append("text");

				svgkey.append("g").attr("id","timeaxis")
					.attr("transform", "translate(45," + (10 + keyheight) + ")")
					.attr("font-weight","600")
					.style("font-family","'open sans'")
					.style("font-size","12px")
					.call(xAxisTime)

				d3.selectAll("path").attr("display","none")

				g.append("line")
					.attr("id", "currLine")
					.attr("y1", y(10))
					.attr("y2", y(10))
					.attr("x1", -10)
					.attr("x2", 0)
					.attr("stroke-width","2px")
					.attr("stroke","#000")
					.attr("opacity",0);

				g.append("text")
					.attr("id", "currVal")
					.attr("y", y(10)+5)
					.attr("x", -15)
					.attr("fill","#000")
					.attr("paint-order","stroke")
					.attr("stroke","#fff")
					.attr("stroke-width","5px")
					.attr("stroke-linecap","butt")
					.attr("stroke-linejoin","miter")
					.text("");


				g.append("circle")
					.attr("id", "currPoint")
					.attr("r","4px")
					.attr("cy", y(10))
					.attr("cx", x(dvc.timepoints[a]))
					.attr("fill","#666")
					.attr("opacity",0);

			} else {
				// Horizontal legend
				keyheight = 65;

				keywidth = d3.select("#keydiv").node().getBoundingClientRect().width;

				svgkey = d3.select("#keydiv")
					.append("svg")
					.attr("id", "key")
					.attr("width", keywidth)
					.attr("height",keyheight);


				xkey = d3.scaleLinear()
					.domain([breaks[0], breaks[dvc.numberBreaks]]) /*range for data*/
					.range([0,keywidth-30]); /*range for pixels*/

				y = d3.scaleLinear()
					.domain([breaks[0], breaks[dvc.numberBreaks]]) /*range for data*/
					.range([0, keywidth-30]); /*range for pixels*/

				var xAxis = d3.axisBottom(xkey)
					.tickSize(15)
					.tickValues(color.domain())
					.tickFormat(legendformat);

				var g2 = svgkey.append("g").attr("id","horiz")
					.attr("transform", "translate(15,30)");


				keyhor = d3.select("#horiz");

				g2.selectAll("rect")
					.data(color.range().map(function(d,i) {

					  return {
						x0: i ? xkey(color.domain()[i+1]) : xkey.range()[0],
						x1: i < color.domain().length ? xkey(color.domain()[i+1]) : xkey.range()[1],
						z: d
					  };
					}))
				  .enter().append("rect")
					.attr("class", "blocks")
					.attr("height", 8)
					.attr("x", function(d) {
						 return d.x0; })
					.attr("width", function(d) {return d.x1 - d.x0; })
					.style("opacity",0.8)
					.style("fill", function(d) { return d.z; });


				g2.append("line")
					.attr("id", "currLine")
					.attr("x1", xkey(10))
					.attr("x2", xkey(10))
					.attr("y1", -10)
					.attr("y2", 8)
					.attr("stroke-width","2px")
					.attr("stroke","#000")
					.attr("opacity",0);

				g2.append("text")
					.attr("id", "currVal")
					.attr("x", xkey(10))
					.attr("y", -15)
					.attr("fill","#000")
					.text("");



				keyhor.selectAll("rect")
					.data(color.range().map(function(d, i) {
					  return {
						x0: i ? xkey(color.domain()[i]) : xkey.range()[0],
						x1: i < color.domain().length ? xkey(color.domain()[i+1]) : xkey.range()[1],
						z: d
					  };
					}))
					.attr("x", function(d) { return d.x0; })
					.attr("width", function(d) { return d.x1 - d.x0; })
					.style("fill", function(d) { return d.z; });

				keyhor.call(xAxis).append("text")
					.attr("id", "caption")
					.attr("x", -63)
					.attr("y", -20)
					.text("");

				keyhor.append("rect")
					.attr("id","keybar")
					.attr("width",8)
					.attr("height",0)
					.attr("transform","translate(15,0)")
					.style("fill", "#ccc")
					.attr("x",xkey(0));


				d3.select("#keydiv").append("p").attr("id","keyunit").style("margin-top","-10px").style("margin-left","10px").text(dvc.varunit[b]);

				if(dvc.dropticks) {
					d3.select("#horiz").selectAll("text").attr("transform",function(d,i){
							// if there are more that 4 breaks, so > 5 ticks, then drop every other.
							if(i % 2){return "translate(0,10)"} }
					);
				}
			}



	} // Ends create key

	function addFullscreen() {

		currentBody = d3.select("#map").style("height");
		d3.select(".mapboxgl-ctrl-fullscreen").on("click", setbodyheight)

	}

	function setbodyheight() {
		d3.select("#map").style("height","100%");

		document.addEventListener('webkitfullscreenchange', exitHandler, false);
		document.addEventListener('mozfullscreenchange', exitHandler, false);
		document.addEventListener('fullscreenchange', exitHandler, false);
		document.addEventListener('MSFullscreenChange', exitHandler, false);

	}


	function exitHandler() {

			if (document.webkitIsFullScreen === false)
			{
				shrinkbody();
			}
			else if (document.mozFullScreen === false)
			{
				shrinkbody();
			}
			else if (document.msFullscreenElement === false)
			{
				shrinkbody();
			}
		}

	function shrinkbody() {
		d3.select("#map").style("height",currentBody);
		pymChild.sendHeight();
	}

	function geolocate() {
		dataLayer.push({
                'event': 'geoLocate',
                'selected': 'geolocate'
    })

		var options = {
		  enableHighAccuracy: true,
		  timeout: 5000,
		  maximumAge: 0
		};

		navigator.geolocation.getCurrentPosition(success, error, options);
	}

	function success(pos) {
	  crd = pos.coords;

	  //go on to filter
	  //Translate lng lat coords to point on screen
	  point = map.project([crd.longitude,crd.latitude]);

	  //then check what features are underneath
	  var features = map.queryRenderedFeatures(point);

	  //then select area
	  disableMouseEvents();

	  map.setFilter("state-fills-hover", ["==", "AREACD", features[0].properties.AREACD]);

	  selectArea(features[0].properties.AREACD);
	  setAxisVal(features[0].properties.AREACD);
	  if(mobile == false) {
			updateChart(e.features[0].properties.AREACD);
	  }


	};

	function setSource() {
		d3.select("#source").text("Source: " + dvc.sourcetext);
	}

		function selectlist(datacsv) {

			var areacodes =  datacsv.map(function(d) { return d.AREACD; });
			var areanames =  datacsv.map(function(d) { return d.AREANM; });
			var menuarea = d3.zip(areanames,areacodes).sort(function(a, b){ return d3.ascending(a[0], b[0]); });

			// Build option menu for occupations
			var optns = d3.select("#selectNav").append("div").attr("id","sel").append("select")
				.attr("id","areaselect")
				.attr("style","width:98%")
				.attr("class","chosen-select");


			optns.append("option")


			optns.selectAll("p").data(menuarea).enter().append("option")
				.attr("value", function(d){ return d[1]})
				.text(function(d){ return d[0]});

			myId=null;

		 $('#areaselect').select2({placeholder:"Select an area",allowClear:true,dropdownParent:$('#sel')})

			$('#areaselect').on('change',function(){

					if($('#areaselect').val() != "") {

							areacode = $('#areaselect').val()

							disableMouseEvents();

							map.setFilter("state-fills-hover", ["==", "AREACD", areacode]);

							selectArea(areacode);
							setAxisVal(areacode);
							if(mobile == false) {
								updateChart(areacode);
							}
							zoomToArea(areacode);

							dataLayer.push({
                  'event': 'mapDropSelect',
                  'selected': areacode
              })
					}
					else {
							enableMouseEvents();
							hideaxisVal();
							onLeave();
							resetZoom();
					}

			});

	};

	}

} else {
	//provide fallback for browsers that don't support webGL
	d3.select('#map').remove();
	d3.select('body').append('p').html("Unfortunately your browser does not support WebGL. <a href='https://www.gov.uk/help/browsers' target='_blank>'>If you're able to please upgrade to a modern browser</a>")

}
