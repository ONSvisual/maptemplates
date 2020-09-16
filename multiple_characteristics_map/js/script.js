//test if browser supports webGL

if (Modernizr.webgl) {

  //setup pymjs
  var pymChild = new pym.Child();

  //Load data and config file
  d3.queue()
    .defer(d3.csv, "data/mortality.csv")
    .defer(d3.json, "data/config.json")
    .defer(d3.json, "data/geojsonew.json")
    .await(ready);


  function ready(error, data, config, geog) {

    // create blank svg to get correct height
    d3.select("body")
      .append('svg')
        .attr('height', '0px');


    // display detail info on mobile button click
    var displayDetail = false;
    d3.select(".btn-primary").on('click', function() {

      displayDetail = !displayDetail;
      if(displayDetail === true) {
        d3.select('#text-title').style('display', 'block');
        d3.select('#textdiv').style('display', 'block');
        d3.select(".btn-primary").text("Hide detail")
      } else {
        d3.select('#text-title').style('display', 'none');
        d3.select('#textdiv').style('display', 'none');
        d3.select(".btn-primary").text("Show detail")
      }
      pymChild.sendHeight();

    })

    //Set up global variables
    dvc = config.ons;
    oldAREACD = "";

    //get column names and store them in an array
    var columnNames = [];

    for (var column in data[0]) {
      if (column == 'AREACD') continue;
      if (column == 'AREANM') continue;
      if (column == 'region') continue;
      if (column == 'country') continue;
      columnNames.push(column);
    }

    //set title of page
    //Need to test that this shows up in GA
    document.title = dvc.maptitle;

    // hide title of the table and "show more" button if all varables are scales
    if (columnNames.length === dvc.numberLegends) {
      d3.select('#text-title')
        .style('display', 'none');

      d3.select('#show-more')
        .style('display', 'none');
    }

    //Fire design functions
    selectlist(data);

    //Set up number formats
    displayformat = d3.format(",." + dvc.displaydecimals + "f");
    displayformatOthers = d3.format(",." + dvc.decimalsOther + "f");
    legendformat = d3.format(",." + dvc.legenddecimals + "f");

    //set up basemap
    map = new mapboxgl.Map({
      container: 'map', // container id
      style: 'data/style.json', //stylesheet location
      center: [-2.5, 53], // starting position
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
    databyId = {};
    var dataById = {};

    data.forEach(function(d) {
      rateById[d.AREACD] = +eval("d." + dvc.columnMap);
      areaById[d.AREACD] = d.AREANM
    });

    data.forEach(function(d) {
      var dataByColumn = {};
      dataById[d.AREACD] = dataByColumn;
      for (i = 0; i < columnNames.length; i++) {
        dataByColumn[columnNames[i]] = +d[columnNames[i]]
      }
    })

    //Flatten data values and work out breaks
    var values = {};
    for (i = 0; i < columnNames.length; i++) {
      var columnValues = data.map(function(d) {
        return +eval("d." + columnNames[i]);
      }).filter(function(d) {
        return !isNaN(d)
      }).sort(d3.ascending);
      values[columnNames[i]] = columnValues;
    }

    breaks = {};
    color = {};

    for (j = 0; j < columnNames.length; j++) {
      if (config.ons.breaks == "jenks") {

        breaks[columnNames[j]] = [];

        ss.ckmeans(values[columnNames[j]], (dvc.numberBreaks)).map(function(cluster, i) {

          if (i < dvc.numberBreaks - 1) {
            breaks[columnNames[j]].push(cluster[0]);
          } else {
            breaks[columnNames[j]].push(cluster[0])
            //if the last cluster take the last max value
            breaks[columnNames[j]].push(cluster[cluster.length - 1]);
          }
        });
      } else if (config.ons.breaks == "equal") {
        breaks[columnNames[j]] = ss.equalIntervalBreaks(values[columnNames[j]], dvc.numberBreaks);
        // console.log(breaks[columnNames[j]])

      } else {
        breaks[columnNames[j]] = config.ons.breaks;
      };

      // console.log(breaks)

      // //round breaks to specified decimal places
      breaks[columnNames[j]] = breaks[columnNames[j]].map(function(each_element) {
        return Number(each_element.toFixed(dvc.legenddecimals));
      });

      //Load colours
      if (typeof dvc.varcolour === 'string') {
        colour = colorbrewer[dvc.varcolour][dvc.numberBreaks];
      } else {
        colour = dvc.varcolour;
      }

      // custom breaks for map legend if set true in config
      if(dvc.customBreaksMapLegend === true) {
        breaks[dvc.columnMap] = dvc.breakPoints;
      }

      //set up d3 color scales
      color[columnNames[j]] = d3.scaleThreshold()
        .domain(breaks[columnNames[j]].slice(1))
        .range(colour);
    }



    //work out halfway point (for no data position)
    midpoint = breaks[0] + ((breaks[dvc.numberBreaks] - breaks[0]) / 2)


    //now ranges are set we can call draw the key


    //convert topojson to geojson
    for (key in geog.objects) {
      var areas = topojson.feature(geog, geog.objects[key])
    }

    //Work out extend of loaded geography file so we can set map to fit total extent
    bounds = turf.extent(areas);

    //set map to total extent
    setTimeout(function() {
      map.fitBounds([
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]]
      ])
    }, 1000);

    //and add properties to the geojson based on the csv file we've read in
    areas.features.map(function(d, i) {

      d.properties.fill = color[dvc.columnMap](rateById[d.properties.lad19cd])
    });

    var code = areas.features.filter(function(d) {
      return d.properties.lad19cd == code
    })


    map.on('load', function() {

      map.addSource('area', {
        'type': 'geojson',
        'data': areas
      });

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
        "filter": ["==", "lad19cd", ""]
      });

      map.addLayer({
        'id': 'area_labels',
        'type': 'symbol',
        'source': 'area',
        'minzoom': 10,
        'layout': {
          "text-field": '{AREANM}',
          "text-font": ["Open Sans", "Arial Unicode MS Regular"],
          "text-size": 14
        },
        'paint': {
          "text-color": "#666",
          "text-halo-color": "#fff",
          "text-halo-width": 1,
          "text-halo-blur": 1
        }
      });

      // make source
      d3.select('#source')
        .text('Source: ' + dvc.sourceText);



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


      if (detectIE()) {
        onMove = onMove.debounce(100);
        onLeave = onLeave.debounce(100);
      };

      //Highlight stroke on mouseover (and show area information)
      map.on("mousemove", "area", onMove);

      // Reset the state-fills-hover layer's filter when the mouse leaves the layer.
      map.on("mouseleave", "area", onLeave);

      //Add click event
      map.on("click", "area", onClick);

      //get location on click
      d3.select(".mapboxgl-ctrl-geolocate").on("click", geolocate);

    });

    function onMove(e) {
      newAREACD = e.features[0].properties.lad19cd;
      if (newAREACD != oldAREACD) {
        oldAREACD = e.features[0].properties.lad19cd;
        map.setFilter("state-fills-hover", ["==", "lad19cd", e.features[0].properties.lad19cd]);
        selectArea(e.features[0].properties.lad19cd);
        setAxisVal(e.features[0].properties.lad19cd);
        // SettingKeys(e.features[0].properties.AREACD);
      }
    };


    function onLeave() {
      map.setFilter("state-fills-hover", ["==", "lad19cd", ""]);
      oldAREACD = "";
      $("#areaselect").val("").trigger("chosen:updated");
      hideaxisVal();
    };

    function onClick(e) {
      disableMouseEvents();
      newAREACD = e.features[0].properties.lad19cd;

      if (newAREACD != oldAREACD) {


        oldAREACD = e.features[0].properties.lad19cd;
        map.setFilter("state-fills-hover", ["==", "lad19cd", e.features[0].properties.lad19cd]);

        selectArea(e.features[0].properties.lad19cd);
        setAxisVal(e.features[0].properties.lad19cd);
        // SettingKeys(e.features[0].properties.AREACD);

      }
    };

    function disableMouseEvents() {
      map.off("mousemove", "area", onMove);
      map.off("mouseleave", "area", onLeave);
    }

    function enableMouseEvents() {
      map.on("mousemove", "area", onMove);
      map.on("click", "area", onClick);
      map.on("mouseleave", "area", onLeave);
    }

    function selectArea(code) {
      $("#areaselect").val(code).trigger("chosen:updated");
      d3.select('abbr').on('keypress',function(evt){
				if(d3.event.keyCode==13 || d3.event.keyCode==32){
          d3.event.preventDefault();
					$("#areaselect").val("").trigger('chosen:updated');
				}
			})
    }

    function zoomToArea(code) {

      specificpolygon = areas.features.filter(function(d) {
        return d.properties.lad19cd == code
      })

      specific = turf.extent(specificpolygon[0].geometry);

      map.fitBounds([
        [specific[0], specific[1]],
        [specific[2], specific[3]]
      ], {
        padding: {
          top: 150,
          bottom: 150,
          left: 100,
          right: 100
        }
      });

    }

    function resetZoom() {

      map.fitBounds([
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]]
      ]);

    }

    function setAxisVal(code) {

      for (i = 0; i < dvc.numberLegends; i++) {

        d3.select("#currLine" + i)
          .style("opacity", function() {
            if (!isNaN(dataById[code][columnNames[i]])) {
              return 1
            } else {
              return 0
            }
          })
          .transition()
          .duration(400)
          .attr("x1", function() {
            if (!isNaN(dataById[code][columnNames[i]])) {
              return x[columnNames[i]](dataById[code][columnNames[i]])
            } else {
              return x[columnNames[i]](midpoint)
            }
          })
          .attr("x2", function() {
            if (!isNaN(dataById[code][columnNames[i]])) {
              return x[columnNames[i]](dataById[code][columnNames[i]])
            } else {
              return x[columnNames[i]](midpoint)
            }
          });

        d3.select("#currVal" + i)
          .text(function() {
            if (columnNames[i] === dvc.columnMap) {
              if (!isNaN(dataById[code][columnNames[i]])) {
                return displayformat(dataById[code][columnNames[i]])
              } else {
                return "Data unavailable"
              }
            } else {
              if (!isNaN(dataById[code][columnNames[i]])) {
                return displayformatOthers(dataById[code][columnNames[i]])
              } else {
                return "Data unavailable"
              }

            }
          })
          .style("opacity", 1)
          .transition()
          .duration(400)
          .attr("x", function() {
            if (!isNaN(dataById[code][columnNames[i]])) {
              return x[columnNames[i]](dataById[code][columnNames[i]])
            } else {
              return x[columnNames[i]](midpoint)
            }
          });

      } //end of for loop

      // create text
      for (i = dvc.numberLegends; i<columnNames.length; i++) {
        var textnumber = d3.select("#number" + i)
          .text(displayformat(dataById[code][columnNames[i]]));
      } //end of create text loop


      d3.select("div#info").select('p').text("In "+areaById[code]+", the "+dvc.textChartTitle + " is " + dataById[code][columnNames[0]] + " "+ dvc.labelNames[0]);

    }

    function hideaxisVal() {
         for (i = 0; i < dvc.numberLegends; i++) {
           d3.select("#currLine"+i)
             .style("opacity", 0)

           d3.select("#currVal"+i).text("")
             .style("opacity", 0)
         }

         for (i = dvc.numberLegends; i < columnNames.length; i++) {
           // d3.select("#number"+i)
             // .style("opacity", 0)

           d3.select("#number"+i).text("")
             // .style("opacity", 0)
         }
       }
