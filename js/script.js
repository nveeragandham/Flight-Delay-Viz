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
            })

    }

});

    // Legend setup
const legendSvg = d3.select("#legend")
  .append("svg")
  .attr("width", 320)
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
