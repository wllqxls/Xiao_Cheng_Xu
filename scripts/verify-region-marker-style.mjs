import fs from 'node:fs';

const source = fs.readFileSync('assets/scripts/cocos/GameBootstrap.ts', 'utf8');

const requiredMarkers = [
  'paintTerritoryShape',
  'paintTerritoryContour',
  'paintSelectedTerritoryRing',
];

const missing = requiredMarkers.filter((marker) => !source.includes(marker));

if (missing.length > 0) {
  console.error(JSON.stringify({ missing }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ requiredMarkers }, null, 2));
