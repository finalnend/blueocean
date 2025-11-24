import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import getDatabase from '../database/db.js';

const db = getDatabase();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const SALT_ROUNDS = 10;

// 使用者註冊
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // 驗證輸入
    if (!username || !email || !password) {
      return res.status(400).json({ error: '所有欄位都是必填的' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: '密碼長度至少需要 6 個字元' });
    }
    
    // 檢查使用者是否已存在
    const checkStmt = db.prepare(`
      SELECT id FROM users WHERE email = ? OR username = ?
    `);
    const existing = checkStmt.get(email, username);
    
    if (existing) {
      return res.status(409).json({ error: '使用者名稱或信箱已被使用' });
    }
    
    // 雜湊密碼
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // 建立使用者
    const insertStmt = db.prepare(`
      INSERT INTO users (username, email, password_hash)
      VALUES (?, ?, ?)
    `);
    
    const result = insertStmt.run(username, email, passwordHash);
    
    // 產生 JWT token
    const token = jwt.sign(
      { userId: result.lastInsertRowid, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: '註冊成功',
      user: {
        id: result.lastInsertRowid,
        username,
        email
      },
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: '註冊失敗' });
  }
};

// 使用者登入
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 驗證輸入
    if (!email || !password) {
      return res.status(400).json({ error: '請提供信箱和密碼' });
    }
    
    // 查詢使用者
    const stmt = db.prepare(`
      SELECT id, username, email, password_hash 
      FROM users 
      WHERE email = ?
    `);
    const user = stmt.get(email);
    
    if (!user) {
      return res.status(401).json({ error: '信箱或密碼錯誤' });
    }
    
    // 驗證密碼
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: '信箱或密碼錯誤' });
    }
    
    // 產生 JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: '登入成功',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '登入失敗' });
  }
};

// 取得當前使用者資訊
export const getMe = (req, res) => {
  try {
    const userId = req.user.userId;
    
    const stmt = db.prepare(`
      SELECT id, username, email, created_at
      FROM users
      WHERE id = ?
    `);
    const user = stmt.get(userId);
    
    if (!user) {
      return res.status(404).json({ error: '找不到使用者' });
    }
    
    res.json({ user });
    
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: '取得使用者資訊失敗' });
  }
};

// 更新使用者資訊
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: '請提供使用者名稱' });
    }
    
    // 檢查使用者名稱是否已被使用
    const checkStmt = db.prepare(`
      SELECT id FROM users WHERE username = ? AND id != ?
    `);
    const existing = checkStmt.get(username, userId);
    
    if (existing) {
      return res.status(409).json({ error: '使用者名稱已被使用' });
    }
    
    // 更新使用者
    const updateStmt = db.prepare(`
      UPDATE users SET username = ? WHERE id = ?
    `);
    updateStmt.run(username, userId);
    
    // 回傳更新後的使用者資訊
    const getStmt = db.prepare(`
      SELECT id, username, email, created_at
      FROM users WHERE id = ?
    `);
    const user = getStmt.get(userId);
    
    res.json({
      message: '更新成功',
      user
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: '更新使用者資訊失敗' });
  }
};

// 修改密碼
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '請提供目前密碼和新密碼' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密碼長度至少需要 6 個字元' });
    }
    
    // 取得目前密碼雜湊
    const getStmt = db.prepare(`
      SELECT password_hash FROM users WHERE id = ?
    `);
    const user = getStmt.get(userId);
    
    // 驗證目前密碼
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: '目前密碼錯誤' });
    }
    
    // 雜湊新密碼
    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    
    // 更新密碼
    const updateStmt = db.prepare(`
      UPDATE users SET password_hash = ? WHERE id = ?
    `);
    updateStmt.run(newPasswordHash, userId);
    
    res.json({ message: '密碼修改成功' });
    
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: '修改密碼失敗' });
  }
};

export default {
  register,
  login,
  getMe,
  updateProfile,
  changePassword
};
