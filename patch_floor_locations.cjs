const fs = require('fs');

let f = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

const oldLocationsDef = 'const mainLocations = useMemo(() => locations.filter((l) => l.location_id < 1000000), [locations]);';
const newLocationsDef = `const mainLocations = useMemo(() => {
    return locations
      .filter((l) => l.location_id < 1000000)
      .sort((a, b) => {
        const stockA = inventory.filter(i => i.location_id === a.location_id).reduce((sum, i) => sum + i.on_hand, 0);
        const stockB = inventory.filter(i => i.location_id === b.location_id).reduce((sum, i) => sum + i.on_hand, 0);
        return stockB - stockA; // Descending, highest stock first
      });
  }, [locations, inventory]);`;

if (f.includes(oldLocationsDef)) {
    f = f.replace(oldLocationsDef, newLocationsDef);
    
    const oldOption = '<option key={l.location_id} value={l.location_id}>{l.code} — {l.name}</option>';
    const newOption = '<option key={l.location_id} value={l.location_id}>{l.code} — {l.name} ({inventory.filter(i => i.location_id === l.location_id).reduce((sum, i) => sum + i.on_hand, 0)} piezas)</option>';
    
    // We only want to replace the first occurrence (which is the source location)
    // The second occurrence is the destination location (we don't want to show stock there, but it's fine if we do).
    f = f.replaceAll(oldOption, newOption);
    
    fs.writeFileSync('frontend/src/pages/FloorPage.jsx', f, 'utf8');
    console.log('FloorPage updated successfully!');
} else {
    console.log('Could not find oldLocationsDef');
}
