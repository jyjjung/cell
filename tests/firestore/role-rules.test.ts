import fs from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, it } from 'vitest';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'cell-master-rules-test',
    firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/admin'), {
      isAdmin: true,
      isYouth: false,
      capabilityKeys: ['app.admin'],
      roleIds: ['admin-role'],
    });
    await setDoc(doc(db, 'users/youth'), {
      isAdmin: false,
      isYouth: true,
      capabilityKeys: ['member.youth'],
      roleIds: ['youth-role'],
    });
    await setDoc(doc(db, 'users/worship'), {
      isAdmin: false,
      isYouth: false,
      capabilityKeys: ['worship.manage'],
      roleIds: ['worship-role'],
    });
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe('role-derived authorization rules', () => {
  it('prevents admin clients from directly changing protected role state', async () => {
    const db = env.authenticatedContext('admin').firestore();
    await assertFails(updateDoc(doc(db, 'users/youth'), { roleIds: [] }));
  });

  it('denies all direct client role writes', async () => {
    const db = env.authenticatedContext('admin').firestore();
    await assertFails(setDoc(doc(db, 'roles/new-role'), {
      name: 'Unsafe role',
      capabilities: ['app.admin'],
    }));
  });

  it('allows a worship-capable user to manage worship content', async () => {
    const db = env.authenticatedContext('worship').firestore();
    await assertSucceeds(setDoc(doc(db, 'worshipSongs/song'), { title: 'Song' }));
  });

  it('prevents a youth user from creating a group chat', async () => {
    const db = env.authenticatedContext('youth').firestore();
    await assertFails(setDoc(doc(db, 'chats/group'), {
      type: 'group',
      name: 'Youth-created group',
      members: ['youth'],
      memberInfo: { youth: {} },
      admins: ['youth'],
      createdAt: serverTimestamp(),
      lastMessageText: '',
      lastMessageSentAt: serverTimestamp(),
      memberSeen: { youth: serverTimestamp() },
    }));
  });
});
