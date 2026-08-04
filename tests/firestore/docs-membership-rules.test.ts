import fs from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'cell-master-docs-rules-test',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/owner'), {
      isAdmin: false,
      capabilityKeys: [],
    });
    await setDoc(doc(db, 'users/member'), {
      isAdmin: false,
      capabilityKeys: [],
    });
    await setDoc(doc(db, 'users/outsider'), {
      isAdmin: false,
      capabilityKeys: [],
    });
    await setDoc(doc(db, 'docs/shared-doc'), {
      ownerId: 'owner',
      title: 'Shared',
      content: '',
      visibility: 'shared',
      sharedWith: ['member'],
      memberIds: ['owner', 'member'],
      sourceChatIds: ['chat-1'],
    });
    await setDoc(doc(db, 'docs/private-doc'), {
      ownerId: 'owner',
      title: 'Private',
      content: '',
      visibility: 'private',
      sharedWith: [],
      memberIds: ['owner'],
    });
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe('docs membership rules', () => {
  it('allows a memberIds user to read a shared doc', async () => {
    const db = env.authenticatedContext('member').firestore();
    await assertSucceeds(getDoc(doc(db, 'docs/shared-doc')));
  });

  it('allows the owner to read their private doc', async () => {
    const db = env.authenticatedContext('owner').firestore();
    await assertSucceeds(getDoc(doc(db, 'docs/private-doc')));
  });

  it('denies an outsider without membership', async () => {
    const db = env.authenticatedContext('outsider').firestore();
    await assertFails(getDoc(doc(db, 'docs/shared-doc')));
    await assertFails(getDoc(doc(db, 'docs/private-doc')));
  });

  it('denies a non-member from creating a doc they are not on', async () => {
    const db = env.authenticatedContext('outsider').firestore();
    await assertFails(
      setDoc(doc(db, 'docs/hijack'), {
        ownerId: 'owner',
        title: 'Nope',
        content: '',
        visibility: 'private',
        sharedWith: [],
        memberIds: ['owner'],
      }),
    );
  });
});
