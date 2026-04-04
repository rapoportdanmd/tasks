const express = require('express');
const fs = require('fs');
const http = require('http');
const os = require('os');
const Database = require('better-sqlite3');
const { execFileSync } = require('child_process');
const {
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual
} = require('crypto');
const multer = require('multer');
const path = require('path');
const { WebSocketServer } = require('ws');
const XLSX = require('xlsx');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(__dirname, 'tasks.db'));
const SESSION_COOKIE_SECURE = normalizeBooleanEnv(
  process.env.SESSION_COOKIE_SECURE,
  NODE_ENV === 'production'
);
const SESSION_COOKIE_DOMAIN = typeof process.env.SESSION_COOKIE_DOMAIN === 'string'
  ? process.env.SESSION_COOKIE_DOMAIN.trim()
  : '';
const SQLITE_BUSY_TIMEOUT_MS = normalizePositiveIntegerEnv(process.env.SQLITE_BUSY_TIMEOUT_MS, 5000);
const INFECTED_LIST_LABEL = 'רשימת מזוהמים';
const LEGACY_INFECTED_CATEGORY = 'רשימת חולים מזוהמים';
const TASK_CATEGORIES = [
  'פרוצדורות',
  'מעבדות',
  'קבלות',
  'הדמיות',
  'יעוצים',
  'פיזיותרפיה',
  'שיקום',
  'שיחות',
  'מכתבים',
  'מעקבים'
];
const LETTER_SUBCATEGORIES = [
  'הצגה לשיקום',
  'סיכום ביניים',
  'שחרור'
];
const INFECTED_CULTURE_TYPES = [
  'דם',
  'כיח',
  'שתן',
  'CSF',
  'פצע',
  'אחר'
];
const ER_PATIENT_STATUSES = [
  'ממתין',
  'נבדק',
  'סגור'
];
const SURGERY_PREP_TYPES = [
  'ססיה',
  'בוקר',
  'דחופים'
];
const SURGERY_PREP_STATUSES = [
  'לא מוכן',
  'מוכן'
];
const DAILY_ON_CALL_ROLES = [
  {
    key: 'head',
    label: 'כונן ראש',
    options: ['שטראוס', 'שפירא', 'טל', 'גונן', 'לוטם', 'אריאל', 'עוז', 'מרגה', 'תומר', 'אידלמן', 'קרלה']
  },
  {
    key: 'spine',
    label: 'כונן עמ״ש',
    options: ['אידלמן', 'דרור', 'רגב', 'מורסי', 'סלאמה', 'חננאל', 'לידר']
  },
  {
    key: 'angio',
    label: 'כונן אנגיו',
    options: ['טלי', 'אודי', 'עוז']
  },
  {
    key: 'children',
    label: 'כונן ילדים',
    options: ['רוט', 'קונסטנטיני', 'קרלה']
  }
];
const DAILY_ON_CALL_ROLE_MAP = Object.fromEntries(
  DAILY_ON_CALL_ROLES.map((role) => [role.key, role])
);
const ON_CALL_CUTOFF_HOUR = 6;
const ON_CALL_CUTOFF_MINUTE = 0;
const ADMISSIONS_NIGHT_SHIFT_START_HOUR = 18;
const ADMISSIONS_NIGHT_SHIFT_END_HOUR = 5;
const TASK_NIGHT_SHIFT_START_HOUR = 18;
const TASK_NIGHT_SHIFT_MORNING_END_HOUR = 5;
const TASK_PREVIOUS_DAY_SELECTION_END_HOUR = 6;
const OPTIONAL_DESCRIPTION_CATEGORIES = [
  'קבלות',
  'פיזיותרפיה',
  'שיקום',
  'מכתבים'
];
const LABS_CATEGORY = 'מעבדות';
const FOLLOWUP_CATEGORY = 'מעקבים';
const VALID_STATUSES = [
  'not_started',
  'in_progress',
  'completed_pending_review',
  'done',
  'canceled'
];
const EXCEL_FILE_EXTENSIONS = ['.xlsx', '.xls'];
const PATIENT_POOL_HEADER_CANDIDATES = [
  'שם',
  'שם מלא',
  'מטופל',
  'שם מטופל',
  'patient',
  'patient name',
  'name'
];
const SESSION_COOKIE_NAME = 'sefer_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 25 * 1000;
const STAFF_ACCOUNT_STATUS_PENDING = 'pending';
const STAFF_ACCOUNT_STATUS_APPROVED = 'approved';
const PUBLIC_ACCESS_CODE = typeof process.env.APP_ACCESS_CODE === 'string'
  ? process.env.APP_ACCESS_CODE.trim()
  : '';
const ADMIN_USERNAME = typeof process.env.APP_ADMIN_USERNAME === 'string'
  ? process.env.APP_ADMIN_USERNAME.trim()
  : '';
const ADMIN_PASSWORD = typeof process.env.APP_ADMIN_PASSWORD === 'string'
  ? process.env.APP_ADMIN_PASSWORD
  : '';
const ADMIN_LOGIN_ENABLED = Boolean(ADMIN_USERNAME && ADMIN_PASSWORD);
const AUTH_ENABLED = Boolean(PUBLIC_ACCESS_CODE || ADMIN_LOGIN_ENABLED);
const SESSION_SECRET = process.env.APP_SESSION_SECRET || randomBytes(32).toString('hex');

const app = express();
const server = http.createServer(app);
ensureParentDirectoryExists(DB_PATH);
const db = new Database(DB_PATH);
const realtimeServer = new WebSocketServer({ noServer: true });
const realtimeClients = new Map();
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

app.set('trust proxy', true);
app.use(express.json());
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

initializeDatabase();
db.pragma('journal_mode = WAL');
db.pragma(`busy_timeout = ${SQLITE_BUSY_TIMEOUT_MS}`);
db.pragma('foreign_keys = ON');

app.get('/api/session', (req, res) => {
  if (!AUTH_ENABLED) {
    return res.json({
      auth_enabled: false,
      authenticated: true,
      expires_at: null,
      role: 'local',
      admin_available: ADMIN_LOGIN_ENABLED,
      can_edit: true,
      can_admin: true,
      account_id: null,
      display_name: 'מנהל מקומי',
      team_member_id: null
    });
  }

  const session = getAuthenticatedSession(req.headers.cookie);
  if (!session) {
    return res.status(401).json({
      auth_enabled: true,
      authenticated: false,
      expires_at: null,
      role: null,
      admin_available: ADMIN_LOGIN_ENABLED,
      can_edit: false,
      can_admin: false,
      account_id: null,
      display_name: null,
      team_member_id: null
    });
  }

  return res.json({
    auth_enabled: true,
    authenticated: true,
    expires_at: session.expiresAt,
    role: session.role || 'staff',
    admin_available: ADMIN_LOGIN_ENABLED,
    can_edit: sessionCanEdit(session),
    can_admin: sessionCanAdmin(session),
    account_id: session.accountId || null,
    display_name: session.displayName || null,
    team_member_id: session.teamMemberId || null
  });
});

