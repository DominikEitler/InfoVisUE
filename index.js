const height = window.innerHeight - 50;
const width = window.innerWidth - 200;

const boundaryFilter = (a, b) => a !== b;
const textOffset = { x: 0, y: 3 };
const greys = d3.schemeGreys[9];

const getColor = (oxygen, min, max) => `hsl(240, ${(oxygen - min) / (max - min) * 100}%, 50%)`;

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

        var mapFrameGeoJSON = JSON.parse(
            `{"type":"Feature",
    "geometry":{"type":"LineString",
    "coordinates":[[-122.539643,38.190853],[-121.691283,37.413678]]}}`
        );

        var projection = d3
            .geoConicConformal()
            .parallels([37 + 4 / 60, 38 + 26 / 60])
            .rotate([120 + 30 / 60], 0)
            .fitSize([width, height], mapFrameGeoJSON);

        const mapFrameCoords = [
            projection.invert(mapFrameSpec().upperLeft),
            projection.invert(mapFrameSpec().bottomRight),
        ];

        function zoom(s) {
            s.call(
                d3
                    .zoom()
                    .on('zoom', () =>
                        s.select('#map-layers').attr('transform', d3.event.transform)
                    )
                    .scaleExtent([1, 18])
                    .translateExtent([
                        [0, 0],
                        [width, height],
                    ])
            );
        }

        const path = d3.geoPath(projection);


        d3.csv("oxygen.csv")
            .row(r => ({ id: r['Station_Number'], lat: +r['Lat'], long: +r['Lng'], oxygen: +r['Oxygen'], year: +r['year'], month: +r['month'] }))
            .get((error, rows) => {

                let markers = rows.filter((r) => (r.year === 2000 && r.month === 5));
                const maxOxygen = Math.max(...rows.map(m => m.oxygen));
                const minOxygen = Math.min(...rows.map(m => m.oxygen));

                // construct svg
                var svg = d3
                    .select('#map')
                    .append('svg')
                    .attr('width', width)
                    .attr('height', height)
                    .call(zoom);

                // map layer group
                const g = svg.append('g').attr('id', 'map-layers');

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
                    .attr('cx', (d) => path.centroid(d)[0])
                    .attr('cy', (d) => path.centroid(d)[1])
                    .attr('r', 1.5)
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
                    .attr('x', (d) => path.centroid(d)[0])
                    .attr('y', (d) => path.centroid(d)[1] - textOffset.y)
                    .attr('text-anchor', 'end')
                    .attr('fill', greys[7])
                    .style('font', '7px sans-serif')
                    .text((d) => d.properties.name);

                // tooltip
                var Tooltip = d3
                    .select('#map')
                    .append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('opacity', 1)
                    .style('background-color', 'white')
                    .style('border', 'solid')
                    .style('border-width', '2px')
                    .style('border-radius', '5px')
                    .style('padding', '5px');

                // tooltip hover function
                var mouseover = function (d) {
                    Tooltip.style('opacity', 1);
                };
                var mousemove = function (d) {
                    Tooltip.html(
                        d.id + '<br>' + 'long: ' + d.long + '<br>' + 'lat: ' + d.lat
                    )
                        .style('left', d3.mouse(this)[0] + 10 + 'px')
                        .style('top', d3.mouse(this)[1] + 2 + 'px');
                };
                var mouseleave = function (d) {
                    Tooltip.style('opacity', 0);
                };

                // circles
                g.selectAll('myCircles')
                    .data(markers)
                    .enter()
                    .append('circle')
                    .attr('cx', (d) => projection([d.long, d.lat])[0])
                    .attr('cy', (d) => projection([d.long, d.lat])[1])
                    .attr('r', 10)
                    .style('fill', (d) => getColor(d.oxygen, minOxygen, maxOxygen))
                    .attr('fill-opacity', 0.9)
                    .on('mouseover', mouseover)
                    .on('mousemove', mousemove)
                    .on('mouseleave', mouseleave);

            });

    }
);