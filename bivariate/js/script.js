//test if browser supports webGL

if (Modernizr.webgl) {

  //setup pymjs
  var pymChild = new pym.Child();

  //Load data and config file
  d3.queue()
    .defer(d3.json, "data/config.json")
    .defer(d3.csv, "data/data.csv")
    .await(ready);

  function ready(error, config, data) {
    //turn csv data into json format
    json = csv2json(data);

    //Set up global variables
    dvc = config.ons;
    hoveredId = null;

    //set title of page
    document.title = dvc.maptitle;

    //Set up number formats
    displayformat = d3.format(",." + dvc.displaydecimals + "f");
    legendformat = d3.format(",");

    //set up basemap
    map = new mapboxgl.Map({
      container: 'map', // container id
      style: 'data/style.json', //stylesheet location
      center: [-3.12, 53], // starting position 51.5074° N, 0.1278
      zoom: 5, // starting zoom
      minZoom: 4,
      maxZoom: 17, //
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
      compact: true,
      // add zoomstack attribution
      customAttribution: "Contains OS data © Crown copyright and database right (" + new Date().getFullYear() + ")"
    }));

    //define mouse pointer
    map.getCanvasContainer().style.cursor = 'pointer';

    addFullscreen();

    // if breaks is jenks or equal
    // get all the numbers, filter out the blanks, and then sort them
    breaks = generateBreaks(data, dvc);

    //Load colours
    if (typeof dvc.varcolour === 'string') {
      colour = colorbrewer[dvc.varcolour][dvc.numberBreaks];
    } else {
      colour = dvc.varcolour;
    }

    //set up d3 color scales
    color1 = d3.scaleThreshold()
      .domain([0,4,8,13])
      .range([0.2,0.4,0.6,0.8,1]);

    color2 = d3.scaleThreshold()
      .domain([1,2,3])
      .range([200,220,240,260])


    category1 = d3.scaleThreshold() //categorise the prevelance
      .domain([6])
      .range(["Low","High"])

    category2 = d3.scaleThreshold() //categorise the risk
      .domain([2])
      .range(["Low","High"])


    //now ranges are set we can call draw the key
    createKey(config);

    map.on('load', function() {

      // Add boundaries tileset
      map.addSource('area-tiles', {
        type: 'vector',
        "tiles": ['https://cdn.ons.gov.uk/maptiles/administrative/msoa/v1/boundaries/{z}/{x}/{y}.pbf'],
        "promoteId": {
          "boundaries": "areacd"
        },
        "buffer": 0,
        "maxzoom": 13,
      });

      map.addLayer({
        id: 'area-boundaries',
        type: 'fill',
        source: 'area-tiles',
        'source-layer': 'boundaries',
        paint: {
          'fill-color': ['case',
            ['!=', ['feature-state', 'colour'], null],
            ['feature-state', 'colour'],
            'rgba(255, 255, 255, 0)'
          ],
          'fill-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9,
            0.9,
            15,
            0.1
          ]
        }
      }, 'place_suburb');

      // // Add buildings tileset
      // map.addSource('building-tiles', {
      //   type: 'vector',
      //   "tiles": ['https://cdn.ons.gov.uk/maptiles/administrative/area/v1/buildings/{z}/{x}/{y}.pbf'],
      //   "promoteId": {
      //     "buildings": "areacd"
      //   },
      //   "buffer": 0,
      //   "maxzoom": 13,
      // });

      // // Add layer from the vector tile source with data-driven style
      // map.addLayer({
      //   id: 'area-building',
      //   type: 'fill',
      //   source: 'building-tiles',
      //   'source-layer': 'buildings',
      //   paint: {
      //     'fill-color': ['case',
      //       ['!=', ['feature-state', 'colour'], null],
      //       ['feature-state', 'colour'],
      //       'rgba(255, 255, 255, 0)'
      //     ],
      //     'fill-opacity': 0.8
      //   }
      // }, 'place_suburb');

      //loop the json data and set feature state for building layer and boundary layer
      for (var key in json) {
        // setFeatureState for buildlings
        // map.setFeatureState({
        //   source: 'building-tiles',
        //   sourceLayer: 'buildings',
        //   id: key
        // }, {
        //   value: json[key],
        //   colour: getColour(json[key])
        // });

        //setFeatureState for boundaries
        map.setFeatureState({
          source: 'area-tiles',
          sourceLayer: 'boundaries',
          id: key
        }, {
          value: json[key].value1,
          colour: getColour(json[key].value1, json[key].value2)
        });
      }

      //outlines around area
      map.addLayer({
        "id": "area-outlines",
        "type": "line",
        "source": 'area-tiles',
        "minzoom": 9,
        "maxzoom": 20,
        "source-layer": "boundaries",
        "background-color": "#ccc",
        'paint': {
          'line-color': 'orange',
          "line-width": 3,
          "line-opacity": [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            1,
            0
          ]
        },
      }, 'place_suburb');

      //get location on click
      d3.select(".mapboxgl-ctrl-geolocate").on("click", geolocate);

    });

    // clears search box on click
    // $(".search-control").click(function() {
    //   $(".search-control").val('');
    // });

    // if you push enter while in the box
    d3.select(".search-control").on("keydown", function() {
      if (d3.event.keyCode === 13) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        getCodes($(".search-control").val());
      }
    });
    //if you click on the search icon, find the postcode
    $("#submitPost").click(function(event) {
      event.preventDefault();
      event.stopPropagation();
      getCodes($(".search-control").val());
    });

    //if you focus on the search icon and push space or enter
    d3.select("#submitPost").on("keydown", function() {
      if (d3.event.keyCode === 13 || d3.event.keyCode === 32) {
        event.preventDefault();
        event.stopPropagation();
        getCodes($(".search-control").val());
      }
    });



    // When the user moves their mouse over the area boundaries layer, we'll update the
    // feature state for the feature under the mouse.
    map.on('mousemove', 'area-boundaries', onMove);

    // When the mouse leaves the area boundaries layer, update the feature state of the
    // previously hovered feature.
    map.on('mouseleave', 'area-boundaries', onLeave);


    map.on('click', 'area-boundaries', onClick);

    function onClick(e) {
      disableMouseEvents();
      highlightArea(e.features);
      addClearBox();
    }

    function addClearBox() {
      if(d3.select('#clearbutton').empty()){
        d3.select('#keydiv').append('a').attr('id', 'clearbutton').attr('role', 'button').attr('class', 'clear').attr('title', 'close').text("close").attr('tabindex', 0);
        d3.select('#clearbutton').on('click', removeClearBox);
        d3.select("#clearbutton").on("keydown", function() {
          if (d3.event.keyCode === 13 || d3.event.keyCode === 32) {
            event.preventDefault();
            event.stopPropagation();
            removeClearBox();
          }
        });
      }
    }

    function removeClearBox() {
      d3.select("#clearbutton").remove();
      enableMouseEvents();
      hideaxisVal();
      unhighlightArea();
    }

    function disableMouseEvents() {
      map.off('mousemove', 'area-boundaries', onMove);
      map.off('mouseleave', 'area-boundaries', onLeave);
    }
    //
    function enableMouseEvents() {
      map.on('mousemove', 'area-boundaries', onMove);
      map.on('mouseleave', 'area-boundaries', onLeave);
    }

    function createKey(config) {
      keywidth = d3.select("#keydiv").node().getBoundingClientRect().width;

      var svgkey = d3.select("#keydiv")
        .attr("width", keywidth);

      d3.select("#keydiv")
        .style("font-family", "Open Sans")
        .style("font-size", "14px")
        .append("p")
        .attr("id", "keyvalue")
        .style("font-size", "18px")
        .style("margin-top", "10px")
        .style("margin-bottom", "5px")
        .style("margin-left", "10px")
        .text("");

      d3.select("#keydiv")
        .append("p")
        .attr("id", "keyunit")
        .style("margin-top", "5px")
        .style("margin-bottom", "5px")
        .style("margin-left", "10px")
        .text(dvc.varunit);

      stops = [
        [dvc.breaks[0], dvc.varcolour[0]],
        [dvc.breaks[1], dvc.varcolour[1]],
        [dvc.breaks[2], dvc.varcolour[2]],
        [dvc.breaks[3], dvc.varcolour[3]],
        [dvc.breaks[4], dvc.varcolour[4]],
        [dvc.breaks[5], dvc.varcolour[5]]
      ];

      labels = ["High persistance and risk", "Low persistance, high risk", "High persistance, low risk", "Low persistance and risk"]

      hardKeyColours = ["Orange", "Red", "Yellow", "Gray"]

      divs = svgkey.selectAll("div")
        .data(breaks)
        .enter()
        .append("div");

      divs.append("div")
        .style("height", "20px")
        .style("width", "10px")
        .attr("float", "left")
        .style("display", "inline-block")
        .style("background-color", function(d, i) {
          if (i != breaks.length - 1) {
            return stops[i][1];
          } else {
            return dvc.nullColour;
          }
        });

      divs.append("p")
        .attr("float", "left")
        .style("padding-left", "5px")
        .style("margin", "0px")
        .style("display", "inline-block")
        .style("position", "relative")
        .style("top", "-5px")
        .text(function(d, i) {
          if (i != breaks.length - 1) {
            return labels[i];
            //return displayformat(stops[i][0]) + " - " + displayformat(stops[i + 1][0] - 1);
          } else {
            return "No Data";
          }
        });
    } // Ends create key

    function addFullscreen() {
      currentBody = d3.select("#map").style("height");
      d3.select(".mapboxgl-ctrl-fullscreen").on("click", setbodyheight);
    }

    function setbodyheight() {
      d3.select("#map").style("height", "100%");

      document.addEventListener('webkitfullscreenchange', exitHandler, false);
      document.addEventListener('mozfullscreenchange', exitHandler, false);
      document.addEventListener('fullscreenchange', exitHandler, false);
      document.addEventListener('MSFullscreenChange', exitHandler, false);

    }


    function exitHandler() {
      if (document.webkitIsFullScreen === false) {
        shrinkbody();
      } else if (document.mozFullScreen === false) {
        shrinkbody();
      } else if (document.msFullscreenElement === false) {
        shrinkbody();
      }
    }

    function shrinkbody() {
      d3.select("#map").style("height", currentBody);
      pymChild.sendHeight();
    }

    function geolocate() {
      dataLayer.push({
        'event': 'geoLocate',
        'selected': 'geolocate'
      });

      var options = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(success, error, options);
    }

    function getCodes(myPC) {
      //first show the remove cross
      d3.select(".search-control").append("abbr").attr("class", "postcode");

      dataLayer.push({
        'event': 'geoLocate',
        'selected': 'postcode'
      });

      var myURIstring = encodeURI("https://api.postcodes.io/postcodes/" + myPC);
      $.support.cors = true;
      $.ajax({
        type: "GET",
        crossDomain: true,
        dataType: "jsonp",
        url: myURIstring,
        error: function(xhr, ajaxOptions, thrownError) {
          d3.select("#keyvalue").text("Enter a valid postcode");
        },
        success: function(data1) {
          if (data1.status == 200) {
            lat = data1.result.latitude;
            lng = data1.result.longitude;
            successpc(lat, lng);
          } else {
            d3.select("#keyvalue").text("Enter a valid postcode");
          }
        }

      });
      pymChild.sendHeight();
    }


    function successpc(lat, lng) {
      map.jumpTo({
        center: [lng, lat],
        zoom: 12
      });
      point = map.project([lng, lat]);

      setTimeout(function() {
        var tilechecker = setInterval(function() {
          features = null;
          var features = map.queryRenderedFeatures(point, {
            layers: ['area-boundaries']
          });
          if (features.length != 0) {
            console.log("successpc")
            highlightArea(features)
            disableMouseEvents();
            addClearBox();
            clearInterval(tilechecker);
          }
        }, 500);
      }, 500);
    }

    function onMove(e) {
      highlightArea(e.features)
    }

  } //end function ready

} else {

  //provide fallback for browsers that don't support webGL
  d3.select('#map').remove();
  d3.select('body').append('p').html("Unfortunately your browser does not support WebGL. <a href='https://www.gov.uk/help/browsers' target='_blank>'>If you're able to please upgrade to a modern browser</a>");

}