//     function SettingKeys(code) {
//        MyKey = dataById[code];
//       Object.keys(MyKey).forEach(function(key) {
//         console.log(key, MyKey[key]);
//       });
//
// key.forEach(
// function(){
// 			d3.select("#keys")
// 					.append("g")
// 					.selectAll("svg")
// 					.data(MyKey)
// 					.enter()
// 					.append("svg")
// 					.attr("id", function(d, i){
// 						console.log(d)
// 						console.log(i)
// 					})
// 					.attr("width", 200)
// 					.attr("height", 65);
// 			});
// }
    createKey(config, code);

    function createKey(config, code) {


      // var color = {};
      // var code;
      // for (j = 0; j < columnNames.length - 1; j++) {
      //   color[columnNames[j]] = d3.scaleThreshold()
      //     .domain(breaks[columnNames[j]])
      //     .range(colour);
      // }


      for (i = 0; i<dvc.numberLegends; i++) {

        keywidth = d3.select("#keydiv").node().getBoundingClientRect().width;

        var svgkey = d3.select("#keydiv")
          .append("svg")
          .attr('aria-hidden','true')
          .attr("id", "key" + i)
          .attr("width", keywidth)
          .attr("height", function () {
            if(columnNames[i] === dvc.columnMap) {
              return 75;
            } else {return 75;}});

        svgkey.append('text')
        .attr("x",15)
        .attr("y",function () {
          if(columnNames[i] === dvc.columnMap) {
            return 10;
          } else {return 10;}})
        .attr("font-size","14px")
        .text(dvc.labelNames[i])
        // var color = d3.scaleThreshold()
        // 	 .domain(breaks)
        // 	 .range(colour);

        x={};//create an object to hold all the different x functions

        for(k=0;k<dvc.numberLegends;k++){
                x[columnNames[k]] = d3.scaleLinear()
                  .domain([breaks[columnNames[k]][0], breaks[columnNames[k]][dvc.numberBreaks]]) /*range for data*/
                  .range([0, keywidth - 35]);
        }


        // // Set up scales for legend
        // x[columnNames[i]] = d3.scaleLinear()
        //   .domain([breaks[columnNames[i]][0], breaks[columnNames[i]][dvc.numberBreaks]]) /*range for data*/
        //   .range([0, keywidth - 30]); /*range for pixels*/

// function(d) {if(columnNames[i] === dvc.columnMap) { return 15;} else { return 0;

        // change tick height for every but first key
        var tickHeight;
        if(columnNames[i] === dvc.columnMap) { tickHeight = 15;} else { tickHeight = 5;}

        var xAxis = d3.axisBottom(x[columnNames[i]])
          .tickSize(tickHeight)
          .tickValues(breaks[columnNames[i]])
          .tickFormat(legendformat);

        var g2 = svgkey.append("g").attr("id", "horiz" + i)
          .attr("transform", function () {
            if(columnNames[i] === dvc.columnMap) {
              return "translate(15,40)";
            } else {return "translate(15,40)";}});


        keyhor = d3.select("#horiz" + i);

        dataforscales={};

        dataforscales[columnNames[i]] = color[columnNames[i]].range().map(function(d, j) {
          return {
            x0: j ? x[columnNames[i]](color[columnNames[i]].domain()[j-1]) : x[columnNames[i]].range()[0],
            x1: j < color[columnNames[i]].domain().length ? x[columnNames[i]](color[columnNames[i]].domain()[j]) : x[columnNames[i]].range()[1],
            z: d
          };
        })


        g2.selectAll("rect")
          .data(dataforscales[columnNames[i]])
          .enter().append("rect")
          .attr("class", "blocks")
          .attr("height", 8)
          .attr("x", function(d, i) {
            //return x[columnNames[i]](d[i]);
            return d.x0;
          })
          .attr("width", function(d, i) {
            //return x[columnNames[i]](d[i + 1]) - x[columnNames[i]](d[i]);
            return d.x1-d.x0;
          })
          .style("opacity", 0.8)
          .style("fill", function(d) {
            return d.z;
          });


        g2.append("line")
          .attr("id", "currLine" + i)
          .attr("x1", x[columnNames[i]](10))
          .attr("x2", x[columnNames[i]](10))
          .attr("y1", -10)
          .attr("y2", function() {
            if(columnNames[i] === dvc.columnMap) {
              return 8;
            } else {return 0;}
          })
          .attr("stroke-width", "2px")
          .attr("stroke", "#666")
          .attr("opacity", 0);

        g2.append("text")
          .attr("id", "currVal" + i)
          .attr("class","currVal")
          .attr("x", x[columnNames[i]](10))
          .attr("y", function () {
            if(columnNames[i] === dvc.columnMap) {
              return -15;
            } else {return -12;}})
          .attr("fill", "#000")
          .text("");

        keyhor.selectAll("rect")
          .data(color[columnNames[i]].range().map(function(d, j) {
            return {
              x0: j ? x[columnNames[i]](color[columnNames[i]].domain()[j-1]) : x[columnNames[i]].range()[0],
              x1: j < color[columnNames[i]].domain().length ? x[columnNames[i]](color[columnNames[i]].domain()[j ]) : x[columnNames[i]].range()[1],
              z: d
            };
          }))
          .attr("x", function(d) {
            return d.x0;
          })
          .attr("width", function(d) {
            return d.x1 - d.x0;
          })
          .style("fill", function(d) {
            if(columnNames[i] === dvc.columnMap) {
              return d.z;
            } else {
              return "none";
            }
          });

        keyhor.call(xAxis).append("text")
          .attr("id", "caption")
          .attr("x", -63)
          .attr("y", -20)
          .text("");

        keyhor.append("rect")
          .attr("id", "keybar")
          .attr("width", 8)
          .attr("height", 0)
          .attr("transform", "translate(15,0)")
          .style("fill", "#ccc")
          .attr("x", x[columnNames[i]](0));


        if (dvc.dropticks) {
          d3.select("#horiz" + i).selectAll("text").attr("transform", function(d, i) {
            // if there are more that 4 breaks, so > 5 ticks, then drop every other.
            if (i % 2) {
              return "translate(0,10)"
            }
          });
        }
        //Temporary	hardcode unit text
        dvc.unittext = "change in life expectancy";

        d3.select("#keydiv" + i).append("p").attr("id", "keyunit" + i).style("margin-top", "-10px").style("margin-left", "10px").text(dvc.varunit);

      } //end of for i loop

      // create text
      var textTitle = d3.select("#text-title")
            .text(dvc.textChartTitle)
            // .style('float', 'right')

      for (i = dvc.numberLegends; i<columnNames.length; i++) {
        var textkey = d3.select("#textdiv")
          .append("div")
            .attr("id", "text" + i)
            // .attr("width", keywidth)
            .style("height", "35px")
            .style('border-top', '1px solid grey')
            .style("font-size", "14px")
          .append("p")
            .text(dvc.labelNames[i]+": ")
            .style('line-height', '5px')
          .append("span")
            .attr("id", "number" + i)
            .style('float', 'right');
      } //end of create text loop



      pymChild.sendHeight();
    } // Ends create key

    function addFullscreen() {

      currentBody = d3.select("#map").style("height");
      d3.select(".mapboxgl-ctrl-fullscreen").on("click", setbodyheight)

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
      point = map.project([crd.longitude, crd.latitude]);

      //then check what features are underneath
      var features = map.queryRenderedFeatures(point);

      //then select area
      disableMouseEvents();

      map.setFilter("state-fills-hover", ["==", "lad19cd", features[0].properties.lad19cd]);

      selectArea(features[0].properties.lad19cd);
      setAxisVal(features[0].properties.lad19cd);


    };

    function selectlist(datacsv) {

      var areacodes = datacsv.map(function(d) {
        return d.AREACD;
      });
      var areanames = datacsv.map(function(d) {
        return d.AREANM;
      });
      var menuarea = d3.zip(areanames, areacodes).sort(function(a, b) {
        return d3.ascending(a[0], b[0]);
      });

      // Build option menu for occupations
      var optns = d3.select("#selectNav").append("div").attr("id", "sel").append("select")
        .attr("id", "areaselect")
        .attr("style", "width:98%")
        .attr("class", "chosen-select");


      optns.append("option")
        .attr("value", "first")
        .text("");

      optns.selectAll("p").data(menuarea).enter().append("option")
        .attr("value", function(d) {
          return d[1]
        })
        .text(function(d) {
          return d[0]
        });

      myId = null;

      $('#areaselect').chosen({
        width: "98%",
        allow_single_deselect: true,
        placeholder_text_single: "Select an area"
      }).on('change', function(evt, params) {

        if (typeof params != 'undefined') {

          disableMouseEvents();

          map.setFilter("state-fills-hover", ["==", "lad19cd", params.selected]);

          selectArea(params.selected);
          setAxisVal(params.selected);

          zoomToArea(params.selected);

        } else {
          enableMouseEvents();
          hideaxisVal();
          onLeave();
          resetZoom();
        }

      });

      d3.select('input.chosen-search-input').attr('id','chosensearchinput')
      d3.select('div.chosen-search').insert('label','input.chosen-search-input').attr('class','visuallyhidden').attr('for','chosensearchinput').html("Type to select an area")


    };

  }

} else {

  //provide fallback for browsers that don't support webGL
  d3.select('#map').remove();
  d3.select('body').append('p').html("Unfortunately your browser does not support WebGL. <a href='https://www.gov.uk/help/browsers' target='_blank>'>If you're able to please upgrade to a modern browser</a>")

}
