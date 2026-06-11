const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '.env');
const content = `MONGO_URI=mongodb://localhost:27017/ep_cyumushyika
PORT=4000
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=30d
`;
fs.writeFileSync(envPath, content, 'utf8');
console.log('.env rewritten without BOM');
console.log('Content:', fs.readFileSync(envPath, 'utf8'));
require('dotenv').config({ path: envPath });
console.log('MONGO_URI =', process.env.MONGO_URI || 'STILL UNDEFINED');
