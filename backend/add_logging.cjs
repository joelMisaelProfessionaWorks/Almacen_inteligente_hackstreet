const fs = require('fs');
let c = fs.readFileSync('src/api/ai.js', 'utf8');
c = c.replace("const ai = new GoogleGenAI", "console.log('Fetching recommendations...'); const ai = new GoogleGenAI");
c = c.replace("const response = await ai.models.generateContent", "console.log('Sending prompt to Gemini...'); const response = await ai.models.generateContent");
c = c.replace("return response.text;", "console.log('Got response from Gemini'); return response.text;");
fs.writeFileSync('src/api/ai.js', c, 'utf8');
