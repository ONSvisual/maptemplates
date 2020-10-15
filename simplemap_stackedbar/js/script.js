
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
		graphic_data = data;
		//Set up global variables
		dvc = config.ons;
		oldAREACD = "";
		firsthover = true;


		//get column name
		varnames = [];
		for (var column in data[0]) {
			if (column == 'AREACD') continue;
			if (column == 'AREANM') continue;
			if (column == dvc.bar.stackVar) continue;
			if (column == dvc.map.mapVarName) continue;
			//if (column == 'unique') continue;
			varnames.push(column);
		}

		//set title of page
		document.title = dvc.map.maptitle;

		//Make dropdown
		selectlist(data);

		//Set up number formats
		displayformat = d3.format("." + dvc.map.displaydecimals + "f");
		legendformat = d3.format("." + dvc.map.legenddecimals + "f");

		//set up basemap
		map = new mapboxgl.Map({
		  container: 'map', // container id
		  style: 'data/style.json', //stylesheet location
		  center: [-2.5, 54], // starting position
		  zoom: 4.5, // starting zoom
		  maxZoom: 13, //
		  attributionControl: false
		});

		// Disable map rotation using right click + drag
		map.dragRotate.disable();

		// Disable map rotation using touch rotation gesture
		map.touchZoomRotate.disableRotation();

		//add compact attribution
		map.addControl(new mapboxgl.AttributionControl({
			compact: true
		}), 'bottom-right');

		var controlsPosition = 'top-right'

		// Add geolocation controls to the map.
		map.addControl(new mapboxgl.GeolocateControl({
			positionOptions: {
				enableHighAccuracy: true
			}
		}), controlsPosition);

		//add fullscreen option
		map.addControl(new mapboxgl.FullscreenControl(), controlsPosition);

		// Add zoom and rotation controls to the map.
		map.addControl(new mapboxgl.NavigationControl(), controlsPosition);

		addFullscreen();

		//set up d3 color scales

		countById = {};
		areaById = {};

		data.forEach(function(d) { countById[d.AREACD] = +eval("d." + dvc.map.mapVarName); areaById[d.AREACD] = d.AREANM});

		//Flatten data values and work out breaks
		var values =  data.map(function(d) { return +eval("d." + dvc.map.mapVarName); }).filter(function(d) {return !isNaN(d)}).sort(d3.ascending);

		if(dvc.map.breaks =="jenks") {
			breaks = [];

			ss.ckmeans(values, (dvc.map.numberBreaks)).map(function(cluster,i) {
				if(i<dvc.map.numberBreaks-1) {
					breaks.push(cluster[0]);
				} else {
					breaks.push(cluster[0])
					//if the last cluster take the last max value
					breaks.push(cluster[cluster.length-1]);
				}
			});
		}
		else if (dvc.map.breaks == "equal") {
			breaks = ss.equalIntervalBreaks(values, dvc.map.numberBreaks);
		}
		else {breaks = dvc.map.breaks;};


		//round breaks to specified decimal places
		breaks = breaks.map(function(each_element){
			return Number(each_element.toFixed(dvc.map.legenddecimals));
		});

		//work out halfway point (for no data position)
		midpoint = breaks[0] + ((breaks[dvc.map.numberBreaks] - breaks[0])/2)

		//Load colours
		if(typeof dvc.map.varcolour === 'string') {

			//colour = colorbrewer[dvc.map.varcolour][dvc.map.numberBreaks];

			colorScale=chroma.scale(dvc.map.varcolour).colors(dvc.map.numberBreaks)
  			colour=[]
			  colorScale.forEach(function(d){
				  colour.push(chroma(d).darken(0.4).saturate(0.6).hex())
			  })

		} else {
			colour = dvc.map.varcolour;
		}
