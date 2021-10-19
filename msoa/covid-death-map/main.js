var pymChild = new pym.Child();

d3.queue()
	.defer(d3.csv, "data/data.csv")
	.await(ready);

// Global variables
let oldareacd = null;
let newareacd = null;
let currentAreanm = "";
let currentAreanmhc = "";
let currentAreacd = "";

function ready(error, data) {
	da = data;
	if (error) {
		console.error(error);
		return;
	};

	if(parseInt(d3.select("body").style("width")) <= 600) {
		size = "md";
	} else {
		size = "lg";
	};

	currentAreacd = "";

	timePeriods = [
		"March 2020",
		"April 2020",
		"May 2020",
		"June 2020",
		"July 2020",
		"August 2020",
		"September 2020",
		"October 2020",
		"November 2020",
		"December 2020",
		"January 2021",
		"February 2021",
		"March 2021",
		"April 2021"
	];
	var tickValues = ['March 2020', 'April 2021'];

	currentMonth = timePeriods.length - 1;

	layernames = ["All months"].concat(timePeriods);

	dataTimePeriods = {};

	layernames.forEach( function(timePeriod, i) {
		dataTimePeriods[timePeriod] = data.reduce( function(obj, item) {
			obj[item["areacd"]] = item[timePeriod]
			return obj
		}, {} )
	});

	const areabyid = [];
	const allCases = [];
	const areanmhc = [];

	data.forEach(function(d, i) {
		areanmhc[d.areacd] = d.areanmhc;
		allCases[i] = +d["All months"];
		areabyid[d.areacd] = d.areanm;
	});

	var maxMonthValue = 0;
 	timePeriods.forEach(function(item, i) {
	  keys = Object.keys(dataTimePeriods[item])
		for (i = 0; i < keys.length; i++) {
			var value = +dataTimePeriods[item][keys[i]];
			if (value > maxMonthValue) {
				maxMonthValue = value;}
		}
 	});
	var maxvalue = d3.max(allCases);

	map = new mapboxgl.Map({
		container: "map",
		style: "data/style.json",
		center: [-3.5, 52.355],
		zoom: 5,
		maxZoom: 13.9999,
		attributionControl: false
	})

	//add fullscreen option
	map.addControl(new mapboxgl.FullscreenControl());

	// Add zoom and rotation controls to the map.
	map.addControl(new mapboxgl.NavigationControl());

	// Disable map rotation using right click + drag
	map.dragRotate.disable();

	// Disable map rotation using touch rotation gesture
	map.touchZoomRotate.disableRotation();

	//add compact attribution
	// map.addControl(new mapboxgl.AttributionControl({
	// 	compact: true
	// }));

	map.addControl(new mapboxgl.AttributionControl({
		compact:true,customAttribution:"© Crown copyright and database rights "+new Date(Date.now()).getFullYear()+" OS 100019153"
		})
	);

	d3.selectAll(".mapboxgl-ctrl-icon").attr("aria-hidden","false")


	map.on("load", function() {

		map.addSource('msoa-centroids', {
			type: 'vector',
			"tiles": ["https://cdn.ons.gov.uk/maptiles/administrative/msoa/v1/centroids/{z}/{x}/{y}.pbf"],
			"promoteId": { "msoacentroids": "areacd" },
			"bounds": [-5.8,50.0,1.9,55.9],
			"minzoom":3,
			"maxzoom":14
		});
		map.addSource('msoa-bounds', {
      type: 'vector',
      "tiles": ["https://cdn.ons.gov.uk/maptiles/administrative/msoa/v1/boundaries/{z}/{x}/{y}.pbf"],
      "promoteId": {
        "boundaries": "areacd"
      },
      "bounds": [-5.8, 50.0, 1.9, 55.9],
      "minzoom": 3,
      "maxzoom": 14
    });
		map.addLayer(
			{
				id: "coronabound",
				type: "fill",
				"source": "msoa-bounds",
				"source-layer": "boundaries",
				minzoom: 4,
				maxzoom: 21,
				layout: {},
				// paint: {
				// 	'fill-opacity': 0
				// }
				paint: {
	        'fill-opacity': ['interpolate', ['linear'],
	          ['zoom'], 10, 0, 11, 1
	        ],
	        "fill-color": "rgba(255,255,255,0)"
	      }
			},
			"place_suburb"
		);

		map.addLayer(
			{
				id: "corona",
				type: "circle",
				"source": 'msoa-centroids',
				"source-layer": "msoacentroids",
				paint: {
					'circle-radius':
            ['interpolate', ['exponential', 2], ['zoom'],
              5, ['case', ['!=', ['feature-state', 'casesPI'], null], ['/', ['feature-state', 'casesPI'], 0.6], 1],
              16, ['case', ['!=', ['feature-state', 'casesPI'], null], ['/', ['feature-state', 'casesPI'], 0.006], 1]
            ],
					"circle-opacity": 0.9,
					'circle-color':
            ['case',
              ['!=', ['feature-state', 'casesPI'], null],
              [
                'interpolate', ['linear'],
                ['feature-state', 'cases'],
                0, '#8ca32a',
                maxvalue, '#1D8B84'
              ],
              '#8ca32a'
            ]
				}
			},
			"place_suburb"
		);


		map.addLayer(
			{
				id: "coronahover",
				type: "circle",
				"source": 'msoa-centroids',
				"source-layer": "msoacentroids",
				paint: {
					'circle-radius':
						['interpolate', ['exponential', 2], ['zoom'],
							5, ['case', ['!=', ['feature-state', 'casesPI'], null], ['/', ['feature-state', 'casesPI'], 0.8], 1],
							16, ['case', ['!=', ['feature-state', 'casesPI'], null], ['/', ['feature-state', 'casesPI'], 0.006], 1]
            ],
					"circle-stroke-color": "black",
					"circle-stroke-width": [
						'case',
						['==',	['feature-state', 'hover'], true],
						3, 0 // 3 if true, 0 if false
					],
					"circle-color": "rgba(255,255,255,0)"
				}
			},
			"place_suburb"
		);


		map.addLayer(
			 {
				id: "coronaboundhover",
				type: "line",
				"source": "msoa-bounds",
				"source-layer": "boundaries",
				minzoom: 8,
				maxzoom: 20,
				layout: {},
				paint: {
					"line-color": ['case', ['==', ['feature-state', 'hover'], true], "black", "rgba(0,0,0,0.02)"],
	        "line-width": ['case', ['==', ['feature-state', 'hover'], true], 2, 1]
					// "line-width": 2
				},
			},
			"place_suburb"
		);

		var bounds = new mapboxgl.LngLatBounds();

		// areas.features.forEach(function(feature) {
		// 	bounds.extend(feature.geometry.coordinates);
		// });


		map.fitBounds([[-5.8,50.0],[1.9,55.9]]);

		// initialise layer with default data
		setFeatureState('All months')

	});

	setLegend()
	map.on("mousemove", "coronabound", onMove);
	map.on("mouseleave", "coronabound", onLeave);
	map.on("click", "coronabound", onClick);

	function onMove(e) {
		newareacd = e.features[0].properties.areacd;

		if (newareacd != oldareacd) {
			updateFeatures()

			var features = map.queryRenderedFeatures(e.point, {
				layers: ["coronabound"]
			});

			if (features.length != 0) {
				// currentAreanm = e.features[0].properties.areanm;
				// currentAreanmhc = e.features[0].properties.areanmhc;
				// currentAreacd = e.features[0].properties.areacd;
				setAxisVal(e.features[0].properties.areanm, e.features[0].properties.areanmhc, e.features[0].properties.areacd);
			}
		}
	}

	function onClick(e) {
		disableMouseEvents();
		newareacd = e.features[0].properties.areacd;
		updateFeatures();

		currentAreanm = e.features[0].properties.areanm;
		currentAreanmhc = e.features[0].properties.areanmhc;
		currentAreacd = e.features[0].properties.areacd;
		setAxisVal(e.features[0].properties.areanm, e.features[0].properties.areanmhc, e.features[0].properties.areacd);

		$(".search-control").addClass('x onX');

	}

	function onLeave() {
		newareacd = null;
		updateFeatures();
		hideaxisVal();
	}

	function setAxisVal(areanm, areanmhc, areacd) {
		d3.select("#placename")
			.style("font-weight", "bold")
			.html(function() {
				// if(parseInt(d3.select("body").style("width")) <= 600) {
				// 	console.log(!isNaN(dataTimePeriods["All months"][areacd]))
					if (!isNaN(dataTimePeriods["All months"][areacd])) {
						var deathsWord = dataTimePeriods["All months"][areacd] == 1 ? "death" : "deaths"
						var placenameText = areanmhc + "<br><span id='msoacodetext'>MSOA " + areanm + "</span><br>" + dataTimePeriods["All months"][areacd] + " " + deathsWord + " over all months";
						if (d3.select("#radio1").property("checked")) {// && (size === "md") ) {
							var deathsWord2 = dataTimePeriods[timePeriods[currentMonth]][areacd] == 1 ? "death" : "deaths"
							placenameText += "<br><span id='monthdeathstext'>" + dataTimePeriods[timePeriods[currentMonth]][areacd] + " " + deathsWord2 + " in " + timePeriods[currentMonth] + "</span>";
						}
						return placenameText
					} else {
						var placenameText = areanmhc + "<br><span id='msoacodetext'>MSOA " + areanm + "</span><br>";
					}
					return placenameText
				// } else {
				// 	if (!isNaN(dataTimePeriods["All months"][areacd])) {
				// 		return areanmhc + "<br><span id='msoacodetext'>MSOA " + areanm + "</span><br>";
				// 	} else {
				// 		return areanmhc + "<br><span id='msoacodetext'>MSOA " + areanm + "</span><br>";
				// 	}
				// }

			});

		d3.select("#keyvaluehidden")
				.html(function() {
					if (d3.select("#radio0").property("checked")) {
						return "In " + areanmhc + " there have been " + dataTimePeriods["All months"][areacd] + " deaths due to COVID-19."
					} else if (d3.select("#radio1").property("checked")) {
						return "In " + areanmhc + " in " + timePeriods[currentMonth] + " there were " + dataTimePeriods[timePeriods[currentMonth]][areacd] + " deaths due to COVID-19."
					}
				});

		// if (size == "lg") {
			// transition bar chart bars
			bars.transition()
				.ease(d3.easeLinear)
				.attr("y", function(d) {dataTimePeriods[d][areacd]; return y(dataTimePeriods[d][areacd]) } )
				.attr("height", function(d) { return y(0) - y(dataTimePeriods[d][areacd]) } )
			// transition numbers
			updateValues(barValueNumbers)
			updateValues(barValueBorders)
			// a better way would be to give both selections above a class in common so that they can be selected and updated together
			function updateValues(barValueSelection) {
				barValueSelection
					.text(function(d) {
						var currentVal = dataTimePeriods[d][areacd];
						return currentVal == 0 ? "" : currentVal } )
					.transition()
					.attr("y", function(d) { return y(dataTimePeriods[d][areacd]) - 2 } )
			}
		// }

	} // end setAxisVal

	function setLegend() {

		d3.select("#keydiv")
			.append("h5")
			.attr("id", "keyvaluehidden")
			.attr("class", "visuallyhidden")
			.attr("aria-live", "polite");

		legend = d3.select("#keydiv")//.append('ul')
								// 	.attr('class', 'key')
									.append("div")
									.attr("class", "key-item-container")
									.selectAll('*')
									.data(['All months', 'Show by month'])
									.enter()
									.append('div')
									.attr('class', function(d, i) { return 'key-item key-' + i + ' b '+ d.replace(' ', '-').toLowerCase(); })
									.style("top", function(d, i) { return (45*i) + "px" })


								legend.append("input")
										.style("float","left")
										.attr("id",function(d,i){return "radio"+i})
										.attr("class", function(d,i) {return "input js-focusable input--radio" } )
										.attr("type", function(d,i) {return "radio"} )
										.attr("name", function(d,i) {return "timeOrTotal"} )
										.attr("value", function(d,i){return d})
										.property("checked", function(d,i){if(i==0) {return true}})
										.on("click",repaintLayer)

								legend.append('label')
								.attr('class', function(d,i) { return 'legendlabel' } )
								.text(function(d,i) {
									var value = parseFloat(d).toFixed(1);
									return d;
								})
								.attr("for",function(d,i){return "radio"+i});

								// create chevrons & time display for moving through time
								var timeControls = d3.select("#keydiv").append('div')
									.attr("id","timeControls")
									.attr("class", "key-item")
									.style("display", "none")
								timeControls.append("button")
									.attr("id", "back")
									.attr("class", "timeControlButtons")
									.attr("type", "submit")
									.attr("aria-label", "Go back one month")
									.on("click", moveBackInTime)
									.append("span")
									.attr("class", "glyphicon glyphicon-chevron-left")
								timeControls.append("label")
									.attr("id", "timeName")
									.text(timePeriods[currentMonth])
								timeControls.append("button")
									.attr("id", "forward")
									.attr("class", "timeControlButtons")
									.attr("type", "submit")
									.attr("aria-label", "Go forwards one month")
									.on("click", moveForwardsInTime)
									// .attr("background-color", "#fff")
									.append("span")
									.attr("class", "glyphicon glyphicon-chevron-right")

								// if (size == "lg") { // replaced by a media query
									drawBarChart()
								// }

								function drawBarChart() {
									var margin = {
										top: 147,
										right: 35,
										bottom: 22,
										left: 40
									}
									var keywidth = Math.min(225, parseInt(d3.select("#keydiv").style("width")));
									// var keywidth = "200";
									var keyheight = (keywidth - margin.left - margin.right)*0.6 + margin.top + margin.bottom;
									// set x scale
									x = d3.scaleBand()
										.domain(timePeriods)
										.range([margin.left, keywidth - margin.right]);
									// set y scale
									y = d3.scaleLinear()
										.domain([0,20]) // .domain([0, maxMonthValue])
										.range([keyheight - margin.bottom, margin.top]); // from bottom to top of inner chart
									// draw x and y axes
									var xAxis = d3.axisBottom(x)
										.tickValues(tickValues)
										.tickSizeOuter(0);
									var yAxis = d3.axisLeft(y)
										.ticks(6)
										.tickSizeInner(-(keywidth - margin.left - margin.right))
										.tickSizeOuter(0);

									barChart = d3.select("#keydiv").append("svg")
										.attr("id", "graphic")
										.style("width", keywidth + "px")
										.style("height", keyheight + "px")
										.attr("aria-hidden", "true");

									// draw axes onto svg
									barChart.append("g")
										.attr("class", "x axis x--axis")
										.attr("transform", "translate(0," + (keyheight-margin.bottom) + ")")
										.call(xAxis)
									barChart.append("g")
										.attr("class", "y axis y--axis")
										.attr("transform", "translate(" + margin.left + ",0)")
										.call(yAxis)
									d3.selectAll(".axis")
										.selectAll(".tick")
										.selectAll("text")
										.attr("fill", null)
									barChart.select(".y--axis")
										.append("text")
										.attr("y", y(23))
										.text("Deaths")

									// draw bars
									bars = barChart.append("g")
										.attr("class", "bars")
										.selectAll("rect")
										.data(timePeriods)
										.enter()
										.append("rect")
										.attr("fill", "#206095")
										.attr("x", function(d) { return x(d) })
										.attr("width", x.bandwidth())
										// initialise with size 0
										.attr("y", y(0))
										.attr("height", 0)

									// add box for time
									barChart.append("rect")
										.attr("id", "currentMonthBox")
										.style("width", x.bandwidth() )
										.style("height", keyheight - margin.top - margin.bottom)
										.attr("x", x(timePeriods[currentMonth]) )
										.attr("y", margin.top)
										.attr("opacity", 0)
										.attr("fill-opacity", 0)
										.attr("stroke", "#27A0CC")
										.attr("stroke-width", "2px")

										// add white border to values
										barValueBorders = barChart.append("g")
											.attr("class", "bar-values")
											.selectAll("text.borders")
											.data(timePeriods)
											.enter()
											.append("text")
											.attr("class", "borders")
											.attr("x", function(d) {return x(d) + x.bandwidth()/2})
											.attr("y", y(0))
											.text("")

									// add values to go above bars
									barValueNumbers = barChart//.append("g")
									 	//.attr("class", "bar-values")
										.select(".bar-values")
										.selectAll("text.vals")
										.data(timePeriods)
										.enter()
										.append("text")
										.attr("class", "vals")
										.attr("x", function(d) { return x(d) + x.bandwidth()/2})
										.attr("y", y(0))
										.text("")

									// barValues = barValueNumbers.merge(barValueBorders)

								} // end drawBarChart

								// // number for selected neighbourhood
								// legend.append('label')
								// .attr('class','legendVal')
								// .attr("id",function(d,i){return layernames[i]})
								// .text("")
								// .attr("value", function(d,i){return layernames[i]})
								// .on("click",repaintLayer);
								//
								// // bar for selected neighbourhood
								// legend.append('div')
								// .attr('class','legendx')
								// .attr("id",function(d,i){return "legendx" + layernames[i]})
								// .style("width", "0px")
								// .style("height","20px")
								// .style("margin-left","7px")
								// .style("margin-top","10px")
								// .style("background-color","black")
								// .style("position","relative")
								// .style("float","left")
								// .style("background-color","#1b5f97");

	} // end setLegend

	function moveBackInTime() {
		console.log("move BACKwards in time")
		// change currentMonth
		if (currentMonth === 0) {
			currentMonth = timePeriods.length - 1
		} else {
			currentMonth--
		}
		moveInTime()
	}

	function moveForwardsInTime() {
		console.log("move forwards in time")
		currentMonth = (currentMonth + 1) % timePeriods.length
		moveInTime()
	}

	function moveInTime() {
		// move box on bar chart
		// if (size == "lg") {
			d3.select("#currentMonthBox")
				.attr("opacity", 1)
				.attr("fill-opacity", 0.1)
				.transition()
				.attr("x", x(timePeriods[currentMonth]))
		// }

		// ensure show by month radio button is selected
		// if the user moves through time we assume they want to show by month
		d3.select("#radio1").property("checked", true)
		// change current month display text
		d3.select("#timeName")
			.text(timePeriods[currentMonth])
		// repaint layer if correct radio button is checked
		// if (d3.select("#radio1").property("checked")) {
			setFeatureState(timePeriods[currentMonth])
		// }
		if(currentAreacd!=""){
			setAxisVal(currentAreanm, currentAreanmhc, currentAreacd);
		}
	}

	function repaintLayer() {

		selectedButton = d3.select(this).attr("id");

		// make sure placename is right on mobile
		if(currentAreacd!=""){
				setAxisVal(currentAreanm, currentAreanmhc, currentAreacd);
		}


		if (selectedButton === "radio0") {
			layername = layernames[0]
			d3.select("#timeControls").style("display", "none")
			// if (size == "lg") {
				d3.select("#currentMonthBox")
					.transition()
					.attr("opacity", 0)
					.attr("fill-opacity", 0)
			// }
		} else if (selectedButton === "radio1") {
			layername = timePeriods[currentMonth]
			d3.select("#timeControls").style("display", null)
			// if (size == "lg") {
				d3.select("#currentMonthBox")
					.transition()
					.attr("opacity", 1)
					.attr("fill-opacity", 0.1)
			// }
		} else {
			console.log("Warning: id of selected radio button not recognised")
		}

		setFeatureState(layername)
	} // end repaintLayer

	function setFeatureState(layername) {
		for (key in dataTimePeriods[layername]) {
			map.setFeatureState({
				source: 'msoa-centroids',
				sourceLayer: 'msoacentroids',
				id: key
			}, {
				casesPI: Math.sqrt(+dataTimePeriods[layername][key]/Math.PI),
				cases: +dataTimePeriods[layername][key]
			});
		}
	} // end setFeatureState

	function resetCurrentAreas(){
		currentAreanm = ""
		currentAreanmhc = ""
		currentAreacd = ""
	}

	function hideaxisVal() {
		d3.select("#placename")
			.style("font-weight", "bold")
			.text("");

		// if (size == "lg") {
			bars.transition()
				.attr("y", y(0))
				.attr("height", 0)

			barValueNumbers
				.attr("y", y(0))
				.text("")

			barValueBorders
				.attr("y", y(0))
				.text("")
		// }
	} // end hideaxisVal


	$(".search-control").click(function() {
		$(".search-control").val('');
	})

	d3.select(".search-control").on("keydown", function() {
	if(d3.event.keyCode === 13){
		event.preventDefault();
		event.stopPropagation();

		myValue=$(".search-control").val();


		getCodes(myValue);
		pymChild.sendHeight();

	}
})

function tog(v){return v?'addClass':'removeClass';}

$(document).on('input', '.clearable', function(){
		$(this)[tog(this.value)]('x');
}).on('mousemove', '.x', function( e ){
		$(this)[tog(this.offsetWidth-28 < e.clientX-this.getBoundingClientRect().left)]('onX');
}).on('touchstart click', '.onX', function( ev ){
		ev.preventDefault();
		$(this).removeClass('x onX').val('').change();
		enableMouseEvents();
		onLeave();
		hideaxisVal();
		resetCurrentAreas();
});

	$("#submitPost").click(function( event ) {

					event.preventDefault();
					event.stopPropagation();

					myValue=$(".search-control").val();


					getCodes(myValue);
					pymChild.sendHeight();
	});


	function getCodes(myPC)	{
		disableMouseEvents();
		//first show the remove cross
		d3.select(".search-control").append("abbr").attr("class","postcode");

			// dataLayer.push({
			// 					 'event': 'geoLocate',
			// 					 'selected': 'postcode'
			// 				 })

			var myURIstring=encodeURI("https://api.postcodes.io/postcodes/"+myPC);
			$.support.cors = true;
			$.ajax({
				type: "GET",
				crossDomain: true,
				dataType: "jsonp",
				url: myURIstring,
				error: function (xhr, ajaxOptions, thrownError) {
					},
				success: function(data1){
					if(data1.status == 200 ){
						//$("#pcError").hide();
						lat =data1.result.latitude;
						lng = data1.result.longitude;
						successpc(lat,lng)
					} else {
						$(".search-control").val("Sorry, invalid postcode.");
						enableMouseEvents();
					}
				}

			});

		}


	function successpc(lat,lng) {

		map.jumpTo({center:[lng,lat], zoom:12})
		point = map.project([lng,lat]);


		setTimeout(function(){

		var tilechecker = setInterval(function(){
			 features=null
			 features = map.queryRenderedFeatures(point,{layers: ['coronabound']});

			 if(features.length != 0){

				 setTimeout(function(){
		 			features = map.queryRenderedFeatures(point,{layers: ['coronabound']});

				disableMouseEvents();
				currentAreanm = features[0].properties.areanm;
				currentAreanmhc = features[0].properties.areanmhc;
				currentAreacd = features[0].properties.areacd;
				newareacd = features[0].properties.areacd;
				setAxisVal(features[0].properties.areanm, features[0].properties.areanmhc, features[0].properties.areacd);
				updateFeatures()
				//updatePercent(features[0]);
			},400);
		 		clearInterval(tilechecker);
		 	}
		 },500)
		},500);




	};

	function disableMouseEvents() {
			map.off("mousemove", "coronabound", onMove);
			map.off("mouseleave", "coronabound", onLeave);
	}

	function enableMouseEvents() {
			map.on("mousemove", "coronabound", onMove);
			// map.on("click", "corona", onClick);
			map.on("mouseleave", "coronabound", onLeave);
	}

	function setFeatureStateOnMap(areacode, hoverBool) {
		if (areacode) {
			map.setFeatureState(
				{ source: "msoa-centroids", sourceLayer: "msoacentroids", id: areacode },
				{ hover: hoverBool }
			);
			map.setFeatureState(
				{ source: "msoa-bounds", sourceLayer: "boundaries", id: areacode },
				{ hover: hoverBool }
			)
		}
	}

	function updateFeatures() {
		console.log('update feature states')
		// remove hover over old area
		setFeatureStateOnMap(oldareacd, false);
		// hover over new area
		setFeatureStateOnMap(newareacd, true);
		oldareacd = newareacd;
	}



}
