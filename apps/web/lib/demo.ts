export const featuredOffers = [
  { id: 1, title: 'Wordplay', provider: 'Lootably', reward: '1,200', category: 'Games', badge: 'HOT', art: 'W' },
  { id: 2, title: 'Grandwin', provider: 'Lootably', reward: '2,750', category: 'Signups', badge: 'NEW', art: 'G' },
  { id: 3, title: 'Crypto Wallet', provider: 'AdGem', reward: '4,600', category: 'Apps', badge: 'TOP', art: 'C' },
  { id: 4, title: 'Play & Earn', provider: 'Lootably', reward: '1,750', category: 'Games', badge: 'HOT', art: 'P' }
];

export const allOffers = [
  ...featuredOffers,
  { id: 5, title: 'Reward Zone', provider: 'CPX', reward: '950', category: 'Surveys', badge: 'SURVEY', art: 'R' },
  { id: 6, title: 'World of Battle', provider: 'AdGem', reward: '3,400', category: 'Games', badge: 'GAME', art: 'B' },
  { id: 7, title: 'Movie Club', provider: 'Lootably', reward: '800', category: 'Videos', badge: 'VIDEO', art: 'M' },
  { id: 8, title: 'Daily App', provider: 'AdGem', reward: '1,100', category: 'Apps', badge: 'APP', art: 'A' }
];

export const tasks = [
  { id: 1, title: 'Join Telegram Channel', category: 'Social', reward: 500, status: 'Available', quota: '124 / 500' },
  { id: 2, title: 'Follow official account', category: 'Social', reward: 350, status: 'Available', quota: '216 / 500' },
  { id: 3, title: 'Complete profile review', category: 'Profile', reward: 800, status: 'In Review', quota: '88 / 250' },
  { id: 4, title: 'Share platform post', category: 'Social', reward: 600, status: 'Available', quota: '72 / 300' }
];

export const paymentMethods = [
  'Airtm','Binance','FaucetPay','Etisalat Cash','InstaPay','Vodafone Cash','Wise','Litecoin'
];
