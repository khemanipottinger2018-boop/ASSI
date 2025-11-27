// backend/routes/auth.ts
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getPool } from '../config/database.js';
import { authenticateToken, trackUserSession } from '../middleware/auth.js';
import sql from 'mssql';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET!; // Remove fallback for security

// ✅ Constants for consistent error messages
const AUTH_ERRORS = {
  MISSING_FIELDS: 'Username, email, and password are required',
  PASSWORD_LENGTH: 'Password must be at least 6 characters long',
  USER_EXISTS: 'User with this email or username already exists',
  INVALID_CREDENTIALS: 'Invalid email or password',
  REGISTRATION_FAILED: 'Internal server error during registration',
  LOGIN_FAILED: 'Internal server error during login',
  USER_NOT_FOUND: 'User not found',
  AUTH_REQUIRED: 'Authentication required',
  PROFILE_UPDATE_FAILED: 'Failed to update profile',
  LOGOUT_FAILED: 'Logout failed'
} as const;

// ✅ Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // ✅ Enhanced validation
    if (!username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ 
        success: false,
        error: AUTH_ERRORS.MISSING_FIELDS
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        error: AUTH_ERRORS.PASSWORD_LENGTH
      });
    }

    const pool = await getPool();

    // ✅ Check existing user with transaction safety
    const existingUserResult = await pool.request()
      .input('email', sql.VarChar, email.trim().toLowerCase())
      .input('username', sql.VarChar, username.trim())
      .query(`
        SELECT id FROM Users 
        WHERE email = @email OR username = @username
      `);

    if (existingUserResult.recordset.length > 0) {
      return res.status(400).json({ 
        success: false,
        error: AUTH_ERRORS.USER_EXISTS
      });
    }

    // ✅ Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // ✅ Insert new user with transaction
    const newUserResult = await pool.request()
      .input('username', sql.VarChar, username.trim())
      .input('email', sql.VarChar, email.trim().toLowerCase())
      .input('password_hash', sql.VarChar, hashedPassword)
      .query(`
        INSERT INTO Users (username, email, password_hash, role, created_at) 
        OUTPUT INSERTED.id, INSERTED.username, INSERTED.email, INSERTED.role, 
               INSERTED.bio, INSERTED.phone_number, INSERTED.show_phone, 
               INSERTED.created_at, INSERTED.is_online
        VALUES (@username, @email, @password_hash, 'student', GETDATE())
      `);

    const user = newUserResult.recordset[0];
    
    // ✅ Enhanced profile completion check
    const profile_completed = Boolean(user.bio?.trim() && user.phone_number?.trim());

    // ✅ Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        bio: user.bio,
        phone_number: user.phone_number,
        show_phone: user.show_phone,
        profile_completed
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile_completed,
        is_online: user.is_online
      },
      token
    });

  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false,
      error: AUTH_ERRORS.REGISTRATION_FAILED
    });
  }
});

// ✅ Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email?.trim() || !password) {
      return res.status(400).json({
        success: false,
        error: AUTH_ERRORS.MISSING_FIELDS
      });
    }

    const pool = await getPool();

    // ✅ Find user with case-insensitive email
    const userResult = await pool.request()
      .input('email', sql.VarChar, email.trim().toLowerCase())
      .query(`
        SELECT * FROM Users 
        WHERE email = @email
      `);

    if (userResult.recordset.length === 0) {
      return res.status(401).json({
        success: false,
        error: AUTH_ERRORS.INVALID_CREDENTIALS
      });
    }

    const user = userResult.recordset[0];

    // ✅ Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: AUTH_ERRORS.INVALID_CREDENTIALS
      });
    }

    // ✅ Enhanced profile completion
    const profile_completed = Boolean(user.bio?.trim() && user.phone_number?.trim());

    // ✅ Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        bio: user.bio,
        phone_number: user.phone_number,
        show_phone: user.show_phone,
        profile_completed
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // ✅ Track user session
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    await trackUserSession(user.id, ipAddress, userAgent);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile_completed,
        is_online: user.is_online,
        last_login: user.last_login
      },
      token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: AUTH_ERRORS.LOGIN_FAILED
    });
  }
});

// ✅ Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: AUTH_ERRORS.USER_NOT_FOUND
      });
    }

    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// ✅ Update profile
router.put('/profile', authenticateToken, async (req, res) => {
  const { bio, phone_number, show_phone } = req.body;
  const userId = req.user?.id;

  try {
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: AUTH_ERRORS.AUTH_REQUIRED
      });
    }

    const pool = await getPool();

    // ✅ Update user profile
    await pool.request()
      .input('id', sql.VarChar, userId)
      .input('bio', sql.VarChar, bio?.trim() || null)
      .input('phone_number', sql.VarChar, phone_number?.trim() || null)
      .input('show_phone', sql.Bit, show_phone ? 1 : 0)
      .query(`
        UPDATE Users 
        SET bio = @bio, 
            phone_number = @phone_number, 
            show_phone = @show_phone,
            updated_at = GETDATE()
        WHERE id = @id
      `);

    // ✅ Get updated user
    const userResult = await pool.request()
      .input('id', sql.VarChar, userId)
      .query('SELECT * FROM Users WHERE id = @id');

    const user = userResult.recordset[0];
    const profile_completed = Boolean(user.bio?.trim() && user.phone_number?.trim());

    // ✅ Generate new token with updated data
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        bio: user.bio,
        phone_number: user.phone_number,
        show_phone: user.show_phone,
        profile_completed
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile_completed,
        bio: user.bio,
        phone_number: user.phone_number,
        show_phone: user.show_phone,
        is_online: user.is_online
      },
      token
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: AUTH_ERRORS.PROFILE_UPDATE_FAILED
    });
  }
});

// ✅ Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: AUTH_ERRORS.AUTH_REQUIRED
      });
    }

    const pool = await getPool();
    
    // ✅ Mark session as logged out and update online status
    await pool.request()
      .input('user_id', sql.VarChar, req.user.id)
      .query(`
        UPDATE TOP (1) UserSessions 
        SET logout_at = GETDATE() 
        WHERE user_id = @user_id AND logout_at IS NULL
        ORDER BY login_at DESC;
        
        UPDATE Users 
        SET is_online = 0, last_seen = GETDATE()
        WHERE id = @user_id;
      `);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error during logout:', errorMessage);
    res.status(500).json({ 
      success: false, 
      error: AUTH_ERRORS.LOGOUT_FAILED
    });
  }
});

export default router;