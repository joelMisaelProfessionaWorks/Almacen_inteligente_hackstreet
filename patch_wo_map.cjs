const fs = require('fs');

let f = fs.readFileSync('frontend/src/pages/WorkOrderPage.jsx', 'utf8');

if (!f.includes('LocationsMap')) {
    // Add import
    f = f.replace(
        "import { HelpBox } from '../components/HelpBox';",
        "import { HelpBox } from '../components/HelpBox';\nimport LocationsMap from './LocationsMap';"
    );

    // Place it below the pending orders header or side-by-side
    // Let's just put it below the HelpBox
    f = f.replace(
        "</HelpBox>",
        "</HelpBox>\n      <LocationsMap />"
    );

    fs.writeFileSync('frontend/src/pages/WorkOrderPage.jsx', f, 'utf8');
    console.log('WorkOrderPage updated with LocationsMap');
}