app.post('/api/session/login', (req, res) => {
  if (!AUTH_ENABLED) {
    return res.json({
      ok: true,
      auth_enabled: false,
      authenticated: true,
      expires_at: null,
      role: 'local',
      admin_available: ADMIN_LOGIN_ENABLED,
      can_edit: true,
      can_admin: true,
      account_id: null,
      display_name: 'מנהל מקומי',
      team_member_id: null
    });
  }

  const requestedMode = req.body?.mode === 'admin' ? 'admin' : 'staff';

  if (requestedMode === 'admin' && !ADMIN_LOGIN_ENABLED) {
    return res.status(400).json({
      ok: false,
      auth_enabled: true,
      authenticated: false,
      role: null,
      admin_available: false,
      error: 'לא הוגדרו פרטי התחברות למנהל.'
    });
  }

  if (requestedMode === 'admin') {
    const username = typeof req.body?.username === 'string'
      ? req.body.username.trim()
      : '';
    const password = typeof req.body?.password === 'string'
      ? req.body.password
      : '';

    if (!isValidAdminCredentials(username, password)) {
      return res.status(401).json({
        ok: false,
        auth_enabled: true,
        authenticated: false,
        role: null,
        admin_available: ADMIN_LOGIN_ENABLED,
        error: 'שם המשתמש או הסיסמה של המנהל שגויים.'
      });
    }

    const sessionCookie = createSessionCookieValue({ role: 'admin' });
    const session = parseSessionCookieValue(sessionCookie);
    res.setHeader('Set-Cookie', buildSessionCookieHeader(sessionCookie));

    return res.json({
      ok: true,
      auth_enabled: true,
      authenticated: true,
      expires_at: session?.expiresAt || null,
      role: 'admin',
      admin_available: ADMIN_LOGIN_ENABLED,
      can_edit: true,
      can_admin: true,
      account_id: null,
      display_name: ADMIN_USERNAME,
      team_member_id: null
    });
  }

  const name = normalizeStaffAccountName(req.body?.name);
  const password = normalizeStaffPassword(req.body?.password);
  const staffAccountAuth = authenticateStaffAccount(name, password);

  if (!staffAccountAuth.ok) {
    return res.status(401).json({
      ok: false,
      auth_enabled: true,
      authenticated: false,
      role: null,
      admin_available: ADMIN_LOGIN_ENABLED,
      error: staffAccountAuth.error
    });
  }

  const sessionCookie = createSessionCookieValue({
    role: 'staff',
    accountId: staffAccountAuth.account.id
  });
  const session = parseSessionCookieValue(sessionCookie);
  res.setHeader('Set-Cookie', buildSessionCookieHeader(sessionCookie));

  db.prepare(`
    UPDATE staff_accounts
    SET last_login_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(staffAccountAuth.account.id);

  return res.json({
    ok: true,
    auth_enabled: true,
    authenticated: true,
    expires_at: session?.expiresAt || null,
    role: 'staff',
    admin_available: ADMIN_LOGIN_ENABLED,
    can_edit: true,
    can_admin: false,
    account_id: staffAccountAuth.account.id,
    display_name: staffAccountAuth.account.name,
    team_member_id: staffAccountAuth.account.team_member_id
  });
});

app.post('/api/session/logout', (_req, res) => {
  if (AUTH_ENABLED) {
    res.setHeader('Set-Cookie', buildExpiredSessionCookieHeader());
  }

  return res.json({
    ok: true,
    auth_enabled: AUTH_ENABLED,
    authenticated: false,
    role: null,
    admin_available: ADMIN_LOGIN_ENABLED
  });
});

app.post('/api/accounts/register', (req, res) => {
  const name = normalizeStaffAccountName(req.body?.name);
  const password = normalizeStaffPassword(req.body?.password);
  const passwordConfirmation = normalizeStaffPassword(req.body?.password_confirmation);

  if (!name) {
    return res.status(400).json({ error: 'יש להזין שם בעברית.' });
  }

  if (!password || !passwordConfirmation) {
    return res.status(400).json({ error: 'יש להזין סיסמה ולאמת אותה שוב.' });
  }

  if (!isValidStaffPassword(password)) {
    return res.status(400).json({ error: 'הסיסמה צריכה להכיל לפחות 4 ספרות.' });
  }

  if (password !== passwordConfirmation) {
    return res.status(400).json({ error: 'אימות הסיסמה לא תואם.' });
  }

  const existingAccount = getStaffAccountByName(name);
  if (existingAccount) {
    return res.status(400).json({
      error: existingAccount.status === STAFF_ACCOUNT_STATUS_PENDING
        ? 'ההרשמה הזו כבר ממתינה לאישור מנהל.'
        : 'כבר קיים חשבון עם השם הזה.'
    });
  }

  const teamMemberId = ensureTeamMemberForName(name);
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = hashStaffPassword(password, passwordSalt);
  const createdAccountId = db.prepare(`
    INSERT INTO staff_accounts (
      name,
      password_salt,
      password_hash,
      status,
      team_member_id
    )
    VALUES (?, ?, ?, ?, ?)
  `).run(
    name,
    passwordSalt,
    passwordHash,
    STAFF_ACCOUNT_STATUS_PENDING,
    teamMemberId
  ).lastInsertRowid;

  return sendMutationResponse(req, res, {
    ok: true,
    pending: true,
    account: getStaffAccountById(createdAccountId)
  });
});

app.use('/api', requireAuthenticatedSession);
app.use('/api', requireMutationEditorSession);
app.use('/download', requireAuthenticatedSession);

function sendDesktopLauncherWebloc(req, res) {
  const origin = getRequestOrigin(req);
  const launcher = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>URL</key>
  <string>${origin}</string>
</dict>
</plist>
`;

  res.setHeader('Content-Type', 'application/x-plist; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="sefer-desktop-launcher.webloc"');
  res.send(launcher);
}

function buildDesktopLauncherArchive(origin) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sefer-launcher-'));
  const appName = 'הספר - משימות המחלקה.app';
  const appPath = path.join(tempRoot, appName);
  const scriptPath = path.join(tempRoot, 'launcher.applescript');
  const iconsetDir = path.join(tempRoot, 'launcher.iconset');
  const icnsPath = path.join(tempRoot, 'launcher.icns');
  const zipPath = path.join(tempRoot, 'sefer-desktop-launcher.app.zip');
  const sourceIconPath = path.join(__dirname, 'public', 'assets', 'book-logo-user-ultratight.png');
  const launcherScript = `on run
  try
    do shell script "open -a " & quoted form of "Google Chrome" & " " & quoted form of "${origin}"
  on error
    do shell script "open " & quoted form of "${origin}"
  end try
end run
`;

  fs.writeFileSync(scriptPath, launcherScript, 'utf8');
  execFileSync('/usr/bin/osacompile', ['-o', appPath, scriptPath]);

  fs.mkdirSync(iconsetDir, { recursive: true });
  const iconVariants = [
    { name: 'icon_16x16.png', size: 16 },
    { name: 'icon_16x16@2x.png', size: 32 },
    { name: 'icon_32x32.png', size: 32 },
    { name: 'icon_32x32@2x.png', size: 64 },
    { name: 'icon_128x128.png', size: 128 },
    { name: 'icon_128x128@2x.png', size: 256 },
    { name: 'icon_256x256.png', size: 256 },
    { name: 'icon_256x256@2x.png', size: 512 },
    { name: 'icon_512x512.png', size: 512 },
    { name: 'icon_512x512@2x.png', size: 1024 }
  ];

  iconVariants.forEach(({ name, size }) => {
    execFileSync('/usr/bin/sips', ['-z', String(size), String(size), sourceIconPath, '--out', path.join(iconsetDir, name)]);
  });

  execFileSync('/usr/bin/iconutil', ['-c', 'icns', iconsetDir, '-o', icnsPath]);
  fs.copyFileSync(icnsPath, path.join(appPath, 'Contents', 'Resources', 'applet.icns'));
  execFileSync('/usr/bin/zip', ['-rq', zipPath, appName], { cwd: tempRoot });

  const archive = fs.readFileSync(zipPath);
  fs.rmSync(tempRoot, { recursive: true, force: true });
  return archive;
}

function sendDesktopLauncherArchive(req, res) {
  const origin = getRequestOrigin(req);

  try {
    const archive = buildDesktopLauncherArchive(origin);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="sefer-desktop-launcher.app.zip"');
    res.send(archive);
    return;
  } catch (error) {
    console.error('Failed to build desktop launcher app archive.', error);
  }

  sendDesktopLauncherWebloc(req, res);
}

app.get('/download/desktop-launcher.command', (req, res) => {
  sendDesktopLauncherArchive(req, res);
});

app.get('/download/desktop-launcher.webloc', (req, res) => {
  sendDesktopLauncherArchive(req, res);
});

app.get('/download/desktop-launcher.app.zip', (req, res) => {
  sendDesktopLauncherArchive(req, res);
});

app.get('/download/quick-phone-launcher.mobileconfig', (req, res) => {
  const origin = getRequestOrigin(req);
  const iconPath = path.join(__dirname, 'public', 'assets', 'book-logo-user-ultratight.png');
  const iconBase64 = fs.readFileSync(iconPath).toString('base64');
  const payloadUuid = randomUUID().toUpperCase();
  const webClipUuid = randomUUID().toUpperCase();
  const profile = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key>
      <false/>
      <key>Icon</key>
      <data>${iconBase64}</data>
      <key>IsRemovable</key>
      <true/>
      <key>Label</key>
      <string>הספר</string>
      <key>PayloadDescription</key>
      <string>Quick home-screen launcher for הספר - משימות המחלקה</string>
      <key>PayloadDisplayName</key>
      <string>הספר</string>
      <key>PayloadIdentifier</key>
      <string>com.danrapoport.sefer.webclip</string>
      <key>PayloadOrganization</key>
      <string>הספר - משימות המחלקה</string>
      <key>PayloadType</key>
      <string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key>
      <string>${webClipUuid}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>Precomposed</key>
      <true/>
      <key>URL</key>
      <string>${origin}</string>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>Quick home-screen launcher for הספר - משימות המחלקה</string>
  <key>PayloadDisplayName</key>
  <string>הספר - Quick Phone Launcher</string>
  <key>PayloadIdentifier</key>
  <string>com.danrapoport.sefer.quicklauncher</string>
  <key>PayloadOrganization</key>
  <string>הספר - משימות המחלקה</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${payloadUuid}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;

  res.setHeader('Content-Type', 'application/x-apple-aspen-config; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="sefer-quick-phone-launcher.mobileconfig"');
  res.send(profile);
});

app.post('/api/suggestions', (req, res) => {
  const message = normalizeText(req.body?.message);
  const sourceUrl = normalizeOptionalText(req.body?.source_url);
  const clientId = getRequestClientId(req);
  const submittedByRole = req.authSession?.role || 'user';
  const submittedByName = normalizeText(req.authSession?.displayName);

  if (!message) {
    return res.status(400).json({ error: 'Suggestion text is required.' });
  }

  if (message.length > 2000) {
    return res.status(400).json({ error: 'Suggestion text is too long.' });
  }

  const result = db.prepare(`
    INSERT INTO suggestions (message, submitted_by_role, submitted_by_name, source_url, client_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(message, submittedByRole, submittedByName || null, sourceUrl, clientId || null);

  return res.json({
    ok: true,
    suggestion_id: result.lastInsertRowid
  });
});

app.get('/api/suggestions', requireAdminSession, (_req, res) => {
  const suggestions = db.prepare(`
    SELECT
      id,
      message,
      submitted_by_role,
      submitted_by_name,
      source_url,
      client_id,
      created_at
    FROM suggestions
    ORDER BY created_at DESC, id DESC
  `).all();

  res.json(suggestions);
});

app.delete('/api/suggestions/:id', requireAdminSession, (req, res) => {
  const existingSuggestion = db.prepare('SELECT id FROM suggestions WHERE id = ?').get(req.params.id);
  if (!existingSuggestion) {
    return res.status(404).json({ error: 'Suggestion not found.' });
  }

  db.prepare('DELETE FROM suggestions WHERE id = ?').run(req.params.id);
  return res.json({ ok: true });
});

app.get('/api/meta', (_req, res) => {
  res.json({
    taskCategories: TASK_CATEGORIES,
    letterSubcategories: LETTER_SUBCATEGORIES,
    infectedCultureTypes: INFECTED_CULTURE_TYPES,
    erPatientStatuses: ER_PATIENT_STATUSES,
    surgeryPrepTypes: SURGERY_PREP_TYPES,
    surgeryPrepStatuses: SURGERY_PREP_STATUSES,
    onCallRoles: DAILY_ON_CALL_ROLES,
    infectedListLabel: INFECTED_LIST_LABEL,
    statuses: VALID_STATUSES,
    teamMembers: getTeamMembers()
  });
});

app.post('/api/accounts/:id/approve', requireAdminSession, (req, res) => {
  const account = getStaffAccountById(req.params.id);
  if (!account) {
    return res.status(404).json({ error: 'Account not found.' });
  }

  if (account.status === STAFF_ACCOUNT_STATUS_APPROVED) {
    return res.json({
      ok: true,
      account
    });
  }

  db.prepare(`
    UPDATE staff_accounts
    SET status = ?,
        approved_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(STAFF_ACCOUNT_STATUS_APPROVED, account.id);

  return sendMutationResponse(req, res, {
    ok: true,
    account: getStaffAccountById(account.id)
  });
});

app.delete('/api/accounts/:id', (req, res) => {
  const account = getStaffAccountById(req.params.id);
  if (!account) {
    return res.status(404).json({ error: 'Account not found.' });
  }

  const isAdmin = sessionCanAdmin(req.authSession);
  const isSelf = Number(req.authSession?.accountId || 0) === Number(account.id);

  if (!isAdmin && !isSelf) {
    return res.status(403).json({ error: 'רק מנהל או בעל/ת החשבון יכולים למחוק את החשבון הזה.' });
  }

  const deleted = db.transaction(() => {
    const deletedAccountChanges = db.prepare('DELETE FROM staff_accounts WHERE id = ?').run(account.id).changes;

    if (account.team_member_id) {
      db.prepare('UPDATE tasks SET assignee_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE assignee_id = ?').run(account.team_member_id);
      db.prepare('DELETE FROM daily_admin_assignments WHERE team_member_id = ?').run(account.team_member_id);
      db.prepare('DELETE FROM team_members WHERE id = ?').run(account.team_member_id);
    }

    return deletedAccountChanges;
  })();

  if (isSelf && AUTH_ENABLED) {
    res.setHeader('Set-Cookie', buildExpiredSessionCookieHeader());
  }

  return sendMutationResponse(req, res, {
    ok: true,
    deleted,
    logged_out: isSelf
  });
});

app.get('/api/patient-pool', (req, res) => {
  res.json(getActivePatientPoolState());
});

app.post('/api/patient-pool/upload', (req, res) => {
  excelUpload.single('file')(req, res, (uploadError) => {
    if (uploadError) {
      return res.status(400).json({ error: 'Excel upload failed.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please choose an Excel file first.' });
    }

    if (!isAcceptedExcelFile(req.file.originalname)) {
      return res.status(400).json({ error: 'Only Excel files (.xlsx or .xls) are supported.' });
    }

    let patientNames = [];
    try {
      patientNames = extractPatientNamesFromExcelBuffer(req.file.buffer);
    } catch (error) {
      return res.status(400).json({ error: 'The Excel file could not be read.' });
    }

    if (patientNames.length === 0) {
      return res.status(400).json({ error: 'No patient names were found in the Excel file.' });
    }

    const poolDate = todayDate();
    const savedPatients = replaceActivePatientPool(poolDate, patientNames);

    return sendMutationResponse(req, res, {
      ok: true,
      pool_date: poolDate,
      imported_count: savedPatients.length,
      patients: savedPatients
    });
  });
});

app.delete('/api/patient-pool', (req, res) => {
  const deleted = db.prepare('DELETE FROM daily_patient_pool_entries').run().changes;
  sendMutationResponse(req, res, {
    ok: true,
    pool_date: null,
    deleted
  });
});

app.get('/api/tasks', (_req, res) => {
  const tasks = db.prepare(`
    SELECT
      tasks.*,
      team_members.name AS assignee_name,
      CASE
        WHEN tasks.recurring_followup_id IS NOT NULL AND EXISTS (
          SELECT 1
          FROM tasks AS next_day_task
          WHERE next_day_task.recurring_followup_id = tasks.recurring_followup_id
            AND next_day_task.task_date = DATE(tasks.task_date, '+1 day')
            AND next_day_task.category = tasks.category
            AND next_day_task.id != tasks.id
        ) THEN 1
        ELSE 0
      END AS has_next_day_copy
    FROM tasks
    LEFT JOIN team_members ON team_members.id = tasks.assignee_id
    ORDER BY
      tasks.task_date ASC,
      CASE tasks.category
        WHEN 'פרוצדורות' THEN 1
        WHEN 'מעבדות' THEN 2
        WHEN 'קבלות' THEN 3
        WHEN 'הדמיות' THEN 4
        WHEN 'יעוצים' THEN 5
        WHEN 'פיזיותרפיה' THEN 6
        WHEN 'שיקום' THEN 7
        WHEN 'שיחות' THEN 8
        WHEN 'מכתבים' THEN 9
        WHEN 'מעקבים' THEN 10
        ELSE 11
      END,
      CASE tasks.status
        WHEN 'not_started' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'completed_pending_review' THEN 3
        WHEN 'done' THEN 4
        WHEN 'canceled' THEN 5
        ELSE 6
      END,
      tasks.high_priority DESC,
      CASE
        WHEN tasks.priority_pinned_at IS NULL OR TRIM(tasks.priority_pinned_at) = '' THEN 1
        ELSE 0
      END,
      tasks.priority_pinned_at DESC,
      CASE
        WHEN tasks.task_time IS NULL OR TRIM(tasks.task_time) = '' THEN 1
        ELSE 0
      END,
      tasks.task_time ASC,
      LOWER(tasks.patient_name) ASC,
      tasks.updated_at DESC
  `).all();
  res.json(tasks);
});

app.get('/api/day-manager', (req, res) => {
  const assignmentDate = normalizeTaskDate(req.query.date) || effectiveOnCallDate();
  const assignment = db.prepare(`
    SELECT
      daily_admin_assignments.assignment_date,
      daily_admin_assignments.team_member_id,
      team_members.name AS team_member_name
    FROM daily_admin_assignments
    LEFT JOIN team_members ON team_members.id = daily_admin_assignments.team_member_id
    WHERE daily_admin_assignments.assignment_date = ?
  `).get(assignmentDate);

  res.json({
    assignment_date: assignmentDate,
    team_member_id: assignment?.team_member_id || null,
    team_member_name: assignment?.team_member_name || null
  });
});

app.get('/api/on-call-assignments', (req, res) => {
  const assignmentDate = normalizeTaskDate(req.query.date) || effectiveOnCallDate();
  const rows = db.prepare(`
    SELECT role_key, assignee_name
    FROM daily_on_call_assignments
    WHERE assignment_date = ?
    ORDER BY role_key ASC
  `).all(assignmentDate);

  const assignments = DAILY_ON_CALL_ROLES.reduce((result, role) => {
    result[role.key] = null;
    return result;
  }, {});

  rows.forEach((row) => {
    if (row.role_key in assignments) {
      assignments[row.role_key] = row.assignee_name || null;
    }
  });

  res.json({
    assignment_date: assignmentDate,
    assignments
  });
});

app.put('/api/on-call-assignments', (req, res) => {
  const assignmentDate = normalizeTaskDate(req.body.date) || effectiveOnCallDate();
  const roleKey = normalizeOnCallRoleKey(req.body.role_key);
  const assigneeName = normalizeOnCallAssigneeName(roleKey, req.body.assignee_name);

  if (!assignmentDate) {
    return res.status(400).json({ error: 'Invalid assignment date.' });
  }

  if (!roleKey) {
    return res.status(400).json({ error: 'Invalid on-call role.' });
  }

  if (req.body.assignee_name !== null && req.body.assignee_name !== undefined && req.body.assignee_name !== '' && !assigneeName) {
    return res.status(400).json({ error: 'Invalid on-call assignee.' });
  }

  if (assigneeName === null) {
    db.prepare(`
      DELETE FROM daily_on_call_assignments
      WHERE assignment_date = ? AND role_key = ?
    `).run(assignmentDate, roleKey);
  } else {
    db.prepare(`
      INSERT INTO daily_on_call_assignments (assignment_date, role_key, assignee_name, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(assignment_date, role_key) DO UPDATE SET
        assignee_name = excluded.assignee_name,
        updated_at = CURRENT_TIMESTAMP
    `).run(assignmentDate, roleKey, assigneeName);
  }

  const rows = db.prepare(`
    SELECT role_key, assignee_name
    FROM daily_on_call_assignments
    WHERE assignment_date = ?
    ORDER BY role_key ASC
  `).all(assignmentDate);

  const assignments = DAILY_ON_CALL_ROLES.reduce((result, role) => {
    result[role.key] = null;
    return result;
  }, {});

  rows.forEach((row) => {
    if (row.role_key in assignments) {
      assignments[row.role_key] = row.assignee_name || null;
    }
  });

  return sendMutationResponse(req, res, {
    assignment_date: assignmentDate,
    assignments
  });
});

app.put('/api/day-manager', (req, res) => {
  const assignmentDate = normalizeTaskDate(req.body.date) || effectiveOnCallDate();
  const teamMemberId = normalizeAssigneeId(req.body.team_member_id);

  if (!assignmentDate) {
    return res.status(400).json({ error: 'Invalid assignment date.' });
  }

  if (teamMemberId !== null && !teamMemberExists(teamMemberId)) {
    return res.status(400).json({ error: 'Invalid team member.' });
  }

  if (teamMemberId === null) {
    db.prepare('DELETE FROM daily_admin_assignments WHERE assignment_date = ?').run(assignmentDate);
    return sendMutationResponse(req, res, {
      assignment_date: assignmentDate,
      team_member_id: null,
      team_member_name: null
    });
  }

  db.prepare(`
    INSERT INTO daily_admin_assignments (assignment_date, team_member_id, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(assignment_date) DO UPDATE SET
      team_member_id = excluded.team_member_id,
      updated_at = CURRENT_TIMESTAMP
  `).run(assignmentDate, teamMemberId);

  const assignment = db.prepare(`
    SELECT
      daily_admin_assignments.assignment_date,
      daily_admin_assignments.team_member_id,
      team_members.name AS team_member_name
    FROM daily_admin_assignments
    LEFT JOIN team_members ON team_members.id = daily_admin_assignments.team_member_id
    WHERE daily_admin_assignments.assignment_date = ?
  `).get(assignmentDate);

  sendMutationResponse(req, res, assignment);
});

app.post('/api/tasks', (req, res) => {
  const editorName = getAuditActorName(req);
  const patientName = normalizeText(req.body.patient_name);
  const description = normalizeText(req.body.description);
  const comment = normalizeOptionalText(req.body.comment);
  const category = normalizeCategory(req.body.category);
  const subcategory = normalizeSubcategory(req.body.subcategory, category);
  const taskDefaults = getNewTaskCreationContext();
  const taskDate = normalizeTaskDate(req.body.task_date) || taskDefaults.taskDate;
  const taskTime = normalizeTaskTime(req.body.task_time);
  const assigneeId = normalizeAssigneeId(req.body.assignee_id);
  const nightShiftAnchorDate = getDefaultNightShiftAnchorDateForTask(taskDate);

  if (!patientName || !category) {
    return res.status(400).json({ error: 'Patient name and category are required.' });
  }

  if (!description && !categoryAllowsEmptyDescription(category)) {
    return res.status(400).json({ error: 'Task description is required for this category.' });
  }

  if (!TASK_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }

  if (subcategory === null && category === 'מכתבים' && Object.prototype.hasOwnProperty.call(req.body, 'subcategory')) {
    return res.status(400).json({ error: 'Invalid letter subcategory.' });
  }

  if (assigneeId !== null && !teamMemberExists(assigneeId)) {
    return res.status(400).json({ error: 'Invalid assignee.' });
  }

  if (!canAssignNewTaskDate(taskDate)) {
    return res.status(400).json({ error: 'Task date cannot be before today.' });
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'task_time') && req.body.task_time !== '' && taskTime === null) {
    return res.status(400).json({ error: 'Invalid task time.' });
  }

  const recurringFollowupId = category === FOLLOWUP_CATEGORY ? randomUUID() : null;
  const insertTask = db.prepare(`
    INSERT INTO tasks (
      patient_name,
      description,
      comment,
      category,
      subcategory,
      assignee_id,
      task_date,
      task_time,
      high_priority,
      night_shift_anchor_date,
      night_shift_moved_at,
      recurring_followup_id,
      updated_by_name
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
  `);

  const createdTaskId = insertTask.run(
    patientName,
    description || '',
    comment,
    category,
    subcategory,
    assigneeId,
    taskDate,
    taskTime,
    nightShiftAnchorDate,
    nightShiftAnchorDate ? new Date().toISOString() : null,
    recurringFollowupId,
    editorName
  ).lastInsertRowid;

  sendMutationResponse(req, res, getTaskById(createdTaskId));
});

app.patch('/api/tasks/:id', (req, res) => {
  const editorName = getAuditActorName(req);
  const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existingTask) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const updates = [];
  const values = [];
  let nextCategory = existingTask.category;
  let nextDescription = existingTask.description;
  let nextTaskDate = existingTask.task_date;
  let nextRecurringFollowupId = existingTask.recurring_followup_id || null;
  const existingAnyNextDayCopy = getAnyNextDayCopyForTask(existingTask);

  if (Object.prototype.hasOwnProperty.call(req.body, 'patient_name')) {
    const patientName = normalizeText(req.body.patient_name);
    if (!patientName) {
      return res.status(400).json({ error: 'Patient name is required.' });
    }
    updates.push('patient_name = ?');
    values.push(patientName);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
    const description = normalizeText(req.body.description);
    updates.push('description = ?');
    values.push(description || '');
    nextDescription = description || '';
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'comment')) {
    updates.push('comment = ?');
    values.push(normalizeOptionalText(req.body.comment));
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
    const status = normalizeStatus(req.body.status);
    if (!status) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    updates.push('status = ?');
    values.push(status);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'category')) {
    const category = normalizeCategory(req.body.category);
    if (!TASK_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category.' });
    }
    updates.push('category = ?');
    values.push(category);
    nextCategory = category;
  }

  if (
    Object.prototype.hasOwnProperty.call(req.body, 'subcategory') ||
    Object.prototype.hasOwnProperty.call(req.body, 'category')
  ) {
    const subcategoryCategory = Object.prototype.hasOwnProperty.call(req.body, 'category')
      ? normalizeCategory(req.body.category)
      : existingTask.category;
    const rawSubcategory = Object.prototype.hasOwnProperty.call(req.body, 'subcategory')
      ? req.body.subcategory
      : existingTask.subcategory;
    const subcategory = normalizeSubcategory(rawSubcategory, subcategoryCategory);

    if (rawSubcategory && subcategory === null) {
      return res.status(400).json({ error: 'Invalid letter subcategory.' });
    }

    updates.push('subcategory = ?');
    values.push(subcategory);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'task_date')) {
    const taskDate = normalizeTaskDate(req.body.task_date);
    if (!taskDate) {
      return res.status(400).json({ error: 'Invalid task date.' });
    }
    if (!canAssignNewTaskDate(taskDate) && taskDate !== existingTask.task_date) {
      return res.status(400).json({ error: 'Task date cannot be before today.' });
    }
    updates.push('task_date = ?');
    values.push(taskDate);
    nextTaskDate = taskDate;
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'task_time')) {
    const taskTime = normalizeTaskTime(req.body.task_time);
    if (req.body.task_time !== '' && taskTime === null) {
      return res.status(400).json({ error: 'Invalid task time.' });
    }
    updates.push('task_time = ?');
    values.push(taskTime);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'assignee_id')) {
    const assigneeId = normalizeAssigneeId(req.body.assignee_id);
    if (assigneeId !== null && !teamMemberExists(assigneeId)) {
      return res.status(400).json({ error: 'Invalid assignee.' });
    }
    updates.push('assignee_id = ?');
    values.push(assigneeId);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'high_priority')) {
    const highPriority = normalizeHighPriority(req.body.high_priority);
    if (highPriority === null) {
      return res.status(400).json({ error: 'Invalid priority flag.' });
    }
    updates.push('high_priority = ?');
    values.push(highPriority);
    if (highPriority === 1) {
      updates.push('priority_pinned_at = CURRENT_TIMESTAMP');
    }
  }

  if (!nextDescription && !categoryAllowsEmptyDescription(nextCategory)) {
    return res.status(400).json({ error: 'Task description is required for this category.' });
  }

  const willBeFollowup = nextCategory === FOLLOWUP_CATEGORY;
  const hadFollowupSeries = Boolean(existingTask.recurring_followup_id);

  if (willBeFollowup && !hadFollowupSeries) {
    nextRecurringFollowupId = randomUUID();
    updates.push('recurring_followup_id = ?');
    values.push(nextRecurringFollowupId);
  }

  if (!willBeFollowup && hadFollowupSeries && !existingAnyNextDayCopy) {
    updates.push('recurring_followup_id = ?');
    values.push(null);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid updates provided.' });
  }

  const updatedTask = db.transaction(() => {
    values.push(editorName, req.params.id);
    db.prepare(`
      UPDATE tasks
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP, updated_by_name = ?
      WHERE id = ?
    `).run(...values);

    const task = getTaskById(req.params.id);

    if (!willBeFollowup && hadFollowupSeries && !existingAnyNextDayCopy) {
      db.prepare(`
        DELETE FROM tasks
        WHERE recurring_followup_id = ?
          AND task_date > ?
      `).run(existingTask.recurring_followup_id, task.task_date);
    }

    syncNextDayCopyFromSource(task, editorName, {
      previousTaskDate: existingTask.task_date
    });

    return getTaskById(req.params.id);
  })();

  sendMutationResponse(req, res, updatedTask);
});

