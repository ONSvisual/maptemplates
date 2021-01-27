var graphic = $('#graphic');
// var keypoints = $('#keypoints');
var footer = $("#footer");
var dAccessMsg = d3.select('#accessibilityInfo').select('p')
// var height;
var dvc = {}; // global object variable to contain all variables prefixed with 'dvc.'
var pymChild = null;
var graphHeight;
var headers = [];
var mapScale;


dvc.data;

var numFormat = d3.format(".1f");

function drawGraphic() {


    var threshold_md = 650;
    var threshold_sm = dvc.optional.mobileBreakpoint;

    var innerPadding_values = {
        "sm": [20, 20, 30, 25],
        "md": [40, 20, 30, 25],
        "lg": [40, 25, 45, 45]
        /* top , right , bottom , left */
    }

    //var mapScales = [ 10000 , 6500 , 9000 ];
    var mapScales = [10000, 7000, 11000];

    //set variables for chart dimensions dependent on width of #graphic
    if (graphic.width() < threshold_sm) {
        var margin = { top: dvc.optional.margin_sm[0], right: dvc.optional.margin_sm[1], bottom: dvc.optional.margin_sm[2], left: dvc.optional.margin_sm[3] };
        chart_width = graphic.width()/* - margin.left - margin.right*/;
        mults_width = $("#mults").width();
        // height = (Math.ceil((chart_width * dvc.optional.aspectRatio_sm[1]) / dvc.optional.aspectRatio_sm[0]) - margin.top - margin.bottom);

        var innerPadding = { top: innerPadding_values.sm[0], right: innerPadding_values.sm[1], bottom: innerPadding_values.sm[2], left: innerPadding_values.sm[3] }

        numberRows = parseInt(dvc.ons.numRows_sm_md_lg[0]);
        numberColumns = parseInt(dvc.ons.numColumns_sm_md_lg[0]);
        mapScale = mapScales[0];

    } else if (graphic.width() < threshold_md) {
        var margin = { top: dvc.optional.margin_md[0], right: dvc.optional.margin_md[1], bottom: dvc.optional.margin_md[2], left: dvc.optional.margin_md[3] };
        chart_width = graphic.width()/* - margin.left - margin.right*/;
        mults_width = $("#mults").width();
        // height = (Math.ceil((chart_width * dvc.optional.aspectRatio_md[1]) / dvc.optional.aspectRatio_md[0]) - margin.top - margin.bottom);

        var innerPadding = { top: innerPadding_values.md[0], right: innerPadding_values.md[1], bottom: innerPadding_values.md[2], left: innerPadding_values.md[3] }

        numberRows = parseInt(dvc.ons.numRows_sm_md_lg[1]);
        numberColumns = parseInt(dvc.ons.numColumns_sm_md_lg[1]);
        mapScale = mapScales[1];

    } else {
        var margin = { top: dvc.optional.margin_lg[0], right: dvc.optional.margin_lg[1], bottom: dvc.optional.margin_lg[2], left: dvc.optional.margin_lg[3] }
        chart_width = graphic.width()/* - margin.left - margin.right*/;
        mults_width = $("#mults").width();
        // height = (Math.ceil((chart_width * dvc.optional.aspectRatio_lg[1]) / dvc.optional.aspectRatio_lg[0]) - margin.top - margin.bottom);

        var innerPadding = { top: innerPadding_values.lg[0], right: innerPadding_values.lg[1], bottom: innerPadding_values.lg[2], left: innerPadding_values.lg[3] }

        numberRows = parseInt(dvc.ons.numRows_sm_md_lg[2]);
        numberColumns = parseInt(dvc.ons.numColumns_sm_md_lg[2]);
        mapScale = mapScales[2];

    }

    dvc.scale = 1;
    dvc.translate = [0, 0];





    zoom = d3.behavior.zoom()
        .scaleExtent([0.5, 12])
        .on("zoom", zoomed);

    // clear out existing graphics
    graphic.empty();
    // keypoints.empty();
    footer.empty();

    // calcualte SM graph dimensions, and set up maegins for base SM SVG
    var graph_unitWidth = (mults_width) / numberColumns;
    var graph_unitHeight = graph_unitWidth;
    var graph_unitMargins = { top: 5, right: 5, bottom: 5, left: 5 };


    var projection = d3.geo.albers()
        .center([3, 52.75])
        .rotate([3.2, 1])
        .parallels([50, 60])
        .scale(mapScale)
        .translate([graph_unitWidth / 2, graph_unitHeight / 2]);


    // Set up a scaling variable effectively tells D3 how to interpret your lat - long coordinates into pixel positions.
    var path = d3.geo.path().projection(projection);


    // initial SM graph count variable (k = SM number being created	)
    var k = 0;
    var l = 0;
    var graphLines = {};
    var currentColoumn;




    // for each row ...
    for (var i = 1; i <= parseInt(numberRows); i++) {
        // for each column ...
        for (var j = 1; j <= parseInt(numberColumns); j++) {

            // if graph panel [to draw] is greater than for which data is provided in data files ...
            if (headers[k] === undefined) { continue; }

            // create and append small SVG panel for each individual graph, k
            var svg = d3.select('#graphic')
                .append('svg')
                .attr("class", "graphUnitSVGs")
                .attr("id", "svg" + k)
                .attr("x", function (d, i) { return (i - 1) * graph_unitWidth + graph_unitMargins.left; })
                .attr("y", (j - 1) * graph_unitHeight + graph_unitMargins.top)
                .attr("width", graph_unitWidth - 10)
                .attr("height", graph_unitHeight * 0.75)
                .attr("aria-hidden", 'true')
                .append("g")
                .attr("transform", "translate(" + (0) + "," + (0) + ")");

            rateById = {};
            dvc.data.forEach(function (d, i) { rateById[d.AREACD] = [d[headers[k]]]; });

            var values = dvc.data.map(function (d) { return +d[headers[k]]; }).filter(function (d) { return !isNaN(d) }).sort(d3.ascending);

            if (dvc.ons.breaks == "jenks") {
                breaks = ss.jenks(values, dvc.ons.breakDivisions);
            } else {
                breaks = dvc.ons.breaks[k];
            };

            color = d3.scale.threshold()
                .domain(breaks.slice(1, dvc.ons.breakDivisions))
                .range(dvc.ons.varcolour);

            createKey(k, graph_unitWidth, graph_unitHeight, margin, innerPadding);

            // Use the normal d3 pattern - select all path elements (even though they haven't yet been created)
            // Then append a path element for every bit of data you've just binded.
            g = svg.append("g").attr("id", "group_" + k);

            zoomed();

            g.attr("class", "pcon")
                .selectAll("path")
                .data(topojson.feature(dvc.pcon, dvc.pcon.objects.LA2013EW).features)
                .enter()
                .append("path")
                .attr("id", function (d) { return "reg" + d.properties.AREACD })
                .attr("data-nm", function (d) { return d.properties.AREANM })
                .attr("data_val", function (d) { return rateById[d.properties.AREACD] })
                .attr("d", path)
                .style("fill", function (d) {
                    if (rateById[d.properties.AREACD] == "null" || rateById[d.properties.AREACD] == undefined) {
                        return "white"
                    } else if (rateById[d.properties.AREACD] == "0") {
                        return "#c6dbef"
                    } else {

                        return color(rateById[d.properties.AREACD]);
                    }
                })
                .style("stroke", function (d) {
                    if (rateById[d.properties.AREACD] == "null" || rateById[d.properties.AREACD] == undefined) {
                        return "#bdbdbd"
                    } else {

                        return "none";
                    }
                })
                .on("mouseout", unhighlight)
                .on("mouseover", function (d) {
                    highlight(d.properties.AREACD);
                    plot(d.properties.AREACD);
                });

            // draw text in upper right corner of each graph with the associated title from data.csv
            svg.append("rect")/*
							.data(headers)*/
                .attr("x", 0)
                .attr("y", 0)
                .attr("height", 18)
                .attr("width", graph_unitWidth)
                .style("fill", "#fff")
                .style("stroke", "none")
                .style("opacity", 0.8);

            svg.append("text")
                .attr("x", 0)
                .attr("y", 12)
                .attr("id", "varval_" + k)
                .attr("class", "areaname")
                .attr("aria-live", "polite")
                //							.attr("font-weight","bold")
                .attr("fill", "#666")
                .text(function () {
                    var fmt = d3.format(".2f")
                    var tempval
                    if (area == undefined) {
                        return headers[k];
                    } else {
                        linevalues = dvc.data.map(function (d) { return d; }).filter(function (d) { return d.AREACD == area });

                        vals = d3.keys(linevalues[0]).filter(function (key) {
                            if (dvc.ons.fieldsToIgnore.indexOf(key) == -1) { return key; }
                        });
                        tempval = linevalues[0][vals[k]]

                        if (linevalues[0][vals[k]] == "0") {
                            return "less than 0.01% " + headers[i];
                        } else {
                            return (headers[k]) + ": " + (isNaN(tempval) ? 'N/A' : fmt(tempval) );
                        }
                    }
                })

            svg.append("text")
                .attr("x", graph_unitWidth - 55)
                .attr("y", 12)
                //.attr("id", "varval_"+k)
                .attr("class", "percent_label")
                //.attr("font-weight","bold")
                .attr("fill", "#666")
                .text(function (d, i) { return dvc.ons.yAxisLabel[k] })
            k++;
        }

    } // end for ...

    center = [$("#svg0").width() / 2, $("#svg0").height() / 2];

    d3.select("#footer").append("h4")
        .text("Source: "+dvc.ons.source)


    d3.selectAll(".graphUnitSVGs").call(zoom)
        .call(zoom.event);

    //use pym to calculate chart dimensions
    setTimeout(function () {
        if (pymChild) {
            pymChild.sendHeight();
        }
    }, 1500)


    return;
} // end function drawGraphic()


