import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

// Database path - configurable via environment variable
// Store the path to detect changes
let currentDbPath = "";

// Singleton database instance
let db: Database.Database | null = null;

/**
 * Get or create the database instance
 */
export function getDatabase(): Database.Database {
	const DB_PATH = process.env.DATABASE_PATH || "./data/clubs.db";

	// If the database path has changed, close the existing connection
	if (db && currentDbPath !== DB_PATH) {
		db.close();
		db = null;
	}

	if (db) {
		return db;
	}

	// Update the current path
	currentDbPath = DB_PATH;

	// Ensure the data directory exists
	const dir = dirname(DB_PATH);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	// Create database connection
	db = new Database(DB_PATH);

	// Enable foreign keys
	db.pragma("foreign_keys = ON");

	// Initialize schema if needed
	initializeSchema(db);

	return db;
}

/**
 * Initialize database schema
 */
function initializeSchema(database: Database.Database) {
	// Create users table
	database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

	// Create refresh_tokens table
	database.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

	// Create index on refresh_tokens.token for faster lookups
	database.exec(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token)
  `);

	// Create index on refresh_tokens.user_id for faster lookups
	database.exec(`
    CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)
  `);

	// Create settings table
	database.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    )
  `);

	// Initialize default settings if not exists
	const guestModeSetting = database
		.prepare("SELECT value FROM settings WHERE key = 'guest_mode_enabled'")
		.get() as { value: string } | undefined;

	if (!guestModeSetting) {
		database
			.prepare("INSERT INTO settings (key, value) VALUES (?, ?)")
			.run("guest_mode_enabled", "true");
	}
}

/**
 * Close the database connection
 */
export function closeDatabase() {
	if (db) {
		db.close();
		db = null;
		currentDbPath = "";
	}
}

/**
 * Force the database to reload (useful for tests)
 * Closes the current connection and clears the cache so the next call to getDatabase() creates a fresh connection
 */
export function reloadDatabase() {
	if (db) {
		// Checkpoint WAL if in WAL mode to ensure changes are flushed
		try {
			db.pragma("wal_checkpoint(TRUNCATE)");
		} catch {
			// Ignore errors if not in WAL mode
		}
		db.close();
		db = null;
	}
	// Don't reset currentDbPath so the same path is used
}

/**
 * Get a setting value
 */
export function getSetting(key: string): string | null {
	const db = getDatabase();
	const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
		| { value: string }
		| undefined;
	return row?.value || null;
}

/**
 * Set a setting value
 */
export function setSetting(key: string, value: string): void {
	const db = getDatabase();
	const now = Math.floor(Date.now() / 1000);
	db.prepare(
		"INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
	).run(key, value, now);
}

/**
 * Check if guest mode is enabled
 */
export function isGuestModeEnabled(): boolean {
	const value = getSetting("guest_mode_enabled");
	return value === "true";
}

/**
 * Delete all users and their refresh tokens
 */
export function deleteAllUsers(): void {
	const db = getDatabase();
	// Refresh tokens will be automatically deleted due to CASCADE
	db.prepare("DELETE FROM users").run();
}
