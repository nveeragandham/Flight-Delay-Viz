document.addEventListener("DOMContentLoaded", function () {
    const width = 1000, height = 600;
    const svg = d3.select("#vis").append("svg")
        .attr("width", width)
        .attr("height", height);
    const g = svg.append("g");

    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

        svg.call(zoom);

    d3.select("#reset-zoom").on("click", () => {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
        });



    const tooltip = d3.select("#tooltip");

    const parseDate = d3.timeParse("%Y-%m-%d");
    const formatDate = d3.timeFormat("%Y-%m-%d");
    const formatLabel = d3.timeFormat("%b %d, %Y");

    const minDate = parseDate("2008-01-03");
    const maxDate = parseDate("2008-01-31");

    let selectedDate = minDate;
    let allFlights = [];

    // create slider
    const dateSlider = d3.sliderBottom()
        .min(minDate)
        .max(maxDate)
        .step(1000 * 60 * 60 * 24)
        .width(800)
        .tickFormat(formatLabel)
        .ticks(10)
        .default(selectedDate)
        .on('onchange', val => {
            selectedDate = val;
            d3.select("#selected-date").text(`Selected date: ${formatLabel(selectedDate)}`);
            updateFlightsForDate(selectedDate);
        });

    const sliderSvg = d3.select('#slider')
        .append('svg')
        .attr('width', 900)
        .attr('height', 100);

    sliderSvg.append('g')
        .attr('transform', 'translate(30,30)')
        .call(dateSlider);

    sliderSvg.append('text')
        .attr('id', 'selected-date')
        .attr('x', 450)
        .attr('y', 90)
        .attr('text-anchor', 'middle')
        .style('font-weight', 'bold')
        .text(`Selected date: ${formatLabel(selectedDate)}`);

    const projection = d3.geoAlbersUsa();
    const path = d3.geoPath();

    d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json").then(us => {
        const states = topojson.feature(us, us.objects.states);
        const projection = d3.geoAlbersUsa()
            .scale(1100)
            .translate([width / 2.05, height / 2.4]);

    const path = d3.geoPath().projection(projection);

    g.selectAll("path")
        .data(states.features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill", "#69b3a2")
        .attr("stroke", "#333");

        // load flight data
        d3.json("data/flights.json").then(flights => {
            allFlights = flights;

            updateFlightsForDate(selectedDate);
        });
    });

    function geoArc(from, to) {
        const source = projection(from);
        const target = projection(to);
        const mid = [(source[0] + target[0]) / 2, (source[1] + target[1]) / 2 - 100];
        return d3.line().curve(d3.curveBasis)([source, mid, target]);
    }

    // function interpolateProjection(raw0, raw1) {
    //     const mutate = d3.geoProjectionMutator(t => (x, y) => {
    //         const [x0, y0] = raw0(x, y), [x1, y1] = raw1(x, y);
    //         return [x0 + t * (x1 - x0), y0 + t * (y1 - y0)];
    //     });
    //     let t = 0;
    //     return Object.assign(mutate(t), {
    //         alpha(_) {
    //             return arguments.length ? mutate(t = +_) : t;
    //         }
    //     });
    // }

        const delayColorScale = d3.scaleLinear()
            .domain([0, 120, 240])
            .range(["yellow", "orange", "red"]);




    function updateFlightsForDate(date) {
        const dateStr = formatDate(date);  // format as "2008-01-01"
        

        // filter by date
        let filteredFlights = allFlights.filter(f => f.date === dateStr);
        filteredFlights.sort((a, b) => b.delay - a.delay);
        
        filteredFlights = filteredFlights.slice(0, 50); // currently selecting top 50

        g.selectAll("path.flight").remove();
        g.selectAll("circle.airport").remove();
        g.selectAll(".flying-dot").remove();
        g.selectAll(".invisible-flight-path").remove();

        g.selectAll("path.flight")
            .data(filteredFlights)
            .enter()
            .append("path")
            .attr("class", "flight")
            .attr("d", d => geoArc(
                [d.originCoords.lon, d.originCoords.lat],
                [d.destCoords.lon, d.destCoords.lat]
            ))
            .attr("stroke", d => delayColorScale(d.delay)) // delay coloring -- not really working
            .attr("stroke-width", d => Math.min(4, d.delay / 10 + 1))
            .attr("fill", "none")
            .attr("opacity", 0.6)
            .on("mouseover", function (event, d) {
                tooltip.style("visibility", "visible")
                    .style("opacity", 1)
                    .text(`${d.origin} → ${d.dest} | Delay: ${d.delay} min`);
            })
            .on("mousemove", function (event) {
                tooltip.style("top", (event.pageY - 10) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function () {
                tooltip.style("visibility", "hidden")
                    .style("opacity", 0);
            });
             let airportSet = new Set();
        
        //anniamtion
      const animatedFlights = filteredFlights.slice(0, 5); // top 5 delayed

animatedFlights.forEach((d, i) => {
  const arcPath = geoArc(
    [d.originCoords.lon, d.originCoords.lat],
    [d.destCoords.lon, d.destCoords.lat]
  );

  if (!arcPath) return;

  const pathElem = g.append("path")
    .attr("d", arcPath)
    .attr("class", "invisible-flight-path")
    .attr("fill", "none")
    .attr("stroke", "none")
    .node();

  const totalLength = pathElem.getTotalLength();

  const planeMarker = g.append("path")
    .attr("class", "flying-dot")
    .attr("d", "M0,-6 L15,0 L0,6 L6,0 Z") // triangle
    .attr("fill", "black")
    .attr("opacity", 0.9);

  function animatePlane() {
    planeMarker
      .transition()
      .duration(10000 + i * 300)
      .ease(d3.easeLinear)
      .attrTween("transform", function () {
        return function (t) {
          const point = pathElem.getPointAtLength(t * totalLength);
          const next = pathElem.getPointAtLength(Math.min(t * totalLength + 1, totalLength));
          const angle = Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI;
          return `translate(${point.x},${point.y}) rotate(${angle})`;
        };
      })
      .on("end", animatePlane); // loop
  }

  animatePlane();
});


        let activeAirports = [];

        filteredFlights.forEach(f => {
            const keyOrigin = `${f.originCoords.lat},${f.originCoords.lon}`;
            const keyDest = `${f.destCoords.lat},${f.destCoords.lon}`;

            if (!airportSet.has(keyOrigin)) {
            activeAirports.push({ code: f.origin, coords: f.originCoords });
            airportSet.add(keyOrigin);
            }

            if (!airportSet.has(keyDest)) {
            activeAirports.push({ code: f.dest, coords: f.destCoords });
            airportSet.add(keyDest);
            }
        });
        g.selectAll("circle.airport")
    .data(activeAirports)
    .enter()
    .append("circle")
    .attr("class", "airport")
    .attr("cx", d => projection([d.coords.lon, d.coords.lat])[0])
    .attr("cy", d => projection([d.coords.lon, d.coords.lat])[1])
    .attr("r", 3)
    .attr("fill", "black")
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .on("mouseover", (event, d) => {
      tooltip.style("visibility", "visible")
        .style("opacity", 1)
        .text(`Airport: ${d.code}`);
    })
    .on("mousemove", event => {
      tooltip.style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("visibility", "hidden")
        .style("opacity", 0);
    });
    }
});

    // Legend setup
const legendSvg = d3.select("#legend")
  .append("svg")
  .attr("width", 450)
  .attr("height", 60);

const defs = legendSvg.append("defs");

const linearGradient = defs.append("linearGradient")
  .attr("id", "legend-gradient")
  .attr("x1", "0%")
  .attr("x2", "100%")
  .attr("y1", "0%")
  .attr("y2", "0%");

linearGradient.selectAll("stop")
  .data([
    { offset: "0%", color: "yellow" },
    { offset: "50%", color: "orange" },
    { offset: "100%", color: "red" }
  ])
  .enter()
  .append("stop")
  .attr("offset", d => d.offset)
  .attr("stop-color", d => d.color);

legendSvg.append("rect")
  .attr("x", 20)
  .attr("y", 10)
  .attr("width", 260)
  .attr("height", 15)
  .style("fill", "url(#legend-gradient)")
  .style("stroke", "#333")
  .style("stroke-width", 1);

legendSvg.append("text")
  .attr("x", 30)
  .attr("y", 40)
  .attr("text-anchor", "middle")
  .text("0 hours");

legendSvg.append("text")
  .attr("x", 150)
  .attr("y", 40)
  .attr("text-anchor", "middle")
  .text("2 hours");

legendSvg.append("text")
  .attr("x", 280)
  .attr("y", 40)
  .attr("text-anchor", "middle")
  .text("4+ hours");
legendSvg.append("path")
  .attr("d", "M0,-6 L16,0 L0,6 L5,0 Z") 
  .attr("transform", "translate(375, 18) rotate(0) scale(1.5)")

  .attr("fill", "black")
  .attr("opacity", 0.9);

legendSvg.append("text")
  .attr("x", 425)
  .attr("y", 40)
  .attr("text-anchor", "end")
  .attr("font-size", "11px")
  .text("Longest Delays");