function plot(area) {

    linevalues = dvc.data.map(function (d) { return d; }).filter(function (d) { return d.AREACD == area });

    vals = d3.keys(linevalues[0]).filter(function (key) {
        if (dvc.ons.fieldsToIgnore.indexOf(key) == -1) { return key; }
    });

    var rangeLabel
    var msg
    var summary = []
    for (i = 0; i < headers.length; i++) {
        rangeLabel = vals[i]
        d3.select("#varval_" + i)
            .text(function () {
                var fmt = d3.format(".2f")
                msg = headers[i] + ": " + fmt(linevalues[0][rangeLabel]) + dvc.ons.unitofmeasure[i]
                if (linevalues[0][rangeLabel] == "null") {
                    return headers[i];
                } else if (linevalues[0][rangeLabel] == "0") {
                    return "less than 0.01% " + headers[i];
                } else {
                    summary.push(msg)
                    return msg
                    //return /*numFormat*/fmt(linevalues[0][vals[i]])+" "+headers[i];;
                }
            })
    }

    // announceUpdate(summary.join('.<br />').replace(/\-/g, ' to '))
    announceUpdate(area)
}

function highlight(area) {
    var reg = document.getElementById("reg" + area);

    var name = d3.select("#reg" + area).attr("data-nm")
    dataLayer.push({
        'event': 'mapHoverSelect',
        'selected': name
    })

    d3.selectAll('.pcon')
        .append("path")
        .attr("d", d3.select(reg).attr("d"))
        .attr("id", "selected")
        .attr("class", "arcSelection")
        .attr("pointer-events", "none")
        .style("fill", "none")
        .style("stroke", function (d) {
            if (area.substr(0, 1) == "E") {
                return "#990000"
            }
            else if (area.substr(0, 1) == "W") {
                return "#990000"
            }
            else if (area.substr(0, 1) == "S") {
                return "#990000"
            }
            else if (area.substr(0, 1) == "N") {
                return "#990000"
            }
        })
        .style("stroke-width", 2 / dvc.scale);

    details = d3.select("#details")

    if (area.substr(0, 1) == "E") {
        d3.select("#areanm").text(name);
    }

    else if (area.substr(0, 1) == "N") {
        d3.select("#areanm").text(name);
    }

    else if (area.substr(0, 1) == "W") {
        d3.select("#areanm").text(name);
    }

    else if (area.substr(0, 1) == "S") {
        d3.select("#areanm").text(name);
    }
}

