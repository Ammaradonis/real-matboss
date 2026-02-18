import { limitPointCloud, scoreByState } from './map-core.js';

async function libs() {
  const d3 = await import('https://cdn.jsdelivr.net/npm/d3@7/+esm');
  const topojson = await import('https://cdn.jsdelivr.net/npm/topojson-client@3/+esm');
  return { d3, topojson };
}

export async function renderUSCoverage(svgSelector, stateCoverage) {
  const svgNode = document.querySelector(svgSelector);
  if (!svgNode) return;

  const { d3, topojson } = await libs();
  const width = svgNode.clientWidth || 900;
  const height = svgNode.clientHeight || 320;

  const svg = d3.select(svgNode).attr('viewBox', `0 0 ${width} ${height}`);
  svg.selectAll('*').remove();

  const response = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
  const us = await response.json();
  const states = topojson.feature(us, us.objects.states);

  const coverage = scoreByState(stateCoverage);
  const max = d3.max(stateCoverage, (d) => d.count) || 1;
  const color = d3.scaleLinear().domain([0, max]).range(['#122131', '#4fd9ff']);

  const projection = d3.geoAlbersUsa().fitSize([width, height], states);
  const path = d3.geoPath(projection);

  const nameLookup = new Map([
    ['01', 'Alabama'], ['02', 'Alaska'], ['04', 'Arizona'], ['05', 'Arkansas'], ['06', 'California'],
    ['08', 'Colorado'], ['09', 'Connecticut'], ['10', 'Delaware'], ['11', 'District of Columbia'], ['12', 'Florida'],
    ['13', 'Georgia'], ['15', 'Hawaii'], ['16', 'Idaho'], ['17', 'Illinois'], ['18', 'Indiana'], ['19', 'Iowa'],
    ['20', 'Kansas'], ['21', 'Kentucky'], ['22', 'Louisiana'], ['23', 'Maine'], ['24', 'Maryland'], ['25', 'Massachusetts'],
    ['26', 'Michigan'], ['27', 'Minnesota'], ['28', 'Mississippi'], ['29', 'Missouri'], ['30', 'Montana'], ['31', 'Nebraska'],
    ['32', 'Nevada'], ['33', 'New Hampshire'], ['34', 'New Jersey'], ['35', 'New Mexico'], ['36', 'New York'],
    ['37', 'North Carolina'], ['38', 'North Dakota'], ['39', 'Ohio'], ['40', 'Oklahoma'], ['41', 'Oregon'], ['42', 'Pennsylvania'],
    ['44', 'Rhode Island'], ['45', 'South Carolina'], ['46', 'South Dakota'], ['47', 'Tennessee'], ['48', 'Texas'],
    ['49', 'Utah'], ['50', 'Vermont'], ['51', 'Virginia'], ['53', 'Washington'], ['54', 'West Virginia'],
    ['55', 'Wisconsin'], ['56', 'Wyoming'], ['72', 'Puerto Rico'],
  ]);

  svg
    .append('g')
    .selectAll('path')
    .data(states.features)
    .join('path')
    .attr('d', path)
    .attr('fill', (d) => {
      const stateName = nameLookup.get(d.id.toString().padStart(2, '0'));
      return color(coverage.get(stateName) || 0);
    })
    .attr('stroke', '#101923')
    .attr('stroke-width', 0.85)
    .append('title')
    .text((d) => {
      const stateName = nameLookup.get(d.id.toString().padStart(2, '0')) || 'Unknown';
      return `${stateName}: ${coverage.get(stateName) || 0} counties`; 
    });
}

export async function renderCountyCluster(svgSelector, points) {
  const svgNode = document.querySelector(svgSelector);
  if (!svgNode) return;

  const { d3 } = await libs();
  const width = svgNode.clientWidth || 900;
  const height = svgNode.clientHeight || 320;

  const svg = d3.select(svgNode).attr('viewBox', `0 0 ${width} ${height}`);
  svg.selectAll('*').remove();

  const x = d3.scaleLinear().domain([-170, -65]).range([20, width - 20]);
  const y = d3.scaleLinear().domain([15, 72]).range([height - 12, 10]);

  svg
    .append('g')
    .selectAll('circle')
    .data(limitPointCloud(points, 1200))
    .join('circle')
    .attr('cx', (d) => x(d.lon))
    .attr('cy', (d) => y(d.lat))
    .attr('r', 1.5)
    .attr('fill', (d, i) => (i % 11 === 0 ? '#ff5c70' : '#46d889'))
    .attr('opacity', 0.72)
    .append('title')
    .text((d) => `${d.county}, ${d.state}`);
}
