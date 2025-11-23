const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
if (!fs.existsSync(envPath)) {
    console.log('NO_ENV_FILE');
    process.exit(0);
}

const content = fs.readFileSync(envPath, 'utf8');
const hasDbUrl = content.includes('DATABASE_URL=');
const hasServiceKey = content.includes('SERVICE_KEY') || content.includes('SERVICE_ROLE');
const supabaseUrlMatch = content.match(/VITE_SUPABASE_URL=(.+)/);
const supabaseUrl = supabaseUrlMatch ? supabaseUrlMatch[1].trim() : null;

console.log(JSON.stringify({
    hasDbUrl,
    hasServiceKey,
    supabaseUrl
}));
