//test if browser supports webGL

if (Modernizr.webgl) {

  //setup pymjs
  var pymChild = new pym.Child();

  //Load data and config file
  d3.queue()
    .defer(d3.json, "data/config.json")
    .defer(d3.csv, "data/data_observed_expected_cluster.csv")
    //.defer(d3.csv, "data/data_cluster_groups.csv")
    .await(ready);

  function ready(error, config, data) {
    
    //turn csv data into json format
    json = csv2json(data);
    
    //read headings for date
    headings = d3.keys(data[0]);

    parseTime = d3.timeParse("%d/%m/%Y");

    screenReadDate = d3.timeFormat()

    headingsParsed = {}

    i = 1

    while (i < 15) {
      headingsParsed[i] = parseTime(headings[i])
      i++
    }

    dataFromColumns = readCSVcolumns(data).sort();

    //console.log(dataFromColumns);

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
      maxBounds: [[-12.836, 49.441], [7.604, 55.945]],//limit it to just E&W
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

    //set up d3 color scales - not used
    color1 = d3.scaleThreshold()
      .domain(breaks.slice(1))//([0,0.01,1,4,7])
      .range(colour);

    color2 = d3.scaleThreshold()
      .domain([1,2,3])
      .range([200,220,240,260])


    category1 = d3.scaleThreshold() //categorise the prevelance
      .domain([6])
      .range(["Low","High"])

    category2 = d3.scaleThreshold() //categorise the risk
      .domain([2])
      .range(["Low","High"])

    quantile = d3.scaleQuantile()
      .domain(dataFromColumns)
      .range(["red", "blue", "green", "yellow", "purple"])

    


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
          'fill-color-transition': {
            duration: 1000,
            delay : 500
          },
          'fill-opacity': [

            'feature-state', 'opacity'

            // 'interpolate',
            // ['linear'],
            // ['zoom'],
            // 9,
            // 0.9,
            // 15,
            // 0.1
          ],

        }
      }, 'place_suburb');

     

      //loop the json data and set feature state for building layer and boundary layer
      for (var key in json) {


        //This section assigns just the first row to the featurestate

        map.setFeatureState({
          source: 'area-tiles',
          sourceLayer: 'boundaries',
          id: key
        }, {
          value: json[key].value1,
          colour: getColour(json[key].value1),
          opacity: getOpacity(json[key].value1)
        });
      

        // // This section loads the entire csv to the featurestate - but changing the colour by switching featurestate is slower than re-binding the data.
        
        // var thisAreaData = json[key];

        // var obj = {};

        // for (var timepoint in thisAreaData){
        //   obj[timepoint] = getColour(thisAreaData[timepoint]);


        //   //setFeatureState for boundaries
        //   map.setFeatureState({
        //     source: 'area-tiles',
        //     sourceLayer: 'boundaries',
        //     id: key
        //   },
          
        //   {

        //     ["colour" + timepoint]: obj[timepoint],
            
        //   });
          
        // }
      }

      //outlines around area
      map.addLayer({
        "id": "area-outlines",
        "type": "line",
        "source": 'area-tiles',
        "minzoom": 4,
        "maxzoom": 17,
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


    //advance through the displayed data

    $("#forward").click(function(event) {   
      changeDate("forward");
    });

    $("#back").click(function(event) {
      changeDate("back")
    });

    var playing = 0
    var timer

    $("#advance").click(function(event) {

      if (playing === 0){
        changeDate("forward")
        timer = setInterval(function(){changeDate("forward")},1000)
        d3.select("#advanceIcon").attr("class", "glyphicon glyphicon-pause")
        playing = 1
      } else {
        d3.selectAll("#advanceIcon").attr("class", "glyphicon glyphicon-play")
        playing = 0
        clearInterval(timer);
      }

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
        .attr("id", "keydate")
        .style("font-size", "18px")
        .style("margin-top", "10px")
        .style("margin-bottom", "5px")
        .style("margin-left", "10px")
        .text(headings[displayedData]);
      
      d3.select("#keydiv")
        .append("p")
        .attr("id", "keyvalue")
        .style("font-size", "18px")
        .style("margin-top", "10px")
        .style("margin-bottom", "5px")
        .style("margin-left", "10px")
        .text("");

      // d3.select("#keydiv")
      //   .append("p")
      //   .attr("id", "keyunit")
      //   .style("margin-top", "5px")
      //   .style("margin-bottom", "5px")
      //   .style("margin-left", "10px")
      //   .text(dvc.varunit);

      // stops = [
      //   [dvc.breaks[0], dvc.varcolour[0]],
      //   [dvc.breaks[1], dvc.varcolour[1]],
      //   [dvc.breaks[2], dvc.varcolour[2]],
      //   [dvc.breaks[3], dvc.varcolour[3]],
      //   [dvc.breaks[4], dvc.varcolour[4]],
      //   [dvc.breaks[5], dvc.varcolour[5]]
      // ];

      // labels = ["High persistance and risk", "Low persistance, high risk", "High persistance, low risk", "Low persistance and risk"]

      // divs = svgkey.selectAll("div")
      //   .data(breaks)
      //   .enter()
      //   .append("div");

      // divs.append("div")
      //   .style("height", "20px")
      //   .style("width", "10px")
      //   .attr("float", "left")
      //   .style("display", "inline-block")
      //   .style("background-color", function(d, i) {
      //     if (i != breaks.length - 1) {
      //       return stops[i][1];
      //     } else {
      //       return dvc.nullColour;
      //     }
      //   });

      // divs.append("p")
      //   .attr("float", "left")
      //   .style("padding-left", "5px")
      //   .style("margin", "0px")
      //   .style("display", "inline-block")
      //   .style("position", "relative")
      //   .style("top", "-5px")
      //   .text(function(d, i) {
      //     if (i != breaks.length - 1) {
      //       return labels[i];
      //       //return displayformat(stops[i][0]) + " - " + displayformat(stops[i + 1][0] - 1);
      //     } else {
      //       return "No Data";
      //     }
      //   });
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

    //console.log(json[e[0].properties.areacd]);

    setAxisVal(e[0].properties.areanmhc, json[e[0].properties.areacd] !==undefined? json[e[0].properties.areacd]["value" + displayedData] : "no data");

    setScreenreader(e[0].properties.areanmhc, json[e[0].properties.areacd] !==undefined? json[e[0].properties.areacd].value1 : "no data");
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

//could probably do this by querying the featurestate - might be less resource intensive? maybe?
function setAxisVal(areanm, areaval) {
  d3.select("#keyvalue").html(function() {
    if (!isNaN(areaval)) {
    //if (typeof areaval === 'string') {
    //if (areaval !== undefined) {
      return areanm //+ "<br> Value:"  + areaval;
    } else {
      return areanm //+ "<br>No data available";
    }
  });
}

function setScreenreader(name, value1) {
  if (!isNaN(value1)) {

    if (value1 > 0) {
      d3.select("#screenreadertext").text(name + " is in a cluster on " + headings[displayedData]);
    } else {
      d3.select("#screenreadertext").text(name + " is not in cluster on " + headings[displayedData]);
    }

  } else {
    d3.select("#screenreadertext").text("There is no data available for " + name);
  }
}

function hideaxisVal() {
  d3.select("#keyvalue").style("font-weight", "bold").text("");
  d3.select("#screenreadertext").text("");
}

function getColour(value) {


  //return quantile(value)

  //Slight bodge hard code the categories

  // colour = (category1(value1) === "High" && category2(value2) === "High" ) ? dvc.varcolour[0] : // High persistance and risk
  //         (category1(value1) === "Low" && category2(value2) === "High" ) ? dvc.varcolour[1] :  // Low persistance and high risk
  //         (category1(value1) === "High" && category2(value2) === "Low" ) ? dvc.varcolour[2] :  // High persistance and low risk
  //         dvc.varcolour[3]; // everything else (low persistance and risk)

  // return colour

  //return chroma({h:color2(value2), s:color1(value1), l:color1(value1)}).rgba(); //Mix HSL values to colour map - incorrect

  //return isNaN(value1) ? dvc.nullColour : color1(value1); //old, non bivariate way of doing it

  //return colour[value]

  //MASSIVE Bodge - hardcoded colours as 

    colour =(value === 5.2 ||
             value === 2.46 ||
             value === 4.4 ||
             value === 4.05 ||
             value === 1.89 ||
             value === 1.44 ||
             value === 1.53 ||
             value === 8.63) ? dvc.varcolour[0] :

            (value === 5.07) ? dvc.varcolour[1] :
            (value === 3.6) ? dvc.varcolour[1] :
            (value === 3.57) ? dvc.varcolour[1] :
            (value === 2.97) ? dvc.varcolour[1] :
            (value === 1.7) ? dvc.varcolour[1] :
            (value === 1.75) ? dvc.varcolour[1] :
            
            (value === 3) ? dvc.varcolour[2] :
            (value === 2.76) ? dvc.varcolour[2] :
            (value === 3.71) ? dvc.varcolour[2] :
            (value === 2.54) ? dvc.varcolour[2] :
            (value === 1.72) ? dvc.varcolour[2] :
            (value === 1.44) ? dvc.varcolour[2] :
            (value === 1.33) ? dvc.varcolour[2] :





  //          (category1(value1) === "Low" && category2(value2) === "High" ) ? dvc.varcolour[1] :  // Low persistance and high risk
  //          (category1(value1) === "High" && category2(value2) === "Low" ) ? dvc.varcolour[2] :  // High persistance and low risk
            "#23A58E"; // everything else

    return colour

  // if (value === 0) {
  //   return "grey" 
  // } else {
  //   return "#23A58E"
  // }
}

function getOpacity(value) {

  if (value === 0) {
      return 0
  } else {
      return 0.7
  }
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

// function getUniqueValuesFromColummn(column, csv) {

//   coloursScales={}
//   for (columns in csv):
//        colourScales[column]=d3.scaleQuantile()
//             .domain(d3.map(data,function(e){return column}).keys())
//             .range([colours]) 

// }

// What you need to do 
// make csv2json only read the current active date
// remove duplicates/get unique and use that for scale ordnial to give each cluster a unique colour
// update the ordinal domain every time the date is changed
// get the range from Henry's new tool



function readCSVcolumns(csv) {
  var dataColumns = [],
  i = 0,
  len = csv.length
  while (i < len) {
    for(j=1; j<csv.columns.length;j++){
      dataColumns.push(+csv[i][csv.columns[j]]);
      //console.log(j)
    }
    i++;
  }
  return dataColumns;
}

function csv2jsonReverse(csv) {
  return null
}

function updateFeatureState(displayedData) {

  for (var key in json) {

    map.setFeatureState({
      source: 'area-tiles',
      sourceLayer: 'boundaries',
      id: key
    }, {
      value: json[key]["value" + displayedData],
      colour: getColour(json[key]["value" + displayedData]),
      opacity: getOpacity(json[key]["value" + displayedData])
    });

  }
}

var numberColumns = 14
var displayedData = 1

function changeDate(direction)  {

  if (direction === "forward") {
    if (displayedData < numberColumns){
      displayedData = displayedData + 1
    } else {
      displayedData = 1
    }
    updateFeatureState(displayedData)
  } else {
    if (displayedData > 1){
      displayedData = displayedData - 1
    } else {
      displayedData = numberColumns
    }
    updateFeatureState(displayedData)
  }

  sliderSimple.silentValue(displayedData)

  d3.select("#keydate").text(headings[displayedData])

}

var sliderSimple = d3
.sliderBottom()
.min(1)
.max(14)
.width(parseInt(d3.select('body').style("width"))-200)
.tickFormat(d3.format(',.0f'))
.ticks(7)
.default(1)
.step(1)
.handle(
  d3.symbol()
    .type(d3.symbolCircle)
    .size(500)
)
.fill("#206595")
.on('onchange', val => {
  updateFeatureState(Math.round(val))
  displayedData = (Math.round(val))
  d3.select("#keydate").text(headings[displayedData])
  //document.getElementById("value-simple").value=d3.format('.0f')(val)
});

var gSimple = d3
.select('div#slider-simple')
.append('svg')
.attr('width', parseInt(d3.select('body').style("width"))-150)
.attr('height', 75)
.append('g')
.attr('transform', 'translate(30,20)');

gSimple.call(sliderSimple);

//document.getElementById("value-simple").value=d3.format('.0f')(sliderSimple.value());

// function sliderchange(){
// sliderSimple.silentValue(document.getElementById('value-simple').value)
// }

d3.select('#handle').on('keydown',function(){
  console.log("keypress")
if(document.getElementById("handle")===document.activeElement){//if handle is focussed
  // var max = document.getElementById('value-simple').max
  // var min = document.getElementById('value-simple').min
  var max = 14
  var min = 1

  if (d3.event.key=='ArrowLeft') {
    if(+document.getElementById('value-simple').value-1<min){
      sliderSimple.silentValue(min)
      document.getElementById("value-simple").value=min
    }else{
      sliderSimple.silentValue(+document.getElementById('value-simple').value-1)
      document.getElementById("value-simple").value=+document.getElementById("value-simple").value-100
    }
  }
  if (d3.event.key=='ArrowUp') {
    d3.event.preventDefault();
    if(+document.getElementById('value-simple').value+1>max){
      sliderSimple.silentValue(max)
      document.getElementById("value-simple").value=max
    }else{
      sliderSimple.silentValue(+document.getElementById('value-simple').value+1)
      document.getElementById("value-simple").value=+document.getElementById("value-simple").value+1
    }
  }
  if (d3.event.key=='ArrowRight') {
    if(+document.getElementById('value-simple').value+1>max){
      sliderSimple.silentValue(max)
      document.getElementById("value-simple").value=max
    }else{
      sliderSimple.silentValue(+document.getElementById('value-simple').value+1)
      document.getElementById("value-simple").value=+document.getElementById("value-simple").value+1
    }              }
  if (d3.event.key=='ArrowDown') {
    d3.event.preventDefault();
    if(+document.getElementById('value-simple').value-1<min){
      sliderSimple.silentValue(min)
      document.getElementById("value-simple").value=min
    }else{
      sliderSimple.silentValue(+document.getElementById('value-simple').value-1)
      document.getElementById("value-simple").value=+document.getElementById("value-simple").value-1
    }
  }
  if (d3.event.key=='PageDown') {
    d3.event.preventDefault();
    if(+document.getElementById('value-simple').value-1<min){
      sliderSimple.silentValue(min)
      document.getElementById("value-simple").value=min
    }else{
      sliderSimple.silentValue(+document.getElementById('value-simple').value-1)
      document.getElementById("value-simple").value=+document.getElementById("value-simple").value-1
    }
  }
  if (d3.event.key=='PageUp') {
    d3.event.preventDefault();
    if(+document.getElementById('value-simple').value+1>max){
      sliderSimple.silentValue(max)
      document.getElementById("value-simple").value=max
    }else{
      sliderSimple.silentValue(+document.getElementById('value-simple').value+1)
      document.getElementById("value-simple").value=+document.getElementById("value-simple").value+1
    }              }
  if (d3.event.key=='Home') {
    d3.event.preventDefault();
    sliderSimple.silentValue(min)
    document.getElementById("value-simple").value=min
  }
  if (d3.event.key=='End') {
    d3.event.preventDefault();
    sliderSimple.silentValue(max)
    document.getElementById("value-simple").value=max
  }
}
})