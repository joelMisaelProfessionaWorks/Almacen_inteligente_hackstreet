const fs = require('fs');
const lines = fs.readFileSync('C:/Users/norma/.gemini/antigravity/brain/9deacb3f-f28f-44b9-8588-13f74ee65d60/.system_generated/logs/transcript_full.jsonl','utf8').split('\n');
for(let line of lines) {
  if(!line) continue;
  if(line.includes('FloorPage.jsx') && line.includes('CodeContent') && line.includes('mainLocations = useMemo')) {
    try {
      const match = line.match(/"CodeContent":"(.*?)","Description"/);
      if(match) {
        fs.writeFileSync('frontend/src/pages/FloorPage.jsx', JSON.parse('"' + match[1] + '"'), 'utf8');
        console.log('RESTORED!');
        process.exit(0);
      }
    } catch(e) {}
  }
}
console.log('Not found');