//colour = dvc.map.bar.colour_palette
		//set up d3 color scales
		colorScale = d3.scaleThreshold()
				.domain(breaks.slice(1))
				.range(colour);

		//now ranges are set we can call draw the key
		createKey();

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

		  d.properties.fill = colorScale(countById[d.properties.AREACD])
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


			// if(detectIE()){
			// 	onMove = onMove.debounce(100);
			// 	onLeave = onLeave.debounce(100);
			// 	console.log("ie");
			// };

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
				// update bars to default values
				updateBars(dvc.bar.defaultBarVar)
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
			console.log(code)
			updateBars(code)
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
				.style("opacity", function(){if(!isNaN(countById[code])) {return 1} else{return 0}})
				.transition()
				.duration(400)
				.attr("x1", function(){if(!isNaN(countById[code])) {return xKey(countById[code])} else{return xKey(midpoint)}})
				.attr("x2", function(){if(!isNaN(countById[code])) {return xKey(countById[code])} else{return xKey(midpoint)}});


			d3.select("#currVal")
				.text(function(){if(!isNaN(countById[code]))  {return displayformat(countById[code])} else {return "Data unavailable"}})
				.style("opacity",1)
				.transition()
				.duration(400)
				.attr("x", function(){
					if(!isNaN(countById[code])) {
						//console.log(xKey(countById[code]))
						return xKey(countById[code])
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

		function createKey(){

			keywidth = d3.select("#keydiv").node().getBoundingClientRect().width;

			var svgkey = d3.select("#keydiv")
				.append("svg")
				.attr("id", "key")
				.attr("width", keywidth)
				.attr("height",65);


			var colorScale = d3.scaleThreshold()
			   .domain(breaks)
			   .range(colour);

			// Set up scales for legend
			xKey = d3.scaleLinear()
				.domain([breaks[0], breaks[dvc.map.numberBreaks]]) /*range for data*/
				.range([0,keywidth-30]); /*range for pixels*/


			var xAxisKey = d3.axisBottom(xKey)
				.tickSize(15)
				.tickValues(colorScale.domain())
				.tickFormat(legendformat);

			var g2 = svgkey.append("g").attr("id","horiz")
				.attr("transform", "translate(15,30)");


			keyhor = d3.select("#horiz");

			g2.selectAll("rect")
				.data(colorScale.range().map(function(d,i) {

				  return {
					x0: i ? xKey(colorScale.domain()[i+1]) : xKey.range()[0],
					x1: i < colorScale.domain().length ? xKey(colorScale.domain()[i+1]) : xKey.range()[1],
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
				.data(colorScale.range().map(function(d, i) {
				  return {
					x0: i ? xKey(colorScale.domain()[i]) : xKey.range()[0],
					x1: i < colorScale.domain().length ? xKey(colorScale.domain()[i+1]) : xKey.range()[1],
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


			if(dvc.map.dropticks) {
				d3.select("#horiz").selectAll("text").attr("transform",function(d,i){
						// if there are more that 4 breaks, so > 5 ticks, then drop every other.
						if(i % 2){return "translate(0,10)"} }
				);
			}
			//Temporary	hardcode unit text
			dvc.map.unittext = "change in life expectancy";

			d3.select("#keydiv").append("p")
			.attr("id","keyunit")
			.style("margin-top","-10px")
			.style("margin-left","10px")
			.text(dvc.map.varunit)
			// .attr("text-anchor", "end");

	} // Ends create key

	function addFullscreen() {

		mapheight = d3.select("#map").style("height");
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
		d3.select("#map").style("height",mapheight);
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

			function getunique(arr) {
				return arr.filter(function(item, pos) {
					if ([dvc.bar.defaultBarVar, dvc.bar.lineVar].indexOf(item) > -1) {
						return false;
					}
					return arr.indexOf(item) == pos
				} )
			}

			var areacodes =  datacsv.map(function(d) { return d.AREACD; });
			var areacodesunique = getunique(areacodes)
			var areanames =  datacsv.map(function(d) { return d.AREANM; });
			var areanamesunique = getunique(areanames)
			var menuarea = d3.zip(areanamesunique,areacodesunique).sort(function(a, b){ return d3.ascending(a[0], b[0]); });
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

			$('#areaselect').chosen({width: "98%", allow_single_deselect:true}).on('change',function(evt,params){

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

		drawGraphic() // draw the bar chart on the right


		function drawGraphic(){
			 clicked = false;

				var svg = d3.select("#graphic").select("svg"),
				  margin = dvc.bar.barMargin
					svgwidth =  parseInt(svg.style("width"));

				// get the height from CSS styling of map and key. Probably more robust to have all height stylings come from an integer in the config.
				var mapheight = parseInt(d3.select('#map').style('height').slice(0,-2))
				var keyheight = parseInt(d3.select('#keydiv').style('height').slice(0,-2))
				height = mapheight + keyheight - margin.top - margin.bottom - 16 // 16 for the height of the legend. If you need a legend on two lines this needs a better solution.
				heightper = height / varnames.length
				width = svgwidth - margin.left - margin.right;

				// clear out existing graphics
				// graphic.selectAll("*").remove();
				// keypoints.selectAll("*").remove();
				// footer.selectAll("*").remove();

				x = d3.scaleLinear()
					.range([0, width]);

				var y = d3.scaleBand()
					.rangeRound([0, height])
					.paddingInner(0.1);

				y.domain(varnames)

				var yAxis = d3.axisLeft(y)

				xAxis = d3.axisBottom(x)
					.tickSize(-height, 0, 0);

				//specify number or ticks on x axis
				if (width <= dvc.bar.mobileBreakpoint) {
					xAxis.ticks(dvc.bar.x_num_ticks_sm_md[0])
				} else {
					xAxis.ticks(dvc.bar.x_num_ticks_sm_md[1])
				}

				// parse data into columns
				bars = {};
				graphic_data.forEach( function(d) {
					// add an entry to bars with AREACD as
					bars[d.AREACD] = {}
					bars[d.AREACD]["AREANM"] = d.AREANM
					bars[d.AREACD]["bars_data"] = []
				})

				graphic_data.forEach( function(d) { // for each row of graphic data
					// get data in the row into a tmp_array
					var tmp_array = [];
					for (var varname in d) {
						if (varnames.indexOf(varname) > -1) { // check if varname is one of the variables to go on the bar chart
							tmp_array.push({varname: +d[varname]});
						}
					}
					// push the tmp_array to the right spot in bars
					bars[d.AREACD]["bars_data"].push(tmp_array)

				});

				// TODO: these are broken!
				//y domain calculations	: zero to intelligent max choice, or intelligent min and max choice,  or interval chosen manually
				if (dvc.bar.xAxisScale == "auto_zero_max") {
					var xDomain = [
						0,
						d3.max(d3.entries(bars), function(c) {
							return d3.max(c.value, function(v) {
								var n = v.amt;
								return Math.ceil(n);
							});
						})
					];
				} else if (dvc.bar.xAxisScale == "auto_min_max") {
					var xDomain = [
						d3.min(d3.entries(bars), function(c) {
							return d3.min(c.value, function(v) {
								var n = v.amt;
								return Math.floor(n);
							});
						}),

						d3.max(d3.entries(bars), function(c) {
							return d3.max(c.value, function(v) {
								var n = v.amt;
								return Math.ceil(n);
							});
						})
					];
				} else {
					var xDomain = dvc.bar.xAxisScale;
				}

				x.domain(xDomain);

				d3.select("#buttonid").on("click", function() {
					saveSvgAsPng(document.getElementById("chart"), "diagram.png")
				});

				//create svg for chart
				var g = svg
					.style("background-color", "#fff")
					// .attr("width", width + margin.left + margin.right)
					.attr("height", height + margin.top + margin.bottom)
					.append("g")
					.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

				g.append("rect")
					.attr("class", "svgRect")
					.attr("width", width)
					.attr("height", height)
					.attr("fill", "transparent")

				g.append('g')
					.attr('class', 'x axis')
					.attr("transform", "translate(0, " + height + ")")
					.call(xAxis).append("text")
					.attr("y", 20)
					.attr("x", width)
					.attr("dy", ".71em")
					.style("text-anchor", "end")
					.attr("font-size", "12px")
					.attr("fill", "#666")
					.text(dvc.bar.xAxisLabel);

				//create y axis, if x axis doesn't start at 0 drop x axis accordingly
				g.append('g')
					.attr('class', 'y axis')
					.attr('transform', function(d) {
						if (xDomain[0] != 0) {
							return 'translate(' + (0) + ',0)'
						} else {
							return 'translate(' + 0 + ', 0)'
						}
					})
					.call(yAxis);

					d3.selectAll(".y .tick text")
						.call(wrap, margin.left-10);

				var defaultData = graphic_data.filter(function(d) {return d.AREACD == dvc.bar.defaultBarVar})
				stack = d3.stack().keys(defaultData.map(function(d) {return d[dvc.bar.stackVar]}))
				transposedData = []
				varnames.forEach( function(d) {
					var tmp_obj = {}
					tmp_obj.key = d
					defaultData.forEach( function(k) {
						tmp_obj[k[dvc.bar.stackVar]] = k[d]
					})
					transposedData.push(tmp_obj)
    			// console.log(defaultData.map(function(k) {
					// 	var tmp_obj = {}
					// 	tmp_obj[k[dvc.bar.stackVar]] = k[d]
					// 	return tmp_obj
					// }))
				})
				// create default bars
				barg = g.append('g').selectAll('rect')
					.data(stack(transposedData))
					.enter()
					.append('g')
					.attr("class", function(d) {return "bar-group " + d.key})
					.attr("fill", function(d) {return dvc.bar.colour_palette[dvc.bar.legendLabels[d.key]]})

				barg.selectAll('rect')
					.data(function(d) { return d })
					.enter()
					.append('rect')
					.attr("class", "bar")
					.attr("width", function(d) { return x(d[1] - d[0]) })
					.attr("x", function(d) { return x(d[0]) })
					.attr("y", function(d) {
						return y(d.data.key);
					})
					.attr("height", y.bandwidth())

				// add GB wide lines to bar chart for context. dvc.bar.lineVar must be an AREACD in data
				contextLines = graphic_data.filter(function(d) {return d.AREACD == dvc.bar.lineVar})[0]
				g.append('g').attr("class", "lines").selectAll("line")
					.data(d3.entries(contextLines))
					.enter()
					.append("line")
					.attr("class", "line")
					.attr("x1", function(d) { return x(d.value) })
					.attr("x2", function(d) { return x(d.value) })
					.attr("y1", function(d) { return y(d.key)})
					.attr("y2", function(d) { return y(d.key) + y.bandwidth() })
					.attr("stroke", function(d) { return dvc.bar.lineColour})
					// .attr("stroke", "#053D58")
					.attr("stroke-width", 2);

				// add g tags for each bar's suppression text
				suppText = g.append('g').attr("class", "suppressed-group").selectAll("text")
					.data(varnames)
					.enter()
					.append('g')
					.attr("transform", function(d) { return "translate(" + (x(0) + 5) + "," + (y(d) + heightper/2) +")" } );

				// add background box for text
				suppText.append("rect")
				.attr("class", function(d) {return "suppressed box " + d.split(' ')[1]})
					.attr("fill", "white")
					.attr("x", 0)
					.attr("y", -12)
					.attr("width", 182)
					.attr("height", 18)
					.style("opacity", 0);

				// add text tag for suppression text
				suppText.append('text')
					.attr("class", function(d) { return "suppressed text " + d.split(' ')[1] })
					.text("suppressed due to small sample")
					.style("font-size", "12px")
					.style("opacity", 0);

				var legend = d3.select('ul.key')
					.selectAll('g')
					.data(d3.entries(dvc.bar.legendLabels))
					.enter()
					.append('li')
					.attr("class", function(d) {
						return "key-" + d.value
					})

				legend.append('b')
					.style('background-color', function(d) {
						return dvc.bar.colour_palette[d.value]
					})

				legend.append('label')
					.html(function(d) {
						return d.key;
					});

				var manualLabel = d3.select('ul.key').append('li')
				manualLabel.append('b')
					.classed('line', true)
					.style('background-color', dvc.bar.lineColour)

				manualLabel.append('label')
					.html(dvc.bar.lineLegendLabel)

				function wrap(text, width) {
					text.each(function() {
						var text = d3.select(this),
							words = text.text().split(/\s+/).reverse(),
							word,
							line = [],
							lineNumber = 0,
							lineHeight = 1.1, // ems
							y = text.attr("y"),
							x = text.attr("x"),
							dy = parseFloat(text.attr("dy")),
							tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
						if (words.length > 2) {
							while (word = words.pop()) {
								line.push(word);
								tspan.text(line.join(" "));
								if (tspan.node().getComputedTextLength() > width) {
									if (lineNumber == 0) {
										tspan.attr("dy", dy - 0.55 + "em")
									} else {
										tspan.attr("dy", -dy + 0.55 + "em")
									}
									line.pop();
									tspan.text(line.join(" "));
									line = [word];
									++lineNumber;
									tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", (0.55 * lineNumber - dy + 0.55) + "em").text(word);
								}
							}
						} else {
							while (word = words.pop()) {
								line.push(word);
								tspan.text(line.join(" "));
								if (tspan.node().getComputedTextLength() > width) {
									if (lineNumber == 0) {
										tspan.attr("dy", dy - 0.55 + "em")
									} else {
										tspan.attr("dy", -dy + 0.55 + "em")
									}
									line.pop();
									tspan.text(line.join(" "));
									line = [word];
									++lineNumber;
									tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", (1.1 * lineNumber - dy + 0.55) + "em").text(word);
								}
							}
						}

					});
				}

				//add source
				d3.select("#source").text("Source: " + dvc.bar.sourceText);

				// Adding a missing (visuallyhidden) label to the search input
				d3.select('input.chosen-search-input').attr('id','chosensearchinput')
				d3.select('div.chosen-search').insert('label','input.chosen-search-input').attr('class','visuallyhidden').attr('for','chosensearchinput').html("Type to select an area")


				if (pymChild) {
					pymChild.sendHeight();
				}

		} //end drawGraphic()

		// updates the bars to be the ones from current area code
		function updateBars(code) {

			// get all the rows in graphic_data concerning current AREACD.
			var data = graphic_data.filter(function(d) {return d.AREACD == code})
			// "transpose" this data into the right format for stacking
			transposedData = []
			varnames.forEach( function(d) {
				var tmp_obj = {}
				tmp_obj.key = d
				data.forEach( function(k) {
					tmp_obj[k[dvc.bar.stackVar]] = k[d]
				})
				transposedData.push(tmp_obj)
			})
			// bind new data to bars
			barg.data(stack(transposedData))

			// when data is very different for certain areas, it might be necessary to transition to a new x axis
			// get previous upper limit of x domain
			var prevMax = x.domain()[1];

			// set new upper limit of x domain as newMax
			// by default it's the same as the old one
			var newMax = x.domain()[1];
			// here's an example of some code to change the axis in specific parts of London
			// if (code == 'E09000001' || code == 'E09000030') {
			// 	var newMax = 40;
			// } else if (code.slice(0,3) == 'E09') {
			// 	var newMax = 16;
			// } else {
			// 	var newMax = 5;
			// }

			if (prevMax == newMax) { // no change in domain so just move the bars
				barg.selectAll('rect')
					.data(function(d) {return d})
				moveBars(100)
			} else {
				// change in domain so change x.domain, move axis, contexual lines, data bars
				x.domain([0,newMax])

				var transitionTime = 600;

				d3.selectAll('.x.axis')
					.transition() // transition x axis
					.duration(transitionTime)
					.call(xAxis)
					.on("start", function() {
						d3.selectAll("line.line") // transition contextual lines at same time as axis
							.transition()
							.duration(transitionTime)
							.attr("x1", function(d) { return x(d.value)})
							.attr("x2", function(d) { return x(d.value)})
							.on("start", function() {
								moveBars(transitionTime) // transition bars with axis
							})
					})
					.on("end", function() {
						barg.selectAll('rect')
							.data(function(d) {return d})
						moveBars(400)
					})

			} // end if else statement

			function moveBars(t) {
				barg.selectAll('rect')
					.transition()
					.duration(t)
					.attr("width", function(d) { return x(d[1]) - x(d[0]) })
					.attr("x", function(d) { return x(d[0]) })
			}
		}
	}

} else {

	//provide fallback for browsers that don't support webGL
	d3.select('#map').remove();
	d3.select('body').append('p').html("Unfortunately your browser does not support WebGL. <a href='https://www.gov.uk/help/browsers' target='_blank>'>If you're able to please upgrade to a modern browser</a>")

}
