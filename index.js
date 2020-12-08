const height = window.innerHeight - 150;
const width = window.innerWidth - 200;
const margin = { right: 50, left: 50 };

const labelSize = 7;
const markerSize = 1.5;
const bubbleSize = 10;

const boundaryFilter = (a, b) => a !== b;
const textOffset = { x: 0, y: 3 };
const greys = d3.schemeGreys[9];

const getColor = (oxygen, min, max) => `hsl(240, ${(oxygen - min) / (max - min) * 100}%, 50%)`;
const compareDates = (date1, date2) => date1.getMonth() == date2.getMonth() && date1.getYear() == date2.getYear();

// import data
d3.json(
    'https://gist.githubusercontent.com/clhenrick/4ebb009378a9ede30d3db672caeb9ff5/raw/bda4918592ff5e089ee4deb6650c4e5d70adb994/basemap_layers.json',
    function (basemapTopoJson) {
        const landArea = topojson.merge(
            basemapTopoJson,
            basemapTopoJson.objects['county_boundaries'].geometries
        );
        const places = topojson.feature(
            basemapTopoJson,
            basemapTopoJson.objects.osm_cities_towns
        );

        // map cropping / bounding box
        const mapFrameSpec = () => {
            const spec = {
                width: 334,
                height: 432,
                upperLeft: [403, 561],
            };

            spec.bottomRight = [
                spec.upperLeft[0] + spec.width,
                spec.upperLeft[1] + spec.height,
            ];
            return spec;
        };

        // longitude, latitude for map frame / bounding box

        const mapFrameGeoJSON = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: [
                    [-122.539643, 38.190853],
                    [-121.691283, 37.413678]]
            }
        };

        const projection = d3
            .geoConicConformal()
            .parallels([37 + 4 / 60, 38 + 26 / 60])
            .rotate([120 + 30 / 60], 0)
            .fitSize([width, height], mapFrameGeoJSON);

        const mapFrameCoords = [
            projection.invert(mapFrameSpec().upperLeft),
            projection.invert(mapFrameSpec().bottomRight),
        ];

        const zoom = s => {
            s.call(
                d3
                    .zoom()
                    .on('zoom', () => {
                        s.select('#map-layers').attr('transform', d3.event.transform);
                        s.selectAll('.bubble').attr('r', bubbleSize / d3.event.transform.k);
                        s.selectAll('.place-label').style('font', `${labelSize / d3.event.transform.k}px sans-serif`);
                        s.selectAll('.places').attr('r', markerSize / d3.event.transform.k);
                    })
                    .scaleExtent([1, 18])
                    .translateExtent([
                        [0, 0],
                        [width, height],
                    ])
            );
        }

        const path = d3.geoPath(projection);


        d3.csv("oxygen.csv")
            .row(r => ({
                id: r['Station_Number'],
                lat: +r['Lat'],
                long: +r['Lng'],
                oxygen: +r['Oxygen'],
                year: +r['year'],
                month: +r['month'],
                date: new Date(+r['year'], +r['month'])
            }))
            .get((error, rows) => {

                const maxDate = new Date(Math.max.apply(null, rows.map(r => r.date)));
                const minDate = new Date(Math.min.apply(null, rows.map(r => r.date)));

                const startDate = minDate;

                const maxOxygen = Math.max(...rows.map(m => m.oxygen));
                const minOxygen = Math.min(...rows.map(m => m.oxygen));

                /* ==================================================== */
                /*                          MAP                         */
                /* ==================================================== */


                // construct svg
                const mapSvg = d3
                    .select('#map')
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height)
                    .call(zoom);

                // map layer group
                const g = mapSvg.append('g').attr('id', 'map-layers');

                // background
                g.append('rect')
                    .attr('width', width)
                    .attr('height', height)
                    .attr('x', 0)
                    .attr('y', 0)
                    .attr('fill', greys[1]);

                // land
                const land = g
                    .append('g')
                    .attr('id', 'land')
                    .append('path')
                    .datum(landArea)
                    .attr('fill', '#fff')
                    .attr('stroke-width', 0.25)
                    .attr('stroke', greys[3])
                    .attr('stroke-line-join', 'round')
                    .attr('d', path);

                // places
                g.append('g')
                    .attr('id', 'places')
                    .selectAll('.place')
                    .data(places.features)
                    .enter()
                    .append('circle')
                    .classed('places', true)
                    .attr('cx', d => path.centroid(d)[0])
                    .attr('cy', d => path.centroid(d)[1])
                    .attr('r', markerSize)
                    .attr('fill', 'white')
                    .attr('stroke', greys[5])
                    .attr('stoke-width', 0.5);

                // labels group
                const labelsGroup = g.append('g').attr('id', 'labels');

                // labels for places
                labelsGroup
                    .append('g')
                    .attr('id', 'place-labels')
                    .selectAll('.place-label')
                    .data(places.features)
                    .enter()
                    .append('text')
                    .classed('place-label', true)
                    .attr('x', d => path.centroid(d)[0])
                    .attr('y', d => path.centroid(d)[1] - textOffset.y)
                    .attr('text-anchor', 'end')
                    .attr('fill', greys[7])
                    .style('font', `${labelSize}px sans-serif`)
                    .text(d => d.properties.name);


                /* ==================================================== */
                /*                        TOOLTIP                      */
                /* ==================================================== */


                const Tooltip = d3
                    .select('body')
                    .append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('visibility', 'hidden')
                    .style('background-color', 'white')
                    .style('border', 'solid')
                    .style('border-width', '2px')
                    .style('border-radius', '5px')
                    .style('padding', '5px');

                // tooltip hover function
                const mouseover = d => {
                    Tooltip.style('visibility', 'visible');
                };

                const mouseleave = d => {
                    Tooltip.style('visibility', 'hidden');
                };

                const mousemove = d => {
                    Tooltip.html(
                        `Station  ${Math.floor(d.id)} <br>
                        Oxygen: ${d.oxygen}`
                    )
                        .style('left', `${d3.event.pageX + 10}px`)
                        .style('top', `${d3.event.pageY + 2}px`);
                };


                /* ==================================================== */
                /*                        BUBBLES                       */
                /* ==================================================== */

                const updateBubbles = date => {
                    let markers = rows.filter(r => compareDates(r.date, date));

                    g.selectAll(".bubble").remove();

                    g.selectAll('myCircles')
                        .data(markers)
                        .enter()
                        .append('circle')
                        .attr('cx', d => projection([d.long, d.lat])[0])
                        .attr('cy', d => projection([d.long, d.lat])[1])
                        .attr('r', bubbleSize)
                        .attr('class', 'bubble')
                        .style('fill', d => getColor(d.oxygen, minOxygen, maxOxygen))
                        .attr('fill-opacity', 0.9)
                        .on('mouseover', mouseover)
                        .on('mousemove', mousemove)
                        .on('mouseleave', mouseleave);
                }

                updateBubbles(startDate);


                /* ==================================================== */
                /*                        SLIDER                        */
                /* ==================================================== */

                formatDate = d3.timeFormat("%b %y");

                const sliderSvg = d3
                    .select("#slider")
                    .append('svg')
                    .attr('width', width)
                    .attr('height', 60);

                // scale function
                const x = d3.scaleTime()
                    .domain([minDate, maxDate])
                    .range([0, width - margin.left - margin.right])
                    .clamp(true);

                // initial value
                const startValue = x(startDate);
                startingValue = startDate;

                const slider = sliderSvg.append("g")
                    .attr("class", "slider")
                    .attr("transform", `translate(${margin.left}, ${40})`);

                slider.append("line")
                    .attr("class", "track")
                    .attr("x1", x.range()[0])
                    .attr("x2", x.range()[1])
                    .select(function () { return this.parentNode.appendChild(this.cloneNode(true)); })
                    .attr("class", "track-inset")
                    .select(function () { return this.parentNode.appendChild(this.cloneNode(true)); })
                    .attr("class", "track-overlay")
                    .call(d3.drag()
                        .on("start.interrupt", () => slider.interrupt())
                        .on("start drag", () => updateData(x.invert(d3.event.x))));

                slider.insert("g", ".track-overlay")
                    .attr("class", "ticks")
                    .attr("transform", `translate(0, ${18})`)
                    .selectAll("text")
                    .data(x.ticks(10))
                    .enter().append("text")
                    .attr("x", x)
                    .attr("text-anchor", "middle")
                    .text(d => formatDate(d));

                const handle = slider.insert("circle", ".track-overlay")
                    .attr("class", "handle")
                    .attr("r", 10);

                const updateData = h => {
                    handle.attr('cx', x(h));
                    console.log(formatDate(h));
                    updateBubbles(h);
                    // set selected values in picker elements
                    d3.select('#yearSelect').property('value', h.getFullYear());
                    d3.select('#monthSelect').property('value', h.getMonth() + 1);
                };


                /* ==================================================== */
                /*                     TIME-PICKER                      */
                /* ==================================================== */

                const years = [...new Set(rows.map(d => d.year))];
                const months = [... new Set(rows.map(d => d.month))];

                const onSelectChange = () => {
                    selectedYear = d3.select('#yearSelect').property('value');
                    selectedMonth = d3.select('#monthSelect').property('value');
                    selectedTime = new Date(selectedYear, selectedMonth - 1); //TODO why is this 1 month off?
                    updateData(selectedTime);
                }

                const monthPicker = d3.select('#timePicker')
                    .append('select')
                    .attr('class', 'select')
                    .attr('id', 'monthSelect')
                    .on('change', onSelectChange);

                const monthOptions = monthPicker
                    .selectAll('option')
                    .data(months).enter()
                    .append('option')
                    .text((d) => d);

                const yearPicker = d3.select("#timePicker")
                    .append('select')
                    .attr('class', 'select')
                    .attr('id', 'yearSelect')
                    .on('change', onSelectChange);

                const yearOptions = yearPicker
                    .selectAll('option')
                    .data(years).enter()
                    .append('option')
                    .text((d) => d);

            });

    }
);
