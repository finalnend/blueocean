import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { submitScore, getLeaderboard } from '../services/gameService';
import { GameManager } from '../utils/gameEngine';

export default function SimulatorPage() {
  const { t } = useTranslation();
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
    const nickname = prompt(t('simulator.ended.submitScore.prompt'));
    if (nickname) {
      try {
        await submitScore({
          nickname,
          score,
          cleanup_rate: cleanupRate,
          duration: 300 - timeLeft
        });
        await loadLeaderboard();
        alert(t('simulator.ended.submitScore.success'));
      } catch (error) {
        console.error('提交分數失敗:', error);
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6">{t('simulator.title')}</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 遊戲區域 */}
          <div className="lg:col-span-2">
            <div className="card">
              {gameState === 'ready' && (
                <div className="text-center py-20">
                  <h2 className="mb-4">{t('simulator.ready.title')}</h2>
                  <p className="text-gray-600 mb-6">
                    {t('simulator.ready.desc1')}<br/>
                    {t('simulator.ready.desc2')}
                  </p>
                  <button onClick={startGame} className="btn-primary text-lg">
                    {t('simulator.ready.start')}
                  </button>
                </div>
              )}
              
              {gameState === 'playing' && (
                <div>
                  {/* HUD */}
                  <div className="flex justify-between mb-4 p-4 bg-gray-100 rounded-lg">
                    <div>
                      <span className="font-bold">{t('simulator.playing.score')}:</span> {score}
                    </div>
                    <div>
                      <span className="font-bold">{t('simulator.playing.timeLeft')}:</span> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
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
                      {t('simulator.playing.endGame')}
                    </button>
                  </div>
                  
                  <div className="mt-4 text-sm text-gray-600">
                    <p>{t('simulator.playing.instructions.title')}</p>
                    <ul className="list-disc list-inside">
                      <li>{t('simulator.playing.instructions.move')}</li>
                      <li>{t('simulator.playing.instructions.collect')}</li>
                      <li>{t('simulator.playing.instructions.avoid')}</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {gameState === 'ended' && (
                <div className="text-center py-12">
                  <h2 className="mb-6">{t('simulator.ended.title')}</h2>
                  
                  {/* 分數統計 */}
                  <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
                    <div className="bg-ocean-blue-50 p-4 rounded-lg">
                      <div className="text-3xl font-bold text-ocean-blue-600">{score}</div>
                      <div className="text-sm text-gray-600">{t('simulator.ended.finalScore')}</div>
                    </div>
                    <div className="bg-earth-green-50 p-4 rounded-lg">
                      <div className="text-3xl font-bold text-earth-green-600">
                        {(cleanupRate * 100).toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">{t('simulator.ended.cleanupRate')}</div>
                    </div>
                  </div>
                  
                  {/* 評價 */}
                  <div className="mb-6">
                    {cleanupRate >= 0.9 && (
                      <div className="text-2xl mb-2">🏆 {t('simulator.ended.rankings.excellent')}</div>
                    )}
                    {cleanupRate >= 0.7 && cleanupRate < 0.9 && (
                      <div className="text-2xl mb-2">🌟 {t('simulator.ended.rankings.great')}</div>
                    )}
                    {cleanupRate < 0.7 && (
                      <div className="text-2xl mb-2">💪 {t('simulator.ended.rankings.keepTrying')}</div>
                    )}
                  </div>
                  
                  {/* 教育訊息 */}
                  <div className="bg-gray-50 p-6 rounded-lg max-w-2xl mx-auto mb-6">
                    <h3 className="text-lg font-bold mb-3">🌊 {t('simulator.ended.education.title')}</h3>
                    <ul className="text-left text-sm text-gray-700 space-y-2">
                      <li>• {t('simulator.ended.education.fact1')}</li>
                      <li>• {t('simulator.ended.education.fact2')}</li>
                      <li>• {t('simulator.ended.education.fact3')}</li>
                      <li>• {t('simulator.ended.education.fact4')}</li>
                    </ul>
                  </div>
                  
                  {/* 行動建議 */}
                  <div className="bg-earth-green-50 p-6 rounded-lg max-w-2xl mx-auto mb-6">
                    <h3 className="text-lg font-bold mb-3 text-earth-green-800">✨ {t('simulator.ended.actions.title')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="text-center">
                        <div className="text-2xl mb-1">🛒</div>
                        <div>{t('simulator.ended.actions.reduce')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl mb-1">♻️</div>
                        <div>{t('simulator.ended.actions.recycle')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl mb-1">🌏</div>
                        <div>{t('simulator.ended.actions.cleanup')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl mb-1">📢</div>
                        <div>{t('simulator.ended.actions.spread')}</div>
                      </div>
                    </div>
                  </div>
                  
                  <button onClick={startGame} className="btn-primary text-lg px-8">
                    {t('simulator.ended.playAgain')}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* 排行榜 */}
          <div>
            <div className="card">
              <h3 className="mb-4">🏆 {t('simulator.leaderboard.title')}</h3>
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
              <h3 className="mb-4">💡 {t('simulator.leaderboard.trivia.title')}</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>• {t('simulator.leaderboard.trivia.fact1')}</li>
                <li>• {t('simulator.leaderboard.trivia.fact2')}</li>
                <li>• {t('simulator.leaderboard.trivia.fact3')}</li>
                <li>• {t('simulator.leaderboard.trivia.fact4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