/* Remove the current selected polygon */
function unhighlight() {
    d3.selectAll('#selected').remove();
    d3.select("#areanm").text("");
    d3.selectAll(".areaname").text(function (d, i) { return headers[i]; })
}

function zoomed() {

    dvc.scale = zoom.scale();

    d3.selectAll(".pcon").style("stroke-width", (0.5 / zoom.scale()))
        .attr("transform", "translate(" + zoom.translate() + ")scale(" + zoom.scale() + ")");


}


function zoom_by(factor) {
    var scale = zoom.scale(),
        extent = zoom.scaleExtent(),
        translate = zoom.translate(),
        x = translate[0], y = translate[1],
        target_scale = scale * factor;

    // If we're already at an extent, done
    if (target_scale === extent[0] || target_scale === extent[1]) { return false; }
    // If the factor is too much, scale it down to reach the extent exactly
    var clamped_target_scale = Math.max(extent[0], Math.min(extent[1], target_scale));
    if (clamped_target_scale != target_scale) {
        target_scale = clamped_target_scale;
        factor = target_scale / scale;
    }

    // Center each vector, stretch, then put back
    x = (x - center[0]) * factor + center[0];
    y = (y - center[1]) * factor + center[1];

    dvc.scale = zoom.scale();
    dvc.translate = zoom.translate();


    // Enact the zoom immediately
    zoom.scale(target_scale)
        .translate([x, y]);

    zoomed();
}