app.delete('/api/tasks/:id', (req, res) => {
  const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existingTask) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const deleted = deleteTasksWithFollowupCascade([existingTask]);
  sendMutationResponse(req, res, { ok: true, deleted });
});

app.delete('/api/tasks', (req, res) => {
  const scope = typeof req.query.scope === 'string' ? req.query.scope.trim() : '';
  const referenceDate = normalizeTaskDate(req.query.date) || todayDate();
  let tasksToDelete = [];

  if (scope === 'previous') {
    tasksToDelete = db.prepare('SELECT * FROM tasks WHERE task_date < ?').all(referenceDate);
  } else if (scope === 'day') {
    tasksToDelete = db.prepare('SELECT * FROM tasks WHERE task_date = ?').all(referenceDate);
  } else {
    return res.status(400).json({ error: 'Invalid task delete scope.' });
  }

  sendMutationResponse(req, res, {
    ok: true,
    deleted: deleteTasksWithFollowupCascade(tasksToDelete),
    scope,
    reference_date: referenceDate
  });
});

app.post('/api/tasks/bulk-delete', (req, res) => {
  const ids = Array.isArray(req.body.ids)
    ? [...new Set(
        req.body.ids
          .map((value) => Number.parseInt(value, 10))
          .filter((value) => Number.isInteger(value) && value > 0)
      )]
    : [];

  if (ids.length === 0) {
    return res.status(400).json({ error: 'No valid task ids provided.' });
  }

  const placeholders = ids.map(() => '?').join(', ');
  const tasksToDelete = db.prepare(`SELECT * FROM tasks WHERE id IN (${placeholders})`).all(...ids);

  sendMutationResponse(req, res, { ok: true, deleted: deleteTasksWithFollowupCascade(tasksToDelete), ids });
});

app.post('/api/tasks/:id/copy-next-day', (req, res) => {
  const editorName = getAuditActorName(req);
  const sourceTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!sourceTask) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const recurringFollowupId = sourceTask.recurring_followup_id || randomUUID();
  const nextTaskDate = addDays(sourceTask.task_date, 1);
  const nextStatus = getMirroredNextDayStatus(sourceTask.status);

  const result = db.transaction(() => {
    if (!sourceTask.recurring_followup_id) {
      db.prepare(`
        UPDATE tasks
        SET recurring_followup_id = ?, updated_at = CURRENT_TIMESTAMP, updated_by_name = ?
        WHERE id = ?
      `).run(recurringFollowupId, editorName, sourceTask.id);
    }

    const currentSourceTask = db.prepare(`
      SELECT *
      FROM tasks
      WHERE id = ?
      LIMIT 1
    `).get(sourceTask.id);

    const existingNextTask = db.prepare(`
      SELECT *
      FROM tasks
      WHERE recurring_followup_id = ?
        AND task_date = ?
      LIMIT 1
    `).get(recurringFollowupId, nextTaskDate);

    if (existingNextTask) {
      const hasExactActiveCopy = existingNextTask.category === currentSourceTask.category;

      if (!hasExactActiveCopy) {
        db.prepare(`
          UPDATE tasks
          SET patient_name = ?,
              description = ?,
              comment = ?,
              category = ?,
              subcategory = ?,
              assignee_id = ?,
              task_date = ?,
              task_time = ?,
              high_priority = ?,
              priority_pinned_at = ?,
              night_shift_anchor_date = NULL,
              night_shift_moved_at = NULL,
              status = ?,
              updated_at = CURRENT_TIMESTAMP,
              updated_by_name = ?
          WHERE id = ?
        `).run(
          currentSourceTask.patient_name,
          currentSourceTask.description,
          normalizeOptionalText(currentSourceTask.comment),
          currentSourceTask.category,
          currentSourceTask.subcategory,
          normalizeAssigneeId(currentSourceTask.assignee_id),
          nextTaskDate,
          normalizeTaskTime(currentSourceTask.task_time),
          Number(currentSourceTask.high_priority) === 1 ? 1 : 0,
          Number(currentSourceTask.high_priority) === 1
            ? (currentSourceTask.priority_pinned_at || existingNextTask.priority_pinned_at || new Date().toISOString())
            : null,
          nextStatus,
          editorName,
          existingNextTask.id
        );

        return {
          task_id: existingNextTask.id,
          created: true,
          removed: false
        };
      }

      db.prepare('DELETE FROM tasks WHERE id = ?').run(existingNextTask.id);

      const remainingLinkedTask = db.prepare(`
        SELECT id
        FROM tasks
        WHERE recurring_followup_id = ?
          AND id != ?
        LIMIT 1
      `).get(recurringFollowupId, sourceTask.id);

      if (!remainingLinkedTask) {
        db.prepare(`
          UPDATE tasks
          SET recurring_followup_id = NULL, updated_at = CURRENT_TIMESTAMP, updated_by_name = ?
          WHERE id = ?
        `).run(editorName, sourceTask.id);
      }

      return {
        task_id: existingNextTask.id,
        created: false,
        removed: true
      };
    }

    const inserted = db.prepare(`
      INSERT INTO tasks (
        patient_name,
        description,
        comment,
        category,
        subcategory,
        assignee_id,
        task_date,
        task_time,
        high_priority,
        priority_pinned_at,
        night_shift_anchor_date,
        night_shift_moved_at,
        recurring_followup_id,
        status,
        updated_by_name
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?)
    `).run(
      currentSourceTask.patient_name,
      currentSourceTask.description,
      normalizeOptionalText(currentSourceTask.comment),
      currentSourceTask.category,
      currentSourceTask.subcategory,
      normalizeAssigneeId(currentSourceTask.assignee_id),
      nextTaskDate,
      normalizeTaskTime(currentSourceTask.task_time),
      Number(currentSourceTask.high_priority) === 1 ? 1 : 0,
      Number(currentSourceTask.high_priority) === 1
        ? (currentSourceTask.priority_pinned_at || new Date().toISOString())
        : null,
      recurringFollowupId,
      nextStatus,
      editorName
    );

    return {
      task_id: inserted.lastInsertRowid,
      created: true,
      removed: false
    };
  })();

  sendMutationResponse(req, res, {
    ok: true,
    created: result.created,
    removed: result.removed,
    source_task_id: sourceTask.id,
    task: getTaskById(result.task_id)
  });
});

app.post('/api/tasks/:id/toggle-night-shift', (req, res) => {
  const editorName = getAuditActorName(req);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  if (task.night_shift_anchor_date) {
    db.prepare(`
      UPDATE tasks
      SET night_shift_anchor_date = NULL,
          night_shift_moved_at = NULL,
          updated_at = CURRENT_TIMESTAMP,
          updated_by_name = ?
      WHERE id = ?
    `).run(editorName, task.id);

    return sendMutationResponse(req, res, getTaskById(task.id));
  }

  db.prepare(`
    UPDATE tasks
    SET night_shift_anchor_date = ?,
        night_shift_moved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP,
        updated_by_name = ?
    WHERE id = ?
  `).run(task.task_date || todayDate(), editorName, task.id);

  return sendMutationResponse(req, res, getTaskById(task.id));
});

