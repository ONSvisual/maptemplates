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
      center: [-0.12, 51.5], // starting position 51.5074° N, 0.1278
      maxBounds: [[-12.836, 49.441], [7.604, 55.945]],//limit it to just E&W
      zoom: 12, // starting zoom
      minZoom: 4,
      maxZoom: 16.99, //
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
    color = d3.scaleThreshold()
      .domain(breaks.slice(1))
      .range(colour);

    //now ranges are set we can call draw the key
    createKey(dvc);

    map.on('load', function() {

      // Add boundaries tileset
      map.addSource('lsoa-tiles', {
        type: 'vector',
        tiles: ['https://cdn.ons.gov.uk/maptiles/administrative/lsoa/v1/boundaries/{z}/{x}/{y}.pbf'],
        "promoteId": {
          "boundaries": "AREACD"
        },
        minzoom:4,
        maxzoom: 12,
      });

      map.addLayer({
        id: 'lsoa-boundaries',
        type: 'fill',
        source: 'lsoa-tiles',
        'source-layer': 'boundaries',
        minzoom:4,
        maxzoom:17,
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
            8,
            0.9,
            9,
            0.1
          ]
        }
      }, 'place_suburb');

      // Add buildings tileset
      map.addSource('building-tiles', {
        type: 'vector',
        tiles: ['https://cdn.ons.gov.uk/maptiles/administrative/lsoa/v1/buildings/{z}/{x}/{y}.pbf'],
        promoteId: {
          buildings: "AREACD"
        },
        minzoom: 8,
        maxzoom: 12,
      });

      // Add layer from the vector tile source with data-driven style
      map.addLayer({
        id: 'lsoa-building',
        type: 'fill',
        source: 'building-tiles',
        'source-layer': 'buildings',
        minzoom:8,
        maxzoom:17,
        paint: {
          'fill-color': ['case',
            ['!=', ['feature-state', 'colour'], null],
            ['feature-state', 'colour'],
            'rgba(255, 255, 255, 0)'
          ],
          'fill-opacity': 0.8
        }
      }, 'place_suburb');

      //loop the json data and set feature state for building layer and boundary layer
      for (var key in json) {
        // setFeatureState for buildlings
        map.setFeatureState({
          source: 'building-tiles',
          sourceLayer: 'buildings',
          id: key
        }, {
          colour: getColour(json[key])
        });

        //setFeatureState for boundaries
        map.setFeatureState({
          source: 'lsoa-tiles',
          sourceLayer: 'boundaries',
          id: key
        }, {
          colour: getColour(json[key])
        });
      }

      //outlines around LSOA
      map.addLayer({
        id: "lsoa-outlines",
        type: "line",
        source: 'lsoa-tiles',
        minzoom: 4,
        maxzoom: 17,
        "source-layer": "boundaries",
        "background-color": "#ccc",
        paint: {
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



    // When the user moves their mouse over the lsoa boundaries layer, we'll update the
    // feature state for the feature under the mouse.
    map.on('mousemove', 'lsoa-boundaries', onMove);

    // When the mouse leaves the lsoa boundaries layer, update the feature state of the
    // previously hovered feature.
    map.on('mouseleave', 'lsoa-boundaries', onLeave);


    map.on('click', 'lsoa-boundaries', onClick);

    function onClick(e) {
      disableMouseEvents();
      highlightArea(e.features);
      addClearBox();
    }

    function addClearBox() {
      if(d3.select('#clearbutton').empty()){
        d3.select('#keydiv').append('button').attr('id', 'clearbutton').attr('class', 'clear').text("Clear area").attr('tabindex', 0);
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
      map.off('mousemove', 'lsoa-boundaries', onMove);
      map.off('mouseleave', 'lsoa-boundaries', onLeave);
    }
    //
    function enableMouseEvents() {
      map.on('mousemove', 'lsoa-boundaries', onMove);
      map.on('mouseleave', 'lsoa-boundaries', onLeave);
    }

    function createKey(dvc) {
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

      stops = d3.zip(breaks,colour);

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
            return "£" + displayformat(breaks[i]) + " to £" + displayformat(breaks[i + 1] - 1);
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
          d3.select("screenreadertext").text("Enter a valid postcode");
        },
        success: function(data1) {
          if (data1.status == 200) {
            lat = data1.result.latitude;
            lng = data1.result.longitude;
            successpc(lat, lng);
          } else {
            d3.select("#keyvalue").text("Enter a valid postcode");
            d3.select("screenreadertext").text("Enter a valid postcode");
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
            layers: ['lsoa-boundaries']
          });
          if (features.length != 0) {
            highlightArea(features);
            disableMouseEvents();
            addClearBox();
            clearInterval(tilechecker);
          }
        }, 500);
      }, 500);
    }

    function onMove(e) {
      highlightArea(e.features);
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
        source: 'lsoa-tiles',
        sourceLayer: 'boundaries',
        id: hoveredId
      }, {
        hover: false
      });
    }

    hoveredId = e[0].id;

    map.setFeatureState({
      source: 'lsoa-tiles',
      sourceLayer: 'boundaries',
      id: hoveredId
    }, {
      hover: true
    });

    setAxisVal(e[0].properties.AREANM, json[e[0].properties.AREACD]);
    setScreenreader(e[0].properties.AREANM, json[e[0].properties.AREACD]);
  }
}

function unhighlightArea(){
  if (hoveredId) {
    map.setFeatureState({
      source: 'lsoa-tiles',
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
      source: 'lsoa-tiles',
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
      return areanm + "<br>" + "£" + displayformat(areaval);
    } else {
      return areanm + "<br>No data available";
    }
  });
}

function setScreenreader(name, value) {
  if (!isNaN(value)) {
    d3.select("#screenreadertext").text("The average house price paid in " + name + " is £" + d3.format(",")(value));
  } else {
    d3.select("#screenreadertext").text("There is no data available for " + name);
  }
}

function hideaxisVal() {
  d3.select("#keyvalue").style("font-weight", "bold").text("");
  d3.select("#screenreadertext").text("");
}

function getColour(value) {
  return isNaN(value) ? dvc.nullColour : color(value);
}

function csv2json(csv) {
  var json = {},
    i = 0,
    len = csv.length;
  while (i < len) {
    json[csv[i][csv.columns[0]]] = +csv[i][csv.columns[1]];
    i++;
  }
  return json;
}