function zoomcontrols() {

    zoomcontrols = d3.select("#graphic").append('div')
        // .attr("tabindex", "0")
        .attr("class", "zoom-container zoom-control-zoom zoom-bar zoom-control");

    zoomcontrols.append("a")
        .attr("id", "zoom_in")
        .attr("class", "zoom-control-zoom-in zoom-bar-part zoom-bar-part-top")
        .attr("tabindex", "0")
        .attr("aria-label", "zoom in on the map")
        .attr("title", "Zoom in")
        .text("+")

    zoomcontrols.append("a")
        .attr("id", "zoom_out")
        .attr("class", "zoom-control-zoom-out zoom-bar-part zoom-bar-part-bottom")
        .attr("tabindex", "0")
        .attr("aria-label", "zoom out on the map")
        .attr("title", "Zoom out")
        .text(" -")

    var intervalID;

    d3.selectAll('.zoom-bar-part')
        .on('mousedown', function () {

            d3.event.preventDefault();
            var factor = (this.id === 'zoom_in') ? 1.1 : 1 / 1.1;
            intervalID = setInterval(zoom_by, 40, factor);

        })
        .on('mouseup', function () {
            d3.event.preventDefault();
            clearInterval(intervalID);
            intervalID = undefined;
        })
        .on('keypress', function () {
            if (d3.event.keyCode == 13 || d3.event.keyCode == 32) { // enter|space
                d3.event.preventDefault()
                var factor = (this.id === 'zoom_in') ? 1.1 : 1 / 1.1;
                zoom_by(factor)
            }
        })

}


function updateHash() {
    window.location.hash = encodeURI(area);
}


//then, onload, check to see if the web browser can handle 'inline svg'
if (Modernizr.svg) {
    var url = decodeURI(window.location.hash);
    params = url.split("/");


    if (url != "") { //if parameters set in url
        if (params[0] == "null") {
            var area = null;
        } else {
            var area = params[0].split("#")[1]
        }
    }

    /**
     * @TODO move this to to queue/ready callback?
     */
    // open and load configuration file.
    d3.json("./data/config.json", function (error, json) {
        // store read in json data from config file as as global dvc. variable ...
        dvc = json;
        //set title of page
        document.title = dvc.ons.visualisationTitle;
        d3.csv(dvc.ons.graphic_data_url, function (error, data) {

            graphic_data = data;
            dvc.data = graphic_data;

            headers = d3.keys(graphic_data[0]).filter(function (key) {
                if (dvc.ons.fieldsToIgnore.indexOf(key) == -1) { return key; }// end else ...
                else { } // end else ...
            });

            d3.queue()
                .defer(d3.json, "./data/geography.json")
                .defer(d3.csv, "./data/data.csv")
                .await(ready);
        })
    })

} // end if ... error
else {
    //use pym to create iframe containing fallback image (which is set as default)
    pymChild = new pym.Child();
    if (pymChild) { pymChild.sendHeight(); }

}// end else ...

