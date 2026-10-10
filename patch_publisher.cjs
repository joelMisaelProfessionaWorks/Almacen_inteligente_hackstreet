const fs = require('fs');

let f = fs.readFileSync('backend/src/kafka/publisher.js', 'utf8');

f = f.replace(
    'topicMessages[event.topic].push({',
    `console.log("PUBLISHING TO", event.topic, ":", JSON.stringify(envelope, null, 2));\n            topicMessages[event.topic].push({`
);

fs.writeFileSync('backend/src/kafka/publisher.js', f, 'utf8');
console.log('Added debugging to publisher');
