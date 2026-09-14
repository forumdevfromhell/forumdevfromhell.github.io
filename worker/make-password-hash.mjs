import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { stdin, stdout } from 'node:process';
import readline from 'node:readline/promises';

const rl = readline.createInterface({ input: stdin, output: stdout });
const password = await rl.question('Admin password: ');
rl.close();
if (!password) throw new Error('Password cannot be empty.');
const salt = randomBytes(24);
const iterations = 600000;
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
console.log('\nRun these commands from the worker directory:\n');
console.log(`printf '%s' '${salt.toString('base64')}' | npx wrangler secret put ADMIN_PASSWORD_SALT`);
console.log(`printf '%s' '${hash.toString('base64')}' | npx wrangler secret put ADMIN_PASSWORD_HASH`);
console.log('\nThe password itself is not written to disk.');
