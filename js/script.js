document.addEventListener("DOMContentLoaded", function () {
    const width = 1000, height = 600;
    const svg = d3.select("#vis").append("svg")
        .attr("width", width)
        .attr("height", height);

    let isFlat = false;

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

    const projection = interpolateProjection(d3.geoOrthographicRaw, d3.geoEquirectangularRaw)
        .scale(170)
        .translate([width / 2, height / 2])
        .precision(0.1);

    const path = d3.geoPath().projection(projection);

    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson").then(geoData => {
        svg.selectAll("path")
            .data(geoData.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", "#69b3a2")
            .attr("stroke", "#333");

        const countries = [
            { name: "United States", coords: [-100, 40] },
            { name: "Brazil", coords: [-55, -10] },
            { name: "India", coords: [78, 22] },
            { name: "China", coords: [104, 35] },
            { name: "Australia", coords: [133, -25] }
        ];

        svg.selectAll("text.label")
            .data(countries)
            .enter().append("text")
            .attr("class", "label")
            .attr("x", d => projection(d.coords)[0])
            .attr("y", d => projection(d.coords)[1])
            .text(d => d.name)
            .style("fill", "#333")
            .style("font-size", "12px");

        // load flight data
        d3.json("data/flights.json").then(flights => {
            allFlights = flights;

            updateFlightsForDate(selectedDate);

            if (!isFlat) {
                rotateGlobe();
            }
        });

        function rotateGlobe() {
            if (!isFlat) {
                projection.rotate([Date.now() / 150, -20]);
                svg.selectAll("path").attr("d", path);
                svg.selectAll("path.flight").attr("d", d =>
                    geoArc(
                        [d.originCoords.lon, d.originCoords.lat],
                        [d.destCoords.lon, d.destCoords.lat]
                    )
                );

                svg.selectAll("text.label")
                    .attr("x", d => projection(d.coords)[0])
                    .attr("y", d => projection(d.coords)[1]);
            }
            requestAnimationFrame(rotateGlobe);
        }

        rotateGlobe();

    });

    document.getElementById("switch-view").addEventListener("click", function () {
        isFlat = !isFlat;
        d3.transition().duration(2000).tween("projection", function () {
            return function (t) {
                projection.alpha(isFlat ? t : 1 - t);
                svg.selectAll("path").attr("d", path);
                svg.selectAll("path.flight").attr("d", d => geoArc(
                    [d.originCoords.lon, d.originCoords.lat],
                    [d.destCoords.lon, d.destCoords.lat]
                ));
                svg.selectAll("text.label")
                    .attr("x", d => projection(d.coords)[0])
                    .attr("y", d => projection(d.coords)[1]);
            };
        });
        this.textContent = isFlat ? "Switch to Globe" : "Switch to Flat Map";
    });

    function geoArc(from, to) {
        const source = projection(from);
        const target = projection(to);
        const mid = [(source[0] + target[0]) / 2, (source[1] + target[1]) / 2 - 100];
        return d3.line().curve(d3.curveBasis)([source, mid, target]);
    }

    function interpolateProjection(raw0, raw1) {
        const mutate = d3.geoProjectionMutator(t => (x, y) => {
            const [x0, y0] = raw0(x, y), [x1, y1] = raw1(x, y);
            return [x0 + t * (x1 - x0), y0 + t * (y1 - y0)];
        });
        let t = 0;
        return Object.assign(mutate(t), {
            alpha(_) {
                return arguments.length ? mutate(t = +_) : t;
            }
        });
    }

    function updateFlightsForDate(date) {
        const dateStr = formatDate(date);  // format as "2008-01-01"

        // filter by date
        let filteredFlights = allFlights.filter(f => f.date === dateStr);
        filteredFlights.sort((a, b) => b.delay - a.delay);
        filteredFlights = filteredFlights.slice(0, 50); // currently selecting top 50

        svg.selectAll("path.flight").remove();

        svg.selectAll("path.flight")
            .data(filteredFlights)
            .enter()
            .append("path")
            .attr("class", "flight")
            .attr("d", d => geoArc(
                [d.originCoords.lon, d.originCoords.lat],
                [d.destCoords.lon, d.destCoords.lat]
            ))
            .attr("stroke", d => d.delay > 15 ? "red" : "#00f") // delay coloring -- not really working
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