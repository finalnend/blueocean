import getDatabase, { closeDatabase } from '../database/db.js';

function clearSeedPollutionData(db) {
  const sources = ['UNEP', 'OWID', 'Research'];

  const countStmt = db.prepare(
    `SELECT source, COUNT(*) as count
     FROM pollution_data
     WHERE source IN (${sources.map(() => '?').join(',')})
     GROUP BY source`
  );
  const before = countStmt.all(...sources);

  const deleteStmt = db.prepare(
    `DELETE FROM pollution_data
     WHERE source IN (${sources.map(() => '?').join(',')})`
  );
  const info = deleteStmt.run(...sources);

  console.log('🧹 pollution_data 清除結果:');
  if (before.length === 0) {
    console.log('  - 沒有找到由 seed.js 插入的污染資料');
  } else {
    before.forEach((row) => {
      console.log(`  - source=${row.source} 刪除 ${row.count} 筆`);
    });
    console.log(`  合計刪除 ${info.changes} 筆 pollution_data 記錄`);
  }
}

function clearSeedResources(db) {
  const titles = [
    'Plastic Pollution - Our World in Data',
    'UNEP Global Plastic Watch',
    'Ocean Cleanup Project',
    'Copernicus Climate Change Service',
    'Marine Debris Tracker',
    '海洋保護教材'
  ];

  const countStmt = db.prepare(
    `SELECT title, COUNT(*) as count
     FROM resource_links
     WHERE title IN (${titles.map(() => '?').join(',')})
     GROUP BY title`
  );
  const before = countStmt.all(...titles);

  const deleteStmt = db.prepare(
    `DELETE FROM resource_links
     WHERE title IN (${titles.map(() => '?').join(',')})`
  );
  const info = deleteStmt.run(...titles);

  console.log('🧹 resource_links 清除結果:');
  if (before.length === 0) {
    console.log('  - 沒有找到由 seed.js 插入的資源資料');
  } else {
    before.forEach((row) => {
      console.log(`  - title="${row.title}" 刪除 ${row.count} 筆`);
    });
    console.log(`  合計刪除 ${info.changes} 筆 resource_links 記錄`);
  }
}

function clearSeedScores(db) {
  const nicknames = [
    'Ocean志工隊',
    '海洋守護者',
    'Eco小隊',
    'CleanupKing',
    '海灘清道夫',
    '藍海小隊',
    '環保小鬥士',
    'Ocean小英雄',
    '海洋小尖兵',
    '地球守護隊'
  ];

  const countStmt = db.prepare(
    `SELECT nickname, COUNT(*) as count
     FROM game_scores
     WHERE nickname IN (${nicknames.map(() => '?').join(',')})
     GROUP BY nickname`
  );
  const before = countStmt.all(...nicknames);

  const deleteStmt = db.prepare(
    `DELETE FROM game_scores
     WHERE nickname IN (${nicknames.map(() => '?').join(',')})`
  );
  const info = deleteStmt.run(...nicknames);

  console.log('🧹 game_scores 清除結果:');
  if (before.length === 0) {
    console.log('  - 沒有找到由 seed.js 插入的遊戲分數資料');
  } else {
    before.forEach((row) => {
      console.log(`  - nickname="${row.nickname}" 刪除 ${row.count} 筆`);
    });
    console.log(`  合計刪除 ${info.changes} 筆 game_scores 記錄`);
  }
}

function main() {
  console.log('🚮 開始清除 seed.js 產生的示範資料...');

  const db = getDatabase();

  try {
    clearSeedPollutionData(db);
    clearSeedResources(db);
    clearSeedScores(db);
    console.log('✅ 清除完成');
  } catch (error) {
    console.error('❌ 清除過程發生錯誤:', error);
    process.exitCode = 1;
  } finally {
    closeDatabase();
  }
}

main();

