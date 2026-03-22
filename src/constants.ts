import { BugStory, Tip, Concern, Proposal } from './types';

export const INITIAL_BUGS: BugStory[] = [
  {
    id: '1',
    author: 'Sarah Chen',
    date: 'Oct 24, 2023',
    title: 'The Infinite Token Loophole',
    impact: 'Production Risk',
    mood: 'Terrified 😱',
    tags: ['Critical', 'API Auth'],
    discovery: 'Automated stress test triggered a 401 on the first retry but then allowed unlimited access on the second attempt without credentials.',
    lesson: 'Always verify that state-machine transitions in auth-middleware are atomic. A 0.5s race condition is a lifetime for a bot.',
    reactions: { '❤️': 12 },
    comments: [],
    isAnonymous: false
  },
  {
    id: '2',
    author: 'David Kim',
    isAnonymous: false,
    date: 'Oct 22, 2023',
    title: 'The Floating Logout Button',
    impact: 'Pure Chaos',
    mood: 'Amused 😂',
    tags: ['Funny Bug', 'UI'],
    discovery: 'Manual exploratory testing on a 13-inch Macbook Air. When scrolling halfway, the logout button would detach from the nav and start following the cursor like a persistent ghost.',
    lesson: 'z-index is not a suggestion, it\'s a hierarchy. And beware of fixed positioning within relative containers that have overflow-hidden.',
    reactions: { '❤️': 42 },
    comments: []
  }
];

export const INITIAL_TIPS: Tip[] = [
  {
    id: '1',
    cat: 'API Testing',
    title: 'The Payload Sanity Check',
    desc: 'Always validate your response schema against the documentation before checking data values. This catches contract breaks before they become logic bugs.',
    scenario: 'A microservice updates its JSON keys. Your tests fail on null values instead of identifying the structural change first.',
    author: 'Sarah J.',
    time: '3 days ago'
  },
  {
    id: '2',
    cat: 'Time Management',
    title: 'The 20-Min Rule',
    desc: 'If you can\'t reproduce a bug within 20 minutes, document the steps you *did* take and move to a different task. Reset your perspective.',
    scenario: 'Chasing an intermittent race condition that eats up your entire morning without any captured logs.',
    author: 'David Chen',
    time: '1 week ago'
  },
  {
    id: '3',
    cat: 'Manual Testing',
    title: 'Mindful Exploratory Sessions',
    desc: 'Set a specific \'Persona\' before starting. Instead of just clicking buttons, act as \'The Impatient Executive\' or \'The Power User\'.',
    scenario: 'Finding that navigation items are too small for an older user demographic despite being technically functional.',
    author: 'Maria A.',
    time: 'Yesterday',
    highlight: true
  }
];

export const INITIAL_CONCERNS: Concern[] = [
  {
    id: '1',
    author: 'Anonymous Architect',
    isAnonymous: true,
    date: '2h ago',
    category: 'Workflow Blockers',
    content: 'During the late afternoon peak, the sandbox response times are exceeding 5 seconds per request. This breaks the cognitive \'flow state\' required for complex edge-case testing.',
    status: 'Under Review',
    adminResponse: 'We acknowledge the latency issue. Infra is scaling nodes between 2 PM and 5 PM starting tomorrow. Please monitor and update if focus improves.',
    helpfulCount: 12
  }
];
