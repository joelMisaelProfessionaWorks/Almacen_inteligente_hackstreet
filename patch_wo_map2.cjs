const fs = require('fs');

let f = fs.readFileSync('frontend/src/pages/WorkOrderPage.jsx', 'utf8');

if (!f.includes('LocationsMap')) {
    // Add import
    f = f.replace(
        "import { PageHeader, HelpBox, Card, Empty, Spinner, Badge, btnPrimary } from '../components/ui';",
        "import { PageHeader, HelpBox, Card, Empty, Spinner, Badge, btnPrimary } from '../components/ui';\nimport LocationsMap from './LocationsMap';"
    );

    // Place it inside the order detail logic, or below the Header
    // The user wants it "Todo esto en la pantalla dentro de ordenes, de forma en que al momento de registrar una pieza faltante, a un lado en el mapa generado se muestre donde y que pieza se puede conmprar"
    // Let's put it below the "HelpBox"
    f = f.replace(
        "</HelpBox>",
        "</HelpBox>\n        <LocationsMap />"
    );

    fs.writeFileSync('frontend/src/pages/WorkOrderPage.jsx', f, 'utf8');
    console.log('WorkOrderPage updated with LocationsMap');
}
