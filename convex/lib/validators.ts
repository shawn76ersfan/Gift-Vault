import { doc } from 'convex-helpers/validators';

import schema from '../schema';

export const userDoc = doc(schema, 'users');
export const recipientDoc = doc(schema, 'recipients');
export const occasionDoc = doc(schema, 'occasions');
export const giftDoc = doc(schema, 'gifts');
export const ledgerDoc = doc(schema, 'vaultLedger');