app.get('/api/infected-list', (_req, res) => {
  const entries = db.prepare(`
    SELECT *
    FROM infected_list_entries
    ORDER BY created_at DESC, id DESC
  `).all();
  res.json(entries);
});

app.post('/api/infected-list', (req, res) => {
  const editorName = getAuditActorName(req);
  const patientName = normalizeText(req.body.patient_name);
  const cultureType = normalizeInfectedCultureType(req.body.culture_type);
  const agent = normalizeOptionalText(req.body.agent);
  const abx = normalizeOptionalText(req.body.abx);
  const question = normalizeOptionalText(req.body.question);
  const comment = normalizeOptionalText(req.body.comment);
  const questionAnswered = normalizeBooleanFlag(req.body.question_answered, 0);

  if (!patientName) {
    return res.status(400).json({ error: 'Patient name is required for the infected list.' });
  }

  if (req.body.culture_type !== null && req.body.culture_type !== undefined && req.body.culture_type !== '' && !cultureType) {
    return res.status(400).json({ error: 'Invalid culture type.' });
  }

  const result = db.prepare(`
    INSERT INTO infected_list_entries (patient_name, culture_type, agent, abx, question, question_answered, comment, note, entry_date, updated_at, updated_by_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `).run(
    patientName,
    cultureType,
    agent,
    abx,
    question,
    questionAnswered,
    comment,
    patientName,
    todayDate(),
    editorName
  );

  const entry = db.prepare('SELECT * FROM infected_list_entries WHERE id = ?').get(result.lastInsertRowid);
  sendMutationResponse(req, res, entry);
});

app.patch('/api/infected-list/:id', (req, res) => {
  const editorName = getAuditActorName(req);
  const existingEntry = db.prepare('SELECT * FROM infected_list_entries WHERE id = ?').get(req.params.id);
  if (!existingEntry) {
    return res.status(404).json({ error: 'Infected list entry not found.' });
  }

  const patientName = normalizeText(req.body.patient_name);
  const cultureType = normalizeInfectedCultureType(req.body.culture_type);
  const agent = normalizeOptionalText(req.body.agent);
  const abx = normalizeOptionalText(req.body.abx);
  const question = normalizeOptionalText(req.body.question);
  const comment = normalizeOptionalText(req.body.comment);
  const questionAnswered = normalizeBooleanFlag(req.body.question_answered, 0);

  if (!patientName) {
    return res.status(400).json({ error: 'Patient name is required for the infected list.' });
  }

  if (req.body.culture_type !== null && req.body.culture_type !== undefined && req.body.culture_type !== '' && !cultureType) {
    return res.status(400).json({ error: 'Invalid culture type.' });
  }

  db.prepare(`
    UPDATE infected_list_entries
    SET
      patient_name = ?,
      culture_type = ?,
      agent = ?,
      abx = ?,
      question = ?,
      question_answered = ?,
      comment = ?,
      note = ?,
      updated_at = CURRENT_TIMESTAMP,
      updated_by_name = ?
    WHERE id = ?
  `).run(
    patientName,
    cultureType,
    agent,
    abx,
    question,
    questionAnswered,
    comment,
    patientName,
    editorName,
    req.params.id
  );

  const entry = db.prepare('SELECT * FROM infected_list_entries WHERE id = ?').get(req.params.id);
  sendMutationResponse(req, res, entry);
});

app.delete('/api/infected-list/:id', (req, res) => {
  db.prepare('DELETE FROM infected_list_entries WHERE id = ?').run(req.params.id);
  sendMutationResponse(req, res, { ok: true });
});

app.delete('/api/infected-list', (req, res) => {
  const result = db.prepare('DELETE FROM infected_list_entries').run();
  sendMutationResponse(req, res, { ok: true, deleted: result.changes });
});

app.get('/api/er-patients', (_req, res) => {
  const entries = db.prepare(`
    SELECT *
    FROM er_patients
    ORDER BY
      created_at DESC,
      id DESC
  `).all();
  res.json(entries);
});

app.post('/api/er-patients', (req, res) => {
  const editorName = getAuditActorName(req);
  const patientName = normalizeText(req.body.patient_name);
  const rawIdNumber = req.body.id_number;
  const idNumber = normalizeErPatientIdNumber(rawIdNumber);
  const ward = normalizeOptionalText(req.body.ward);
  const status = normalizeErPatientStatus(req.body.status) || 'ממתין';
  const comment = normalizeOptionalText(req.body.comment);

  if (!patientName) {
    return res.status(400).json({ error: 'Patient name is required for the ER list.' });
  }

  if (!isValidErPatientIdNumberField(rawIdNumber)) {
    return res.status(400).json({ error: 'ID number may contain only digits, with an optional leading z, up to 12 characters.' });
  }

  const result = db.prepare(`
    INSERT INTO er_patients (patient_name, id_number, ward, status, comment, updated_at, updated_by_name)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `).run(patientName, idNumber, ward, status, comment, editorName);

  const entry = db.prepare('SELECT * FROM er_patients WHERE id = ?').get(result.lastInsertRowid);
  sendMutationResponse(req, res, entry);
});

app.patch('/api/er-patients/:id', (req, res) => {
  const editorName = getAuditActorName(req);
  const existingEntry = db.prepare('SELECT * FROM er_patients WHERE id = ?').get(req.params.id);
  if (!existingEntry) {
    return res.status(404).json({ error: 'ER patient entry not found.' });
  }

  const patientName = normalizeText(req.body.patient_name);
  const rawIdNumber = req.body.id_number;
  const idNumber = normalizeErPatientIdNumber(rawIdNumber);
  const ward = normalizeOptionalText(req.body.ward);
  const status = Object.prototype.hasOwnProperty.call(req.body, 'status')
    ? (normalizeErPatientStatus(req.body.status) || 'ממתין')
    : existingEntry.status;
  const comment = normalizeOptionalText(req.body.comment);

  if (!patientName) {
    return res.status(400).json({ error: 'Patient name is required for the ER list.' });
  }

  if (!isValidErPatientIdNumberField(rawIdNumber)) {
    return res.status(400).json({ error: 'ID number may contain only digits, with an optional leading z, up to 12 characters.' });
  }

  db.prepare(`
    UPDATE er_patients
    SET
      patient_name = ?,
      id_number = ?,
      ward = ?,
      status = ?,
      comment = ?,
      updated_at = CURRENT_TIMESTAMP,
      updated_by_name = ?
    WHERE id = ?
  `).run(patientName, idNumber, ward, status, comment, editorName, req.params.id);

  const entry = db.prepare('SELECT * FROM er_patients WHERE id = ?').get(req.params.id);
  sendMutationResponse(req, res, entry);
});

app.delete('/api/er-patients/:id', (req, res) => {
  db.prepare('DELETE FROM er_patients WHERE id = ?').run(req.params.id);
  sendMutationResponse(req, res, { ok: true });
});

app.post('/api/er-patients/:id/move-to-admissions', (req, res) => {
  const editorName = getAuditActorName(req);
  const entry = db.prepare('SELECT * FROM er_patients WHERE id = ?').get(req.params.id);

  if (!entry) {
    return res.status(404).json({ error: 'ER patient entry not found.' });
  }

  if (entry.status !== 'סגור') {
    return res.status(400).json({ error: 'Only closed ER/consult entries can be moved to admissions.' });
  }

  const transferContext = getAdmissionsTransferContext();
  const description = buildAdmissionsTaskDescription(entry);
  const comment = buildAdmissionsTaskComment(entry);

  const insertTask = db.prepare(`
    INSERT INTO tasks (
      patient_name,
      description,
      comment,
      category,
      subcategory,
      assignee_id,
      task_date,
      task_time,
      high_priority,
      status,
      recurring_followup_id,
      night_shift_anchor_date,
      night_shift_moved_at,
      updated_by_name
    )
    VALUES (?, ?, ?, ?, NULL, NULL, ?, NULL, 0, 'not_started', NULL, ?, ?, ?)
  `);

  const result = db.transaction(() => {
    const insertResult = insertTask.run(
      entry.patient_name,
      description,
      comment,
      'קבלות',
      transferContext.taskDate,
      transferContext.nightShiftAnchorDate,
      transferContext.nightShiftAnchorDate ? new Date().toISOString() : null,
      editorName
    );

    db.prepare('DELETE FROM er_patients WHERE id = ?').run(entry.id);

    return {
      taskId: insertResult.lastInsertRowid,
      removedErPatientId: entry.id
    };
  })();

  sendMutationResponse(req, res, {
    ok: true,
    moved_from_er_patient_id: result.removedErPatientId,
    task: getTaskById(result.taskId)
  });
});

app.delete('/api/er-patients', (req, res) => {
  const result = db.prepare('DELETE FROM er_patients').run();
  sendMutationResponse(req, res, { ok: true, deleted: result.changes });
});

app.get('/api/surgery-preps', (_req, res) => {
  const entries = db.prepare(`
    SELECT *
    FROM surgery_preps
    ORDER BY
      CASE surgery_type
        WHEN 'דחופים' THEN 1
        WHEN 'בוקר' THEN 2
        WHEN 'ססיה' THEN 3
        ELSE 4
      END,
      created_at DESC,
      id DESC
  `).all();
  res.json(entries);
});

app.post('/api/surgery-preps', (req, res) => {
  const editorName = getAuditActorName(req);
  const patientName = normalizeText(req.body.patient_name);
  const surgeryType = normalizeSurgeryPrepType(req.body.surgery_type) || 'בוקר';
  const status = normalizeSurgeryPrepStatus(req.body.status) || 'לא מוכן';
  const comment = normalizeOptionalText(req.body.comment);

  if (!patientName) {
    return res.status(400).json({ error: 'Patient name is required for the surgery prep list.' });
  }

  const result = db.prepare(`
    INSERT INTO surgery_preps (patient_name, surgery_type, status, comment, updated_at, updated_by_name)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `).run(patientName, surgeryType, status, comment, editorName);

  const entry = db.prepare('SELECT * FROM surgery_preps WHERE id = ?').get(result.lastInsertRowid);
  sendMutationResponse(req, res, entry);
});

app.patch('/api/surgery-preps/:id', (req, res) => {
  const editorName = getAuditActorName(req);
  const existingEntry = db.prepare('SELECT * FROM surgery_preps WHERE id = ?').get(req.params.id);
  if (!existingEntry) {
    return res.status(404).json({ error: 'Surgery prep entry not found.' });
  }

  const patientName = normalizeText(req.body.patient_name);
  const surgeryType = normalizeSurgeryPrepType(req.body.surgery_type) || 'בוקר';
  const status = Object.prototype.hasOwnProperty.call(req.body, 'status')
    ? (normalizeSurgeryPrepStatus(req.body.status) || 'לא מוכן')
    : existingEntry.status;
  const comment = Object.prototype.hasOwnProperty.call(req.body, 'comment')
    ? normalizeOptionalText(req.body.comment)
    : existingEntry.comment;

  if (!patientName) {
    return res.status(400).json({ error: 'Patient name is required for the surgery prep list.' });
  }

  db.prepare(`
    UPDATE surgery_preps
    SET
      patient_name = ?,
      surgery_type = ?,
      status = ?,
      comment = ?,
      updated_at = CURRENT_TIMESTAMP,
      updated_by_name = ?
    WHERE id = ?
  `).run(patientName, surgeryType, status, comment, editorName, req.params.id);

  const entry = db.prepare('SELECT * FROM surgery_preps WHERE id = ?').get(req.params.id);
  sendMutationResponse(req, res, entry);
});

app.delete('/api/surgery-preps/:id', (req, res) => {
  db.prepare('DELETE FROM surgery_preps WHERE id = ?').run(req.params.id);
  sendMutationResponse(req, res, { ok: true });
});

app.delete('/api/surgery-preps', (req, res) => {
  const result = db.prepare('DELETE FROM surgery_preps').run();
  sendMutationResponse(req, res, { ok: true, deleted: result.changes });
});

app.post('/api/reset-all', (req, res) => {
  const summary = db.transaction(() => {
    const deletedTasks = db.prepare('DELETE FROM tasks').run().changes;
    const deletedInfected = db.prepare('DELETE FROM infected_list_entries').run().changes;
    const deletedErPatients = db.prepare('DELETE FROM er_patients').run().changes;
    const deletedSurgeryPreps = db.prepare('DELETE FROM surgery_preps').run().changes;
    const deletedDailyAdmins = db.prepare('DELETE FROM daily_admin_assignments').run().changes;
    const deletedDailyOnCalls = db.prepare('DELETE FROM daily_on_call_assignments').run().changes;
    const deletedPatientPoolEntries = db.prepare('DELETE FROM daily_patient_pool_entries').run().changes;

    return {
      deleted_tasks: deletedTasks,
      deleted_infected_entries: deletedInfected,
      deleted_er_patients: deletedErPatients,
      deleted_surgery_preps: deletedSurgeryPreps,
      deleted_daily_admin_assignments: deletedDailyAdmins,
      deleted_daily_on_call_assignments: deletedDailyOnCalls,
      deleted_daily_patient_pool_entries: deletedPatientPoolEntries
    };
  })();

  sendMutationResponse(req, res, { ok: true, ...summary });
});

app.get('/api/team-members', (_req, res) => {
  res.json(getTeamMembers());
});

app.post('/api/team-members', (_req, res) => {
  return res.status(403).json({
    error: 'Staff members are added through account registration only.'
  });
});

app.delete('/api/team-members/:id', (req, res) => {
  const member = getTeamMemberById(req.params.id);
  if (!member) {
    return res.status(404).json({ error: 'איש הצוות לא נמצא.' });
  }

  if (member.account_id) {
    return res.status(400).json({
      error: 'לאיש הצוות הזה יש חשבון משתמש. יש למחוק את החשבון במקום זאת.'
    });
  }

  if (!sessionCanAdmin(req.authSession)) {
    return res.status(403).json({ error: 'רק מנהל יכול למחוק איש צוות שאין לו חשבון.' });
  }

  db.prepare('UPDATE tasks SET assignee_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE assignee_id = ?').run(member.id);
  db.prepare('DELETE FROM daily_admin_assignments WHERE team_member_id = ?').run(member.id);
  db.prepare('DELETE FROM team_members WHERE id = ?').run(member.id);
  sendMutationResponse(req, res, { ok: true });
});

app.get('/api/health', (_req, res) => {
  let dbHealthy = true;

  try {
    db.prepare('SELECT 1').get();
  } catch (error) {
    dbHealthy = false;
  }

  res.json({
    ok: dbHealthy,
    auth_enabled: AUTH_ENABLED,
    db_healthy: dbHealthy,
    db_path: DB_PATH,
    realtime_clients: realtimeClients.size,
    now: new Date().toISOString()
  });
});

