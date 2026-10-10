const fs = require('fs');

let f = fs.readFileSync('frontend/src/pages/FloorPage.jsx', 'utf8');

f = f.replace(
  /\) : \(\s+className=\{inputCls\}\s+value=""\s+onChange=\{\(e\)/g,
  ') : (\n            <select\n              className={inputCls}\n              value=""\n              onChange={(e)'
);

f = f.replace(
  /className=\{inputCls \+ ' mt-1'\} value=\{destId\}/g,
  '<select className={inputCls + \' mt-1\'} value={destId}'
);

fs.writeFileSync('frontend/src/pages/FloorPage.jsx', f, 'utf8');
console.log('Fixed');