function ready(error, pcon, data) {

    dvc.pcon = pcon;
    dvc.data = data;

    pymChild = new pym.Child({ renderCallback: drawGraphic });

    var IE = (!!window.ActiveXObject && +(/msie\s(\d+)/i.exec(navigator.userAgent)[1])) || NaN;
    if (IE != 9) {
        zoomcontrols();
    }

    var divs = d3.select('.tbody').selectAll('td').data(dvc.vars).enter().append('tr');

    divs.append('td').text(function (d) { return d })
    divs.append('td').text(function (d, i) { return dvc.ref[i] })
    divs.append('td').text(function (d, i) { return dvc.desc[i] })

    var sources = divs.append('td').attr("class", "sources")

    sources.append("a")
        .attr("href", function (d, i) {

        }
        )
        .attr("target", "_blank")
        .html(function (d, i) { return dvc.source[i][0] })

    sources.append("a")
        .attr("href", function (d, i) {

        }
        )
        .attr("target", "_blank")
        .html(function (d, i) { return dvc.source[i][1] })

    sources.append("a")
        .attr("href", function (d, i) {

        }
        )
        .attr("target", "_blank")
        .html(function (d, i) { return dvc.source[i][2] })

    sources.append("a")
        .attr("href", function (d, i) {

        }
        )
        .attr("target", "_blank")
        .html(function (d, i) { return dvc.source[i][3] })

    selectlist();
    //if url has custom area select it

    if (area != null) {
        var reg = document.getElementById("reg" + area);

        var name = d3.select("#reg" + area).attr("data-nm")

        d3.selectAll('.pcon')
            .append("path")
            .attr("d", d3.select(reg).attr("d"))
            .attr("id", "selected")
            .attr("class", "arcSelection")
            .attr("pointer-events", "none")
            .style("fill", "none")
            .style("stroke", "#990000")
            .style("stroke-width", 2 / dvc.scale);

        details = d3.select("#details")

        d3.select("#areanm").text(name);

        $("#areaselect").val(area);

        $("#areaselect").trigger("chosen:updated");

        d3.selectAll(".pcon").selectAll("path").attr("pointer-events", "none")
    }

}// end function ready()

function createKey(k, graph_unitWidth, graph_unitHeight, margin, innerPadding) {

    var svgkey = d3.select("#svg" + k)
        .append("svg")
        .attr("id", "key")
        .attr("class", "keys")
    newbreaks = breaks;

    var color = d3.scale.threshold()
        .domain(newbreaks)
        .range(dvc.ons.varcolour);

    y = d3.scale.linear()
        .domain([breaks[0], breaks[dvc.ons.breakDivisions]]) /*range for data*/
        .range([graph_unitHeight - 120, 0]); /*range for pixels*/

    key_svg = $("#key_svg").width()

    x = d3.scale.linear()
        .domain([breaks[0], breaks[dvc.ons.breakDivisions]]) /*range for data*/
        .range([0, key_svg - 30]); /*range for pixels*/

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("right")
        .tickSize(8)
        .tickFormat(function (d, i) {

            //	if (i==0 || i==4 || i==5){
            return numFormat(d)// }

        })
        .tickValues(color.domain())

    svgkey.append("rect")
        .attr("transform", "translate(" + (graph_unitWidth - 54) + ",18)")
        .attr("height", graph_unitHeight)
        .attr("width", 40)
        .style("fill", "#fff")
        .style("stroke", "none")
        .style("opacity", 0.8);

    var g = svgkey.append("g")
        .attr("transform", "translate(" + (graph_unitWidth - 50) + ",30)");

    g.selectAll("rect")
        .data(color.range().map(function (d, i) {
            return {
                y0: i ? y(color.domain()[i]) : y.range()[0],
                y1: i < color.domain().length ? y(color.domain()[i + 1]) : y.range()[1],
                z: d
            };
        }))
        .enter().append("rect")
        .attr("width", 5)
        .attr("y", function (d, i) { return d.y1; })
        .attr("height", function (d) { return d.y0 - d.y1; })
        .style("fill", function (d) { return d.z; });

    g.call(yAxis).append("text");


    setTimeout(function () {
        if (pymChild) {
            pymChild.sendHeight();
        }
    }, 1500)


}// end function createKey()

