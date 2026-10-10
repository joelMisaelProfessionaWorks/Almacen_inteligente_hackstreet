const fs = require('fs');

let f = fs.readFileSync('frontend/src/App.jsx', 'utf8');

if (!f.includes('AdvancedDashboardPage')) {
  f = f.replace(
    "import KardexPage from './pages/KardexPage';",
    "import KardexPage from './pages/KardexPage';\nimport AdvancedDashboardPage from './pages/AdvancedDashboardPage';"
  );
  
  f = f.replace(
    "{ to: '/kardex', label: 'Kardex', icon: BookOpen }",
    "{ to: '/kardex', label: 'Kardex', icon: BookOpen },\n    { to: '/advanced', label: 'IA Avanzada', icon: Package }"
  );
  
  f = f.replace(
    "<Route path=\"/kardex\" element={<KardexPage />} />",
    "<Route path=\"/kardex\" element={<KardexPage />} />\n          <Route path=\"/advanced\" element={<AdvancedDashboardPage />} />"
  );
  
  fs.writeFileSync('frontend/src/App.jsx', f, 'utf8');
  console.log('App.jsx updated with AdvancedDashboardPage');
}
