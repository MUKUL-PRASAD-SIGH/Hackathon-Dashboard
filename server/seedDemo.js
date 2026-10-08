// Seeds demo accounts and public hackathons for presenting the app.
// Usage: MONGODB_URI=... node seedDemo.js   (or: npm run seed:demo)
// Safe to re-run; refuses to run in production.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const UserMongoDB = require('./models/UserMongoDB');
const Hackathon = require('./models/Hackathon');

const DAY = 24 * 60 * 60 * 1000;
const PASSWORD = 'password123';

const users = [
  { name: 'Demo Hacker', email: 'demo@hack.dev', profile: { skills: ['React', 'Node'], experience: 'Intermediate', isPublic: true } },
  { name: 'Priya Designer', email: 'priya@hack.dev', profile: { skills: ['Figma', 'UI', 'Branding'], experience: 'Expert', github: 'https://github.com/priya', isPublic: true } },
  { name: 'Sam Backend', email: 'sam@hack.dev', profile: { skills: ['Python', 'ML'], experience: 'Intermediate', isPublic: true } },
  { name: 'Private Pat', email: 'pat@hack.dev', profile: { skills: ['Go'], isPublic: false } }
];

const hackathons = (owners) => [
  { name: 'Campus AI Sprint', platform: 'Devpost', owner: 'priya@hack.dev', team: 'Team', inDays: 9, status: 'Planning', isPublicWorld: true, maxParticipants: 4 },
  { name: 'Green Tech Challenge', platform: 'HackerEarth', owner: 'sam@hack.dev', team: 'Team', inDays: 40, status: 'Planning', isPublicWorld: true, maxParticipants: 3 },
  { name: 'Old Devpost Jam', platform: 'Devpost', owner: 'demo@hack.dev', team: 'Team', inDays: -30, status: 'Won' },
  { name: 'Web3 Weekend Jam', platform: 'Topcoder', owner: 'demo@hack.dev', team: 'Solo', inDays: 3, status: 'Participating' }
].map(h => ({
  name: h.name, platform: h.platform, email: h.owner, userId: owners[h.owner], team: h.team,
  date: new Date(Date.now() + h.inDays * DAY), rounds: 2, status: h.status,
  isPublicWorld: !!h.isPublicWorld, maxParticipants: h.maxParticipants || 4
}));

(async () => {
  if (process.env.NODE_ENV === 'production') throw new Error('Refusing to seed demo data in production');
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI);

  const owners = {};
  for (const u of users) {
    let doc = await UserMongoDB.findOne({ email: u.email });
    if (!doc) doc = await UserMongoDB.create({ ...u, password: PASSWORD, emailVerified: true });
    owners[u.email] = doc._id;
  }
  for (const h of hackathons(owners)) {
    if (!(await Hackathon.findOne({ name: h.name, email: h.email }))) await Hackathon.create(h);
  }
  console.log(`Demo data ready. Log in as demo@hack.dev / ${PASSWORD}`);
  await mongoose.disconnect();
})().catch(err => { console.error(err.message); process.exit(1); });
