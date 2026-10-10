const fs = require('fs');
const lines = fs.readFileSync('C:/Users/norma/.gemini/antigravity/brain/9deacb3f-f28f-44b9-8588-13f74ee65d60/.system_generated/logs/transcript_full.jsonl','utf8').split('\\n').reverse();
for(let line of lines) {
  if(!line) continue;
  try {
    const j = JSON.parse(line);
    if(j.tool_calls && j.tool_calls.length > 0) {
      for (let tc of j.tool_calls) {
        if(tc.name === 'default_api:write_to_file' || tc.function === 'default_api:write_to_file' || tc.tool_name === 'default_api:write_to_file' || (tc.function && tc.function.name === 'default_api:write_to_file')) {
          const args = tc.arguments || tc.function.arguments || tc.tool_args;
          let parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
          if(parsedArgs.TargetFile && parsedArgs.TargetFile.endsWith('FloorPage.jsx')) {
            fs.writeFileSync('frontend/src/pages/FloorPage.jsx', parsedArgs.CodeContent, 'utf8');
            console.log('Restored UI successfully.');
            process.exit(0);
          }
        }
      }
    }
  } catch(e) {}
}
