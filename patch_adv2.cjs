const fs = require('fs');

let f = fs.readFileSync('frontend/src/pages/AdvancedDashboardPage.jsx', 'utf8');

f = f.replace(
  'if (loading) return <Spinner />;',
  'if (loading) return <Spinner />;\n  if (!data) return <div className="p-6 text-red-500">Error cargando datos del dashboard. Verifica la conexión con el servidor.</div>;'
);

fs.writeFileSync('frontend/src/pages/AdvancedDashboardPage.jsx', f, 'utf8');
