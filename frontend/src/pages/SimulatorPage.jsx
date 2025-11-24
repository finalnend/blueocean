import { useState, useEffect, useRef } from 'react';
import { submitScore, getLeaderboard } from '../services/gameService';
import { GameManager } from '../utils/gameEngine';

export default function SimulatorPage() {
  const [gameState, setGameState] = useState('ready'); // ready, playing, ended
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [cleanupRate, setCleanupRate] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const canvasRef = useRef(null);
  const gameManagerRef = useRef(null);
  const gameLoopRef = useRef(null);
  
  useEffect(() => {
    loadLeaderboard();
    
    return () => {
      // 清理遊戲
      if (gameManagerRef.current) {
        gameManagerRef.current.stop();
      }
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);
  
  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard({ period: 'week', limit: 10 });
      setLeaderboard(data.leaderboard);
    } catch (error) {
      console.error('載入排行榜失敗:', error);
    }
  };
  
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(300);
    setCleanupRate(0);
    
    // 延遲初始化遊戲管理器，確保 canvas 已渲染
    setTimeout(() => {
      if (!canvasRef.current) {
        console.error('Canvas not found!');
        return;
      }
      gameManagerRef.current = new GameManager(canvasRef.current);
      gameManagerRef.current.start();
      updateUI();
    }, 100);
  };
  
  const updateUI = () => {
      if (gameManagerRef.current && gameManagerRef.current.isRunning) {
        const state = gameManagerRef.current.getGameState();
        setScore(Math.floor(state.score));
        setTimeLeft(Math.floor(state.timeLeft));
        setCleanupRate(state.cleanupRate);
        gameLoopRef.current = requestAnimationFrame(updateUI);
      } else if (gameManagerRef.current) {
        // 遊戲結束
        const finalState = gameManagerRef.current.getGameState();
        setScore(Math.floor(finalState.score));
        setCleanupRate(finalState.cleanupRate);
        setGameState('ended');
      }
    };
  
  const endGame = async () => {
    if (gameManagerRef.current) {
      gameManagerRef.current.stop();
    }
    
    setGameState('ended');
    const nickname = prompt('請輸入您的暱稱：');
    if (nickname) {
      try {
        await submitScore({
          nickname,
          score,
          cleanup_rate: cleanupRate,
          duration: 300 - timeLeft
        });
        await loadLeaderboard();
        alert('分數已提交！');
      } catch (error) {
        console.error('提交分數失敗:', error);
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6">海洋清理模擬遊戲</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 遊戲區域 */}
          <div className="lg:col-span-2">
            <div className="card">
              {gameState === 'ready' && (
                <div className="text-center py-20">
                  <h2 className="mb-4">準備開始清理海洋！</h2>
                  <p className="text-gray-600 mb-6">
                    使用方向鍵移動清理船，在限時內盡可能收集海洋垃圾。<br/>
                    注意避開海洋生物！
                  </p>
                  <button onClick={startGame} className="btn-primary text-lg">
                    開始遊戲
                  </button>
                </div>
              )}
              
              {gameState === 'playing' && (
                <div>
                  {/* HUD */}
                  <div className="flex justify-between mb-4 p-4 bg-gray-100 rounded-lg">
                    <div>
                      <span className="font-bold">分數:</span> {score}
                    </div>
                    <div>
                      <span className="font-bold">剩餘時間:</span> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                  
                  {/* 遊戲畫布 */}
                  <canvas 
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="game-canvas w-full"
                  />
                  
                  <div className="mt-4 text-center">
                    <button onClick={endGame} className="btn-outline">
                      結束遊戲
                    </button>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-600">
                    <p>操作說明：</p>
                    <ul className="list-disc list-inside">
                      <li>↑↓←→ - 移動清理船</li>
                      <li>靠近垃圾自動收集</li>
                      <li>避免碰到海洋生物</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {gameState === 'ended' && (
                <div className="text-center py-12">
                  <h2 className="mb-6">遊戲結束！</h2>
                  
                  {/* 分數統計 */}
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                    <div className="bg-ocean-blue-50 p-4 rounded-lg">
                      <div className="text-3xl font-bold text-ocean-blue-600">{score}</div>
                      <div className="text-sm text-gray-600">最終分數</div>
                    </div>
                    <div className="bg-earth-green-50 p-4 rounded-lg">
                      <div className="text-3xl font-bold text-earth-green-600">
                        {(cleanupRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">清理率</div>
                    </div>
                  </div>
                  
                  {/* 評價 */}
                  <div className="mb-6">
                    {cleanupRate >= 0.9 && (
                      <div className="text-2xl mb-2">🏆 卓越！</div>
                    )}
                    {cleanupRate >= 0.7 && cleanupRate < 0.9 && (
                      <div className="text-2xl mb-2">🌟 很棒！</div>
                    )}
                    {cleanupRate < 0.7 && (
                      <div className="text-2xl mb-2">💪 繼續努力！</div>
                    )}
                  </div>
                  
                  {/* 教育訊息 */}
                  <div className="bg-gray-50 p-6 rounded-lg max-w-2xl mx-auto mb-6">
                    <h3 className="text-lg font-bold mb-3">🌊 現實中的海洋污染</h3>
                    <ul className="text-left text-sm text-gray-700 space-y-2">
                      <li>• 每年約有 <strong>1100 萬噸</strong>塑膠流入海洋</li>
                      <li>• 至少 <strong>14 億噸</strong>塑膠已累積在海洋中</li>
                      <li>• 每年有超過 <strong>100 萬隻</strong>海鳥和海洋哺乳動物因塑膠污染死亡</li>
                      <li>• 到 2050 年，海洋中的塑膠可能比魚還多</li>
                    </ul>
                  </div>
                  
                  {/* 行動建議 */}
                  <div className="bg-earth-green-50 p-6 rounded-lg max-w-2xl mx-auto mb-6">
                    <h3 className="text-lg font-bold mb-3 text-earth-green-800">✨ 你可以這樣做</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="text-center">
                        <div className="text-2xl mb-1">🛒</div>
                        <div>減少一次性塑膠</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl mb-1">♻️</div>
                        <div>回收再利用</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl mb-1">🌏</div>
                        <div>參與淫灘活動</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl mb-1">📢</div>
                        <div>傳播環保意識</div>
                      </div>
                    </div>
                  </div>
                  
                  <button onClick={startGame} className="btn-primary text-lg px-8">
                    再玩一次
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* 排行榜 */}
          <div>
            <div className="card">
              <h3 className="mb-4">🏆 週排行榜</h3>
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div 
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-ocean-blue-600">
                        #{entry.rank}
                      </span>
                      <span>{entry.nickname}</span>
                    </div>
                    <span className="font-semibold">{entry.score}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="card mt-6">
              <h3 className="mb-4">💡 小知識</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• 每年有 1100 萬噸塑膠流入海洋</li>
                <li>• 至少 14 億噸塑膠已累積在海洋中</li>
                <li>• 海洋生物常誤食塑膠而死亡</li>
                <li>• 我們可以透過減塑行動改變現況</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