realtimeServer.on('connection', (socket, request, context = {}) => {
  const connectionId = randomUUID();
  realtimeClients.set(connectionId, {
    socket,
    clientId: normalizeText(context.clientId),
    teamMemberId: normalizeAssigneeId(context.teamMemberId),
    accountId: Number.isInteger(Number(context.accountId)) ? Number(context.accountId) : null,
    role: normalizeText(context.role)
  });

  socket.send(JSON.stringify({
    type: 'connected',
    sentAt: new Date().toISOString()
  }));

  broadcastRealtimePresence();

  socket.on('pong', () => {
    socket.isAlive = true;
  });

  socket.on('close', () => {
    removeRealtimeClient(connectionId, { broadcastPresence: true });
  });

  socket.on('error', () => {
    removeRealtimeClient(connectionId, { broadcastPresence: true });
  });

  socket.isAlive = true;
});

server.on('upgrade', (request, socket, head) => {
  let url;
  let authSession = null;

  try {
    url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  } catch (error) {
    socket.destroy();
    return;
  }

  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }

  authSession = getAuthenticatedSession(request.headers.cookie);

  if (AUTH_ENABLED && !authSession) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }

  realtimeServer.handleUpgrade(request, socket, head, (upgradedSocket) => {
    realtimeServer.emit('connection', upgradedSocket, request, {
      clientId: url.searchParams.get('clientId') || '',
      teamMemberId: authSession?.teamMemberId || null,
      accountId: authSession?.accountId || null,
      role: authSession?.role || ''
    });
  });
});

const heartbeatTimer = setInterval(() => {
  realtimeClients.forEach((client, connectionId) => {
    if (client.socket.readyState !== client.socket.OPEN) {
      removeRealtimeClient(connectionId);
      return;
    }

    if (client.socket.isAlive === false) {
      client.socket.terminate();
      removeRealtimeClient(connectionId, { broadcastPresence: true });
      return;
    }

    client.socket.isAlive = false;
    client.socket.ping();
  });
}, HEARTBEAT_INTERVAL_MS);

server.listen(PORT, HOST, () => {
  console.log(`\n✓ Patient Task Manager running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`  Share with department: http://<your-ip>:${PORT}`);
  console.log(`  Live sync: WebSockets enabled`);
  console.log(`  Database path: ${DB_PATH}`);
  if (AUTH_ENABLED) {
    console.log('  Online protection: staff login enabled, admin approval supported');
  }
  console.log('');
});

server.on('close', () => {
  clearInterval(heartbeatTimer);
  realtimeClients.forEach((client) => {
    try {
      client.socket.close();
    } catch (error) {
      // Ignore shutdown socket errors.
    }
  });
  realtimeClients.clear();
});

function initializeDatabase() {
  db.exec('PRAGMA foreign_keys = ON');
  ensureTeamMembersTable();
  ensureStaffAccountsTable();
  ensureDailyAdminAssignmentsTable();
  ensureDailyOnCallAssignmentsTable();
  ensureDailyPatientPoolTable();
  ensureSuggestionsTable();
  ensureInfectedEntriesTable();
  ensureErPatientsTable();
  ensureSurgeryPrepsTable();
  ensureTasksTable();
}

function ensureTeamMembersTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

function ensureStaffAccountsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS staff_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '${STAFF_ACCOUNT_STATUS_PENDING}',
      team_member_id INTEGER NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      approved_at DATETIME,
      last_login_at DATETIME,
      FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
    )
  `);

  const columns = db.prepare('PRAGMA table_info(staff_accounts)').all();
  const hasApprovedAt = columns.some((column) => column.name === 'approved_at');
  const hasLastLoginAt = columns.some((column) => column.name === 'last_login_at');

  if (!hasApprovedAt) {
    db.exec('ALTER TABLE staff_accounts ADD COLUMN approved_at DATETIME');
  }

  if (!hasLastLoginAt) {
    db.exec('ALTER TABLE staff_accounts ADD COLUMN last_login_at DATETIME');
  }

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_accounts_name
    ON staff_accounts(name)
  `);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_accounts_team_member
    ON staff_accounts(team_member_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_staff_accounts_status
    ON staff_accounts(status)
  `);

  db.prepare(`
    UPDATE staff_accounts
    SET status = ?
    WHERE status IS NULL
       OR TRIM(status) = ''
       OR status NOT IN (?, ?)
  `).run(
    STAFF_ACCOUNT_STATUS_PENDING,
    STAFF_ACCOUNT_STATUS_PENDING,
    STAFF_ACCOUNT_STATUS_APPROVED
  );
}

function ensureDailyPatientPoolTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_patient_pool_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pool_date TEXT NOT NULL,
      patient_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_daily_patient_pool_date
    ON daily_patient_pool_entries(pool_date)
  `);

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_patient_pool_unique_name
    ON daily_patient_pool_entries(pool_date, patient_name)
  `);
}

function ensureSuggestionsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT NOT NULL,
      submitted_by_role TEXT NOT NULL DEFAULT 'user',
      submitted_by_name TEXT,
      source_url TEXT,
      client_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const columns = db.prepare('PRAGMA table_info(suggestions)').all();
  const hasSubmittedByName = columns.some((column) => column.name === 'submitted_by_name');

  if (!hasSubmittedByName) {
    db.exec('ALTER TABLE suggestions ADD COLUMN submitted_by_name TEXT');
  }

  db.prepare(`
    UPDATE suggestions
    SET submitted_by_name = NULL
    WHERE submitted_by_name IS NOT NULL AND TRIM(submitted_by_name) = ''
  `).run();
}

function ensureInfectedEntriesTable() {
  const tableExists = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = 'infected_list_entries'
  `).get();

  if (!tableExists) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS infected_list_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_name TEXT NOT NULL,
        culture_type TEXT,
        agent TEXT,
        abx TEXT,
        question TEXT,
        question_answered INTEGER NOT NULL DEFAULT 0,
        comment TEXT,
        note TEXT,
        entry_date TEXT NOT NULL DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by_name TEXT
      )
    `);
    ensureInfectedEntryIndexes();
    return;
  }

  const columns = db.prepare('PRAGMA table_info(infected_list_entries)').all();
  const hasPatientName = columns.some((column) => column.name === 'patient_name');
  const hasCultureType = columns.some((column) => column.name === 'culture_type');
  const hasAgent = columns.some((column) => column.name === 'agent');
  const hasAbx = columns.some((column) => column.name === 'abx');
  const hasQuestion = columns.some((column) => column.name === 'question');
  const hasQuestionAnswered = columns.some((column) => column.name === 'question_answered');
  const hasComment = columns.some((column) => column.name === 'comment');

  if (!hasPatientName || !hasCultureType || !hasAgent || !hasAbx || !hasComment) {
    migrateInfectedEntriesTable(columns);
    return;
  }

  if (!hasQuestion) {
    db.exec(`ALTER TABLE infected_list_entries ADD COLUMN question TEXT`);
  }

  if (!hasQuestionAnswered) {
    db.exec(`ALTER TABLE infected_list_entries ADD COLUMN question_answered INTEGER NOT NULL DEFAULT 0`);
  }

  ensureUpdatedMetadataColumns('infected_list_entries');
  normalizeExistingInfectedEntries();
  ensureInfectedEntryIndexes();
}

function ensureInfectedEntryIndexes() {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_infected_list_entry_date
    ON infected_list_entries(entry_date)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_infected_list_patient
    ON infected_list_entries(patient_name)
  `);
}

function ensureErPatientsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS er_patients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL,
      id_number TEXT,
      ward TEXT,
      status TEXT NOT NULL DEFAULT 'ממתין',
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by_name TEXT
    )
  `);
  ensureUpdatedMetadataColumns('er_patients');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_er_patients_status
    ON er_patients(status)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_er_patients_name
    ON er_patients(patient_name)
  `);
  normalizeExistingErPatients();
}

function ensureSurgeryPrepsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS surgery_preps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL,
      surgery_type TEXT NOT NULL DEFAULT 'בוקר',
      status TEXT NOT NULL DEFAULT 'לא מוכן',
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by_name TEXT
    )
  `);

  const columns = db.prepare('PRAGMA table_info(surgery_preps)').all();
  const hasComment = columns.some((column) => column.name === 'comment');

  if (!hasComment) {
    db.exec(`ALTER TABLE surgery_preps ADD COLUMN comment TEXT`);
  }

  ensureUpdatedMetadataColumns('surgery_preps');
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_surgery_preps_type
    ON surgery_preps(surgery_type)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_surgery_preps_status
    ON surgery_preps(status)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_surgery_preps_name
    ON surgery_preps(patient_name)
  `);
}

function ensureDailyAdminAssignmentsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_admin_assignments (
      assignment_date TEXT PRIMARY KEY,
      team_member_id INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_member_id) REFERENCES team_members(id) ON DELETE CASCADE
    )
  `);
}

function ensureDailyOnCallAssignmentsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_on_call_assignments (
      assignment_date TEXT NOT NULL,
      role_key TEXT NOT NULL,
      assignee_name TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (assignment_date, role_key)
    )
  `);
}

