const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { execSync } = require('child_process');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
    console.log('\n🚀 Lafter.org Setup Wizard');
    console.log('==========================\n');
    console.log('This script will configure your environment and deploy the database schema.\n');

    // 1. Get Credentials
    const projectUrl = await question('1. Enter Supabase Project URL: ');
    const anonKey = await question('2. Enter Supabase Anon Key: ');
    const dbUrl = await question('3. Enter Database Connection String (URI): ');

    if (!projectUrl || !anonKey || !dbUrl) {
        console.error('\n❌ Error: All fields are required.');
        process.exit(1);
    }

    // 2. Update .env
    console.log('\n📝 Updating .env file...');
    const envPath = path.join(__dirname, '../.env');
    let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

    // Replace or append
    const updateEnv = (key, value) => {
        const regex = new RegExp(`^${key}=.*`, 'm');
        if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${key}=${value}`);
        } else {
            envContent += `\n${key}=${value}`;
        }
    };

    updateEnv('VITE_SUPABASE_URL', projectUrl);
    updateEnv('VITE_SUPABASE_ANON_KEY', anonKey);
    // We don't strictly need DATABASE_URL in .env for the app, but good for reference
    // updateEnv('DATABASE_URL', dbUrl); 

    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log('✅ .env updated.');

    // 3. Install pg driver (temporary)
    console.log('\n📦 Installing postgres driver...');
    try {
        execSync('npm install pg --no-save', { stdio: 'ignore' });
    } catch (e) {
        console.error('❌ Failed to install pg driver.');
        process.exit(1);
    }

    // 4. Run Migration
    console.log('\n🐘 Deploying database schema...');
    const { Client } = require('pg');
    const client = new Client({ connectionString: dbUrl });

    try {
        await client.connect();

        const migrationPath = path.join(__dirname, '../migrations/20231123_laugh_clips.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        // Split by statement if needed, but simple exec usually works for multiple statements in pg
        await client.query(sql);

        // 5. Create Storage Bucket (via SQL)
        console.log('🗄️  Creating storage bucket...');
        try {
            await client.query(`
                INSERT INTO storage.buckets (id, name, public)
                VALUES ('laugh-starter-clips', 'laugh-starter-clips', true)
                ON CONFLICT (id) DO NOTHING;
            `);
        } catch (bucketErr) {
            console.warn('⚠️  Could not auto-create bucket via SQL (permissions). You might need to create "laugh-starter-clips" manually in the dashboard.');
        }

        console.log('\n✅ Database deployed successfully!');

    } catch (err) {
        console.error('\n❌ Database deployment failed:', err.message);
        console.log('You may need to run the migration manually via the Supabase Dashboard SQL Editor.');
    } finally {
        await client.end();
        rl.close();
    }
}

main();
