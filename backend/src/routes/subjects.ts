import express, { Request, Response } from 'express';
import { getPool } from '../config/database.js';

const router = express.Router();

console.log('📚 Subjects route file executed!');

interface Subject {
  subject_id: string;
  name: string;
  level: 'CSEC' | 'CAPE';
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

// GET /api/subjects - Get all subjects
router.get('/', async (req: Request, res: Response<ApiResponse<Subject[]>>) => {
  console.log('📚 Fetching all subjects from database...');
  
  try {
    const pool = await getPool();
    
    // Test database connection first
    const healthCheck = await pool.request().query('SELECT 1 as health_check');
    if (!healthCheck.recordset[0]?.health_check) {
      throw new Error('Database health check failed');
    }
    
    console.log('✅ Database connection healthy, querying subjects...');
    
    const query = `
      SELECT subject_id, name, level 
      FROM subjects 
      ORDER BY name
    `;
    
    const result = await pool.request().query(query);
    
    console.log(`✅ Found ${result.recordset.length} subjects`);
    
    // Validate we have subjects
    if (!result.recordset || result.recordset.length === 0) {
      console.warn('⚠️ No subjects found in database');
      return res.json({
        success: true,
        data: [],
        count: 0
      });
    }
    
    res.json({
      success: true,
      data: result.recordset,
      count: result.recordset.length
    });
    
  } catch (error: any) {
    console.error('❌ Error fetching subjects:', error);
    
    // More specific error messages
    let errorMessage = 'Failed to fetch subjects from database';
    if (error.message?.includes('health check failed')) {
      errorMessage = 'Database connection failed';
    } else if (error.message?.includes('Invalid object name')) {
      errorMessage = 'Subjects table does not exist';
    } else if (error.message?.includes('Login failed')) {
      errorMessage = 'Database authentication failed';
    }
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

// Test endpoint with detailed diagnostics
router.get('/test', async (req: Request, res: Response) => {
  console.log('✅ /api/subjects/test endpoint called');
  
  try {
    const pool = await getPool();
    const healthResult = await pool.request().query('SELECT 1 as health_check');
    const tableCheck = await pool.request().query(`
      SELECT COUNT(*) as subject_count FROM information_schema.tables 
      WHERE table_name = 'subjects'
    `);
    
    const tableExists = tableCheck.recordset[0]?.subject_count > 0;
    
    res.json({ 
      success: true, 
      message: 'Subjects test endpoint is working!',
      database: {
        connected: healthResult.recordset[0]?.health_check === 1,
        subjects_table_exists: tableExists
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Test failed: ' + error.message
    });
  }
});

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 as health_check');
    
    res.json({
      success: true,
      database: result.recordset[0]?.health_check === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(503).json({
      success: false,
      error: 'Database health check failed: ' + error.message
    });
  }
});

export default router;