function highlightArea(e) {
  if (e.length > 0) {
    if (hoveredId) {
      map.setFeatureState({
        source: 'area-tiles',
        sourceLayer: 'boundaries',
        id: hoveredId
      }, {
        hover: false
      });
    }

    hoveredId = e[0].id;

    map.setFeatureState({
      source: 'area-tiles',
      sourceLayer: 'boundaries',
      id: hoveredId
    }, {
      hover: true
    });

    console.log(json[e[0].properties.areacd].value1);

    setAxisVal(e[0].properties.areanmhc, json[e[0].properties.areacd] !==undefined? json[e[0].properties.areacd].value1 : NaN);
    
    
    setScreenreader(e[0].properties.areanmhc, json[e[0].properties.areacd].value1);
  }
}

function unhighlightArea(){
  if (hoveredId) {
    map.setFeatureState({
      source: 'area-tiles',
      sourceLayer: 'boundaries',
      id: hoveredId
    }, {
      hover: false
    });
  }
  hoveredId = null;
}


function generateBreaks(data, dvc) {
  if (!Array.isArray(dvc.breaks)) {
    values = data.map(function(d) {
      return +d.value;
    }).filter(function(d) {
      if (!isNaN(d)) {
        return d;
      }
    }).sort(d3.ascending);
  }


  if (dvc.breaks == "jenks") {
    breaks = [];

    ss.ckmeans(values, (dvc.numberBreaks)).map(function(cluster, i) {
      if (i < dvc.numberBreaks - 1) {
        breaks.push(cluster[0]);
      } else {
        breaks.push(cluster[0]);
        //if the last cluster take the last max value
        breaks.push(cluster[cluster.length - 1]);
      }
    });
  } else if (dvc.breaks == "equal") {
    breaks = ss.equalIntervalBreaks(values, dvc.numberBreaks);
  } else {
    breaks = dvc.breaks;
  }

  //round breaks to specified decimal places
  breaks = breaks.map(function(each_element) {
    return Number(each_element.toFixed(dvc.legenddecimals));
  });

  return breaks;
}