function ensureTasksTable() {
  const tableExists = db.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name = 'tasks'
  `).get();

  if (!tableExists) {
    createTasksTable();
    return;
  }

  const columns = db.prepare('PRAGMA table_info(tasks)').all();
  const tableDefinition = db.prepare(`
    SELECT sql
    FROM sqlite_master
    WHERE type = 'table' AND name = 'tasks'
  `).get();
  const hasTaskDate = columns.some((column) => column.name === 'task_date');
  const hasSubcategory = columns.some((column) => column.name === 'subcategory');
  const hasComment = columns.some((column) => column.name === 'comment');
  const hasTaskTime = columns.some((column) => column.name === 'task_time');
  const hasHighPriority = columns.some((column) => column.name === 'high_priority');
  const hasPriorityPinnedAt = columns.some((column) => column.name === 'priority_pinned_at');
  const hasNightShiftAnchorDate = columns.some((column) => column.name === 'night_shift_anchor_date');
  const hasNightShiftMovedAt = columns.some((column) => column.name === 'night_shift_moved_at');
  const hasRecurringFollowupId = columns.some((column) => column.name === 'recurring_followup_id');
  const hasUpdatedByName = columns.some((column) => column.name === 'updated_by_name');
  const taskTableSql = String(tableDefinition?.sql || '');
  const needsCategoryConstraintRefresh = (
    taskTableSql.includes(`'ייעוצים'`) ||
    taskTableSql.includes(`'שיקומיסט'`) ||
    taskTableSql.includes(`'פיזיותרפיה/שיקום'`) ||
    !taskTableSql.includes(`'יעוצים'`) ||
    !taskTableSql.includes(`'שיקום'`) ||
    !taskTableSql.includes(`'קבלות'`)
  );

  if (!hasTaskDate || !hasSubcategory || !hasComment || !hasTaskTime || needsCategoryConstraintRefresh) {
    migrateLegacyTasksTable(columns);
    return;
  }

  if (!hasHighPriority) {
    db.exec(`ALTER TABLE tasks ADD COLUMN high_priority INTEGER NOT NULL DEFAULT 0`);
  }

  if (!hasPriorityPinnedAt) {
    db.exec(`ALTER TABLE tasks ADD COLUMN priority_pinned_at TEXT`);
  }

  if (!hasNightShiftAnchorDate) {
    db.exec(`ALTER TABLE tasks ADD COLUMN night_shift_anchor_date TEXT`);
  }

  if (!hasNightShiftMovedAt) {
    db.exec(`ALTER TABLE tasks ADD COLUMN night_shift_moved_at TEXT`);
  }

  if (!hasRecurringFollowupId) {
    db.exec(`ALTER TABLE tasks ADD COLUMN recurring_followup_id TEXT`);
  }

  if (!hasUpdatedByName) {
    db.exec(`ALTER TABLE tasks ADD COLUMN updated_by_name TEXT`);
  }

  normalizeExistingTasks();
  ensureTaskIndexes();
}

function createTasksTable() {
  const categoryCheck = TASK_CATEGORIES.map((category) => `'${category.replace(/'/g, "''")}'`).join(', ');
  const statusCheck = VALID_STATUSES.map((status) => `'${status}'`).join(', ');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL,
      description TEXT NOT NULL,
      comment TEXT,
      category TEXT NOT NULL CHECK (category IN (${categoryCheck})),
      subcategory TEXT,
      assignee_id INTEGER,
      task_date TEXT NOT NULL DEFAULT CURRENT_DATE,
      task_time TEXT,
      high_priority INTEGER NOT NULL DEFAULT 0,
      priority_pinned_at TEXT,
      night_shift_anchor_date TEXT,
      night_shift_moved_at TEXT,
      recurring_followup_id TEXT,
      status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN (${statusCheck})),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_by_name TEXT,
      FOREIGN KEY (assignee_id) REFERENCES team_members(id) ON DELETE SET NULL
    )
  `);
  ensureTaskIndexes();
}

function ensureTaskIndexes() {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_task_date
    ON tasks(task_date)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_category
    ON tasks(category)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_patient
    ON tasks(patient_name)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee
    ON tasks(assignee_id)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_followup_series
    ON tasks(recurring_followup_id)
  `);
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_followup_series_date
    ON tasks(recurring_followup_id, task_date)
    WHERE recurring_followup_id IS NOT NULL
  `);
}

function migrateLegacyTasksTable(columns) {
  const legacyTableName = `tasks_legacy_${Date.now()}`;
  const hasStatus = columns.some((column) => column.name === 'status');
  const hasCreatedAt = columns.some((column) => column.name === 'created_at');
  const hasUpdatedAt = columns.some((column) => column.name === 'updated_at');
  const hasCategory = columns.some((column) => column.name === 'category');
  const hasAssigneeId = columns.some((column) => column.name === 'assignee_id');
  const hasTaskDate = columns.some((column) => column.name === 'task_date');
  const hasSubcategory = columns.some((column) => column.name === 'subcategory');
  const hasComment = columns.some((column) => column.name === 'comment');
  const hasTaskTime = columns.some((column) => column.name === 'task_time');
  const hasHighPriority = columns.some((column) => column.name === 'high_priority');
  const hasPriorityPinnedAt = columns.some((column) => column.name === 'priority_pinned_at');
  const hasNightShiftAnchorDate = columns.some((column) => column.name === 'night_shift_anchor_date');
  const hasNightShiftMovedAt = columns.some((column) => column.name === 'night_shift_moved_at');
  const hasRecurringFollowupId = columns.some((column) => column.name === 'recurring_followup_id');

  db.transaction(() => {
    db.prepare(`ALTER TABLE tasks RENAME TO ${legacyTableName}`).run();
    createTasksTable();

    const infectedFilter = hasCategory
      ? `category IN ('${LEGACY_INFECTED_CATEGORY}', '${INFECTED_LIST_LABEL}')`
      : '0';

    db.prepare(`
      INSERT INTO infected_list_entries (note, entry_date, created_at)
      SELECT
        CASE
          WHEN TRIM(patient_name) = '' THEN description
          ELSE patient_name || ': ' || description
        END AS note,
        ${
          hasTaskDate
            ? `COALESCE(NULLIF(TRIM(task_date), ''), ${hasCreatedAt ? 'DATE(created_at)' : 'CURRENT_DATE'})`
            : hasCreatedAt
              ? 'DATE(created_at)'
              : 'CURRENT_DATE'
        } AS entry_date,
        ${hasCreatedAt ? 'created_at' : 'CURRENT_TIMESTAMP'} AS created_at
      FROM ${legacyTableName}
      WHERE ${infectedFilter}
    `).run();

    db.prepare(`
      INSERT INTO tasks (
        id,
        patient_name,
        description,
        comment,
        category,
        subcategory,
        assignee_id,
        task_date,
        task_time,
        high_priority,
        priority_pinned_at,
        night_shift_anchor_date,
        night_shift_moved_at,
        recurring_followup_id,
        status,
        created_at,
        updated_at,
        updated_by_name
      )
      SELECT
        id,
        patient_name,
        description,
        ${hasComment ? 'comment' : 'NULL'} AS comment,
        ${
          hasCategory
            ? `CASE
                WHEN category IN ('${LEGACY_INFECTED_CATEGORY}', '${INFECTED_LIST_LABEL}') THEN 'מעקבים'
                WHEN category = 'פיזיותרפיה/שיקום' THEN 'פיזיותרפיה'
                WHEN category IN (${TASK_CATEGORIES.map((category) => `'${category}'`).join(', ')}) THEN category
                ELSE 'מעקבים'
              END`
            : `'מעקבים'`
        } AS category,
        ${
          hasSubcategory
            ? `CASE
                WHEN category = 'מכתבים' AND subcategory IN (${LETTER_SUBCATEGORIES.map((item) => `'${item}'`).join(', ')}) THEN subcategory
                ELSE NULL
              END`
            : 'NULL'
        } AS subcategory,
        ${hasAssigneeId ? 'assignee_id' : 'NULL'} AS assignee_id,
        ${
          hasTaskDate
            ? `COALESCE(NULLIF(TRIM(task_date), ''), ${hasCreatedAt ? 'DATE(created_at)' : 'CURRENT_DATE'})`
            : hasCreatedAt
              ? 'DATE(created_at)'
              : 'CURRENT_DATE'
        } AS task_date,
        ${
          hasTaskTime
            ? `CASE
                WHEN task_time IS NULL OR TRIM(task_time) = '' THEN NULL
                WHEN TRIM(task_time) GLOB '[0-2][0-9]:[0-5][0-9]' THEN TRIM(task_time)
                ELSE NULL
              END`
            : 'NULL'
        } AS task_time,
        ${hasHighPriority ? `CASE WHEN high_priority IN (1, '1', 'true', 'TRUE') THEN 1 ELSE 0 END` : '0'} AS high_priority,
        ${
          hasPriorityPinnedAt
            ? `CASE
                WHEN priority_pinned_at IS NULL OR TRIM(priority_pinned_at) = '' THEN NULL
                ELSE priority_pinned_at
              END`
            : hasHighPriority
              ? `CASE
                  WHEN high_priority IN (1, '1', 'true', 'TRUE') THEN COALESCE(${hasUpdatedAt ? 'updated_at' : 'NULL'}, ${hasCreatedAt ? 'created_at' : 'NULL'}, CURRENT_TIMESTAMP)
                  ELSE NULL
                END`
              : 'NULL'
        } AS priority_pinned_at,
        ${
          hasNightShiftAnchorDate
            ? `CASE
                WHEN night_shift_anchor_date IS NULL OR TRIM(night_shift_anchor_date) = '' THEN NULL
                ELSE night_shift_anchor_date
              END`
            : 'NULL'
        } AS night_shift_anchor_date,
        ${
          hasNightShiftMovedAt
            ? `CASE
                WHEN night_shift_moved_at IS NULL OR TRIM(night_shift_moved_at) = '' THEN NULL
                ELSE night_shift_moved_at
              END`
            : 'NULL'
        } AS night_shift_moved_at,
        ${hasRecurringFollowupId ? `NULLIF(TRIM(recurring_followup_id), '')` : 'NULL'} AS recurring_followup_id,
        ${
          hasStatus
            ? `CASE
                WHEN status = 'in_progress' THEN 'in_progress'
                WHEN status = 'done_not_approved' THEN 'completed_pending_review'
                WHEN status = 'done' THEN 'done'
                WHEN status = 'completed_pending_review' THEN 'completed_pending_review'
                WHEN status = 'canceled' THEN 'canceled'
                WHEN status = 'not_started' THEN 'not_started'
                ELSE 'not_started'
              END`
            : `'not_started'`
        } AS status,
        ${hasCreatedAt ? 'created_at' : 'CURRENT_TIMESTAMP'} AS created_at,
        ${hasUpdatedAt ? 'updated_at' : 'CURRENT_TIMESTAMP'} AS updated_at,
        NULL AS updated_by_name
      FROM ${legacyTableName}
      WHERE NOT (${infectedFilter})
    `).run();

    db.prepare(`DROP TABLE ${legacyTableName}`).run();
  })();
}

function migrateInfectedEntriesTable(columns) {
  const legacyTableName = `infected_list_entries_legacy_${Date.now()}`;
  const hasNote = columns.some((column) => column.name === 'note');
  const hasEntryDate = columns.some((column) => column.name === 'entry_date');
  const hasCreatedAt = columns.some((column) => column.name === 'created_at');

  db.transaction(() => {
    db.prepare(`ALTER TABLE infected_list_entries RENAME TO ${legacyTableName}`).run();
    db.exec(`
      CREATE TABLE infected_list_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_name TEXT NOT NULL,
        culture_type TEXT,
        agent TEXT,
        abx TEXT,
        question TEXT,
        question_answered INTEGER NOT NULL DEFAULT 0,
        comment TEXT,
        note TEXT,
        entry_date TEXT NOT NULL DEFAULT CURRENT_DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_by_name TEXT
      )
    `);

    db.prepare(`
      INSERT INTO infected_list_entries (id, patient_name, culture_type, agent, abx, question, question_answered, comment, note, entry_date, created_at, updated_at, updated_by_name)
      SELECT
        id,
        CASE
          WHEN ${hasNote ? "note LIKE '%: %'" : '0'} THEN TRIM(SUBSTR(note, 1, INSTR(note, ': ') - 1))
          WHEN ${hasNote ? "note IS NOT NULL AND TRIM(note) != ''" : '0'} THEN TRIM(note)
          ELSE 'ללא שם'
        END AS patient_name,
        NULL AS culture_type,
        NULL AS agent,
        NULL AS abx,
        NULL AS question,
        0 AS question_answered,
        CASE
          WHEN ${hasNote ? "note LIKE '%: %'" : '0'} THEN TRIM(SUBSTR(note, INSTR(note, ': ') + 2))
          ELSE NULL
        END AS comment,
        ${hasNote ? 'note' : 'NULL'} AS note,
        ${hasEntryDate ? 'entry_date' : 'CURRENT_DATE'} AS entry_date,
        ${hasCreatedAt ? 'created_at' : 'CURRENT_TIMESTAMP'} AS created_at,
        ${hasCreatedAt ? 'created_at' : 'CURRENT_TIMESTAMP'} AS updated_at,
        NULL AS updated_by_name
      FROM ${legacyTableName}
    `).run();

    db.prepare(`DROP TABLE ${legacyTableName}`).run();
  })();

  normalizeExistingInfectedEntries();
  ensureInfectedEntryIndexes();
}

function normalizeExistingInfectedEntries() {
  db.transaction(() => {
    db.prepare(`
      UPDATE infected_list_entries
      SET patient_name = CASE
        WHEN patient_name IS NULL OR TRIM(patient_name) = '' THEN
          CASE
            WHEN note IS NULL OR TRIM(note) = '' THEN 'ללא שם'
            WHEN note LIKE '%: %' THEN TRIM(SUBSTR(note, 1, INSTR(note, ': ') - 1))
            ELSE TRIM(note)
          END
        ELSE TRIM(patient_name)
      END
    `).run();

    db.prepare(`
      UPDATE infected_list_entries
      SET comment = CASE
        WHEN (comment IS NULL OR TRIM(comment) = '') AND note LIKE '%: %' THEN TRIM(SUBSTR(note, INSTR(note, ': ') + 2))
        ELSE comment
      END
    `).run();

    db.prepare(`
      UPDATE infected_list_entries
      SET culture_type = NULL
      WHERE culture_type IS NOT NULL AND culture_type NOT IN (${INFECTED_CULTURE_TYPES.map((item) => `'${item}'`).join(', ')})
    `).run();

    db.prepare(`
      UPDATE infected_list_entries
      SET question = NULL
      WHERE question IS NOT NULL AND TRIM(question) = ''
    `).run();

    db.prepare(`
      UPDATE infected_list_entries
      SET question_answered = CASE
        WHEN question_answered IN (1, '1', 'true', 'TRUE') THEN 1
        ELSE 0
      END
    `).run();
  })();
}

function ensureUpdatedMetadataColumns(tableName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasUpdatedAt = columns.some((column) => column.name === 'updated_at');
  const hasUpdatedByName = columns.some((column) => column.name === 'updated_by_name');
  const hasCreatedAt = columns.some((column) => column.name === 'created_at');

  if (!hasUpdatedAt) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN updated_at DATETIME`);
  }

  if (!hasUpdatedByName) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN updated_by_name TEXT`);
  }

  db.prepare(`
    UPDATE ${tableName}
    SET updated_at = COALESCE(updated_at, ${hasCreatedAt ? 'created_at' : 'CURRENT_TIMESTAMP'}, CURRENT_TIMESTAMP)
    WHERE updated_at IS NULL OR TRIM(updated_at) = ''
  `).run();
}

function normalizeExistingErPatients() {
  db.transaction(() => {
    db.prepare(`
      UPDATE er_patients
      SET status = CASE
        WHEN status = 'ממתין' THEN 'ממתין'
        WHEN status = 'נבדק' THEN 'נבדק'
        WHEN status = 'סגור' THEN 'סגור'
        WHEN status IN ('אשפוז', 'שחרור') THEN 'סגור'
        ELSE 'ממתין'
      END
      WHERE status IS NULL OR status NOT IN ('ממתין', 'נבדק', 'סגור')
    `).run();

    const updateIdNumber = db.prepare(`
      UPDATE er_patients
      SET id_number = ?
      WHERE id = ?
    `);

    const rows = db.prepare('SELECT id, id_number FROM er_patients').all();
    rows.forEach((row) => {
      const normalizedIdNumber = normalizeErPatientIdNumber(row.id_number);
      const currentValue = row.id_number === null || row.id_number === undefined ? null : String(row.id_number);
      if (currentValue !== normalizedIdNumber) {
        updateIdNumber.run(normalizedIdNumber, row.id);
      }
    });
  })();
}

function normalizeExistingTasks() {
  db.transaction(() => {
    db.prepare(`
      UPDATE tasks
      SET status = CASE
        WHEN status = 'done_not_approved' THEN 'completed_pending_review'
        WHEN status IN ('in_progress', 'done', 'completed_pending_review', 'canceled', 'not_started') THEN status
        ELSE 'not_started'
      END
    `).run();

    db.prepare(`
      UPDATE tasks
      SET task_date = COALESCE(NULLIF(TRIM(task_date), ''), DATE(created_at))
      WHERE task_date IS NULL OR TRIM(task_date) = ''
    `).run();

    db.prepare(`
      UPDATE tasks
      SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
      WHERE updated_at IS NULL OR TRIM(updated_at) = ''
    `).run();

    db.prepare(`
      UPDATE tasks
      SET updated_by_name = NULL
      WHERE updated_by_name IS NOT NULL AND TRIM(updated_by_name) = ''
    `).run();

    db.prepare(`
      UPDATE tasks
      SET high_priority = CASE
        WHEN high_priority IN (1, '1', 'true', 'TRUE') THEN 1
        ELSE 0
      END
    `).run();

    db.prepare(`
      UPDATE tasks
      SET priority_pinned_at = COALESCE(NULLIF(TRIM(priority_pinned_at), ''), updated_at, created_at, CURRENT_TIMESTAMP)
      WHERE high_priority = 1
        AND (priority_pinned_at IS NULL OR TRIM(priority_pinned_at) = '')
    `).run();

    db.prepare(`
      UPDATE tasks
      SET priority_pinned_at = NULL
      WHERE high_priority = 0
        AND priority_pinned_at IS NOT NULL
        AND TRIM(priority_pinned_at) = ''
    `).run();

    db.prepare(`
      UPDATE tasks
      SET recurring_followup_id = NULL
      WHERE recurring_followup_id IS NOT NULL AND TRIM(recurring_followup_id) = ''
    `).run();

    db.prepare(`
      UPDATE tasks
      SET night_shift_anchor_date = NULL
      WHERE night_shift_anchor_date IS NOT NULL AND TRIM(night_shift_anchor_date) = ''
    `).run();

    db.prepare(`
      UPDATE tasks
      SET night_shift_moved_at = NULL
      WHERE night_shift_moved_at IS NOT NULL AND TRIM(night_shift_moved_at) = ''
    `).run();

    const infectedTasks = db.prepare(`
      SELECT *
      FROM tasks
      WHERE category IN (?, ?)
    `).all(LEGACY_INFECTED_CATEGORY, INFECTED_LIST_LABEL);

    const insertEntry = db.prepare(`
      INSERT INTO infected_list_entries (note, entry_date, created_at)
      VALUES (?, ?, ?)
    `);
    const deleteTask = db.prepare('DELETE FROM tasks WHERE id = ?');

    for (const task of infectedTasks) {
      const note = task.patient_name ? `${task.patient_name}: ${task.description}` : task.description;
      insertEntry.run(note, task.task_date || todayDate(), task.created_at || new Date().toISOString());
      deleteTask.run(task.id);
    }

    db.prepare(`
      UPDATE tasks
      SET category = 'יעוצים'
      WHERE category = 'ייעוצים'
    `).run();

    db.prepare(`
      UPDATE tasks
      SET category = 'מעקבים'
      WHERE category NOT IN (${TASK_CATEGORIES.map((category) => `'${category}'`).join(', ')})
    `).run();

  db.prepare(`
    UPDATE tasks
    SET category = 'פיזיותרפיה'
    WHERE category = 'פיזיותרפיה/שיקום'
  `).run();

  db.prepare(`
    UPDATE tasks
    SET category = 'שיקום'
    WHERE category = 'שיקומיסט'
  `).run();

    db.prepare(`
      UPDATE tasks
      SET subcategory = NULL
      WHERE category != 'מכתבים'
    `).run();
  })();
}

function getRequestClientId(req) {
  return normalizeText(req.headers['x-client-id']);
}

function sendMutationResponse(req, res, payload) {
  broadcastRealtimeReload(getRequestClientId(req));
  return res.json(payload);
}

function getAuditActorName(sessionOrReq) {
  const session = sessionOrReq?.authSession || sessionOrReq || null;
  const displayName = normalizeText(session?.displayName);

  if (displayName) {
    return displayName;
  }

  if (session?.role === 'admin') {
    return ADMIN_USERNAME || 'Admin';
  }

  if (session?.role === 'local') {
    return 'מנהל מקומי';
  }

  return null;
}

function broadcastRealtimeMessage(type, payload = {}) {
  const message = JSON.stringify({
    type,
    sentAt: new Date().toISOString(),
    ...payload
  });

  realtimeClients.forEach((client, connectionId) => {
    if (client.socket.readyState !== client.socket.OPEN) {
      removeRealtimeClient(connectionId);
      return;
    }

    try {
      client.socket.send(message);
    } catch (error) {
      removeRealtimeClient(connectionId);
      try {
        client.socket.terminate();
      } catch (closeError) {
        // Ignore socket shutdown errors.
      }
    }
  });
}

function broadcastRealtimeReload(sourceClientId = '') {
  broadcastRealtimeMessage('reload', {
    sourceClientId: normalizeText(sourceClientId)
  });
}

function broadcastRealtimePresence() {
  broadcastRealtimeMessage('presence', {
    onlineTeamMemberIds: Array.from(getOnlineTeamMemberIdSet())
  });
}

function removeRealtimeClient(connectionId, options = {}) {
  const { broadcastPresence = false } = options;
  const existed = realtimeClients.delete(connectionId);
  if (existed && broadcastPresence) {
    broadcastRealtimePresence();
  }
}

function parseCookies(cookieHeader) {
  if (typeof cookieHeader !== 'string' || cookieHeader.trim() === '') {
    return {};
  }

  return cookieHeader.split(';').reduce((cookies, part) => {
    const [rawName, ...rawValueParts] = part.split('=');
    const name = rawName ? rawName.trim() : '';
    if (!name) {
      return cookies;
    }
    cookies[name] = decodeURIComponent(rawValueParts.join('=').trim());
    return cookies;
  }, {});
}

function requireAuthenticatedSession(req, res, next) {
  if (req.path === '/health') {
    req.authSession = null;
    return next();
  }

  if (!AUTH_ENABLED) {
    req.authSession = {
      nonce: 'auth-disabled',
      expiresAt: null,
      role: 'local',
      displayName: 'מנהל מקומי',
      canEdit: true,
      canAdmin: true,
      accountId: null,
      teamMemberId: null
    };
    return next();
  }

  const session = getAuthenticatedSession(req.headers.cookie);
  if (!session) {
    return res.status(401).json({
      auth_enabled: true,
      authenticated: false,
      role: null,
      admin_available: ADMIN_LOGIN_ENABLED,
      error: 'נדרשת התחברות.'
    });
  }

  req.authSession = session;
  return next();
}

function getRequestOrigin(req) {
  const forwardedProtocol = normalizeText(String(req.headers['x-forwarded-proto'] || '').split(',')[0]);
  const protocol = forwardedProtocol || (req.protocol === 'https' ? 'https' : 'http');
  const forwardedHost = normalizeText(String(req.headers['x-forwarded-host'] || '').split(',')[0]);
  const host = forwardedHost || normalizeText(req.headers.host);

  if (host) {
    return `${protocol}://${host}`;
  }

  return `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
}

function createSessionCookieValue(sessionInput = {}) {
  const sessionConfig = typeof sessionInput === 'string'
    ? { role: sessionInput }
    : (sessionInput || {});
  const role = sessionConfig.role === 'admin' ? 'admin' : 'staff';
  const accountId = role === 'staff' ? Number(sessionConfig.accountId) : null;

  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payloadObject = {
    nonce: randomUUID(),
    expiresAt,
    role
  };

  if (role === 'staff' && Number.isInteger(accountId) && accountId > 0) {
    payloadObject.accountId = accountId;
  }

  const payload = Buffer.from(JSON.stringify(payloadObject)).toString('base64url');
  const signature = signSessionPayload(payload);
  return `${payload}.${signature}`;
}

function parseSessionCookieValue(cookieValue) {
  if (typeof cookieValue !== 'string' || cookieValue.trim() === '') {
    return null;
  }

  const [payload, signature] = cookieValue.split('.');
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signSessionPayload(payload);
  const signatureMatches = safeCompareStrings(signature, expectedSignature);
  if (!signatureMatches) {
    return null;
  }

  try {
    const sessionData = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const expiresAt = Number(sessionData.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return null;
    }

    const role = sessionData.role === 'admin'
      ? 'admin'
      : (sessionData.role === 'staff' ? 'staff' : null);
    if (!role) {
      return null;
    }

    const parsedSession = {
      nonce: sessionData.nonce,
      expiresAt,
      role
    };

    if (role === 'staff') {
      const accountId = Number(sessionData.accountId);
      if (!Number.isInteger(accountId) || accountId <= 0) {
        return null;
      }
      parsedSession.accountId = accountId;
    }

    return {
      ...parsedSession
    };
  } catch (error) {
    return null;
  }
}

function getAuthenticatedSession(cookieHeader) {
  if (!AUTH_ENABLED) {
    return {
      nonce: 'auth-disabled',
      expiresAt: null,
      role: 'local'
    };
  }

  const cookies = parseCookies(cookieHeader);
  const parsedSession = parseSessionCookieValue(cookies[SESSION_COOKIE_NAME]);
  if (!parsedSession) {
    return null;
  }

  if (parsedSession.role === 'admin') {
    return {
      ...parsedSession,
      displayName: ADMIN_USERNAME || 'Admin',
      canEdit: true,
      canAdmin: true,
      accountId: null,
      teamMemberId: null
    };
  }

  const account = getStaffAccountById(parsedSession.accountId);
  if (!account || account.status !== STAFF_ACCOUNT_STATUS_APPROVED || !account.team_member_id) {
    return null;
  }

  return {
    ...parsedSession,
    role: 'staff',
    displayName: account.name,
    canEdit: true,
    canAdmin: false,
    accountId: account.id,
    teamMemberId: account.team_member_id
  };
}

function signSessionPayload(payload) {
  return createHmac('sha256', SESSION_SECRET)
    .update(payload)
    .digest('base64url');
}

function safeCompareStrings(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function isValidAccessCode(accessCode, requestedMode = 'user') {
  if (!AUTH_ENABLED) {
    return true;
  }

  if (requestedMode === 'admin') {
    return false;
  }

  if (!PUBLIC_ACCESS_CODE) {
    return false;
  }

  return safeCompareStrings(accessCode, PUBLIC_ACCESS_CODE);
}

function isValidAdminCredentials(username, password) {
  if (!ADMIN_LOGIN_ENABLED) {
    return false;
  }

  return safeCompareStrings(String(username || '').trim(), ADMIN_USERNAME)
    && safeCompareStrings(String(password || ''), ADMIN_PASSWORD);
}

function buildSessionCookieHeader(cookieValue) {
  const maxAgeSeconds = Math.floor(SESSION_TTL_MS / 1000);
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(cookieValue)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`
  ];

  if (SESSION_COOKIE_SECURE) {
    cookieParts.push('Secure');
  }

  if (SESSION_COOKIE_DOMAIN) {
    cookieParts.push(`Domain=${SESSION_COOKIE_DOMAIN}`);
  }

  return cookieParts.join('; ');
}

