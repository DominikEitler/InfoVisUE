const mapHeight = Math.min(window.innerHeight - 250, 700);
const sliderWidth = Math.min(window.innerWidth - 200, 1500);
const mapWidth = 750;
const margin = { right: 50, left: 50 };

const labelSize = 9;
const markerSize = 1.5;
const bubbleSize = 10;
let lastZoom = 1

const boundaryFilter = (a, b) => a !== b;
const textOffset = { x: 0, y: 3 };
const greys = d3.schemeGreys[9];

const compareDates = (date1, date2) => date1.getMonth() == date2.getMonth() && date1.getYear() == date2.getYear();

// import map data
d3.json(
    // map data based on OpenStreetMap and the U.S. Census Bureau, uses the "California State Plane III feet" projection (EPSG: 2227)

    // Parts of this code regarding the map of the San Francisco Bay Area are based
    // on a Observable Notebook by Chris Henrick: https://observablehq.com/@clhenrick/sf-bay-area-basemap-cropped, last accessed 12.12.2020


    'https://gist.githubusercontent.com/clhenrick/4ebb009378a9ede30d3db672caeb9ff5/raw/bda4918592ff5e089ee4deb6650c4e5d70adb994/basemap_layers.json',
    function (basemapTopoJson) {
        // merge each county to create one contiguous land area
        const landArea = topojson.merge(
            basemapTopoJson,
            basemapTopoJson.objects['county_boundaries'].geometries
        );

        // extract the geographical data for cities from the dataset
        const places = topojson.feature(
            basemapTopoJson,
            basemapTopoJson.objects.osm_cities_towns
        );

        // crop the map and create a bounding box
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
            .fitSize([mapWidth, mapHeight], mapFrameGeoJSON);


        // function which is called on zoom events to transform the displayed map area
        const zoom = s => {
            s.call(
                d3.zoom()
                    .on('zoom', () => {
                        lastZoom = d3.event.transform.k
                        s.select('#map-layers').attr('transform', d3.event.transform);
                        s.selectAll('.bubble').attr('r', bubbleSize / lastZoom);
                        s.selectAll('.place-label').style('font', `${labelSize / lastZoom}px sans-serif`);
                        s.selectAll('.places').attr('r', markerSize / lastZoom);
                    })
                    .scaleExtent([1, 18])
                    .translateExtent([
                        [0, 0],
                        [mapWidth, mapHeight],
                    ])
            );
        }

        const path = d3.geoPath(projection);

        // load data
        d3.csv("oxygen.csv")
            .row(r => ({
                id: r['Station_Number'],
                name: r['Station_Name'],
                lat: +r['Lat'],
                long: +r['Lng'],
                oxygen: +r['Oxygen'],
                year: +r['year'],
                month: +r['month'],
                date: new Date(+r['year'], +r['month'] - 1)
            }))
            .get((error, rows) => {
                // general values from data

                const maxDate = new Date(Math.max.apply(null, rows.map(r => r.date)));
                const minDate = new Date(Math.min.apply(null, rows.map(r => r.date)));

                const startDate = maxDate;

                const years = [...new Set(rows.map(d => d.year))];
                const months = [... new Set(rows.map(d => d.month))];

                const maxOxygen = Math.max(...rows.map(m => m.oxygen));
                const minOxygen = Math.min(...rows.map(m => m.oxygen));

                const bubbleColor = d3.scaleSequential(d3.interpolateBlues)
                    .domain([minOxygen, maxOxygen]);

                /* ==================================================== */
                /*                          MAP                         */
                /* ==================================================== */

                // construct svg
                const mapSvg = d3
                    .select('#map')
                    .append('svg')
                    .attr('width', mapWidth)
                    .attr('height', mapHeight)
                    .call(zoom);

                // map layer group
                const g = mapSvg.append('g').attr('id', 'map-layers');

                // background
                g.append('rect')
                    .attr('width', mapWidth)
                    .attr('height', mapHeight)
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
                    .attr('x', d => path.centroid(d)[0] - textOffset.x)
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
                        `Station  ${Math.floor(d.id)} ${d.name !== '' ? '- ' + d.name : ''} <br>
                        Oxygen: ${d.oxygen} mg/l`
                    )
                        .style('left', `${d3.event.pageX + 10}px`)
                        .style('top', `${d3.event.pageY + 2}px`);
                };


                /* ==================================================== */
                /*                        BUBBLES                       */
                /* ==================================================== */

                // function to update the displayed bubbles on the map
                // extracts values from the data and maps each value to the respective color saturation
                const updateBubbles = date => {
                    const markers = rows.filter(r => compareDates(r.date, date));

                    g.selectAll(".bubble").remove();

                    g.selectAll('myCircles')
                        .data(markers)
                        .enter()
                        .append('circle')
                        .attr('cx', d => projection([d.long, d.lat])[0])
                        .attr('cy', d => projection([d.long, d.lat])[1])
                        .attr('r', bubbleSize / lastZoom)
                        .attr('class', 'bubble')
                        .style('fill', d => bubbleColor(d.oxygen))
                        .attr('fill-opacity', 0.9)
                        .on('mouseover', mouseover)
                        .on('mousemove', mousemove)
                        .on('mouseleave', mouseleave);
                }


                /* ==================================================== */
                /*                        SLIDER                        */
                /* ==================================================== */

                // Parts of the code regarding the slider are based on the following snippet: 
                // https://www.d3-graph-gallery.com/graph/density_slider.html

                // time format used for the ticks on the slider
                const formatDate = d3.timeFormat("%b %y");

                const sliderSvg = d3
                    .select("#slider")
                    .append('svg')
                    .attr('width', sliderWidth)
                    .attr('height', 60);

                // scale function
                const x = d3.scaleTime()
                    .domain([minDate, maxDate])
                    .range([0, sliderWidth - margin.left - margin.right])
                    .clamp(true);

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
                    .data(x.ticks(20))
                    .enter().append("text")
                    .attr("x", x)
                    .attr("text-anchor", "middle")
                    .text(d => formatDate(d));

                const handle = slider.insert("circle", ".track-overlay")
                    .attr("class", "handle")
                    .attr("r", 10);

                const updateData = h => {
                    handle.attr('cx', x(h));
                    updateBubbles(h);
                    // set selected values in picker elements
                    d3.select('#yearSelect').property('value', h.getFullYear());
                    d3.select('#monthSelect').property('value', h.getMonth() + 1);
                };


                /* ==================================================== */
                /*                     TIME-PICKER                      */
                /* ==================================================== */

                // the selection of the date should update the bubbles and and the slider position
                const onSelectChange = () => {
                    selectedYear = d3.select('#yearSelect').property('value');
                    selectedMonth = d3.select('#monthSelect').property('value');
                    selectedTime = new Date(selectedYear, selectedMonth);
                    updateData(selectedTime);
                }

                // month picker
                const monthLabel = d3.select('#timePicker')
                    .append('text')
                    .attr('class', 'label')
                    .text("Month:")

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

                // year picker
                const yearLabel = d3.select('#timePicker')
                    .append('text')
                    .attr('class', 'label')
                    .text("Year:")

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

                // set initial values
                updateData(startDate);

            });

    }
);
