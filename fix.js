const fs = require('fs');
let c = fs.readFileSync('frontend/src/App.jsx', 'utf8');

// Find the block from import fetchApi down to the closing array bracket ];
const regex = /import \{ fetchApi \} from '\.\/api';[\s\S]*?\];/;
const replacement = `import { fetchApi } from './api';

const tabs = [
  { to: '/', label: 'Piso', icon: ScanLine, end: true },
  { to: '/warehouse', label: 'Almacén', icon: Warehouse },
  { to: '/work-orders', label: 'Órdenes', icon: ClipboardList },
  { to: '/kardex', label: 'Kardex', icon: BookOpen },
];`;

c = c.replace(regex, replacement);
fs.writeFileSync('frontend/src/App.jsx', c, 'utf8');
