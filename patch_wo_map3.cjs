const fs = require('fs');

let f = fs.readFileSync('frontend/src/pages/WorkOrderPage.jsx', 'utf8');

if (!f.includes('<LocationsMap />')) {
    f = f.replace(
        '<div className="space-y-4">',
        '<LocationsMap />\n        <div className="space-y-4">'
    );
    fs.writeFileSync('frontend/src/pages/WorkOrderPage.jsx', f, 'utf8');
    console.log('WorkOrderPage updated with LocationsMap component');
}