function buildExpiredSessionCookieHeader() {
  const cookieParts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ];

  if (SESSION_COOKIE_SECURE) {
    cookieParts.push('Secure');
  }

  if (SESSION_COOKIE_DOMAIN) {
    cookieParts.push(`Domain=${SESSION_COOKIE_DOMAIN}`);
  }

  return cookieParts.join('; ');
}

function sessionCanEdit(session) {
  if (!session) {
    return false;
  }

  return session.role === 'local' || session.role === 'admin' || session.role === 'staff';
}

function sessionCanAdmin(session) {
  if (!session) {
    return false;
  }

  return session.role === 'local' || session.role === 'admin';
}

function requireAdminSession(req, res, next) {
  if (sessionCanAdmin(req.authSession)) {
    return next();
  }

  return res.status(403).json({ error: 'רק מנהל יכול לבצע את הפעולה הזו.' });
}

function requireMutationEditorSession(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  if (sessionCanEdit(req.authSession)) {
    return next();
  }

  return res.status(403).json({ error: 'רק אנשי צוות מאושרים יכולים לערוך נתונים.' });
}

function getTaskById(id) {
  return db.prepare(`
    SELECT
      tasks.*,
      team_members.name AS assignee_name,
      CASE
        WHEN tasks.recurring_followup_id IS NOT NULL AND EXISTS (
          SELECT 1
          FROM tasks AS next_day_task
          WHERE next_day_task.recurring_followup_id = tasks.recurring_followup_id
            AND next_day_task.task_date = DATE(tasks.task_date, '+1 day')
            AND next_day_task.category = tasks.category
            AND next_day_task.id != tasks.id
        ) THEN 1
        ELSE 0
      END AS has_next_day_copy
    FROM tasks
    LEFT JOIN team_members ON team_members.id = tasks.assignee_id
    WHERE tasks.id = ?
  `).get(id);
}

function getTeamMembers() {
  const onlineTeamMemberIds = getOnlineTeamMemberIdSet();
  const members = db.prepare(`
    SELECT
      team_members.*,
      staff_accounts.id AS account_id,
      staff_accounts.status AS account_status,
      staff_accounts.created_at AS account_created_at,
      staff_accounts.approved_at AS account_approved_at,
      staff_accounts.last_login_at AS account_last_login_at
    FROM team_members
    LEFT JOIN staff_accounts
      ON staff_accounts.team_member_id = team_members.id
    ORDER BY team_members.name COLLATE NOCASE
  `).all();

  return members.map((member) => ({
    ...member,
    is_online: onlineTeamMemberIds.has(String(member.id))
  }));
}

function getTeamMemberById(id) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return db.prepare(`
    SELECT
      team_members.*,
      staff_accounts.id AS account_id,
      staff_accounts.status AS account_status,
      staff_accounts.created_at AS account_created_at,
      staff_accounts.approved_at AS account_approved_at,
      staff_accounts.last_login_at AS account_last_login_at
    FROM team_members
    LEFT JOIN staff_accounts
      ON staff_accounts.team_member_id = team_members.id
    WHERE team_members.id = ?
  `).get(parsedId);
}

function getOnlineTeamMemberIdSet() {
  const onlineIds = new Set();

  realtimeClients.forEach((client) => {
    if (!client) {
      return;
    }

    const teamMemberId = normalizeAssigneeId(client.teamMemberId);
    if (teamMemberId !== null) {
      onlineIds.add(String(teamMemberId));
    }
  });

  return onlineIds;
}

function getStaffAccountByName(name) {
  const normalizedName = normalizeStaffAccountName(name);
  if (!normalizedName) {
    return null;
  }

  return db.prepare(`
    SELECT
      staff_accounts.*,
      team_members.name AS team_member_name
    FROM staff_accounts
    LEFT JOIN team_members
      ON team_members.id = staff_accounts.team_member_id
    WHERE staff_accounts.name = ?
  `).get(normalizedName) || null;
}

function getStaffAccountById(id) {
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }

  return db.prepare(`
    SELECT
      staff_accounts.*,
      team_members.name AS team_member_name
    FROM staff_accounts
    LEFT JOIN team_members
      ON team_members.id = staff_accounts.team_member_id
    WHERE staff_accounts.id = ?
  `).get(parsedId) || null;
}

function ensureTeamMemberForName(name) {
  const normalizedName = normalizeStaffAccountName(name) || normalizeText(name);
  if (!normalizedName) {
    return null;
  }

  const existing = db.prepare('SELECT id FROM team_members WHERE name = ?').get(normalizedName);
  if (existing?.id) {
    return existing.id;
  }

  return db.prepare('INSERT INTO team_members (name) VALUES (?)').run(normalizedName).lastInsertRowid;
}

function normalizeStaffAccountName(value) {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');
  if (!normalized || !/[\u0590-\u05FF]/.test(normalized)) {
    return '';
  }

  return normalized;
}

function normalizeStaffPassword(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function isValidStaffPassword(password) {
  return typeof password === 'string' && /^\d{4,}$/.test(password);
}

function hashStaffPassword(password, salt) {
  return scryptSync(password, salt, 64).toString('hex');
}

function verifyStaffPassword(password, salt, passwordHash) {
  if (!password || !salt || !passwordHash) {
    return false;
  }

  const candidateHash = hashStaffPassword(password, salt);
  return safeCompareStrings(candidateHash, passwordHash);
}

function authenticateStaffAccount(name, password) {
  const normalizedName = normalizeStaffAccountName(name);
  const normalizedPassword = normalizeStaffPassword(password);

  if (!normalizedName || !normalizedPassword) {
    return {
      ok: false,
      error: 'יש להזין שם בעברית וסיסמה.'
    };
  }

  const account = getStaffAccountByName(normalizedName);
  if (!account) {
    return {
      ok: false,
      error: 'השם או הסיסמה שגויים.'
    };
  }

  if (account.status !== STAFF_ACCOUNT_STATUS_APPROVED) {
    return {
      ok: false,
      error: 'החשבון הזה עדיין ממתין לאישור מנהל.'
    };
  }

  if (!verifyStaffPassword(normalizedPassword, account.password_salt, account.password_hash)) {
    return {
      ok: false,
      error: 'השם או הסיסמה שגויים.'
    };
  }

  return {
    ok: true,
    account
  };
}

function teamMemberExists(id) {
  return Boolean(db.prepare('SELECT id FROM team_members WHERE id = ?').get(id));
}

function getPatientPoolEntriesForDate(poolDate) {
  return db.prepare(`
    SELECT patient_name
    FROM daily_patient_pool_entries
    WHERE pool_date = ?
    ORDER BY LOWER(patient_name) COLLATE NOCASE, id ASC
  `).all(poolDate).map((entry) => entry.patient_name);
}

function getActivePatientPoolState() {
  const latestPool = db.prepare(`
    SELECT pool_date
    FROM daily_patient_pool_entries
    ORDER BY pool_date DESC, id DESC
    LIMIT 1
  `).get();

  if (!latestPool?.pool_date) {
    return {
      pool_date: null,
      patients: []
    };
  }

  return {
    pool_date: latestPool.pool_date,
    patients: getPatientPoolEntriesForDate(latestPool.pool_date)
  };
}

function replaceActivePatientPool(poolDate, patientNames) {
  const normalizedNames = uniqueNormalizedNames(patientNames);

  db.transaction(() => {
    db.prepare('DELETE FROM daily_patient_pool_entries').run();

    const insertEntry = db.prepare(`
      INSERT INTO daily_patient_pool_entries (pool_date, patient_name)
      VALUES (?, ?)
    `);

    for (const patientName of normalizedNames) {
      insertEntry.run(poolDate, patientName);
    }
  })();

  return getPatientPoolEntriesForDate(poolDate);
}

function uniqueNormalizedNames(names) {
  return Array.from(new Set(
    (Array.isArray(names) ? names : [])
      .map((name) => normalizeText(name))
      .filter(Boolean)
  ));
}

function isAcceptedExcelFile(fileName) {
  if (typeof fileName !== 'string') {
    return false;
  }

  const lowerName = fileName.toLowerCase();
  return EXCEL_FILE_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
}

function extractPatientNamesFromExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
    header: 1,
    raw: false,
    defval: '',
    blankrows: false
  });

  if (!Array.isArray(rows) || rows.length === 0) {
    return [];
  }

  const headerRow = rows.find((row) => Array.isArray(row) && row.some((cell) => normalizeText(cell)));
  let preferredColumnIndex = -1;

  if (headerRow) {
    preferredColumnIndex = headerRow.findIndex((cell) => isLikelyPatientHeader(cell));
  }

  if (preferredColumnIndex === -1) {
    preferredColumnIndex = getLikelyPatientNameColumnIndex(rows);
  }

  const extractedNames = rows
    .map((row) => extractPatientNameFromRow(row, preferredColumnIndex))
    .filter(Boolean);

  return uniqueNormalizedNames(extractedNames);
}