function announceUpdate(area) {
    var linevalues = dvc.data.map(function (d) { return d; }).filter(function (d) { return d.AREACD == area });
    var vals = d3.keys(linevalues[0]).filter(function (key) {
        if (dvc.ons.fieldsToIgnore.indexOf(key) == -1) { return key; }
    });
    var rangeLabel
    var msg
    var summary = []
    for (i = 0; i < headers.length; i++) {
        rangeLabel = headers[i]
        d3.select("#varval_" + i)
            .text(function () {
                var fmt = d3.format(".2f")
                msg = headers[i].replace(/\-/g, ' to ') + ": " + fmt(linevalues[0][rangeLabel]) + dvc.ons.unitofmeasure[i]
                if (linevalues[0][rangeLabel] == "null") {
                    return headers[i];
                } else if (linevalues[0][rangeLabel] == "0") {
                    return "less than 0.01% " + headers[i];
                } else {
                    summary.push(msg)
                    return msg
                }
            })

    }
    var summaryStr = summary.length ? summary.join('. ') : 'none available.'
    var output = 'For ' + linevalues[0].AREANM + ' the statistics are as follows: ' + summaryStr
    dAccessMsg.html(output)
}

function announceClear() {
    dAccessMsg.html('')
}

function selectlist() {

    var areacodes = dvc.data.map(function (d) { return d.AREACD; })
    var areanames = dvc.data.map(function (d) { return d.AREANM; })
    var menuarea = d3.zip(areanames, areacodes).sort(function (a, b) { return d3.ascending(a[0], b[0]); });

    $('#selectNav').on('keypress', function (e) {
        if (e.target.classList.contains('search-choice-close')) {
            if (e.keyCode == 13 || e.keyCode == 32) { // enter|space
                e.preventDefault()
                $('#areaselect').val('').trigger('chosen:updated')
                unhighlight()
            }
        }
    })

    // Build option menu for occupations
    var optns = d3.select("#selectNav").append("div").attr("id", "sel")
        .append("select")
        .attr("id", "areaselect")
        .attr("style", "width:calc(100% - 6px)")
        .attr("class", "chosen-select");

    optns.append("option")
    // .attr("value", "first")
    // .text("");

    optns.selectAll("p").data(menuarea).enter().append("option")
        .attr("value", function (d) { return d[1] })
        .attr("id", function (d) { return d[1] })
        .text(function (d) { return d[0] });



    $('#areaselect').chosen({
        placeholder_text_single: "Select an area",
        // width: "98%",
        allow_single_deselect: true
    })


    d3.select('input.chosen-search-input').attr('id', 'chosensearchinput')
    d3.select('div.chosen-search').insert('label', 'input.chosen-search-input')
        .attr('class', 'visuallyhidden')
        .attr('for', 'chosensearchinput')
        .html("Type to select which UK area to hear statistics for")

    function onChangeSelect(evt, params) {
        if (typeof params != "undefined") {
            area = params.selected
            areaName = d3.select("#areaselect_chosen").select("span").html()

            dataLayer.push({
                'event': 'mapDropSelect',
                'selected': areaName
            })

            d3.selectAll('#selected').remove();
            d3.select("#areanm").empty();

            var reg = document.getElementById("reg" + area);

            var name = d3.select("#reg" + area).attr("data-nm")

            d3.selectAll('.pcon')
                .append("path")
                .attr("d", d3.select(reg).attr("d"))
                .attr("id", "selected")
                .attr("class", "arcSelection")
                .attr("pointer-events", "none")
                .style("fill", "none")
                .style("stroke", "#990000")
                .style("stroke-width", 2 / dvc.scale);

            details = d3.select("#details")
            d3.select("#areanm").text(areaName);
            d3.selectAll(".pcon").selectAll("path").attr("pointer-events", "none")

            //d3.select("#clearBtn").classed("hide", false);


            plot(area);
            // announceUpdate(area)
        } else {
            d3.select("#areaselect_chosen").select("span").html('')
            announceClear()
            d3.selectAll("path").attr("pointer-events", "all")
            //d3.select("#clearBtn").classed("hide", true);

            d3.selectAll(".lines")
                .attr("y1", 0)
                .attr("y2", 0)
                .attr("x1", 0)
                .attr("x2", 0)


            d3.selectAll('#selected').remove();
            d3.selectAll(".areaname").text(function (d, i) { return headers[i] })
            d3.select("#areanm").text("");

            dataLayer.push({
                'event': 'deselectCross',
                'selected': 'deselect'
            })

        }

        updateHash();

    }
    $('#areaselect').on('change', onChangeSelect);

};

$('#collapse').hide();


$('.coll').on('click', function () {
    $('#intro').toggle('slide');
    $('#collapse').toggle();
    $('#expand').toggle();
});
