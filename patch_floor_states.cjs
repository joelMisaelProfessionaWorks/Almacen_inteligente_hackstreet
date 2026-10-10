const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

if (!c.includes('const [inventory')) {
  c = c.replace(
    "const [locations, setLocations] = useState([]);",
    "const [locations, setLocations] = useState([]);\n  const [inventory, setInventory] = useState([]);\n  const [allParts, setAllParts] = useState([]);"
  );
}

if (!c.includes('setInventory(')) {
  c = c.replace(
    "fetchApi('/locations')",
    "fetchApi('/inventory').then(d => setInventory(d.items || []));\n    fetchApi('/parts').then(d => setAllParts(d.items || []));\n    fetchApi('/locations')"
  );
}

fs.writeFileSync('frontend/src/pages/FloorPage.jsx', c, 'utf8');
console.log('Fixed states.');
