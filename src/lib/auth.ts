import crypto from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { getDatabase, getSetting, setSetting } from "./db";

// JWT configuration
const JWT_EXPIRES_IN = "15m"; // Access token expires in 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Get or generate JWT secret
 * Priority:
 * 1. Environment variable JWT_SECRET (if provided)
 * 2. Stored secret in database
 * 3. Generate new random secret and store it
 */
function getJWTSecret(): string {
	// Check environment variable first (allows manual override)
	if (process.env.JWT_SECRET) {
		return process.env.JWT_SECRET;
	}

	// Check database for stored secret
	const storedSecret = getSetting("jwt_secret");
	if (storedSecret) {
		return storedSecret;
	}

	// Generate new secret and store it
	const newSecret = crypto.randomBytes(64).toString("hex");
	setSetting("jwt_secret", newSecret);
	return newSecret;
}

// Cookie names
export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

// Types
export interface User {
	id: number;
	username: string;
	created_at: number;
}

export interface JWTPayload {
	userId: number;
	username: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
	const saltRounds = 10;
	return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
	password: string,
	hash: string,
): Promise<boolean> {
	return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT access token
 */
export function generateAccessToken(payload: JWTPayload): string {
	return jwt.sign(payload, getJWTSecret(), {
		expiresIn: JWT_EXPIRES_IN,
	});
}

/**
 * Verify and decode a JWT access token
 */
export function verifyAccessToken(token: string): JWTPayload | null {
	try {
		const decoded = jwt.verify(token, getJWTSecret()) as JWTPayload;
		return decoded;
	} catch (_error) {
		return null;
	}
}

/**
 * Generate a random refresh token
 */
export function generateRefreshToken(): string {
	return crypto.randomBytes(32).toString("hex");
}

/**
 * Store a refresh token in the database
 */
export function storeRefreshToken(token: string, userId: number): void {
	const db = getDatabase();
	const expiresAt = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_EXPIRES_IN;

	db.prepare(
		"INSERT INTO refresh_tokens (token, user_id, expires_at) VALUES (?, ?, ?)",
	).run(token, userId, expiresAt);
}

/**
 * Verify a refresh token and get the associated user ID
 */
export function verifyRefreshToken(token: string): number | null {
	const db = getDatabase();
	const now = Math.floor(Date.now() / 1000);

	const row = db
		.prepare("SELECT user_id, expires_at FROM refresh_tokens WHERE token = ?")
		.get(token) as { user_id: number; expires_at: number } | undefined;

	if (!row) {
		return null;
	}

	// Check if token is expired
	if (row.expires_at < now) {
		// Delete expired token
		db.prepare("DELETE FROM refresh_tokens WHERE token = ?").run(token);
		return null;
	}

	return row.user_id;
}

/**
 * Delete a refresh token
 */
export function deleteRefreshToken(token: string): void {
	const db = getDatabase();
	db.prepare("DELETE FROM refresh_tokens WHERE token = ?").run(token);
}

/**
 * Delete all refresh tokens for a user
 */
export function deleteAllRefreshTokens(userId: number): void {
	const db = getDatabase();
	db.prepare("DELETE FROM refresh_tokens WHERE user_id = ?").run(userId);
}

/**
 * Create a new user
 */
export async function createUser(
	username: string,
	password: string,
): Promise<User> {
	const db = getDatabase();
	const passwordHash = await hashPassword(password);

	const result = db
		.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
		.run(username, passwordHash);

	const userId = result.lastInsertRowid as number;

	return {
		id: userId,
		username,
		created_at: Math.floor(Date.now() / 1000),
	};
}

/**
 * Get a user by username
 */
export function getUserByUsername(
	username: string,
): (User & { password_hash: string }) | null {
	const db = getDatabase();
	const row = db
		.prepare("SELECT * FROM users WHERE username = ?")
		.get(username) as (User & { password_hash: string }) | undefined;

	return row || null;
}

/**
 * Get a user by ID
 */
export function getUserById(userId: number): User | null {
	const db = getDatabase();
	const row = db
		.prepare("SELECT id, username, created_at FROM users WHERE id = ?")
		.get(userId) as User | undefined;

	return row || null;
}

/**
 * Check if any users exist
 */
export function hasUsers(): boolean {
	const db = getDatabase();
	const row = db.prepare("SELECT COUNT(*) as count FROM users").get() as {
		count: number;
	};

	return row.count > 0;
}

/**
 * Get the current user from cookies (server-side only)
 */
export async function getCurrentUser(): Promise<User | null> {
	const cookieStore = await cookies();
	const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;

	if (!accessToken) {
		return null;
	}

	const payload = verifyAccessToken(accessToken);
	if (!payload) {
		return null;
	}

	return getUserById(payload.userId);
}

/**
 * Set auth cookies (access token and refresh token)
 */
export async function setAuthCookies(
	userId: number,
	username: string,
): Promise<void> {
	const accessToken = generateAccessToken({ userId, username });
	const refreshToken = generateRefreshToken();

	// Store refresh token in database
	storeRefreshToken(refreshToken, userId);

	// Set cookies
	const cookieStore = await cookies();

	cookieStore.set(ACCESS_TOKEN_COOKIE, accessToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: 15 * 60, // 15 minutes
		path: "/",
	});

	cookieStore.set(REFRESH_TOKEN_COOKIE, refreshToken, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		maxAge: REFRESH_TOKEN_EXPIRES_IN,
		path: "/",
	});
}

/**
 * Clear auth cookies
 */
export async function clearAuthCookies(): Promise<void> {
	const cookieStore = await cookies();

	// Get refresh token to delete from database
	const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
	if (refreshToken) {
		deleteRefreshToken(refreshToken);
	}

	// Clear cookies
	cookieStore.delete(ACCESS_TOKEN_COOKIE);
	cookieStore.delete(REFRESH_TOKEN_COOKIE);
}
