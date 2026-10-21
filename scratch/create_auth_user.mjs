import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

const newConfig = {
  apiKey: 'AIzaSyCXFh81NPGfD7VNQ2-wIvv_95YqAZzA3UU',
  authDomain: 'nagarst-16040.firebaseapp.com',
  projectId: 'nagarst-16040',
  storageBucket: 'nagarst-16040.firebasestorage.app',
  messagingSenderId: '905215853273',
  appId: '1:905215853273:web:f36a799788874ba89a74c8',
  measurementId: 'G-2SY06TRPY2'
};

const app = initializeApp(newConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const usersToCreate = [
  {
    email: 'sushantmarkad1@gmail.com',
    password: 'Sushant@123',
    role: 'SUPER_ADMIN',
    fullName: 'Sushant Markad'
  },
  {
    email: 'admin@ahilyanagar.gov.in',
    password: 'Admin@123',
    role: 'CITY_ADMIN',
    fullName: 'Municipal Transit Administrator'
  },
  {
    email: 'driver@ahilyanagar.gov.in',
    password: 'Driver@123',
    role: 'DRIVER',
    fullName: 'Senior Bus Operator'
  }
];

async function main() {
  console.log('--- CREATING USERS IN FIREBASE AUTH FOR nagarst-16040 ---');
  for (const u of usersToCreate) {
    try {
      console.log(`Creating/signing in ${u.email}...`);
      let uid;
      try {
        const cred = await createUserWithEmailAndPassword(auth, u.email, u.password);
        uid = cred.user.uid;
        console.log(`  ✓ Successfully created ${u.email} in Firebase Auth! UID: ${uid}`);
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          console.log(`  Account already exists in Firebase Auth, signing in...`);
          const cred = await signInWithEmailAndPassword(auth, u.email, u.password);
          uid = cred.user.uid;
          console.log(`  ✓ Signed in! UID: ${uid}`);
        } else {
          console.error(`  ✕ Error creating ${u.email}:`, err.code, err.message);
          continue;
        }
      }

      // Sync Firestore profile
      if (uid) {
        await setDoc(doc(db, 'users', uid), {
          id: uid,
          full_name: u.fullName,
          email: u.email,
          role: u.role,
          admin_request_status: 'APPROVED',
          created_at: new Date().toISOString()
        }, { merge: true });
        console.log(`  ✓ Firestore profile synced for ${u.email}`);
      }
    } catch (e) {
      console.error(`Unexpected error for ${u.email}:`, e.message);
    }
  }
  console.log('\nAll default accounts and credentials are created and ready in nagarst-16040!');
}

main().then(() => process.exit(0)).catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
