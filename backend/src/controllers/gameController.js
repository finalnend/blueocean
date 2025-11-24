import getDatabase from '../database/db.js';

const db = getDatabase();

// 提交遊戲分數
export const submitScore = (req, res) => {
  try {
    const { nickname, score, cleanup_rate, duration } = req.body;
    
    // 驗證輸入
    if (!nickname || score === undefined) {
      return res.status(400).json({ error: '缺少必要欄位' });
    }
    
    if (typeof score !== 'number' || score < 0) {
      return res.status(400).json({ error: '分數格式不正確' });
    }
    
    if (nickname.length > 50) {
      return res.status(400).json({ error: '暱稱過長' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO game_scores (user_id, nickname, score, cleanup_rate, duration)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      null, // user_id (若有登入系統可從 req.user 取得)
      nickname,
      score,
      cleanup_rate || null,
      duration || null
    );
    
    res.status(201).json({
      success: true,
      scoreId: result.lastInsertRowid,
      message: '分數提交成功！'
    });
  } catch (error) {
    console.error('Error in submitScore:', error);
    res.status(500).json({ error: '提交分數失敗' });
  }
};

// 取得排行榜
export const getLeaderboard = (req, res) => {
  try {
    const { period = 'all', limit = 10 } = req.query;
    
    let query = `
      SELECT 
        id,
        nickname,
        score,
        cleanup_rate,
        duration,
        created_at
      FROM game_scores
    `;
    
    const params = [];
    
    // 根據時間區間篩選
    switch (period) {
      case 'day':
        query += ` WHERE created_at >= datetime('now', '-1 day')`;
        break;
      case 'week':
        query += ` WHERE created_at >= datetime('now', '-7 days')`;
        break;
      case 'month':
        query += ` WHERE created_at >= datetime('now', '-1 month')`;
        break;
      case 'all':
      default:
        // 不加條件
        break;
    }
    
    query += ` ORDER BY score DESC, cleanup_rate DESC LIMIT ?`;
    params.push(parseInt(limit));
    
    const stmt = db.prepare(query);
    const leaderboard = stmt.all(...params);
    
    // 加上排名
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      ...entry
    }));
    
    res.json({
      period,
      leaderboard: rankedLeaderboard
    });
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    res.status(500).json({ error: '取得排行榜失敗' });
  }
};

// 取得遊戲統計
export const getGameStats = (req, res) => {
  try {
    const statsStmt = db.prepare(`
      SELECT 
        COUNT(*) as total_games,
        AVG(score) as avg_score,
        MAX(score) as max_score,
        AVG(cleanup_rate) as avg_cleanup_rate,
        AVG(duration) as avg_duration
      FROM game_scores
    `);
    
    const stats = statsStmt.get();
    
    const recentStmt = db.prepare(`
      SELECT COUNT(*) as games_today
      FROM game_scores
      WHERE created_at >= datetime('now', '-1 day')
    `);
    
    const recent = recentStmt.get();
    
    res.json({
      ...stats,
      ...recent
    });
  } catch (error) {
    console.error('Error in getGameStats:', error);
    res.status(500).json({ error: '取得遊戲統計失敗' });
  }
};

// 取得個人最佳紀錄
export const getPersonalBest = (req, res) => {
  try {
    const { nickname } = req.params;
    
    if (!nickname) {
      return res.status(400).json({ error: '需要提供暱稱' });
    }
    
    const stmt = db.prepare(`
      SELECT 
        MAX(score) as best_score,
        MAX(cleanup_rate) as best_cleanup_rate,
        MIN(duration) as fastest_time,
        COUNT(*) as total_plays
      FROM game_scores
      WHERE nickname = ?
    `);
    
    const stats = stmt.get(nickname);
    
    if (!stats.total_plays) {
      return res.status(404).json({ error: '找不到該玩家紀錄' });
    }
    
    res.json({
      nickname,
      ...stats
    });
  } catch (error) {
    console.error('Error in getPersonalBest:', error);
    res.status(500).json({ error: '取得個人紀錄失敗' });
  }
};
