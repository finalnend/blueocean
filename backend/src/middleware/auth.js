import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// JWT 驗證中介層
export const authenticateToken = (req, res, next) => {
  try {
    // 從 Authorization header 取得 token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({ error: '需要認證 token' });
    }
    
    // 驗證 token
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Token 無效或已過期' });
      }
      
      // 將使用者資訊附加到 request
      req.user = user;
      next();
    });
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: '認證失敗' });
  }
};

// 可選的認證中介層（允許未登入使用者存取，但會嘗試解析 token）
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      jwt.verify(token, JWT_SECRET, (err, user) => {
        if (!err) {
          req.user = user;
        }
      });
    }
    
    next();
  } catch (error) {
    next();
  }
};

export default {
  authenticateToken,
  optionalAuth
};
