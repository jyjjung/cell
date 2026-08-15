/** Resolve Firebase Admin service account from env (JSON blob or split vars). */
function resolveServiceAccount(options = {}) {
  const { jsonEnvKeys = ['FIREBASE_SERVICE_ACCOUNT_KEY', 'FIREBASE_ADMIN_SERVICE_ACCOUNT'] } = options;

  for (const key of jsonEnvKeys) {
    const raw = process.env[key];
    if (!raw) continue;
    const trimmed = raw.trim();
    try {
      return typeof raw === 'object' ? raw : JSON.parse(trimmed);
    } catch {
      // try with escaped newlines in JSON string
      try {
        return JSON.parse(trimmed.replace(/^"|"$/g, '').replace(/\\"/g, '"'));
      } catch {
        continue;
      }
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  if (projectId && clientEmail && privateKeyRaw) {
    return {
      project_id: projectId,
      client_email: clientEmail,
      private_key: privateKeyRaw.replace(/\\n/g, '\n').trim(),
    };
  }

  return null;
}

module.exports = { resolveServiceAccount };
