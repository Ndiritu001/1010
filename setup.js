

'use strict';

const readline = require('readline');
const fs       = require('fs');
const path     = require('path');
const { execSync } = require('child_process');

let mysql;
try {
  mysql = require('mysql2/promise');
} catch {
  console.error('\n❌  mysql2 is not installed. Run:  npm install\n');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

/*helpers*/
function green(s)  { return `\x1b[32m${s}\x1b[0m`; }
function red(s)    { return `\x1b[31m${s}\x1b[0m`; }
function yellow(s) { return `\x1b[33m${s}\x1b[0m`; }
function bold(s)   { return `\x1b[1m${s}\x1b[0m`; }

async function main() {
  console.log('\n' + bold('═══════════════════════════════════════════'));
  console.log(bold('   BRISA MOTORS v3 — MySQL Setup Wizard'));
  console.log(bold('═══════════════════════════════════════════\n'));

  // Check if .env already exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const overwrite = await ask(yellow('⚠️  A .env file already exists. Overwrite it? (y/N): '));
    if (overwrite.trim().toLowerCase() !== 'y') {
      console.log('\nSetup cancelled. Your existing .env was not changed.\n');
      rl.close(); return;
    }
  }

  console.log('Enter your MySQL connection details.\n');

  const host       = (await ask('MySQL host       [localhost]: ')).trim() || 'localhost';
  const port       = (await ask('MySQL port       [3306]: ')).trim() || '3306';
  const rootUser   = (await ask('MySQL root user  [root]: ')).trim() || 'root';

  // Hide password input if possible
  process.stdout.write('MySQL root password [leave blank if none]: ');
  const rootPass   = await new Promise(res => {
    const chunks = [];
    process.stdin.setRawMode?.(true);
    const handler = (chunk) => {
      for (const byte of chunk) {
        if (byte === 13 || byte === 10) { // Enter
          process.stdin.setRawMode?.(false);
          process.stdin.removeListener('data', handler);
          process.stdout.write('\n');
          res(Buffer.concat(chunks).toString());
        } else if (byte === 127) { // Backspace
          if (chunks.length) chunks.pop();
          process.stdout.write('\b \b');
        } else {
          chunks.push(Buffer.from([byte]));
          process.stdout.write('*');
        }
      }
    };
    process.stdin.on('data', handler);
  }).catch(async () => {
    // Fallback if raw mode not available (piped input)
    return (await ask('')).trim();
  });

  const dbName     = (await ask('\nDatabase name    [car_platform]: ')).trim() || 'car_platform';
  const appUser    = (await ask('App DB username  [brisa_app]: ')).trim() || 'brisa_app';

  // Generate a random app DB password
  const crypto = require('crypto');
  const defaultAppPass = crypto.randomBytes(12).toString('base64url');
  const appPassInput = (await ask(`App DB password  [auto: ${defaultAppPass}]: `)).trim();
  const appPass = appPassInput || defaultAppPass;

  const serverPort = (await ask('\nServer port      [5000]: ')).trim() || '5000';
  const jwtSecret  = crypto.randomBytes(32).toString('hex');

  console.log('\n' + bold('Setting up database...') + '\n');

  //Step 1: Connect as root
  let rootConn;
  try {
    rootConn = await mysql.createConnection({
      host, port: parseInt(port), user: rootUser, password: rootPass,
      multipleStatements: true,
    });
    console.log(green('✅  Connected to MySQL as root'));
  } catch (e) {
    console.error(red(`\n❌  Cannot connect to MySQL: ${e.message}`));
    console.error(yellow('\nTroubleshooting:'));
    console.error('  • Make sure MySQL is running:  sudo service mysql start');
    console.error('  • Check your root username and password');
    console.error('  • On MySQL 8+, try: sudo mysql  (no password needed)');
    rl.close(); process.exit(1);
  }

  try {
    //Step 2: Create database 
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(green(`✅  Database '${dbName}' ready`));

    //Step 3: Create app user 
    // Drop user if exists (handles re-runs gracefully)
    try {
      await rootConn.query(`DROP USER IF EXISTS '${appUser}'@'${host}'`);
      await rootConn.query(`DROP USER IF EXISTS '${appUser}'@'localhost'`);
      await rootConn.query(`DROP USER IF EXISTS '${appUser}'@'127.0.0.1'`);
    } catch { /* ignore */ }

    await rootConn.query(`CREATE USER '${appUser}'@'localhost' IDENTIFIED BY '${appPass}'`);
    await rootConn.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${appUser}'@'localhost'`);
    await rootConn.query(`FLUSH PRIVILEGES`);
    console.log(green(`✅  App user '${appUser}' created with permissions on '${dbName}'`));

    //Step 4: Run schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at ${schemaPath}`);
    }
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const appConn = await mysql.createConnection({
      host, port: parseInt(port), user: appUser, password: appPass,
      database: dbName, multipleStatements: true,
    });
    await appConn.query(schema);
    await appConn.end();
    console.log(green('✅  Schema and seed data loaded'));

    // Step 5: Verify tables
    const [tables] = await rootConn.query(`SHOW TABLES FROM \`${dbName}\``);
    console.log(green(`✅  ${tables.length} tables created: `) + tables.map(t => Object.values(t)[0]).join(', '));

  } catch (e) {
    console.error(red(`\n❌  Database setup failed: ${e.message}\n`));
    await rootConn.end();
    rl.close(); process.exit(1);
  }

  await rootConn.end();

  //Step 6: Write .env 
  const envContent = [
    `# Brisa Motors v3 — Environment Configuration`,
    `# Generated by setup-db.js on ${new Date().toLocaleString()}`,
    ``,
    `# Server`,
    `PORT=${serverPort}`,
    `JWT_SECRET=${jwtSecret}`,
    `APP_URL=http://localhost:${serverPort}`,
    ``,
    `# Database`,
    `DB_HOST=${host}`,
    `DB_PORT=${port}`,
    `DB_USER=${appUser}`,
    `DB_PASSWORD=${appPass}`,
    `DB_NAME=${dbName}`,
    ``,
    `# Email (optional — for password reset emails)`,
    `# SMTP_HOST=smtp.gmail.com`,
    `# SMTP_PORT=587`,
    `# SMTP_SECURE=false`,
    `# SMTP_USER=you@gmail.com`,
    `# SMTP_PASS=your_app_password`,
    `# SMTP_FROM=Brisa Motors <noreply@brisamotors.co.ke>`,
  ].join('\n');

  fs.writeFileSync(envPath, envContent + '\n');
  console.log(green(`✅  .env file written`));

  // Done 
  console.log('\n' + bold('═══════════════════════════════════════════'));
  console.log(bold(green('   ✅  Setup complete!')));
  console.log(bold('═══════════════════════════════════════════'));
  console.log(`
  ${bold('Start the server:')}
     node server.js

  ${bold('Open in browser:')}
     http://localhost:${serverPort}

  ${bold('Admin login:')}
     Email:    admin@carplatform.com
     Password: Admin@1234

  ${bold('Database:')}
     Host:     ${host}:${port}
     Database: ${dbName}
     User:     ${appUser}
  `);

  rl.close();
}

main().catch(e => {
  console.error(red('\n❌  Unexpected error: ' + e.message));
  process.exit(1);
});