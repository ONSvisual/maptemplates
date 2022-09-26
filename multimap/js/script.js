//test if browser supports webGL

if(Modernizr.webgl) {

	//setup pymjs
	var pymChild = new pym.Child();

	//Load data and config file
	d3.queue()
		.defer(d3.csv, "data/data.csv")
		.defer(d3.json, "data/config.json")
		.defer(d3.json, "data/geog.json")
		.await(ready);


	function ready (error, data, config, geog){

		//Set up global variables
		dvc = config.ons;
		oldAREACD = "";
		selected = false;
		firsthover = true;

		//Get column names
		variables = [];
		for (var column in data[0]) {
			if (column == 'AREACD') continue;
			if (column == 'AREANM') continue;
			variables.push(column);
		}




		a = dvc.varload;


		//BuildNavigation
		if(dvc.varlabels.length > 1)	{
			buildNav();
		}
		//set title of page
		//Need to test that this shows up in GA
		document.title = dvc.maptitle;

		//Fire design functions
		selectlist(data);

		//Set up number formats
		displayformat = d3.format("." + dvc.displaydecimals + "f");
		legendformat = d3.format("." + dvc.legenddecimals + "f")
		formatPercent=d3.format(".0f");

		//set up basemap
		map = new mapboxgl.Map({
		  container: 'map', // container id
		  style: 'data/style.json', //stylesheet location //includes key for API
		  center: [-2.5, 54], // starting position
		  minZoom: 3.5,//
		  zoom: 4.5, // starting zoom
		  maxZoom: 13, //
		  attributionControl: false //
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

		defineBreaks();

		setupScales();

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
		  if(!isNaN(rateById[d.properties.AREACD]))
		  	{d.properties.fill = color(rateById[d.properties.AREACD])}
		  else {d.properties.fill = '#ccc'};
		});

		map.on('load', defineLayers);

		if ($('html').hasClass('touch')) {
			map.scrollZoom.disable();
			map.dragPan.disable();
		};

		function buildNav() {

			fieldset=d3.select('#nav').append('fieldset');

			fieldset
			.append('legend')
			.attr('class','visuallyhidden')
			.html('Choose a variable');

			fieldset
			.append("div")
			.attr('class','visuallyhidden')
			.attr('aria-live','polite')
			.append('span')
			.attr('id','selected');

			grid=fieldset.append('div')
			.attr('class','grid grid--full large-grid--fit');

			cell=grid.selectAll('div')
			.data(dvc.varlabels)
			.enter()
			.append('div')
			.attr('class','grid-cell');

			cell.append('input')
			.attr('type','radio')
			.attr('class','visuallyhidden')
			.attr('id',function(d,i){return 'button'+i;})
			.attr('value',function(d,i){return i;})
			.attr('name','button');

			cell.append('label')
			.attr('for',function(d,i){return 'button'+i;})
			.append('div')
					.html(function(d){return d;});

			d3.selectAll('input[type="radio"]').on('change', function(d) {
				onchange(document.querySelector('input[name="button"]:checked').value);
				d3.select('#selected').text(dvc.varlabels[document.querySelector('input[name="button"]:checked').value] + " is selected");
			});

			d3.select('#button'+dvc.varload).property('checked',true);
			d3.select('#selected').text(dvc.varlabels[document.querySelector('input[name="button"]:checked').value] + " is selected");

		// formgroup = d3.select('#nav')
		// 			.append('form')
		// 			.attr('class','btn-form-fullwidth')
		// 			.attr('role','radiogroup')
		// 			.selectAll('div')
		// 			.data(dvc.varlabels)
		// 			.enter()
		// 			.append('div')
		// 			.attr("class",'form-group-fullwidth')
		// 			.attr("role","radio")
		// 			.attr("tabindex", function(d,i){return 0})
		//
		// formgroup.append('input')
		// 	.attr("id",function(d,i){return "button" + i})
		// 	.attr('class','radio-primary-fullwidth')
		// 	.attr("type","radio")
		// 	.attr("name","button")
		// 	.attr("value",function(d,i){return i})
		// 	.attr("aria-checked", function(d,i){if(i == dvc.varload){return "true"}})
		// 	.property("checked", function(d, i) {return i===dvc.varload;})
		//
		// formgroup.append('label')
		// 	.attr('class','label-primary-fullwidth')
		// 	.attr("for",function(d,i){return "button" + i})
		// 	.text(function(d,i){return dvc.varlabels[i]})
		// 	.on('click',function(d,i){onchange(i)})
		d3.select('#selectnav').append('label')
		.attr('for','dropdown')
		.attr('class','visuallyhidden')
		.text('Choose a variable')

		selectgroup = d3.select('#selectnav')
						.append('select')
						.attr('class','dropdown')
						.attr('id','dropdown')
						.on('change', onselect)
						.selectAll("option")
						.data(dvc.varlabels)
						.enter()
						.append('option')
						.attr("value", function(d,i){return i})
						.property("selected", function(d, i) {return i===dvc.varload;})
						.text(function(d,i){return dvc.varlabels[i]});


		}

		function defineBreaks(){

			rateById = {};
			areaById = {};

			data.forEach(function(d) {rateById[d.AREACD] = +d[variables[a]]; areaById[d.AREACD] = d.AREANM}); //change to brackets


			//Flatten data values and work out breaks
			if(config.ons.breaks[a] =="jenks" || config.ons.breaks[a] =="equal") {
				var values =  data.map(function(d) { return +d[variables[a]]; }).filter(function(d) {return !isNaN(d)}).sort(d3.ascending);
			};

			if(config.ons.breaks[a] =="jenks") {
				breaks = [];

				ss.ckmeans(values, (dvc.numberBreaks[a])).map(function(cluster,i) {
					if(i<dvc.numberBreaks[a]-1) {
						breaks.push(cluster[0]);
						//console.log(cluster[0])
					} else {
						breaks.push(cluster[0])
						//if the last cluster take the last max value
						breaks.push(cluster[cluster.length-1]);
						//console.log(cluster[cluster.length-1])
					}
				});
			}
			else if (config.ons.breaks[a] == "equal") {
				breaks = ss.equalIntervalBreaks(values, dvc.numberBreaks[a]);
			}
			else {breaks = config.ons.breaks[a];};

//console.log(breaks);
			//round breaks to specified decimal places
			breaks = breaks.map(function(each_element){
				return Number(each_element.toFixed(dvc.legenddecimals));
			});

			//work out halfway point (for no data position)
			midpoint = breaks[0] + ((breaks[dvc.numberBreaks[a]] - breaks[0])/2)


		}

		function setupScales() {
			//set up d3 color scales
			//Load colours
			if(typeof dvc.varcolour[a] === 'string') {
				color=chroma.scale(dvc.varcolour[a]).colors(dvc.numberBreaks[a])
				colour=[]
				color.forEach(function(d){colour.push(chroma(d).darken(0.4).saturate(0.6).hex())})
				// colour = colorbrewer[dvc.varcolour[a]][dvc.numberBreaks];
			} else {
				colour = dvc.varcolour[a];
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
				  'touchAction':'none',
				  'layout': {},
				  'paint': {
					  'fill-color': {
							type: 'identity',
							property: 'fill'
					   },
					  'fill-opacity': 0.8,
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
					  "text-size": 16
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
			   if(!isNaN(rateById[d.properties.AREACD]))
			    {d.properties.fill = color(rateById[d.properties.AREACD])}
			   else {d.properties.fill = '#ccc'};

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

			a = i;

			defineBreaks();
			setupScales();
			createKey(config);

			if(selected) {
				setAxisVal($("#areaselect").val());
			}
			updateLayers();
		}

		function onselect() {
			a = $(".dropdown").val();
			onchange(a);
		}


		function onMove(e) {
			// console.log(e)

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

				}
		};


		function onLeave() {
				map.getCanvasContainer().style.cursor = null;
				map.setFilter("state-fills-hover", ["==", "AREACD", ""]);
				oldAREACD = "";
				$("#areaselect").val(null).trigger('chosen:updated');
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
			$("#areaselect").val(code).trigger('chosen:updated');
			d3.select('abbr').on('keypress',function(evt){
				if(d3.event.keyCode==13 || d3.event.keyCode==32){
					d3.event.preventDefault();
					onLeave();
					resetZoom();
				}
			})
		}


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
			d3.select('#accessibilityInfo').select('p.visuallyhidden')
			.text(function(){
				if (!isNaN(rateById[code])) {
					return areaById[code]+": "+ displayformat(rateById[code]) +" "+ dvc.varunit[a];
				} else {
					return "Data unavailable";
				}
			});


			d3.select("#currLine")
				.style("opacity", function(){if(!isNaN(rateById[code])) {return 1} else{return 0}})
				.transition()
				.duration(400)
				.attr("x1", function(){if(!isNaN(rateById[code])) {return x(rateById[code])} else{return x(midpoint)}})
				.attr("x2", function(){if(!isNaN(rateById[code])) {return x(rateById[code])} else{return x(midpoint)}});


			d3.select("#currVal")
				.text(function(){if(!isNaN(rateById[code]))  {return displayformat(rateById[code])+"%"} else {return "Data unavailable"}})
				.style("opacity",1)
				.transition()
				.duration(400)
				.attr("x", function(){if(!isNaN(rateById[code])) {return x(rateById[code])} else{return x(midpoint)}});

			//	d3.select("#currVal2")
			//		.text(function(){if(!isNaN(rateById[code]))  {return displayformat(rateById[code])} else {return "Data unavailable"}})
			//		.style("opacity",1)
			//		.transition()
			//		.duration(400)
			//		.attr("x", "13px");



		}

		function hideaxisVal() {
			d3.select("#currLine")
				.style("opacity",0)

			d3.select("#currVal").text("")
				.style("opacity",0)
		}

		function createKey(config){

			d3.select("#keydiv").selectAll("*").remove();

			keywidth1 = d3.select("#keydiv").node().getBoundingClientRect().width;
			var keywidth = keywidth1+10


			var svgkey = d3.select("#keydiv")
				.append("svg")
				.attr("id", "key")
				.attr('aria-hidden',true)
				.attr("width", keywidth)
				.attr("height",80);


			var color = d3.scaleThreshold()
			   .domain(breaks)
			   .range(colour);

			// Set up scales for legend
			x = d3.scaleLinear()
				.domain([breaks[0], breaks[dvc.numberBreaks[a]]]) /*range for data*/
				.range([0,keywidth-50]); /*range for pixels*/


			var xAxis = d3.axisBottom(x)
				.tickSize(14)
				.tickValues(color.domain())
				.tickFormat(formatPercent);


			var g2 = svgkey.append("g").attr("id","horiz")
				.attr("transform", "translate(15,35)");



			keyhor = d3.select("#horiz");

			g2.selectAll("rect")
				.data(color.range().map(function(d,i) {

				  return {
					x0: i ? x(color.domain()[i+1]) : x.range()[0],
					x1: i < color.domain().length ? x(color.domain()[i+1]) : x.range()[1],
					z: d
				  };
				}))
			  .enter().append("rect")
				.attr("class", "blocks")
				.attr("height", 14)
				.attr("x", function(d) {
					 return d.x0; })
				.attr("width", function(d) {return d.x1 - d.x0; })
				.style("opacity",0.8)
				.style("fill", function(d) { return d.z; });


			g2.append("line")
				.attr("id", "currLine")
				.attr("x1", x(10))
				.attr("x2", x(10))
				.attr("y1", -5)
				.attr("y2", 14)
				.attr("stroke-width","2px")
				.attr("stroke","#000")
				.attr("opacity",0);

			g2.append("text")
				.attr("id", "currVal")
				.attr("x", x(10))
				.attr("y", -10)
				.attr("fill","#000")
				.text("");

				// g2.append("text")
				// 	.attr("id", "currVal2")
				// 	.attr("x", x(10))
				// 	.attr("y", -10)
				// 	.attr("fill","#000")
				// 	.text("");

			keyhor.selectAll("rect")
				.data(color.range().map(function(d, i) {
				  return {
					x0: i ? x(color.domain()[i]) : x.range()[0],
					x1: i < color.domain().length ? x(color.domain()[i+1]) : x.range()[1],
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
				.attr("x",x(0));


				d3.selectAll(".tick")
				.attr("class",function(d,i){ return "ticky ticky"+i
				})
				d3.selectAll(".ticky5")
				.append("text")
				.attr("x","9")
				.attr("y","27")
				.style("text-anchor","start")
				.text("%")

				// d3.selectAll("#currVal")
				// .append("text")
				// .attr("x","9")
				// .attr("y","27")
				// .style("text-anchor","start")
				// .text("%")


				d3.selectAll(".ticky2").selectAll("text")
				.attr("transform","translate(-3,0)")
				d3.selectAll(".ticky3").selectAll("text")
				.attr("transform","translate(2,0)")

			if(dvc.dropticks) {
				d3.select("#horiz").selectAll("text").attr("transform",function(d,i){
						// if there are more that 4 breaks, so > 5 ticks, then drop every other.
						if(i % 2){return "translate(0,13)"} }
				);
			}


			//if(dvc.dropticks) {
			//	d3.select("#horiz").selectAll("line").style("stroke",function(d,i){
						// if there are more that 4 breaks, so > 5 ticks, then drop every other.
		//				if(i % 2){return "red"} }
		//		);
		//	}


			if(dvc.dropticks) {
				d3.select("#horiz").selectAll("line").attr("transform",function(d,i){
						// if there are more that 4 breaks, so > 5 ticks, then drop every other.
						if(i % 2){return "scale(1,1.7)"} }
				);
			}

			//label the units
			d3.select("#keydiv").append("p").attr("id","keyunit").attr('aria-hidden',true)
			.style("margin-top","-12px").style("margin-left","10px")
			.style('font-size','14px').text(dvc.varunit[a]);


			d3.select("#key").attr("class","c2")

			if(dvc.dropticks) {
				d3.select("#keyunit").style("margin-top","-8px")

d3.select("#key").attr("class","c1")
				}
				// d3.selectAll("#horiz")

		//   .select("text")
		//   .text("'08")


	} // Ends create key


	//couldn't get this to work
		d3.selectAll("#horiz")
		.selectAll(".tick")
		  .attr("class",function(d,i){ return "ticky ticky"+i
		  })
		  d3.selectAll(".ticky0")

	pymChild.sendHeight();

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


	};

		function selectlist(datacsv) {

			var areacodes =  datacsv.map(function(d) { return d.AREACD; });
			var areanames =  datacsv.map(function(d) { return d.AREANM; });
			var menuarea = d3.zip(areanames,areacodes).sort(function(a, b){ return d3.ascending(a[0], b[0]); });

			// Build option menu for occupations
			var optns = d3.select("#selectNav").append("div").attr("id","sel").append("select")
				.attr("id","areaselect")
				.attr("style","width:calc(100% - 6px)")
				.attr("class","chosen-select");

			optns.append("option")
				// .attr("value","first")
				// .text("");

			optns.selectAll("p").data(menuarea).enter().append("option")
				.attr("value", function(d){ return d[1]})
				.attr("id",function(d){return d[1]})
				.text(function(d){ return d[0]});

			myId=null;

			 $('#areaselect').chosen({placeholder_text_single:"Select an area",allow_single_deselect:true})

			 d3.select('input.chosen-search-input').attr('id','chosensearchinput')
	     d3.select('div.chosen-search').insert('label','input.chosen-search-input').attr('class','visuallyhidden').attr('for','chosensearchinput').html("Type to select an area")

			$('#areaselect').on('change',function(){

					if($('#areaselect').val() != "") {
							areacode = $('#areaselect').val()

							disableMouseEvents();

							map.setFilter("state-fills-hover", ["==", "AREACD", areacode]);

							selectArea(areacode);
							setAxisVal(areacode);
							zoomToArea(areacode);

							dataLayer.push({
                  'event': 'mapDropSelect',
                  'selected': areacode
              })
					}
					else {
							dataLayer.push({
									'event': 'deselectCross',
									'selected': 'deselect'
							})

							enableMouseEvents();
							hideaxisVal();
							onLeave();
							resetZoom();
					}
			});
	};//end selectlist
}//end ready

} else {

	//provide fallback for browsers that don't support webGL
	d3.select('#map').remove();
	d3.select('body').append('p').html("Unfortunately your browser does not support WebGL. <a href='https://www.gov.uk/help/browsers' target='_blank>'>If you're able to please upgrade to a modern browser</a>")

}
