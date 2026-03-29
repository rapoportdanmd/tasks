const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DEFAULT_CATEGORY = 'מעקבים';
const VALID_STATUSES = ['in_progress', 'done_not_approved', 'done'];
const CATEGORIES = [
  'פרוצדורות',
  'מעבדות',
  'הדמיות',
  'ייעוצים',
  'פיזיותרפיה/שיקום',
  'שיחות',
  'מכתבים',
  'רשימת חולים מזוהמים',
  'מעקבים'
];

const app = express();
const db = new Database(path.join(__dirname, 'tasks.db'));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

initializeDatabase();

app.get('/api/meta', (_req, res) => {
  const teamMembers = getTeamMembers();
  res.json({
    categories: CATEGORIES,
    statuses: VALID_STATUSES,
    teamMembers
  });
});

app.get('/api/tasks', (_req, res) => {
  const tasks = db.prepare(`
    SELECT
      tasks.*,
      team_members.name AS assignee_name
    FROM tasks
    LEFT JOIN team_members ON team_members.id = tasks.assignee_id
    ORDER BY
      CASE tasks.status
        WHEN 'in_progress' THEN 1
        WHEN 'done_not_approved' THEN 2
        WHEN 'done' THEN 3
        ELSE 4
      END,
      tasks.updated_at DESC
  `).all();
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const patientName = normalizeText(req.body.patient_name);
  const description = normalizeText(req.body.description);
  const category = normalizeCategory(req.body.category);
  const assigneeId = normalizeAssigneeId(req.body.assignee_id);

  if (!patientName || !description || !category) {
    return res.status(400).json({ error: 'Patient name, description, and category are required.' });
  }

  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category.' });
  }

  if (assigneeId !== null && !teamMemberExists(assigneeId)) {
    return res.status(400).json({ error: 'Invalid assignee.' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (patient_name, description, category, assignee_id)
    VALUES (?, ?, ?, ?)
  `).run(patientName, description, category, assigneeId);

  const task = getTaskById(result.lastInsertRowid);
  res.json(task);
});

app.patch('/api/tasks/:id', (req, res) => {
  const existingTask = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existingTask) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const updates = [];
  const values = [];

  if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }
    updates.push('status = ?');
    values.push(status);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'category')) {
    const category = normalizeCategory(req.body.category);
    if (!category || !CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category.' });
    }
    updates.push('category = ?');
    values.push(category);
  }

  if (Object.prototype.hasOwnProperty.call(req.body, 'assignee_id')) {
    const assigneeId = normalizeAssigneeId(req.body.assignee_id);
    if (assigneeId !== null && !teamMemberExists(assigneeId)) {
      return res.status(400).json({ error: 'Invalid assignee.' });
    }
    updates.push('assignee_id = ?');
    values.push(assigneeId);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No valid updates provided.' });
  }

  values.push(req.params.id);
  db.prepare(`
    UPDATE tasks
    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(...values);

  const task = getTaskById(req.params.id);
  res.json(task);
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/team-members', (_req, res) => {
  res.json(getTeamMembers());
});

app.post('/api/team-members', (req, res) => {
  const name = normalizeText(req.body.name);
  if (!name) {
    return res.status(400).json({ error: 'Team member name is required.' });
  }

  try {
    const result = db.prepare('INSERT INTO team_members (name) VALUES (?)').run(name);
    const member = db.prepare('SELECT * FROM team_members WHERE id = ?').get(result.lastInsertRowid);
    res.json(member);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'Team member already exists.' });
    }
    throw error;
  }
});

app.delete('/api/team-members/:id', (req, res) => {
  db.prepare('UPDATE tasks SET assignee_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE assignee_id = ?').run(req.params.id);
  db.prepare('DELETE FROM team_members WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, HOST, () => {
  console.log(`\n✓ Patient Task Manager running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`  Share with department: http://<your-ip>:${PORT}\n`);
});

function initializeDatabase() {
  db.exec('PRAGMA foreign_keys = ON');
  ensureTeamMembersTable();
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
  const hasCategory = columns.some((column) => column.name === 'category');
  const hasAssigneeId = columns.some((column) => column.name === 'assignee_id');

  if (hasCategory && hasAssigneeId) {
    db.prepare(`
      UPDATE tasks
      SET category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE category IS NULL OR TRIM(category) = ''
    `).run(DEFAULT_CATEGORY);
    ensureTaskIndexes();
    return;
  }

  migrateLegacyTasksTable(columns);
}

function createTasksTable() {
  const categoryCheck = CATEGORIES.map((category) => `'${category.replace(/'/g, "''")}'`).join(', ');
  const statusCheck = VALID_STATUSES.map((status) => `'${status}'`).join(', ');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN (${categoryCheck})),
      assignee_id INTEGER,
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN (${statusCheck})),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assignee_id) REFERENCES team_members(id) ON DELETE SET NULL
    )
  `);
  ensureTaskIndexes();
}

function ensureTaskIndexes() {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_status_updated
    ON tasks(status, updated_at DESC)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_category
    ON tasks(category)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee
    ON tasks(assignee_id)
  `);
}

function migrateLegacyTasksTable(columns) {
  const legacyTableName = `tasks_legacy_${Date.now()}`;
  const hasStatus = columns.some((column) => column.name === 'status');
  const hasCreatedAt = columns.some((column) => column.name === 'created_at');
  const hasUpdatedAt = columns.some((column) => column.name === 'updated_at');
  const hasCategory = columns.some((column) => column.name === 'category');
  const hasAssigneeId = columns.some((column) => column.name === 'assignee_id');

  db.transaction(() => {
    db.prepare(`ALTER TABLE tasks RENAME TO ${legacyTableName}`).run();
    createTasksTable();
    db.prepare(`
      INSERT INTO tasks (
        id,
        patient_name,
        description,
        category,
        assignee_id,
        status,
        created_at,
        updated_at
      )
      SELECT
        id,
        patient_name,
        description,
        ${hasCategory ? `COALESCE(NULLIF(TRIM(category), ''), '${DEFAULT_CATEGORY}')` : `'${DEFAULT_CATEGORY}'`} AS category,
        ${hasAssigneeId ? 'assignee_id' : 'NULL'} AS assignee_id,
        ${
          hasStatus
            ? `CASE
                WHEN status IN ('in_progress', 'done_not_approved', 'done') THEN status
                ELSE 'in_progress'
              END`
            : `'in_progress'`
        } AS status,
        ${hasCreatedAt ? 'created_at' : 'CURRENT_TIMESTAMP'} AS created_at,
        ${hasUpdatedAt ? 'updated_at' : 'CURRENT_TIMESTAMP'} AS updated_at
      FROM ${legacyTableName}
    `).run();
    db.prepare(`DROP TABLE ${legacyTableName}`).run();
  })();
}

function getTaskById(id) {
  return db.prepare(`
    SELECT
      tasks.*,
      team_members.name AS assignee_name
    FROM tasks
    LEFT JOIN team_members ON team_members.id = tasks.assignee_id
    WHERE tasks.id = ?
  `).get(id);
}

function getTeamMembers() {
  return db.prepare('SELECT * FROM team_members ORDER BY name COLLATE NOCASE').all();
}

function teamMemberExists(id) {
  return Boolean(db.prepare('SELECT id FROM team_members WHERE id = ?').get(id));
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizeCategory(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
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
