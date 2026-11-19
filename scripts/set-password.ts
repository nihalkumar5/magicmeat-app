// Sets the password of an existing account without going through the reset
// email. The password is typed into a hidden prompt and never echoed.
//
//   npm run set-password -- --project magicmeat-gmpqj you@example.com
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const args = process.argv.slice(2);
const projectId = args[args.indexOf('--project') + 1];
const email = args.find((a) => a.includes('@'));
if (!args.includes('--project') || !projectId || !email) {
  console.error('Usage: npm run set-password -- --project <project-id> <email>');
  process.exit(1);
}

// Local Google login (ADC) needs a quota project for the Auth/Firestore admin APIs.
process.env.GOOGLE_CLOUD_QUOTA_PROJECT ||= projectId;

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    process.stdout.write(question);
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (ch: string) => {
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode?.(false);
        stdin.pause();
        stdin.off('data', onData);
        process.stdout.write('\n');
        resolve(value);
      } else if (ch === '\u0003') {
        process.exit(130);
      } else if (ch === '\u007f') {
        value = value.slice(0, -1);
      } else {
        value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  initializeApp({ projectId, credential: applicationDefault() });
  const user = await getAuth().getUserByEmail(email!);
  const password = await askHidden(`New password for ${email}: `);
  const again = await askHidden('Type it again: ');
  if (password !== again) throw new Error('The two passwords do not match.');
  if (password.length < 8) throw new Error('Use at least 8 characters.');
  await getAuth().updateUser(user.uid, { password });
  console.log(`Password set for ${email}. Sign in at /admin.`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