function extractPatientNameFromRow(row, preferredColumnIndex) {
  if (!Array.isArray(row)) {
    return '';
  }

  if (preferredColumnIndex >= 0) {
    const candidate = normalizeImportedPatientName(row[preferredColumnIndex]);
    if (candidate && !isLikelyPatientHeader(candidate)) {
      return candidate;
    }
  }

  const fallbackCandidate = row
    .map((cell) => normalizeImportedPatientName(cell))
    .find((candidate) => candidate && !isLikelyPatientHeader(candidate));

  return fallbackCandidate || '';
}

function getLikelyPatientNameColumnIndex(rows) {
  const columnScores = new Map();

  for (const row of rows) {
    if (!Array.isArray(row)) {
      continue;
    }

    row.forEach((cell, index) => {
      const score = scoreCellAsPotentialPatientName(cell);
      columnScores.set(index, (columnScores.get(index) || 0) + score);
    });
  }

  let bestIndex = -1;
  let bestScore = -Infinity;

  for (const [index, score] of columnScores.entries()) {
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestScore > 0 ? bestIndex : -1;
}

function scoreCellAsPotentialPatientName(cellValue) {
  const normalized = normalizeImportedPatientName(cellValue);

  if (!normalized || isLikelyPatientHeader(normalized)) {
    return 0;
  }

  if (/^\d+$/.test(normalized)) {
    return -3;
  }

  let score = 1;

  if (/[A-Za-z\u0590-\u05FF]/.test(normalized)) {
    score += 2;
  }

  if (normalized.length >= 2 && normalized.length <= 80) {
    score += 1;
  }

  return score;
}

function normalizeImportedPatientName(value) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/\s+/g, ' ').trim();
}

function isLikelyPatientHeader(value) {
  const normalized = normalizeImportedPatientName(value).toLowerCase();
  return PATIENT_POOL_HEADER_CANDIDATES.includes(normalized);
}

function addDays(dateString, daysToAdd) {
  const [year, month, day] = String(dateString || '').split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + daysToAdd);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function getExactNextDayCopyForTask(task) {
  if (!task?.recurring_followup_id || !task?.task_date || !task?.category) {
    return null;
  }

  return db.prepare(`
    SELECT *
    FROM tasks
    WHERE recurring_followup_id = ?
      AND task_date = ?
      AND category = ?
      AND id != ?
    ORDER BY id DESC
    LIMIT 1
  `).get(
    task.recurring_followup_id,
    addDays(task.task_date, 1),
    task.category,
    task.id
  ) || null;
}

function getAnyNextDayCopyForTask(task) {
  if (!task?.recurring_followup_id || !task?.task_date) {
    return null;
  }

  return db.prepare(`
    SELECT *
    FROM tasks
    WHERE recurring_followup_id = ?
      AND task_date = ?
      AND id != ?
    ORDER BY id DESC
    LIMIT 1
  `).get(
    task.recurring_followup_id,
    addDays(task.task_date, 1),
    task.id
  ) || null;
}

function getLinkedNextDayCopyForSync(sourceTask, previousTaskDate = null) {
  if (!sourceTask?.recurring_followup_id || !sourceTask?.task_date || !sourceTask?.category) {
    return null;
  }

  const candidateDates = [addDays(sourceTask.task_date, 1)];
  if (previousTaskDate && previousTaskDate !== sourceTask.task_date) {
    candidateDates.push(addDays(previousTaskDate, 1));
  }

  const uniqueDates = [...new Set(candidateDates)];
  const placeholders = uniqueDates.map(() => '?').join(', ');

  return db.prepare(`
    SELECT *
    FROM tasks
    WHERE recurring_followup_id = ?
      AND category = ?
      AND id != ?
      AND task_date IN (${placeholders})
    ORDER BY CASE WHEN task_date = ? THEN 0 ELSE 1 END, id DESC
    LIMIT 1
  `).get(
    sourceTask.recurring_followup_id,
    sourceTask.category,
    sourceTask.id,
    ...uniqueDates,
    addDays(sourceTask.task_date, 1)
  ) || null;
}

function getMirroredNextDayStatus(sourceStatus) {
  return sourceStatus === 'in_progress' ? 'in_progress' : 'not_started';
}

function syncNextDayCopyFromSource(sourceTask, editorName, options = {}) {
  const linkedTask = getLinkedNextDayCopyForSync(sourceTask, options.previousTaskDate || null);
  if (!linkedTask) {
    return null;
  }

  const nextTaskDate = addDays(sourceTask.task_date, 1);
  const nextStatus = getMirroredNextDayStatus(sourceTask.status);
  const nextPriorityPinnedAt = Number(sourceTask.high_priority) === 1
    ? (sourceTask.priority_pinned_at || linkedTask.priority_pinned_at || new Date().toISOString())
    : null;

  db.prepare(`
    UPDATE tasks
    SET patient_name = ?,
        description = ?,
        comment = ?,
        category = ?,
        subcategory = ?,
        assignee_id = ?,
        task_date = ?,
        task_time = ?,
        high_priority = ?,
        priority_pinned_at = ?,
        night_shift_anchor_date = NULL,
        night_shift_moved_at = NULL,
        status = ?,
        updated_at = CURRENT_TIMESTAMP,
        updated_by_name = ?
    WHERE id = ?
  `).run(
    sourceTask.patient_name,
    sourceTask.description,
    normalizeOptionalText(sourceTask.comment),
    sourceTask.category,
    sourceTask.subcategory,
    normalizeAssigneeId(sourceTask.assignee_id),
    nextTaskDate,
    normalizeTaskTime(sourceTask.task_time),
    Number(sourceTask.high_priority) === 1 ? 1 : 0,
    nextPriorityPinnedAt,
    nextStatus,
    editorName,
    linkedTask.id
  );

  return getTaskById(linkedTask.id);
}

function deleteTasksWithFollowupCascade(tasks) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return 0;
  }

  const directIds = [];
  const followupStartDates = new Map();

  for (const task of tasks) {
    if (task.recurring_followup_id && task.category === FOLLOWUP_CATEGORY) {
      const currentStartDate = followupStartDates.get(task.recurring_followup_id);
      if (!currentStartDate || task.task_date < currentStartDate) {
        followupStartDates.set(task.recurring_followup_id, task.task_date);
      }
      continue;
    }

    directIds.push(task.id);
  }

  const deleteDirect = directIds.length > 0
    ? db.prepare(`DELETE FROM tasks WHERE id IN (${directIds.map(() => '?').join(', ')})`)
    : null;
  const deleteSeries = db.prepare(`
    DELETE FROM tasks
    WHERE recurring_followup_id = ?
      AND task_date >= ?
  `);

  return db.transaction(() => {
    let deleted = 0;

    if (deleteDirect) {
      deleted += deleteDirect.run(...directIds).changes;
    }

    for (const [seriesId, startDate] of followupStartDates.entries()) {
      deleted += deleteSeries.run(seriesId, startDate).changes;
    }

    return deleted;
  })();
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizeBooleanEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function normalizePositiveIntegerEnv(value, fallback) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function ensureParentDirectoryExists(filePath) {
  const parentDirectory = path.dirname(filePath);
  fs.mkdirSync(parentDirectory, { recursive: true });
}

function normalizeOptionalText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeCategory(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizeTaskDate(value) {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return '';
  }

  return trimmed;
}

function normalizeOnCallRoleKey(value) {
  const normalized = normalizeText(value);
  return Object.prototype.hasOwnProperty.call(DAILY_ON_CALL_ROLE_MAP, normalized)
    ? normalized
    : null;
}

function normalizeOnCallAssigneeName(roleKey, value) {
  const role = DAILY_ON_CALL_ROLE_MAP[roleKey];
  if (!role) {
    return null;
  }

  const normalizedValue = normalizeOptionalText(value);
  if (!normalizedValue) {
    return null;
  }

  return role.options.includes(normalizedValue) ? normalizedValue : null;
}

function normalizeTaskTime(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function normalizeStatus(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return VALID_STATUSES.includes(trimmed) ? trimmed : '';
}

function normalizeHighPriority(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return 1;
  }
  if (value === false || value === 0 || value === '0' || value === 'false' || value === '' || value === null) {
    return 0;
  }
  return null;
}

function normalizeSubcategory(value, category) {
  if (category !== 'מכתבים') {
    return null;
  }

  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return LETTER_SUBCATEGORIES.includes(trimmed) ? trimmed : null;
}

function normalizeInfectedCultureType(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return INFECTED_CULTURE_TYPES.includes(trimmed) ? trimmed : null;
}

function normalizeBooleanFlag(value, fallback = null) {
  if (value === true || value === 1 || value === '1' || value === 'true' || value === 'TRUE') {
    return 1;
  }
  if (value === false || value === 0 || value === '0' || value === 'false' || value === 'FALSE' || value === '' || value === null) {
    return 0;
  }
  return fallback;
}

function normalizeErPatientStatus(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return ER_PATIENT_STATUSES.includes(trimmed) ? trimmed : '';
}

function normalizeErPatientIdNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const cleaned = trimmed.replace(/[^0-9zZ]/g, '');
  const hasLeadingZ = /^[zZ]/.test(cleaned);
  const numericPart = cleaned
    .slice(hasLeadingZ ? 1 : 0)
    .replace(/[zZ]/g, '');
  const normalized = `${hasLeadingZ ? 'z' : ''}${numericPart}`.slice(0, 12);

  return normalized || null;
}

function isValidErPatientIdNumberField(value) {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  return /^(?:[zZ][0-9]{0,11}|[0-9]{1,12})$/.test(trimmed);
}

function normalizeSurgeryPrepType(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return SURGERY_PREP_TYPES.includes(trimmed) ? trimmed : '';
}

function normalizeSurgeryPrepStatus(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return SURGERY_PREP_STATUSES.includes(trimmed) ? trimmed : '';
}

function categoryAllowsEmptyDescription(category) {
  return OPTIONAL_DESCRIPTION_CATEGORIES.includes(category);
}

function normalizeAssigneeId(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return NaN;
  }

  return parsed;
}

function todayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function effectiveOnCallDate(now = new Date()) {
  const current = now instanceof Date ? new Date(now.getTime()) : new Date();
  const cutoff = new Date(current);
  cutoff.setHours(ON_CALL_CUTOFF_HOUR, ON_CALL_CUTOFF_MINUTE, 0, 0);
  return current < cutoff
    ? addDays(todayDate(), -1)
    : todayDate();
}

function getAdmissionsTransferContext(now = new Date()) {
  const current = now instanceof Date ? new Date(now.getTime()) : new Date();
  const currentDate = formatDateForStorage(current);
  const currentHour = current.getHours();

  if (currentHour >= ADMISSIONS_NIGHT_SHIFT_START_HOUR) {
    return {
      taskDate: currentDate,
      nightShiftAnchorDate: currentDate
    };
  }

  if (currentHour < ADMISSIONS_NIGHT_SHIFT_END_HOUR) {
    const previousDate = addDays(currentDate, -1);
    return {
      taskDate: previousDate,
      nightShiftAnchorDate: previousDate
    };
  }

  return {
    taskDate: currentDate,
    nightShiftAnchorDate: null
  };
}

function getNewTaskCreationContext(now = new Date()) {
  const current = now instanceof Date ? new Date(now.getTime()) : new Date();
  const currentDate = formatDateForStorage(current);
  const currentHour = current.getHours();

  if (currentHour < TASK_NIGHT_SHIFT_MORNING_END_HOUR) {
    const previousDate = addDays(currentDate, -1);
    return {
      taskDate: previousDate,
      nightShiftAnchorDate: previousDate
    };
  }

  if (currentHour >= TASK_NIGHT_SHIFT_START_HOUR) {
    return {
      taskDate: currentDate,
      nightShiftAnchorDate: currentDate
    };
  }

  return {
    taskDate: currentDate,
    nightShiftAnchorDate: null
  };
}

function getDefaultNightShiftAnchorDateForTask(taskDate, now = new Date()) {
  const current = now instanceof Date ? new Date(now.getTime()) : new Date();
  const currentDate = formatDateForStorage(current);
  const currentHour = current.getHours();
  const previousDate = addDays(currentDate, -1);

  if (currentHour >= TASK_NIGHT_SHIFT_START_HOUR && taskDate === currentDate) {
    return currentDate;
  }

  if (currentHour < TASK_NIGHT_SHIFT_MORNING_END_HOUR && taskDate === previousDate) {
    return previousDate;
  }

  return null;
}

function canAssignNewTaskDate(value, now = new Date()) {
  if (typeof value !== 'string' || !value) {
    return false;
  }

  if (!isPastDate(value)) {
    return true;
  }

  const current = now instanceof Date ? new Date(now.getTime()) : new Date();
  const currentDate = formatDateForStorage(current);
  const previousDate = addDays(currentDate, -1);
  return current.getHours() < TASK_PREVIOUS_DAY_SELECTION_END_HOUR && value === previousDate;
}

function isPastDate(value) {
  return typeof value === 'string' && value < todayDate();
}

function formatDateForStorage(dateInput = new Date()) {
  const date = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildAdmissionsTaskDescription(entry) {
  return '';
}

function buildAdmissionsTaskComment(entry) {
  return null;
}
