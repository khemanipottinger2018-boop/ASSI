// routes/auth.ts
import express from 'express';
import { authService, AuthUser } from '@/core/auth/auth.service';
import { db } from '@/config/database';
import { redisService } from '@/infra/redis/redis.service';
import { authenticate, AuthRequest } from '@/middleware/auth';

const router = express.Router();

// Constants
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_MAX_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year in ms

// -------------------- REGISTER --------------------
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ success: false, error: 'All fields required' });

  if (!authService.validateEmail(email))
    return res.status(400).json({ success: false, error: 'Invalid email' });

  if (password.length < 6)
    return res.status(400).json({ success: false, error: 'Password too short' });

  const existing = await db.queryOne(
    `SELECT id FROM Users WHERE username=@username OR email=@email`,
    { username, email: email.toLowerCase() }
  );
  if (existing) return res.status(400).json({ success: false, error: 'Username/email exists' });

  const hashed = await authService.hashPassword(password);
  const now = new Date();

  const result = await db.query(
    `INSERT INTO Users (username,email,password_hash,role,created_at,updated_at,last_login,disclaimer_accepted)
     OUTPUT INSERTED.id VALUES (@username,@email,@password_hash,'student',@now,@now,@now,0)`,
    { username, email: email.toLowerCase(), password_hash: hashed, now }
  );

  const userId = result[0]?.id;
  const user: AuthUser = { id: userId, username, email, role: 'student' };
  const accessToken = authService.generateAccessToken(user);
  const refreshToken = authService.generateRefreshToken(user);

  // Set cookies
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  res.status(201).json({ success: true, user });
});

// -------------------- LOGIN --------------------
router.post('/login', async (req, res) => {
  const { email, password, rememberMe } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, error: 'Email/password required' });

  const userRow = await db.queryOne<any>(`SELECT * FROM Users WHERE email=@email`, {
    email: email.toLowerCase(),
  });

  if (!userRow || !(await authService.comparePassword(password, userRow.password_hash)))
    return res.status(401).json({ success: false, error: 'Invalid credentials' });

  const user: AuthUser = {
    id: userRow.id,
    username: userRow.username,
    email: userRow.email,
    role: userRow.role as AuthUser['role'],
  };

  const accessToken = authService.generateAccessToken(user);
  const refreshToken = authService.generateRefreshToken(user);

  const refreshMaxAge = rememberMe ? REFRESH_TOKEN_MAX_AGE : 7 * 24 * 60 * 60 * 1000; // 1 year or 7 days

  // Set cookies
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000,
  });

  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: refreshMaxAge,
  });

  res.json({ success: true, user });
});

// -------------------- REFRESH TOKEN --------------------
router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies['refresh_token'];
  if (!refreshToken) return res.status(401).json({ success: false, error: 'No refresh token provided' });

  const decoded = authService.verifyRefreshToken(refreshToken);
  if (!decoded) return res.status(401).json({ success: false, error: 'Invalid refresh token' });

  const storedToken = await redisService.getRefreshToken(decoded.id);
  if (!storedToken || storedToken !== refreshToken)
    return res.status(401).json({ success: false, error: 'Refresh token expired or invalid' });

  const user = await authService.getUserById(decoded.id);
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });

  const newAccessToken = authService.generateAccessToken(user);
  const newRefreshToken = authService.generateRefreshToken(user);

  res.cookie('access_token', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000,
  });

  res.cookie('refresh_token', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  res.json({ success: true, user });
});

// -------------------- LOGOUT --------------------
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ success: false, error: 'Not authenticated' });

  await redisService.deleteRefreshToken(req.user.id);
  await authService.setUserOffline(req.user.id);

  res.clearCookie('access_token');
  res.clearCookie('refresh_token');

  res.json({ success: true });
});

export { router };
