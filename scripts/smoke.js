const { generateBotMessage, bots } = require('../server/bots');

console.log('Loaded bots:', bots.length);
const sample = Array.from({ length: 5 }, () => generateBotMessage(Math.random() > 0.5));
console.table(sample.map(({ botName, category, content }) => ({ botName, category, content })));