function onLeave() {
  if (hoveredId) {
    map.setFeatureState({
      source: 'area-tiles',
      sourceLayer: 'boundaries',
      id: hoveredId
    }, {
      hover: false
    });
  }
  hoveredId = null;
}

function setAxisVal(areanm, areaval) {
  d3.select("#keyvalue").html(function() {
    if (!isNaN(areaval)) {
    //if (typeof areaval === 'string') {
    //if (areaval !== undefined) {
      return areanm + "<br> Value:"  + displayformat(areaval);
    } else {
      return areanm + "<br>No data available";
    }
  });
}

function setScreenreader(name, value1) {
  if (!isNaN(value1)) {
    d3.select("#screenreadertext").text("The average house price paid in " + name + " is " + value1);
  } else {
    d3.select("#screenreadertext").text("There is no data available for " + name);
  }
}

function hideaxisVal() {
  d3.select("#keyvalue").style("font-weight", "bold").text("");
  d3.select("#screenreadertext").text("");
}

function getColour(value1, value2) {

  //Slight bodge hard code the categories

  colour = (category1(value1) === "High" && category2(value2) === "High" ) ? "Orange" : // High persistance and risk
          (category1(value1) === "Low" && category2(value2) === "High" ) ? "Red" :  // Low persistance and high risk
          (category1(value1) === "High" && category2(value2) === "Low" ) ? "Yellow" :  // High persistance and low risk
          "Grey"; // everything else (low persistance and risk)

  return colour

  //return chroma({h:color2(value2), s:color1(value1), l:color1(value1)}).rgba(); //Mix HSL values to colour map - incorrect

  //return isNaN(value) ? dvc.nullColour : color(value); //old, non bivariate way of doing it
}

function csv2jsonOld(csv) {
  var json = {},
    i = 0,
    len = csv.length;
  while (i < len) {
    json[csv[i][csv.columns[0]]] = +csv[i][csv.columns[1]];
    i++;
  }
  return json;
}


function csv2json(csv) {
  var json = {},
    i = 0,
    len = csv.length;
  while (i < len) {
    json[csv[i][csv.columns[0]]] = {};
    var obj=json[csv[i][csv.columns[0]]]
    for(j=1;j<csv.columns.length;j++){
        //obj[csv.columns[j]]=csv[i][csv.columns[j]]; //object name set by csv column heading
        obj["value" + j]=+csv[i][csv.columns[j]]; //object name set sequentially
    }
    i++;
  }
  //console.log(json);
  return json;

}
