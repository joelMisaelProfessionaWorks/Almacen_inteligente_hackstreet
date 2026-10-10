const fs = require('fs');
let c = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');
c = c.replace(
  '<HelpBox>{ACTIONS.find((a) => a.id === action).desc}</HelpBox>',
  '<p className="text-sm text-slate-500 mb-6 text-center">{ACTIONS.find((a) => a.id === action).desc}</p>'
);
fs.writeFileSync('frontend/src/pages/FloorPage.jsx', c, 'utf8');
