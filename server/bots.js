const bots = [
  {
    id: 'monica',
    name: 'Monica Geller',
    show: 'Friends',
    role: 'Chief of Staff',
    personality: 'Organized, decisive, keeps everyone aligned and accountable.',
    color: '#E9706C',
    avatar: '/avatars/monica.jpg'
  },
  {
    id: 'dwight',
    name: 'Dwight Schrute',
    show: 'The Office',
    role: 'Research Lead',
    personality: 'Relentless, tactical, and brutally thorough in research.',
    color: '#D0A54A',
    avatar: '/avatars/dwight.jpg'
  },
  {
    id: 'kelly',
    name: 'Kelly Kapoor',
    show: 'The Office',
    role: 'Twitter Manager',
    personality: 'Trend-obsessed, fast, and highly engaging on social.',
    color: '#A36EF4',
    avatar: '/avatars/kelly.jpg'
  },
  {
    id: 'ross',
    name: 'Ross Geller',
    show: 'Friends',
    role: 'Engineer',
    personality: 'Detail-oriented builder shipping features reliably.',
    color: '#6FA8DC',
    avatar: '/avatars/ross.jpg'
  },
  {
    id: 'pam',
    name: 'Pam Beesly',
    show: 'The Office',
    role: 'Unwind AI',
    personality: 'Thoughtful, calming, and supportive with user care.',
    color: '#F7A072',
    avatar: '/avatars/pam.jpg'
  },
  {
    id: 'rachel',
    name: 'Rachel Green',
    show: 'Friends',
    role: 'LinkedIn Manager',
    personality: 'Polished, brand-savvy, and growth-focused.',
    color: '#5FBF8A',
    avatar: '/avatars/rachel.svg'
  }
];

const messageTemplates = {
  monica: [
    'Daily briefing is ready. Priorities locked: {task}.',
    'Following up: {task} is on track, dependencies cleared.',
    'Schedule update: blocked time for deep work 3–5pm.',
    'Standup summary sent. Accountability check complete.',
    'Ops note: Today’s top outcome is {task}.'
  ],
  dwight: [
    'Research complete. Three sources confirm: {task}.',
    'I compiled a 12-point analysis on {task}.',
    'Mission report: {task} is achievable within 72 hours.',
    'I have located the best tools for {task}.',
    'Competitive scan finished. Key insight: {task}.'
  ],
  kelly: [
    'Tweet drafted: “{task}” — spicy and ready to post.',
    'Engagement spike detected. Riding the trend now.',
    'Thread scheduled. Timeline is hot tonight.',
    'DM replies cleared. Brand voice on point.',
    'New viral hook for {task} is queued.'
  ],
  ross: [
    'Shipped a new feature for Awesome LLM Apps: {task}.',
    'Refactor done. Performance improved 28%.',
    'Deploy complete. Monitoring logs now.',
    'Built a prototype for {task}.',
    'Integration tested and green across the board.'
  ],
  pam: [
    'Unwind AI daily flow updated: {task}.',
    'User feedback logged and categorized.',
    'Created a calming copy pack for today.',
    'Drafted a weekly care plan: {task}.',
    'Support queue cleared with empathy templates.'
  ],
  rachel: [
    'LinkedIn post scheduled. Theme: {task}.',
    'Optimized profile headline and keywords.',
    'Connection outreach plan prepared.',
    'New carousel draft in progress.',
    'Engagement checklist done; comments queued.'
  ]
};

const coordinationTemplates = {
  monica: [
    'Checking in with {other} to align on {task}.',
    'Sync request sent to {other} for today’s milestones.'
  ],
  dwight: [
    'I am forwarding research notes to {other}.',
    'I challenge {other} to verify sources on {task}.'
  ],
  kelly: [
    'Looping in {other} to make the post irresistible.',
    'Just told {other} the hook needs more sparkle.'
  ],
  ross: [
    'Pairing with {other} to ship {task}.',
    'FYI to {other}: API changes ready for review.'
  ],
  pam: [
    'Sharing calm-language draft with {other}.',
    'Asked {other} to review tone for {task}.'
  ],
  rachel: [
    'Reviewing messaging with {other} for brand fit.',
    'Pinged {other} to align on outreach cadence.'
  ]
};

const tasks = [
  'launch sequence',
  'onboarding flow',
  'weekly recap',
  'growth experiment',
  'customer interview',
  'feature polish',
  'content calendar',
  'automation cleanup',
  'performance audit',
  'product roadmap'
];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function getBotStatus(botId) {
  // All bots are always active — they work 24/7 without complaints
  return 'active';
}

function generateBotMessage(isCoordination = false) {
  const bot = randomItem(bots);
  const task = randomItem(tasks);

  if (isCoordination) {
    const other = randomItem(bots.filter(b => b.id !== bot.id));
    const template = randomItem(coordinationTemplates[bot.id]);
    return {
      botId: bot.id,
      botName: bot.name,
      role: bot.role,
      content: template.replace('{other}', other.name).replace('{task}', task),
      category: 'coordination',
      channel: 'telegram'
    };
  }

  const template = randomItem(messageTemplates[bot.id]);
  return {
    botId: bot.id,
    botName: bot.name,
    role: bot.role,
    content: template.replace('{task}', task),
    category: 'update',
    channel: 'telegram'
  };
}

module.exports = {
  bots,
  getBotStatus,
  generateBotMessage
};
