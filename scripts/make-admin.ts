// Marks an existing email/password account as a store admin by creating
// admins/{uid}. Create the account first (Firebase console → Authentication →
// Add user), then:
//
//   GOOGLE_APPLICATION_CREDENTIALS=<key.json> npx tsx scripts/make-admin.ts --project magicmeat-gmpqj owner@example.com
//
// Add --remove to take admin rights away.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const args = process.argv.slice(2);
const projectId = args[args.indexOf('--project') + 1];
const remove = args.includes('--remove');
const email = args.find((a) => a.includes('@'));
if (!args.includes('--project') || !projectId || !email) {
  console.error('Usage: npx tsx scripts/make-admin.ts --project <project-id> <email> [--remove]');
  process.exit(1);
}

// Local Google login (ADC) needs a quota project for the Auth/Firestore admin APIs.
process.env.GOOGLE_CLOUD_QUOTA_PROJECT ||= projectId;

const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
initializeApp(usingEmulator ? { projectId } : { projectId, credential: applicationDefault() });

async function main() {
  const user = await getAuth().getUserByEmail(email!);
  const ref = getFirestore().collection('admins').doc(user.uid);
  if (remove) {
    await ref.delete();
    console.log(`${email} is no longer an admin.`);
  } else {
    await ref.set({ email, addedAt: FieldValue.serverTimestamp() });
    console.log(`${email} (${user.uid}) is now an admin.`);
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
