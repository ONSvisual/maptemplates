
//test if browser supports webGL

if(Modernizr.webgl) {

	//setup pymjs
	var pymChild = new pym.Child();

	//Load data and config file
	d3.queue()
		.defer(d3.csv, "data/data.csv")
		.defer(d3.json, "data/config.json")
		.defer(d3.json, "data/geogEngCUA2.json")
		//.defer(d3.csv, "data/datapay.csv")

		.await(ready);


	function ready (error, data, config, geog){
		graphic_data = data;
		//Set up global variables
		dvc = config.ons;
		oldAREACD = "";
		firsthover = true;


		//get column name
		for (var column in data[0]) {
			if (column == 'AREACD') continue;
			if (column == 'AREANM') continue;
			if (column == 'id') continue;
			//if (column == 'unique') continue;
			dvc.varname = column;
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
		  style: 'data/style.json', //stylesheet location
		  center: [-2.5, 54], // starting position
		  zoom: 4.5, // starting zoom
		  maxZoom: 13, //
		  attributionControl: false
		});
		//add fullscreen option
		map.addControl(new mapboxgl.FullscreenControl());

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



		addFullscreen();

		//set up d3 color scales

		rateById = {};
		areaById = {};

		data.forEach(function(d) { rateById[d.AREACD] = +eval("d." + dvc.varname); areaById[d.AREACD] = d.AREANM});


		//Flatten data values and work out breaks
		var values =  data.map(function(d) { return +eval("d." + dvc.varname); }).filter(function(d) {return !isNaN(d)}).sort(d3.ascending);

		if(config.ons.breaks =="jenks") {
			breaks = [];

			ss.ckmeans(values, (dvc.numberBreaks)).map(function(cluster,i) {
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
			breaks = ss.equalIntervalBreaks(values, dvc.numberBreaks);
		}
		else {breaks = config.ons.breaks;};


		//round breaks to specified decimal places
		breaks = breaks.map(function(each_element){
			return Number(each_element.toFixed(dvc.legenddecimals));
		});

		//work out halfway point (for no data position)
		midpoint = breaks[0] + ((breaks[dvc.numberBreaks] - breaks[0])/2)

		//Load colours
		if(typeof dvc.varcolour === 'string') {
			//colour = colorbrewer[dvc.varcolour][dvc.numberBreaks];

			color=chroma.scale(dvc.varcolour).colors(dvc.numberBreaks)
  			colour=[]
			  color.forEach(function(d){
				  colour.push(chroma(d).darken(0.4).saturate(0.6).hex())
			  })

		} else {
			colour = dvc.varcolour;
		}
//colour = dvc.essential.colour_palette
		//set up d3 color scales
		color = d3.scaleThreshold()
				.domain(breaks.slice(1))
				.range(colour);

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


		map.on('load', function() {

			map.addSource('area', { 'type': 'geojson', 'data': areas });

			  map.addLayer({
				  'id': 'area',
				  'type': 'fill',
				  'source': 'area',
				  'layout': {},
				  'paint': {
					  'fill-color': {
							type: 'identity',
							property: 'fill',
					   },
					  'fill-opacity': 0.7,
					  'fill-outline-color': '#fff'
				  }
			  });

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
			});

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

			  // Test values; Uncomment to check result …

			  // IE 10
			  // ua = 'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/6.0)';

			  // IE 11
			  // ua = 'Mozilla/5.0 (Windows NT 6.3; Trident/7.0; rv:11.0) like Gecko';

			  // Edge 12 (Spartan)
			  // ua = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/39.0.2171.71 Safari/537.36 Edge/12.0';

			  // Edge 13
			  // ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586';

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
				onMove = onMove.debounce(100);
				onLeave = onLeave.debounce(100);
				console.log("ie");
			};

			//Highlight stroke on mouseover (and show area information)
			map.on("mousemove", "area", onMove);

			// Reset the state-fills-hover layer's filter when the mouse leaves the layer.
			map.on("mouseleave", "area", onLeave);

			//Add click event
			map.on("click", "area", onClick);

			//get location on click
			d3.select(".mapboxgl-ctrl-geolocate").on("click",geolocate);

		});

		function onMove(e) {
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
					d3.selectAll(".cellsselected").classed("cellsselected",false)
					d3.select(".cell" + e.features[0].properties.AREACD).classed("cellsselected",true)
				}
		};


		function onLeave(e) {
				map.setFilter("state-fills-hover", ["==", "AREACD", ""]);
				oldAREACD = "";
				$("#areaselect").val("").trigger("chosen:updated");
				d3.selectAll(".cellsselected").classed("cellsselected",false)
				hideaxisVal();
		};

		function onClick(e) {
				disableMouseEvents();
				newAREACD = e.features[0].properties.AREACD;


				if(newAREACD != oldAREACD) {
					oldAREACD = e.features[0].properties.AREACD;
					map.setFilter("state-fills-hover", ["==", "AREACD", e.features[0].properties.AREACD]);

					d3.selectAll(".cellsselected").classed("cellsselected",false)
					d3.select(".cell" + e.features[0].properties.AREACD).classed("cellsselected",true)

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
			d3.selectAll(".cells path").style("pointer-events","none")

		}

		function enableMouseEvents() {
				map.on("mousemove", "area", onMove);
				map.on("click", "area", onClick);
				map.on("mouseleave", "area", onLeave);
			d3.selectAll(".cells path").style("pointer-events","all")
		}

		function selectArea(code) {
			//console.log(code)
			$("#areaselect").val(code).trigger("chosen:updated");
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
			d3.select("#currLine")
				.style("opacity", function(){if(!isNaN(rateById[code])) {return 1} else{return 0}})
				.transition()
				.duration(400)
				.attr("x1", function(){if(!isNaN(rateById[code])) {return xKey(rateById[code])} else{return xKey(midpoint)}})
				.attr("x2", function(){if(!isNaN(rateById[code])) {return xKey(rateById[code])} else{return xKey(midpoint)}});


			d3.select("#currVal")
				.text(function(){if(!isNaN(rateById[code]))  {return displayformat(rateById[code])} else {return "Data unavailable"}})
				.style("opacity",1)
				.transition()
				.duration(400)
				.attr("x", function(){
					if(!isNaN(rateById[code])) {
						//console.log(xKey(rateById[code]))
						return xKey(rateById[code])
					} else {
						return xKey(midpoint)
					}
				});

		}

		function hideaxisVal() {
			d3.select("#currLine")
				.style("opacity",0)

			d3.select("#currVal").text("")
				.style("opacity",0)
		}

		function createKey(config){

			keywidth = d3.select("#keydiv").node().getBoundingClientRect().width;

			var svgkey = d3.select("#keydiv")
				.append("svg")
				.attr("id", "key")
				.attr("width", keywidth)
				.attr("height",65);


			var color = d3.scaleThreshold()
			   .domain(breaks)
			   .range(colour);

			// Set up scales for legend
			xKey = d3.scaleLinear()
				.domain([breaks[0], breaks[dvc.numberBreaks]]) /*range for data*/
				.range([0,keywidth-30]); /*range for pixels*/


			var xAxisKey = d3.axisBottom(xKey)
				.tickSize(15)
				.tickValues(color.domain())
				.tickFormat(legendformat);

			var g2 = svgkey.append("g").attr("id","horiz")
				.attr("transform", "translate(15,30)");


			keyhor = d3.select("#horiz");

			g2.selectAll("rect")
				.data(color.range().map(function(d,i) {

				  return {
					x0: i ? xKey(color.domain()[i+1]) : xKey.range()[0],
					x1: i < color.domain().length ? xKey(color.domain()[i+1]) : xKey.range()[1],
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
				.attr("x1", xKey(10))
				.attr("x2", xKey(10))
				.attr("y1", -10)
				.attr("y2", 8)
				.attr("stroke-width","2px")
				.attr("stroke","#000")
				.attr("opacity",0);

			g2.append("text")
				.attr("id", "currVal")
				.attr("x", xKey(10))
				.attr("y", -15)
				.attr("fill","#000")
				.text("");



			keyhor.selectAll("rect")
				.data(color.range().map(function(d, i) {
				  return {
					x0: i ? xKey(color.domain()[i]) : xKey.range()[0],
					x1: i < color.domain().length ? xKey(color.domain()[i+1]) : xKey.range()[1],
					z: d
				  };
				}))
				.attr("x", function(d) { return d.x0; })
				.attr("width", function(d) { return d.x1 - d.x0; })
				.style("fill", function(d) { return d.z; });

			keyhor.call(xAxisKey).append("text")
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
				.attr("x",xKey(0));


			if(dvc.dropticks) {
				d3.select("#horiz").selectAll("text").attr("transform",function(d,i){
						// if there are more that 4 breaks, so > 5 ticks, then drop every other.
						if(i % 2){return "translate(0,10)"} }
				);
			}
			//Temporary	hardcode unit text
			dvc.unittext = "change in life expectancy";

			d3.select("#keydiv").append("p").attr("id","keyunit").style("margin-top","-10px").style("margin-left","10px").text(dvc.varunit);

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

		console.log("shrink");
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
		d3.select(".cell" + features[0].properties.AREACD).classed("cellsselected",true)
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
				.attr("style","width:98%")
				.attr("class","chosen-select");


			optns.append("option")
				.attr("value","first")
				.text("");

			optns.selectAll("p").data(menuarea).enter().append("option")
				.attr("value", function(d){ return d[1]})
				.text(function(d){ return d[0]});

			myId=null;

			$('#areaselect').chosen({width: "98%", allow_single_deselect:true,placeholder_text_single:"Choose an area"}).on('change',function(evt,params){

					if(typeof params != 'undefined') {

							disableMouseEvents();

							map.setFilter("state-fills-hover", ["==", "AREACD", params.selected]);
							d3.select(".cell" + params.selected).classed("cellsselected",true)
							selectArea(params.selected);
							setAxisVal(params.selected);

							zoomToArea(params.selected);

							dataLayer.push({
									'event': 'mapDropSelect',
									'selected': params.selected
							})
					}
					else {
							d3.select(".cellsselected").classed("cellsselected",false)

							enableMouseEvents();
							hideaxisVal();
							onLeave();
							resetZoom();
					}

			});

	};

		drawGraphic()


		function drawGraphic(){

			 clicked = false;

				var svg = d3.select("#beeswarm").select("svg"),
					margin = {top: 35, right: 12, bottom: 20, left: 140},

					svgwidth =  parseInt(svg.style("width"));
				heightper = dvc.essential.heightperstrip;

				heightper = heightper;
				width = svgwidth - margin.left - margin.right;

				//get unique groups
				var groups = graphic_data.map(function(obj) { return obj.id; });
				groups = groups.filter(function(v,i) { return groups.indexOf(v) == i; });

				height = (heightper*groups.length) + margin.top + margin.bottom;

				svg.attr("height",height + "px")

				var formatValue = d3.format(",d");

				 x = d3.scaleLinear()
					.rangeRound([0, width]);

				//if(dvc.essential.xAxisScale == "auto") {
				//  x.domain(d3.extent(graphic_data, function(d) { return d.value; }));
				//} else {
				  x.domain(dvc.essential.xAxisScale);
				//}

			//x.domain([0,32])

			  groupeddata = {}

			  separate = heightper;

			  runningtotal = 0;

			  for(var j = 0; j < groups.length; j++) {

			  groupeddata[j] =  graphic_data.filter(function(v,i) { return v.id == groups[j]; });

			  if(j>0) {
				runningtotal = runningtotal + groupeddata[j-1].length;
			  }
				var g = svg.append("g")
					.attr("transform", "translate(" + margin.left + "," + (margin.top + (separate*j)) + ")");

				  var simulation = d3.forceSimulation(groupeddata[j])
					  .force("x", d3.forceX(function(d,i) {  return x(d.value); }).strength(2))
					  .force("y", d3.forceY(heightper / 2))
					  .force("collide", d3.forceCollide(dvc.essential.dotradius))
					  .stop();

				  for (var i = 0; i < 120; ++i) simulation.tick();

				  if(svgwidth < dvc.optional.mobileBreakpoint) {
					  numberticks = dvc.optional.x_num_ticks_sm_md[0];
				  } else {
					  numberticks = dvc.optional.x_num_ticks_sm_md[1];
				  }


		    g.append("text").attr("class","label").text(groups[j]).attr("y",(heightper/2)+5).attr("x",-margin.left)


	var cell = g.append("g")
		  .attr("class", "cells")
		.selectAll("g").data(d3.voronoi()
			.extent([[-margin.left, 0], [width + margin.right, heightper]])
			.x(function(d) { return d.x; })
			.y(function(d) { return d.y; })
		  .polygons(groupeddata[j])).enter().append("g")


				  cell.append("circle")
					  .attr("r", dvc.essential.dotradius)
					  .attr("cx", function(d) { return d.data.x; })
					  .attr("cy", function(d) { return d.data.y; })
					  .attr("class", function(d,i) { return "cell cell" + (runningtotal + i)+" cell"+d.data.AREACD})
					  .attr("fill",function(d){
					  			//return  dvc.essential.colour_palette[groups.indexOf(d.data.id)]
								//console.log(d.data.value)
					  			//console.log(color(d.data.value))
					  			//return  color(d.data.value)
					  			return "#666";
						});

				  cell.append("path")
					  .attr("d", function(d) { return "M" + d.join("L") + "Z"; })
				  .attr("class", function(d,i) { return "path" + (runningtotal + i)+" "+d.data.AREACD})
				  .on("mouseover", function(d,i) {
					pathidstr = d3.select(this).attr("class");

					code = pathidstr.substr(pathidstr.indexOf(' ')).replace(/ /g,'')

					  changetext(d.data.value, d.data.AREACD);

					  	  $("#areaselect").val(code).trigger("chosen:updated");
					  	map.setFilter("state-fills-hover", ["==", "AREACD", code]);
					  		//selectArea(params.selected);
							setAxisVal(code);


						  d3.select(".cell" + code).classed("cellsselected",true)
					  })
					  // .on("click", function(d) {
				  //
						// 	d3.selectAll(".cells path").style("pointer-events","none");
						// 	clicked = true;
				  //
				  //
					  // })
					  .on("mouseout", function(d,i) {
					pathidstr = d3.select(this).attr("class");
					code = pathidstr.substr(pathidstr.indexOf(' ')).replace(/ /g,'')


						  d3.select("#info").html("");
					$("#areaselect").val("").trigger("chosen:updated");
						  d3.select(".cell" + code).classed("cellsselected",false)

						  if(clicked == true) {
							 changetext(d.data.value, d.data.AREACD)


							  d3.select(".cell" + code).classed("cellsselected",true)

						  }
					  })


				  if(j==0) {
					  g.append("g")
						.attr("class", "axis axis--x")
						.attr("transform", "translate(0,0)")
						.call(d3.axisTop(x).ticks(numberticks, ".0s"));
					}

					if(j==groups.length-1){
					  g.append("g")
						  .attr("class", "axis axis--x")
						  .attr("transform", "translate(0," + (-heightper*(groups.length-1)-margin.bottom) + ")")
						  .call(d3.axisBottom(x)
								.ticks(numberticks, ".0s")
								.tickSize(height-heightper)

						);

					g.selectAll(".axis--x line").style("stroke", "#ddd").attr("stroke-dasharray", "2,2");
					}
				  }

				  annotationCreation();

				  function annotationCreation(){
					  //create line breaks for annotation
					  var insertLinebreaks = function () {

					  var el1 = this.firstChild;
					  var el = el1.data;

					  var words = el.split('  ');


					  d3.select(this).text('');

					  xpos = d3.select(this).attr("x");


						for (var i = 0; i < words.length; i++) {
						  var tspan = d3.select(this).attr("transform","translate(10,0)").append('tspan').text(words[i]);
						  if (i > 0) {
							tspan.attr('x', xpos).attr('dy', '13');
							}
						}

						if(words.length > 1) {
							d3.select(this).attr("transform","translate(10,"+ ((words.length-1) * (-13/2)) + ")")
						}

					  };

						d3.selectAll(".label").each(insertLinebreaks);

				  }//end of annotationCreation

			 //     selectlist(graphic_data);
			//
			//      function selectlist(datacsv) {
			//      			var dropcodes =  datacsv.map(function(d,i) { return "id" + i; });
			//      			var dropnames =  datacsv.map(function(d) { return d.unique; });
			//      			var menuarea = d3.zip(dropnames,dropcodes).sort(function(a, b){ return d3.ascending(a[0], b[0]); });
			//      			//menuarea.shift();
			//      			//menuarea.shift();
			//      			// Build option menu for occupations
			//      			var optns = d3.select("#dropdown").append("div").attr("id","sel").append("select")
			//      				.attr("id","dropselect")
			//      				.attr("style","width:300px")
			//      				.attr("class","chosen-select");
			//
			//      			optns.append("option")
			//      				// .attr("value","first")
			//      				// .text("");
			//      			optns.selectAll("p").data(menuarea).enter().append("option")
			//      				.attr("value", function(d){return d[1]})
			//      				.attr("id",function(d){return d[1]})
			//      				.text(function(d){ return d[0]});
			//
			//      			myId=null;
			//
			//      			$('#dropselect').chosen({width: "98%", allow_single_deselect:true}).on('change',function(evt,params){
			//
			//      					if($('#dropselect').val() != "") {
			//      					//if(typeof params != 'undefined') {
			//                  clicked = true;
			//      							d3.selectAll(".cell").classed("cellsselected", false);
			//      							d3.selectAll(".cells path").style("pointer-events","none")
			//
			//      							dropcode = $('#dropselect').val();
			//                    console.log(dropcode)
			//                    dropcodeid = +dropcode.substr(2)
			//
			//      							d3.select(".cell" + dropcodeid).classed("cellsselected", true);
			//      							datafilter = datacsv.filter(function(d,i) {return "id" + i == dropcode})
			//
			//      							changetext(datafilter[0].value,datafilter[0].unique )
			//
			//      					}
			//      					else {
			//
			//      						clicked = false;
			//
			//      						d3.selectAll(".cell").classed("cellsselected", false);
			//      						d3.selectAll(".cells path").style("pointer-events","all");
			//
			//      					}
			//      			});
			//          } //end selectlist

					  function changetext(value,id) {

						  d3.select("#info").html("<span id='label'> £" + formatValue(value) + "</span> gross, per annum");
					  }



				//add xaxislabel
				  svg.append("g")
					.attr("transform", "translate(" + (svgwidth - margin.right + margin.left) +"," + (height+margin.top + margin.bottom) + ")")
					.append("text")
					.attr("id","xaxislabel")
					.attr("text-anchor", "end")
					.text(dvc.essential.xAxisLabel);

				//add source
				d3.select("#source").text("Source: " + dvc.essential.sourceText);

				// Adding a missing (visuallyhidden) label to the search input
				d3.select('input.chosen-search-input').attr('id','chosensearchinput')
				d3.select('div.chosen-search').insert('label','input.chosen-search-input').attr('class','visuallyhidden').attr('for','chosensearchinput').html("Type to select an area")

				if (pymChild) {
					pymChild.sendHeight();
				}

		} //end drawGraphic()
	}

} else {

	//provide fallback for browsers that don't support webGL
	d3.select('#map').remove();
	d3.select('body').append('p').html("Unfortunately your browser does not support WebGL. <a href='https://www.gov.uk/help/browsers' target='_blank>'>If you're able to please upgrade to a modern browser</a>")

}
