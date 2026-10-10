const fs = require('fs');

let f = fs.readFileSync('frontend/src/pages/LocationsMap.jsx', 'utf8');

f = f.replace(
  "'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'",
  "'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'"
);

f = f.replace(
  "attribution: '&copy; OpenStreetMap &copy; CARTO'",
  "attribution: '&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors'"
);

fs.writeFileSync('frontend/src/pages/LocationsMap.jsx', f, 'utf8');
console.log('Fixed TileLayer to OpenStreetMap');
