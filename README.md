# MagicMeat

Expo (SDK 58) app for ordering fresh meat, with a Firebase backend
(project `magicmeat-gmpqj`, Firestore in `asia-south1`).

## Run

```bash
npm install
cp .env.local.example .env.local   # fill in from `firebase apps:sdkconfig`
npx expo start                     # press w for web, a for Android
```

## Backend

| Piece | Where |
|---|---|
| Firebase init, emulator switch | `src/services/firebase.ts` |
| Auth, orders, products, profile calls | `src/services/backend.ts` |
| Price table for every cut and pack | `src/data/pricing.ts` |
| Security rules | `firestore.rules` |
| Rules tests | `scripts/test-rules.ts` (`npm run test:rules`) |

**Customers** are signed in automatically as Firebase anonymous (guest)
users. Their orders and profile belong to that guest account on that device.

**Admins** sign in at `/admin` with an email/password account that has an
`admins/{uid}` document.

**Prices** are checked by the rules, not trusted from the app: each order
line must match `products/{id}.prices[cutId]`, and the subtotal, delivery
fee (₹35 under ₹299), cold-pack fee (₹0 or ₹15) and total must add up. An
order can have at most 6 different items, each up to 20 units (the rules
expression limit). Payment is Cash on Delivery only.

### Firestore collections

- `products/{id}`: `prices`, `inStock`, `stockKg`, `availableCutIds`. Public read, admin write.
- `orders/{MM-…}`: created by the customer; the customer can read their own and cancel one that is still `placed`; admins read all and change `status`, `riderName`, `riderPhone`, `currentTempCelsius`.
- `users/{uid}`: `name`, `phone`, `email`, owned by that user.
- `admins/{uid}`: written only with the Admin SDK.

### One-time setup on a machine

The seed and admin scripts use the Admin SDK with Application Default
Credentials. Sign in once with the Google account that owns the project:

```bash
gcloud auth application-default login
```

Then:

```bash
npm run seed -- --project magicmeat-gmpqj
```

Create the owner's account in Firebase console → Authentication → Users →
Add user, then:

```bash
npm run make-admin -- --project magicmeat-gmpqj you@example.com
```

To set or change that account's password without the reset email (it asks
in a hidden prompt):

```bash
npm run set-password -- --project magicmeat-gmpqj you@example.com
```

### Changing prices

Edit `basePrice` / `priceDelta` in `src/data/mockData.ts` (pack sizes are in
`src/data/pricing.ts`), run `npm run seed -- --project magicmeat-gmpqj`, and
ship the app update. Old app builds showing old prices will have their orders
rejected until they update.

### Deploying rules

```bash
firebase deploy --only firestore --project magicmeat-gmpqj
```

### Local emulators

```bash
npm run emulators          # Firestore :8080, Auth :9099 (needs Java 21+)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed -- --project demo-magicmeat
npm run test:rules
```

Start Expo with `EXPO_PUBLIC_USE_FIREBASE_EMULATORS=true` and
`EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-magicmeat`, and move `.env.local` aside
first: Expo lets `.env.local` win over the shell.

## Not built yet

- Online payment (UPI/card); orders are Cash on Delivery.
- Phone OTP login; guests lose their order history if they clear app data.
- Stock is not reduced automatically when an order is placed; admins update it.
- Push notifications for order status.
- The admin "Cold Hub & Riders" tab still shows sample riders.
