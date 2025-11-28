import express from 'express';
import { getPool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { Request, Response } from 'express';
import sql from 'mssql';

const router = express.Router();

// ==================== CONVERSATIONS ====================

// Get user's conversations (inbox)
router.get('/conversations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const pool = await getPool();

    const result = await pool.request()
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          c.id,
          c.subject,
          c.last_message_at,
          c.created_at,
          -- Get other participant info
          CASE 
            WHEN c.user1_id = @user_id THEN u2.id
            ELSE u1.id
          END as other_user_id,
          CASE 
            WHEN c.user1_id = @user_id THEN u2.username
            ELSE u1.username
          END as other_user_name,
          CASE 
            WHEN c.user1_id = @user_id THEN u2.role
            ELSE u1.role
          END as other_user_role,
          -- Get tutor_id if other user is a tutor
          CASE 
            WHEN c.user1_id = @user_id THEN t2.tutor_id
            ELSE t1.tutor_id
          END as other_user_tutor_id,
          -- Get last message preview
          last_msg.message as last_message,
          last_msg.sent_at as last_message_at,
          -- Get unread count
          (SELECT COUNT(*) 
           FROM messages m 
           WHERE m.conversation_id = c.id 
           AND m.sender_id != @user_id 
           AND m.read_at IS NULL) as unread_count
        FROM conversations c
        INNER JOIN users u1 ON c.user1_id = u1.id
        INNER JOIN users u2 ON c.user2_id = u2.id
        LEFT JOIN tutors t1 ON u1.id = t1.user_id
        LEFT JOIN tutors t2 ON u2.id = t2.user_id
        LEFT JOIN messages last_msg ON last_msg.id = (
          SELECT TOP 1 id 
          FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY sent_at DESC
        )
        WHERE c.user1_id = @user_id OR c.user2_id = @user_id
        ORDER BY c.last_message_at DESC
      `);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error: any) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// Start new conversation with any user
router.post('/conversations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { other_user_id, subject, initial_message } = req.body;

    if (!other_user_id || !initial_message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: other_user_id and initial_message are required'
      });
    }

    const pool = await getPool();

    // Check if conversation already exists
    const existingConv = await pool.request()
      .input('user1_id', sql.UniqueIdentifier, userId)
      .input('user2_id', sql.UniqueIdentifier, other_user_id)
      .query(`
        SELECT id FROM conversations 
        WHERE (user1_id = @user1_id AND user2_id = @user2_id)
           OR (user1_id = @user2_id AND user2_id = @user1_id)
      `);

    let conversationId;
    
    if (existingConv.recordset.length > 0) {
      // Use existing conversation
      conversationId = existingConv.recordset[0].id;
    } else {
      // Create new conversation
      const convResult = await pool.request()
        .input('user1_id', sql.UniqueIdentifier, userId)
        .input('user2_id', sql.UniqueIdentifier, other_user_id)
        .input('subject', sql.NVarChar, subject || 'New Conversation')
        .query(`
          INSERT INTO conversations (user1_id, user2_id, subject)
          OUTPUT INSERTED.id
          VALUES (@user1_id, @user2_id, @subject)
        `);
      
      conversationId = convResult.recordset[0].id;
    }

    // Send initial message
    const messageResult = await pool.request()
      .input('conversation_id', sql.UniqueIdentifier, conversationId)
      .input('sender_id', sql.UniqueIdentifier, userId)
      .input('message', sql.NVarChar, initial_message)
      .query(`
        INSERT INTO messages (conversation_id, sender_id, message)
        OUTPUT INSERTED.id, INSERTED.sent_at
        VALUES (@conversation_id, @sender_id, @message)
      `);

    // Update conversation last message time
    await pool.request()
      .input('conversation_id', sql.UniqueIdentifier, conversationId)
      .query('UPDATE conversations SET last_message_at = GETDATE() WHERE id = @conversation_id');

    res.json({
      success: true,
      data: {
        conversation_id: conversationId,
        message: {
          id: messageResult.recordset[0].id,
          sent_at: messageResult.recordset[0].sent_at
        }
      }
    });

  } catch (error: any) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
});

// ==================== MESSAGES ====================

// Get messages in a conversation
router.get('/conversations/:conversationId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    const pool = await getPool();

    // Verify user has access to this conversation
    const accessCheck = await pool.request()
      .input('conversation_id', sql.UniqueIdentifier, conversationId)
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 1 as has_access 
        FROM conversations 
        WHERE id = @conversation_id 
        AND (user1_id = @user_id OR user2_id = @user_id)
      `);

    if (accessCheck.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this conversation'
      });
    }

    let query = `
      SELECT 
        m.id,
        m.message,
        m.sent_at,
        m.read_at,
        m.sender_id,
        u.username as sender_name,
        u.role as sender_role
      FROM messages m
      INNER JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = @conversation_id
    `;

    if (before) {
      query += ` AND m.sent_at < @before`;
    }

    query += ` ORDER BY m.sent_at DESC`;

    if (limit) {
      query += ` OFFSET 0 ROWS FETCH NEXT @limit ROWS ONLY`;
    }

    const request = pool.request()
      .input('conversation_id', sql.UniqueIdentifier, conversationId)
      .input('limit', sql.Int, parseInt(limit as string));

    if (before) {
      request.input('before', sql.DateTime, new Date(before as string));
    }

    const messages = await request.query(query);

    res.json({
      success: true,
      data: messages.recordset.reverse() // Return in chronological order
    });

  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// Send message in conversation
router.post('/conversations/:conversationId/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message cannot be empty'
      });
    }

    const pool = await getPool();

    // Verify access
    const accessCheck = await pool.request()
      .input('conversation_id', sql.UniqueIdentifier, conversationId)
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 1 as has_access 
        FROM conversations 
        WHERE id = @conversation_id 
        AND (user1_id = @user_id OR user2_id = @user_id)
      `);

    if (accessCheck.recordset.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Send message
    const messageResult = await pool.request()
      .input('conversation_id', sql.UniqueIdentifier, conversationId)
      .input('sender_id', sql.UniqueIdentifier, userId)
      .input('message', sql.NVarChar, message.trim())
      .query(`
        INSERT INTO messages (conversation_id, sender_id, message)
        OUTPUT INSERTED.id, INSERTED.sent_at
        VALUES (@conversation_id, @sender_id, @message)
      `);

    // Update conversation last message time
    await pool.request()
      .input('conversation_id', sql.UniqueIdentifier, conversationId)
      .query('UPDATE conversations SET last_message_at = GETDATE() WHERE id = @conversation_id');

    res.json({
      success: true,
      data: {
        id: messageResult.recordset[0].id,
        sent_at: messageResult.recordset[0].sent_at
      }
    });

  } catch (error: any) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});

// Mark conversation as read
router.post('/conversations/:conversationId/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { conversationId } = req.params;

    const pool = await getPool();

    // Mark all messages from other users as read
    await pool.request()
      .input('conversation_id', sql.UniqueIdentifier, conversationId)
      .input('user_id', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE messages 
        SET read_at = GETDATE()
        WHERE conversation_id = @conversation_id 
        AND sender_id != @user_id
        AND read_at IS NULL
      `);

    res.json({
      success: true,
      message: 'Conversation marked as read'
    });

  } catch (error: any) {
    console.error('Error marking conversation as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark conversation as read' });
  }
});

export default router;
