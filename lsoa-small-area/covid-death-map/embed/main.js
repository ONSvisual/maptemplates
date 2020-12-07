var pymChild = new pym.Child();

d3.queue()
	.defer(d3.csv, "data/data.csv")
	.await(ready);

function ready(error, featureService) {


	if (error) {
		console.error(error);
		return;
	}

	var data = featureService.map(function(feature) {
		return {
			areacd: feature.areacd,
			areanm: feature.areanm,
			areanmhc: feature.areanmhc,
			cases: feature.covid,
			casesMar: feature.covidmar,
			casesApr: feature.covidapr,
			casesMay: feature.covidmay,
			casesJune: feature.covidjune,
			casesJuly: feature.covidjuly

		};
	});


	dataAll = {}
	dataMar = {}
	dataApr = {}
	dataMay = {}
	dataJune = {}
	dataJuly = {}

	data.forEach(function(d){
		dataAll[d.areacd] = +d.cases,
		dataMar[d.areacd] = +d.casesMar,
		dataApr[d.areacd] = +d.casesApr,
		dataMay[d.areacd] = +d.casesMay,
		dataJune[d.areacd] = +d.casesJune,
		dataJuly[d.areacd] = +d.casesJuly
	});


	const areabyid = [];
	const cases = [];
	const cases2 = [];
	const areanmhc = [];

	data.forEach(function(d, i) {
		cases[d.areacd] = +d.cases;
		areanmhc[d.areacd] = d.areanmhc;
		cases2[i] = +d.cases;
		areabyid[d.areacd] = d.areanm;
	});


	var maxvalue = d3.max(cases2);

	// areas.features.map(function(d, i) {
	// 	if (cases[d.properties.areacd] >= 0) {
	// 		d.properties.cases = cases[d.properties.areacd];
	// 		d.properties.casesPI = Math.sqrt(cases[d.properties.areacd]/Math.PI);
	// 		d.properties.areanmhc = areanmhc[d.properties.areacd];
	// 	} else {
	// 		d.properties.cases = 0;
	// 	}
	// });

	// areabounds.features.map(function(d, i) {
	// 	if (cases[d.properties.areacd] >= 0) {
	// 		d.properties.cases = cases[d.properties.areacd];
	// 	} else {
	// 		d.properties.cases = 0;
	// 	}
	// });


	map = new mapboxgl.Map({
		container: "map",
		style: "data/style.json",
		center: [-3.5, 52.355],
		zoom: 5,
		maxZoom:13.999,
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
		//map.addSource("area", { type: "geojson", data: areas });

		map.addSource('msoa-centroids', {
			type: 'vector',
			"tiles": ["https://cdn.ons.gov.uk/maptiles/administrative/msoa/v1/centroids/{z}/{x}/{y}.pbf"],
			"promoteId": { "msoacentroids": "areacd" },
			"bounds": [-5.8,50.0,1.9,55.9],
			"minzoom":3,
			"maxzoom":14
		});



	//	map.addSource("areabound", { type: "geojson", data: areabounds });




		map.addLayer(
			{
				id: "coronabound",
				type: "fill",
				"source": {
					"type": "vector",
					"bounds": [-5.8,50.0,1.9,55.9],
					//"tiles": ["http://localhost:8000/boundaries/{z}/{x}/{y}.pbf"],
					"tiles": ["https://cdn.ons.gov.uk/maptiles/administrative/msoa/v1/boundaries/{z}/{x}/{y}.pbf"],
				},
				"source-layer": "boundaries",
				minzoom: 4,
				maxzoom: 21,
				layout: {},
				paint: {
					'fill-opacity': [
							'interpolate',
							  ['linear'],
							  // ['zoom'] indicates zoom, default at lowest number, threshold, value above threshold
							  ['zoom'],
							  10, 0,
							  11, 1
						],
					"fill-color": "rgba(255,255,255,0)",
					// "fill-outline": "grey",
					"fill-outline-color": "grey"
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
            ['interpolate', ['linear'], ['zoom'],
              4, ['case', ['!=', ['feature-state', 'casesPI'], null], ['/', ['feature-state', 'casesPI'], 0.5], 1],
              8, ['case', ['!=', ['feature-state', 'casesPI'], null], ['/', ['feature-state', 'casesPI'], 0.5], 1],
              16, ['case', ['!=', ['feature-state', 'casesPI'], null], ['/', ['feature-state', 'casesPI'], 0.05], 1]
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
            ['interpolate', ['linear'], ['zoom'],
              4, ['case', ['!=', ['feature-state', 'casesPI'], null], ['/', ['feature-state', 'casesPI'], 0.5], 1],
              8, ['case', ['!=', ['feature-state', 'casesPI'], null], ['/', ['feature-state', 'casesPI'], 0.5], 1],
              16, ['case', ['!=', ['feature-state', 'casesPI'], null], ['/', ['feature-state', 'casesPI'], 0.05], 1]
            ],
					"circle-opacity": 0.9,
					"circle-stroke-color": "black",
					"circle-stroke-width": 3,
					"circle-color": "rgba(255,255,255,0)"
				},
				filter: ["==", "areacd", ""]
			},
			"place_suburb"
		);


		map.addLayer(
			 {
				id: "coronaboundhover",
				type: "line",
				"source": {
					"type": "vector",
					"bounds": [-5.8,50.0,1.9,55.9],
					//"tiles": ["https://cdn.ons.gov.uk/maptiles/t30/boundaries/{z}/{x}/{y}.pbf"],
					"tiles": ["https://cdn.ons.gov.uk/maptiles/administrative/msoa/v1/boundaries/{z}/{x}/{y}.pbf"],
					"minzoom":3,
					"maxzoom":14

					//"tiles": ["https://cdn.ons.gov.uk/maptiles/t23/boundaries/{z}/{x}/{y}.pbf"],
				},
				"source-layer": "boundaries",
				minzoom: 8,
				maxzoom: 20,
				layout: {},
				paint: {
					"line-color": "black",
					"line-width": 2
				},
			filter: ["==", "areacd", ""]
			},
			"place_suburb"
		);

		var bounds = new mapboxgl.LngLatBounds();

		// areas.features.forEach(function(feature) {
		// 	bounds.extend(feature.geometry.coordinates);
		// });


		map.fitBounds([[-5.8,50.0],[1.9,55.9]]);


			for (key in dataAll) {

			//	console.log(key);

				map.setFeatureState({
					source: 'msoa-centroids',
					sourceLayer: 'msoacentroids',
					id: key
				}, {
					casesPI: Math.sqrt(dataAll[key]/Math.PI),
					cases: dataAll[key]
				});
			}


	});

	setLegend()


	map.on("mousemove", "coronabound", onMove);
	map.on("mouseleave", "coronabound", onLeave);
	map.on("click", "corona", onClick);

	pymChild.onMessage('update', receiveUpdate);

	function receiveUpdate(updateObj) {
		pymobj = JSON.parse(updateObj);
		successpc(pymobj.coordinates.latitude,pymobj.coordinates.longitude)
		disableMouseEvents();
		showRemoveSelection();
	}


	map.on('click', function(e) {
		var features = map.queryRenderedFeatures(e.point);
	})

	function onMove(e) {

		var oldareacd = "ff";

		newareacd = e.features[0].properties.areacd;

		if (newareacd != oldareacd) {
			oldareacd = e.features[0].properties.areacd;

			map.setFilter("coronahover", [
				"==",
				"areacd",
				e.features[0].properties.areacd
			]);

			map.setFilter("coronaboundhover", [
				"==",
				"areacd",
				e.features[0].properties.areacd
			]);

			var features = map.queryRenderedFeatures(e.point, {
				layers: ["coronabound"]
			});

			if (features.length != 0) {
				setAxisVal(e.features[0].properties.areanm, e.features[0].properties.areanmhc, e.features[0].properties.areacd);
			}
		}
	}

	function onClick(e) {
		console.log(e)
		var oldareacd = "ff";
		newareacd = e.features[0].properties.areacd;

		if (newareacd != oldareacd) {
			oldareacd = e.features[0].properties.areacd;
			map.setFilter("coronahover", [
				"==",
				"areacd",
				e.features[0].properties.areacd
			]);

			map.setFilter("coronaboundhover", [
				"==",
				"areacd",
				e.features[0].properties.areacd
			]);
			console.log(e.features[0].properties)

			setAxisVal(e.features[0].properties.areanm, e.features[0].properties.areanmhc, e.features[0].properties.areacd);

		}
	}

	function onLeave() {
		map.setFilter("coronahover", ["==", "areacd", ""]);
		map.setFilter("coronaboundhover", ["==", "areacd", ""]);

		oldlsoa11cd = "";
		hideaxisVal();
	}

	function setAxisVal(areanm, areanmhc, areacd) {
		d3.select("#keyvalue")
			.style("font-weight", "bold")
			.html(function() {
				if(parseInt(d3.select("body").style("width")) <= 600) {
					if (!isNaN(dataAll[areacd])) {
						return areanmhc + "<br><span id='msoacodetext'>MSOA " + areanm + "</span><br>" + dataAll[areacd] + " deaths";
					} else {
						return areanmhc + "<br><span id='msoacodetext'>MSOA " + areanm + "</span><br>" + dataAll[areacd] + " deaths";
					}
				} else {
					if (!isNaN(dataAll[areacd])) {
						return areanmhc + "<br><span id='msoacodetext'>MSOA " + areanm + "</span><br>";
					} else {
						return areanmhc + "<br><span id='msoacodetext'>MSOA " + areanm + "</span><br>";
					}
				}

			});

			d3.select("#keyvaluehidden")
					.html("In " + areanmhc + " there have been " +
							dataAll[areacd] + " deaths overall. There have been " +
							dataMar[areacd] + " deaths in March. There have been " +
							dataApr[areacd] + " deaths in April. There have been " +
							dataMay[areacd]+  " deaths in May. There have been " +
							dataJune[areacd] + " deaths in June. And there have been  " +
							dataJuly[areacd] +" deaths in July.")


		d3.select("#deathLabel").text("Deaths");

		d3.select("#legendVal0").text(dataAll[areacd]);
		d3.select("#legendVal1").text(dataMar[areacd]);
		d3.select("#legendVal2").text(dataApr[areacd]);
		d3.select("#legendVal3").text(dataMay[areacd]);
		d3.select("#legendVal4").text(dataJune[areacd]);
		d3.select("#legendVal5").text(dataJuly[areacd]);

		d3.select("#legendx0").style("width", dataAll[areacd] + "px");
		d3.select("#legendx1").style("width", dataMar[areacd] + "px");
		d3.select("#legendx2").style("width", dataApr[areacd] + "px");
		d3.select("#legendx3").style("width", dataMay[areacd] + "px");
		d3.select("#legendx4").style("width", dataJune[areacd] + "px");
		d3.select("#legendx5").style("width", dataJuly[areacd] + "px");
	}

	function setLegend() {

		layernames = ["All","Mar","Apr","May","June","July"];

		d3.select("#keydiv").append("div").attr("id","deathLabel").text("").style("position","relative").style("left","136px").style("height","20px")

		legend = d3.select("#keydiv")//.append('ul')
								// 	.attr('class', 'key')
									.selectAll('g')
									.data(["Overall","March","April","May","June","July"])
									.enter()
									.append('div')
									.attr('class', function(d, i) { return 'key-item key-' + i + ' b '+ d.replace(' ', '-').toLowerCase(); })


								legend.append("input")
										.style("float","left")
										.attr("id",function(d,i){return "radio"+i})
										.attr("class","input input--radio js-focusable")
										.attr("type","radio")
										.attr("name","layerchoice")
										.attr("value", function(d,i){return layernames[i]})
										.property("checked", function(d,i){if(i==0){return true}})
										.on("click",repaintLayer)

								legend.append('label')
								.attr('class','legendlabel').text(function(d,i) {
									var value = parseFloat(d).toFixed(1);
									return d;
								})

								legend.append('label')
								.attr('class','legendVal')
								.attr("id",function(d,i){return "legendVal" + i})
								.text("")
								.attr("value", function(d,i){return layernames[i]})
								.on("click",repaintLayer);

								legend.append('div')
								.attr('class','legendx')
								.attr("id",function(d,i){return "legendx" + i})
								.style("width", "0px")
								.style("height","20px")
								.style("margin-left","7px")
								.style("margin-top","10px")
								.style("background-color","black")
								.style("position","relative")
								.style("float","left")
								.style("background-color","#1b5f97")


	}

	function repaintLayer() {

		layername = d3.select(this).attr("value");

		if(layername == "All") {
			for (key in dataAll) {

			//	console.log(key);

				map.setFeatureState({
					source: 'msoa-centroids',
					sourceLayer: 'msoacentroids',
					id: key
				}, {
					casesPI: Math.sqrt(eval(dataAll[key])/Math.PI),
					cases: dataAll[key]

				});
			}


		} else if(layername == "Mar") {

			for (key in dataAll) {

			//	console.log(key);

				map.setFeatureState({
					source: 'msoa-centroids',
					sourceLayer: 'msoacentroids',
					id: key
				}, {
					casesPI: Math.sqrt(eval(dataMar[key])/Math.PI),
					cases: dataMar[key]
				});
			}

		} else if(layername == "Apr") {

			for (key in dataAll) {

			//	console.log(key);

				map.setFeatureState({
					source: 'msoa-centroids',
					sourceLayer: 'msoacentroids',
					id: key
				}, {
					casesPI: Math.sqrt(eval(dataApr[key])/Math.PI),
					cases: dataApr[key]
				});
			}

		} else if(layername == "May") {

			for (key in dataAll) {

			//	console.log(key);

				map.setFeatureState({
					source: 'msoa-centroids',
					sourceLayer: 'msoacentroids',
					id: key
				}, {
					casesPI: Math.sqrt(eval(dataMay[key])/Math.PI),
					cases: dataMay[key]
				});
			}

		} else if(layername == "June") {

			for (key in dataAll) {

			//	console.log(key);

				map.setFeatureState({
					source: 'msoa-centroids',
					sourceLayer: 'msoacentroids',
					id: key
				}, {
					casesPI: Math.sqrt(eval(dataJune[key])/Math.PI),
					cases: dataJune[key]
				});
			}

		} else if(layername == "July") {

			for (key in dataAll) {

			//	console.log(key);

				map.setFeatureState({
					source: 'msoa-centroids',
					sourceLayer: 'msoacentroids',
					id: key
				}, {
					casesPI: Math.sqrt(eval(dataJuly[key])/Math.PI),
					cases: dataJuly[key]
				});
			}

		}




	}

	function hideaxisVal() {
		d3
			.select("#keyvalue")
			.style("font-weight", "bold")
			.text("");


			d3.selectAll(".legendVal")
				.text("");

			d3.selectAll("#deathLabel")
				.text("");

			d3.selectAll(".legendx")
				.style("width","0px");

	}

	function showRemoveSelection() {
				currwidth = d3.select("#map").style("width");
				d3.select("#removeSelection").style("left",(parseInt(currwidth)/2) - 100 + "px").style("display","block");

				d3.select("#removeSelection").on("click", removeRemoveSelection);

	}

	function removeRemoveSelection() {
		onLeave();
		enableMouseEvents();
		d3.select("#removeSelection").style("display","none");
	}


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
});

	$("#submitPost").click(function( event ) {

					event.preventDefault();
					event.stopPropagation();

					myValue=$(".search-control").val();


					getCodes(myValue);
					pymChild.sendHeight();
	});


	function getCodes(myPC)	{

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

		 		 //onrender(),
		 		//map.setFilter("coronahover", ["==", "areacd", features[0].properties.areacd]);

				map.setFilter("coronahover", [
					"==",
					"areacd",
					features[0].properties.areacd
				]);

				map.setFilter("coronaboundhover", [
					"==",
					"areacd",
					features[0].properties.areacd
				]);
				//var features = map.queryRenderedFeatures(point);
				disableMouseEvents();
				setAxisVal(features[0].properties.areanm, features[0].properties.areanmhc, features[0].properties.areacd);
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
			map.on("click", "corona", onClick);
			map.on("mouseleave", "coronabound", onLeave);
	}



}
