jQuery.noConflict();
jQuery(document).ready(function($){

// svg width="800" height="600"
//     g class="axes"
//         g class="x axis" transform="translate(30,570)"
//             g class="tick" transform="translate(__,0)"  /* __ 0..800 */
//                 line /line                              /* the tick mark */
//                 text /text                              /* the tick label */
//                 line class="grid-line" y2="-N" /line    /* the grid line, -N goes opposite dir */
//             /g
//             ...
//             path class="domain" /path                   /* a rectantular covering axis line and ticks */
//         /g
//         g class="y axis" transform="translate(30,30)"
//             g class="tick" transform="translate(0,__)"  /* __ 600..0 */
//                 line /line                              /* the tick mark */
//                 text /text                              /* the tick label */
//                 line class="grid-line" /line            /* the grid line */
//             /g
//             ...
//             path class="domain" /path                   /* a rectantular covering axis line and ticks */
//         /g
//     /g
//     defs
//         clippath id="body-clip"
//             rect /rect
//         /clippath
//     /defs
//     g class="body" transform="translate(30,30)" clip-path="url(#body-clip)"
//         path class="line" d="..." /path
//         path class="line" d="..." /path         /* if there're muti-series */
//         ...
//         circle class="dot" /circle
//         ...
//     g/
// /svg

var config = {
    width: 800,
    height: 600,
    // define a margin around the chart for tick marks and labels
    margin: { top: 10, right: 10, bottom: 60, left: 40 },
    padding: 5
};
var containerId = "chart-container";

resetChart(config, containerId);

getData(config, reloadChart);

function resetChart(config, containerId) {

    // clear the contents of container
    var node;
    var ctDom = document.getElementById(containerId);
    while (ctDom.firstChild) {
        ctDom.removeChild(ctDom.firstChild);
    }

    // (1) create a selection representing svg
    var container = config.container = d3.select("#"+containerId);
    var svg = container
                .append("svg")
                    .attr("class", "chart")
                    .attr("height", config.height)
                    .attr("width", config.width);
    config.svg = svg;

    // (2) create X/Y scales (with default)
    var xScale = createXScale(svg, config.width, config.margin);
    var yScale = createYScale(svg, config.height, config.margin);
    config.xScale = xScale;
    config.yScale = yScale;

    // (3) create X/Y axes (with default scales)
    var xAxis = createXAxis(svg, {
                    margin: config.margin,
                    width: config.width,
                    height: config.height
                }, xScale);
    var yAxis = createYAxis(svg, {
                    margin: config.margin,
                    width: config.width,
                    height: config.height
                }, yScale);
    config.xAxis = xAxis;
    config.yAxis = yAxis;

    // origin x and y are relative to svg
    config.plotArea = {
        originX: xAxis.svgGroup.left,
        originY: xAxis.svgGroup.top,
        width: xAxis.svgGroup.width,
        height: yAxis.svgGroup.height
    };

    // (4) define/bind body clip
    /*
    var clipDefId = "body-clip";
    defineBodyClip(svg, clipDefId, config.plotArea, config.padding);
    config.clipDefId = clipDefId;
    svg.attr("clip-path", "url(#"+clipDefId+")");
    config.defs = svg[0][0].getElementsByTagName("defs")[0];
    */
}

function reloadChart(config, data) {

    // clear the contents of container
    var svg = config.svg;
    var svgDom = svg[0][0];
    while (svgDom.firstChild) {
        svgDom.removeChild(svgDom.firstChild);
    }

    // clear the tooltip
    var container = null, tooltip = null;
    if (config.tooltip && config.container) {
        container = config.container[0][0];
        tooltip = config.tooltip[0][0];
        container.removeChild(tooltip);
        delete config.tooltip;
    }

    // extract min/max date and value from data
    var minDate = data[0].date, maxDate = data[0].date;
    var minValue = data[0].value, maxValue = data[0].value;
    var i, d, ms, v;
    for (i = 0; i < data.length; i++) {
        d = data[i];
        ms = d.date.getTime();
        if (ms < minDate.getTime()) { minDate = d.date; }
        if (ms > maxDate.getTime()) { maxDate = d.date; }
        v = d.value;
        if (v < minValue) { minValue = v; }
        if (v > maxValue) { maxValue = v; }
    }

    var margin = config.margin;
    var width = config.width, height = config.height;

    // (2) create X/Y scales (with min, max)
    var xScale = createXScale(svg, width, margin, minDate, maxDate);
    var yScale = createYScale(svg, height, margin, minValue, maxValue);
    config.xScale = xScale;
    config.yScale = yScale;

    // (3) create X/Y axes (with min/max scale)
    var xAxis = createXAxis(svg, { margin: margin, width: width, height: height }, xScale);
    var yAxis = createYAxis(svg, { margin: margin, width: width, height: height }, yScale);
    config.xAxis = xAxis;
    config.yAxis = yAxis;

    // origin x and y are relative to svg
    config.plotArea = {
        originX: xAxis.svgGroup.left,
        originY: xAxis.svgGroup.top,
        width: xAxis.svgGroup.width,
        height: yAxis.svgGroup.height
    };

    // (4) define/bind body clip
    /*
    defineBodyClip(svg, config.clipDefId, config.plotArea, config.padding);
    //svg.attr("clip-path", "url(#"+config.clipDefId+")");
    config.defs = svg[0][0].getElementsByTagName("defs")[0];
    */

    renderLine(config, data. xScale, yScale);

    renderDots(config, data, xScale, yScale);
}



function createXScale(svg, width, margin, minDate, maxDate) {
    if (!maxDate) { maxDate = new Date(); }
    if (!minDate) { minDate = new Date(maxDate.getTime() - (7*24*60*60*1000)); }
    var w = svg[0][0] ? svg[0][0].width.baseVal.value : width;

    var xScale = d3.time.scale()
                   .domain([minDate, maxDate])
                   .range([0, w - margin.left - margin.right]);

    return xScale;
}

function createYScale(svg, height, margin, minValue, maxValue) {
    if (maxValue === undefined) { maxValue = 100; }
    if (minValue === undefined) { minValue = 0; }
    var h = svg[0][0] ? svg[0][0].height.baseVal.value : height;

    var yScale = d3.scale.linear()
                   .domain([minValue, maxValue])
                   .range([h - margin.top - margin.bottom, 0]);   // height, 0

    return yScale;
}

/**
 * @param {Object} cfg - { margin, width, height }
 */
function createXAxis(svg, cfg, xScale) {
    var margin = cfg.margin;
    var height = cfg.height;
    var svgDom = svg[0][0];
    var h = svgDom ? svgDom.clientHeight : height;

    // create an axis object and bind it to scale
    var xAxis = d3.svg.axis()
                  .scale(xScale)
                  .orient("bottom");

    xAxis.svgGroup = {
        left: margin.left, top: h - margin.bottom
    };

    // create a g having class="x axis", move it to the bottom, and bind it to axis
    var g = svg.append("g")
               .attr("class", "x axis")
               .attr("transform", function () {
                   return "translate("+xAxis.svgGroup.left+","+xAxis.svgGroup.top+")";
               })
               .call(xAxis);
    xAxis.svgGroup.g = g;

    // as the axis object is bound to the SVG g, children g for each tick are created
    // g class="x axis"
    //     g class="tick"
    //         line x2="-6" y2="0" /text                  -- the tick mark
    //         text x="-9" y="0" dy=".32em" style="..."   -- the tick label
    //             string
    //         /text
    //     /g
    //     ...
    // /g

    // path.animatedPathSegList
    // for (i = 0; i &lt; path.animatedPathSegList.length; i++) {
    //     seg = path.getItem(i);   // SVGPathSeg seg
    //     if (seg.pathSegType != 12) { continue; }  // 12 = SVGPathSegLinetoHorizontalAbs
    //     width = seg.x;
    //     break;
    // }
    var gDom = g[0][0], seg;
    if (!gDom) { return xAxis; }

    var path = gDom.getElementsByTagName("path")[0];
    for (var i = 0; i < path.animatedPathSegList.length; i++) {
        seg = path.animatedPathSegList.getItem(i);   // SVGPathSeg seg
        if (seg.pathSegType != 12) { continue; }  // 12 = SVGPathSegLinetoHorizontalAbs
        xAxis.svgGroup.width = seg.x;
        break;
    }

    // xAxis.svgGroup = {top, left, g, width}, where top/left are relative to svg
    return xAxis;
}

/**
 * @param {Object} cfg - { margin, width, height }
 */
function createYAxis(svg, cfg, yScale) {
    var margin = cfg.margin;
    var width = cfg.width;
    var height = cfg.height;
    var svgDom = svg[0][0];
    var w = svgDom ? svgDom.clientWidth : width;
    var h = svgDom ? svgDom.clientHeight : height;

    // create an axis object and bind it to yScale
    var yAxis = d3.svg.axis()
                  .scale(yScale)
                  .ticks(6)
                  .orient("left");

    yAxis.svgGroup = {
        left: margin.left, top: h - margin.bottom
    };

    // create a g having class="y axis", move it to the top-left margin, and bind it to axis
    var g = svg.append("g")
               .attr("class", "y axis")
               .attr("transform", function () {
                   return "translate("+yAxis.svgGroup.left+","+margin.top+")";
                   //return "translate(40,40)";
               })
               .call(yAxis);
    yAxis.svgGroup.g = g;
    // Note that the y axis' g group is moved to the low-left to ensure the same axes origin
    // as the x axis' g; group is.  Because of moving the y axis g group to the low-left,
    // all of its ticks must be drawn from the bottom to the top along the y axis on a negative
    // direction relative to the y axis's g; group.  In order to do that, the range max to
    // the yScale needs to be casted to negative.  Refer to the createAxes() function when it
    // creates the yScale.

    // As the axis object is bound to the g, children g for each tick are created
    // g class="y axis"
    //     g class="tick"
    //         line x2="-6" y2="0" /line                          -- the tick mark
    //         text x="-9" y="0" dy=".32em" style="..." /line     -- the tick label
    //     /g
    //     ...
    // /g

    // path.animatedPathSegList
    // for (i = 0; i &lt; path.animatedPathSegList.length; i++) {
    //     seg = path.getItem(i);   // SVGPathSeg seg
    //     if (seg.pathSegType != 2) { continue; }  // 2 = SVGPathSegMovetoAbs
    //     height = seg.y;   // a negative value
    //     break;
    // }
    // 
    var gDom = g[0][0], seg;
    if (!gDom) { return yAxis; }

    var path = gDom.getElementsByTagName("path")[0];
    for (var i = 0; i < path.animatedPathSegList.length; i++) {
        seg = path.animatedPathSegList.getItem(i);   // SVGPathSeg seg
        if (seg.pathSegType != 14) { continue; }  // 14 = SVG_PATHSEG_LINETO_HORIZONTAL_ABS, 2 = SVGPathSegMovetoAbs
        yAxis.svgGroup.height = seg.y;   // a negative value
        break;
    }

    // yAxis.svgGroup = { top, left, g, height }
    return yAxis;
}

function defineBodyClip(svg, id, plotArea, padding) {
    svg.append("defs")
           .append("clipPath")
               .attr("id", id)
               .append("rect")
               .attr("x", plotArea.originX - padding)
               .attr("y", plotArea.originY - plotArea.height - padding)
               .attr("width", plotArea.width + 2 * padding)
               .attr("height", plotArea.height + 2 * padding);
}

function renderLine(config, data, xScale, yScale) {
    // create a line function
    var line = d3.svg.line()
                 .interpolate("linear") // "linear" or "monotone"
                 .x(function(d){return xScale(d.date);})
                 .y(function(d){return yScale(d.value);});

    // create a g to contain the path and create the path
    config.plotG = svg.append("g")
        .attr("class", "body")
        .attr("transform", "translate("+margin.left+","+margin.top+ ")");
        //.attr("clip-path", "url(#"+config.clipDefId+")");

    // bind the data to g and render paths
    config.plotG.selectAll("path.line")
       .data([data])
       .enter()
           .append("path")
           .attr("class", "line")                
           .attr("d", function(d){return line(d);});        
                
    /* the attr "d" can also be bound separately
    config.plotG.selectAll("path.line")
       .data([data])       
       .attr("d", function(d){return line(d);});        
    */
}

function renderDots(config, data, xScale, yScale) {
    var svg = config.svg;

    var tooltip = config.tooltip =
        //d3.select("body")
        config.container
          .append("div")
              .attr("class", "chart-tooltip")
              .style("opacity", 0);

    _colors = d3.scale.category10();
    svg.append("g")
           .attr("transform", function () {
               return "translate("+config.margin.left+","+config.margin.top+")";
           })
           .selectAll("circle")
           .data(data)
           .enter()
               .append("circle")
                   .attr("class", "dot")
                   .style("stroke", function (d) { 
                       return _colors(0);
                   })
                   .on("mouseover", function(d) {
                       tooltip.transition()
                              .duration(200)
                              .style("opacity", .9);
                       tooltip.html(d.value)
                              .style("left", (d3.event.pageX) + "px")
                              .style("top", (d3.event.pageY - 28) + "px");
                   })
                   .on("mouseout", function(d) {
                       tooltip.transition()
                              .duration(500)
                              .style("opacity", 0);
                   })
                   .transition()
                   .attr("cx", function(d) { return xScale(d.date); })
                   .attr("cy", function(d) { return yScale(d.value); })
                   .attr("r", 4.5);
}

function generateData() {
    var data = [];
    var i = Math.max(Math.round(Math.random()*365), 3);

    var lastDate = new Date();
    while (i--) {
        lastDate = new Date(lastDate.getTime() - Math.max(Math.round(Math.random()*3), 1)*24*60*60*1000);
        lastDate.setHours(0, 0, 0, 0);
        data.push({date: lastDate, value: Math.round(Math.random()*1200)});
    }
    return data;
}


function getData(config, callback) {
    setTimeout(function () {
        callback(config, generateData());
    }, 1500);
}



});
