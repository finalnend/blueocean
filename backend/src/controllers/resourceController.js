import getDatabase from '../database/db.js';

const db = getDatabase();

function isValidExternalUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === '#') return false;
  return /^https?:\/\//i.test(trimmed);
}

// 取得資源列表
export const getResources = (req, res) => {
  try {
    const { type, tag, language, search } = req.query;
    
    let query = `
      SELECT 
        id, title, url, type, tags, language, description, added_at
      FROM resource_links
      WHERE 1=1
    `;
    
    const params = [];
    
    if (type) {
      query += ` AND type = ?`;
      params.push(type);
    }
    
    if (tag) {
      query += ` AND tags LIKE ?`;
      params.push(`%${tag}%`);
    }
    
    if (language) {
      query += ` AND language = ?`;
      params.push(language);
    }
    
    if (search) {
      query += ` AND (title LIKE ? OR description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY added_at DESC`;
    
    const stmt = db.prepare(query);
    const resources = stmt.all(...params);
    
    // 解析 tags
    const formattedResources = resources
      .map((resource) => ({
        ...resource,
        url: typeof resource.url === 'string' ? resource.url.trim() : resource.url,
      }))
      .filter((resource) => isValidExternalUrl(resource.url))
      .map((resource) => ({
        ...resource,
        tags: resource.tags ? resource.tags.split(',') : [],
      }));
    
    res.json({
      count: formattedResources.length,
      resources: formattedResources
    });
  } catch (error) {
    console.error('Error in getResources:', error);
    res.status(500).json({ error: '取得資源列表失敗' });
  }
};

// 取得單一資源詳情
export const getResourceById = (req, res) => {
  try {
    const { id } = req.params;
    
    const stmt = db.prepare(`
      SELECT * FROM resource_links WHERE id = ?
    `);
    
    const resource = stmt.get(id);
    
    if (!resource) {
      return res.status(404).json({ error: '找不到該資源' });
    }
    
    res.json({
      ...resource,
      tags: resource.tags ? resource.tags.split(',') : []
    });
  } catch (error) {
    console.error('Error in getResourceById:', error);
    res.status(500).json({ error: '取得資源詳情失敗' });
  }
};

// 取得資源類型列表
export const getResourceTypes = (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT DISTINCT type, COUNT(*) as count
      FROM resource_links
      GROUP BY type
      ORDER BY type
    `);
    
    const types = stmt.all();
    
    res.json({ types });
  } catch (error) {
    console.error('Error in getResourceTypes:', error);
    res.status(500).json({ error: '取得資源類型失敗' });
  }
};

// 取得熱門標籤
export const getPopularTags = (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT tags FROM resource_links WHERE tags IS NOT NULL
    `);
    
    const rows = stmt.all();
    
    // 統計標籤
    const tagCount = {};
    rows.forEach(row => {
      const tags = row.tags.split(',');
      tags.forEach(tag => {
        const trimmedTag = tag.trim();
        tagCount[trimmedTag] = (tagCount[trimmedTag] || 0) + 1;
      });
    });
    
    // 轉換成陣列並排序
    const popularTags = Object.entries(tagCount)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    
    res.json({ tags: popularTags });
  } catch (error) {
    console.error('Error in getPopularTags:', error);
    res.status(500).json({ error: '取得熱門標籤失敗' });
  }
};

// 新增資源（管理員功能，可選）
export const addResource = (req, res) => {
  try {
    const { title, url, type, tags, language, description } = req.body;
    
    if (!title || !url || !type) {
      return res.status(400).json({ error: '缺少必要欄位' });
    }
    
    const normalizedUrl = typeof url === 'string' ? url.trim() : '';
    if (!isValidExternalUrl(normalizedUrl)) {
      return res.status(400).json({ error: 'Invalid resource URL' });
    }
    
    const stmt = db.prepare(`
      INSERT INTO resource_links (title, url, type, tags, language, description, added_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const tagsString = Array.isArray(tags) ? tags.join(',') : tags;
    
    const result = stmt.run(
      title,
      normalizedUrl,
      type,
      tagsString,
      language || 'en',
      description || null,
      'admin' // 可從 req.user 取得
    );
    
    res.status(201).json({
      success: true,
      resourceId: result.lastInsertRowid,
      message: '資源新增成功'
    });
  } catch (error) {
    console.error('Error in addResource:', error);
    res.status(500).json({ error: '新增資源失敗' });
  }
};
