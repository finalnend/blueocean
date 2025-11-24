import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { submitScore, getLeaderboard } from '../services/gameService';
import { GameManager } from '../utils/gameEngine';

export default function SimulatorPage() {
  const { t } = useTranslation();
  const [gameState, setGameState] = useState('ready'); // ready, playing, ended
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [leaderboard, setLeaderboard] = useState([]);
  const canvasRef = useRef(null);
  const gameManagerRef = useRef(null);
  const gameLoopRef = useRef(null);

  useEffect(() => {
    loadLeaderboard();

    return () => {
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
      console.error('Failed to load leaderboard:', error);
    }
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(300);

    setTimeout(() => {
      if (!canvasRef.current) return;
      // Make canvas fill the container or window if possible, for now keep fixed size but maybe larger
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
      gameLoopRef.current = requestAnimationFrame(updateUI);
    } else if (gameManagerRef.current) {
      // Game Over
      const finalState = gameManagerRef.current.getGameState();
      setScore(Math.floor(finalState.score));
      setGameState('ended');
    }
  };

  const endGame = async () => {
    if (gameManagerRef.current) {
      gameManagerRef.current.stop();
    }

    setGameState('ended');
    const nickname = prompt(t('simulator.ended.submitScore.prompt') || "Enter your name for the leaderboard:");
    if (nickname) {
      try {
        await submitScore({
          nickname,
          score,
          cleanup_rate: 0, // Not used
          duration: 300 - timeLeft
        });
        await loadLeaderboard();
        alert(t('simulator.ended.submitScore.success') || "Score submitted!");
      } catch (error) {
        console.error('Failed to submit score:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-center text-blue-400">Ocean Agar.io</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
              {gameState === 'ready' && (
                <div className="text-center py-20">
                  <h2 className="mb-4 text-2xl">Ready to Clean the Ocean?</h2>
                  <p className="text-gray-400 mb-6">
                    Control your cleanup bubble.<br />
                    Eat trash and smaller bots to grow.<br />
                    Avoid larger bots!
                  </p>
                  <button onClick={startGame} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-xl transition">
                    Start Game
                  </button>
                </div>
              )}

              {gameState === 'playing' && (
                <div>
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="w-full rounded-lg cursor-crosshair border border-gray-700"
                  />

                  <div className="mt-4 text-center">
                    <button onClick={endGame} className="border border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded">
                      End Game
                    </button>
                  </div>
                </div>
              )}

              {gameState === 'ended' && (
                <div className="text-center py-12">
                  <h2 className="mb-6 text-3xl">Game Over!</h2>

                  <div className="bg-gray-700 p-6 rounded-lg max-w-md mx-auto mb-8">
                    <div className="text-5xl font-bold text-blue-400 mb-2">{score}</div>
                    <div className="text-sm text-gray-400">Final Score</div>
                  </div>

                  <button onClick={startGame} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-xl transition">
                    Play Again
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div>
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="mb-4 text-xl font-bold text-yellow-400">🏆 Global Leaderboard</h3>
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.id || index}
                    className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${index < 3 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        #{entry.rank || index + 1}
                      </span>
                      <span>{entry.nickname}</span>
                    </div>
                    <span className="font-semibold text-blue-300">{entry.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 shadow-lg mt-6">
              <h3 className="mb-4 text-lg font-bold">🎮 Controls</h3>
              <ul className="text-sm text-gray-400 space-y-2">
                <li>• Mouse to move</li>
                <li>• Eat trash to grow</li>
                <li>• Eat smaller players</li>
                <li>• Avoid larger players</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
