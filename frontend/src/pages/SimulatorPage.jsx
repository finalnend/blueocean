import { useState, useEffect, useRef, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { submitScore, getLeaderboard } from '../services/gameService';
import { GameManager } from '../utils/gameEngine';

const NICKNAME_STORAGE_KEY = 'bew_sim_nickname';
const PENDING_SCORE_STORAGE_KEY = 'bew_pending_score_v1';

function buildLessons({ gameOverReason, botDifficulty }) {
  const lessons = [
    'Use split (Space) to escape or secure a quick eat—splitting launches one cell forward.',
    'Use boost (hold Shift) to reposition, but it drains mass—boost only when it wins a fight or saves you.',
    'After splitting, regroup and wait to merge before re-engaging big bots.',
    'Grow safely early: prioritize small trash near you and avoid chasing players too soon.',
    'Keep moving in arcs (not straight lines) to make it harder for bigger bots to line up an eat.',
    'Use camera zoom: when you get bigger, scan wider before committing to a chase.',
    'When you’re medium-sized, “farm” dense food pockets to scale faster than risky fights.',
  ];

  if (botDifficulty === 'hard') {
    lessons.unshift('Hard bots react faster: don’t hover near bigger circles; break line-of-sight by changing direction.');
  } else if (botDifficulty === 'easy') {
    lessons.unshift('Easy bots are predictable: practice smooth mouse control and quick direction changes.');
  } else if (botDifficulty === 'mixed') {
    lessons.unshift('Mixed difficulty: identify hard bots and give them extra space while you farm food.');
  }

  if (gameOverReason === 'eaten') {
    lessons.unshift('You got eaten: keep more distance from anything 10% bigger; one mistake is enough.');
  } else if (gameOverReason === 'timeout') {
    lessons.unshift('Time ran out: increase early-game tempo—farm food aggressively for the first 30–60 seconds.');
  } else if (gameOverReason === 'quit') {
    lessons.unshift('You ended early: try setting a mini-goal (e.g. reach top 5 on the in-game mass board).');
  }

  return lessons;
}

export default function SimulatorPage() {
  const { t } = useTranslation();
  const [gameState, setGameState] = useState('ready'); // ready, playing, ended
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLeaderboardRefreshing, setIsLeaderboardRefreshing] = useState(false);
  const [isLeaderboardPending, startLeaderboardTransition] = useTransition();

  const [nickname, setNickname] = useState(() => {
    try {
      return localStorage.getItem(NICKNAME_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [submitStatus, setSubmitStatus] = useState('idle'); // idle | submitting | submitted | error
  const [submitError, setSubmitError] = useState('');

  const [aiCollisionEnabled, setAiCollisionEnabled] = useState(true);
  const [aiEdgeLeaveEnabled, setAiEdgeLeaveEnabled] = useState(true);
  const [botDifficulty, setBotDifficulty] = useState('mixed'); // easy | normal | hard | mixed
  const [botCount, setBotCount] = useState(15);
  const [botMix, setBotMix] = useState({ easy: 6, normal: 6, hard: 3 });
  const [gameSpeed, setGameSpeed] = useState(1);
  const [lastGameOverReason, setLastGameOverReason] = useState(null);
  const canvasRef = useRef(null);
  const gameManagerRef = useRef(null);
  const gameLoopRef = useRef(null);
  const runIdRef = useRef(0);
  const handledRunIdRef = useRef(-1);
  const submittedRunIdRef = useRef(-1);

  useEffect(() => {
    loadLeaderboard();
    submitPendingScoreIfAny();

    return () => {
      if (gameManagerRef.current) {
        gameManagerRef.current.destroy?.();
        gameManagerRef.current.stop();
      }
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!gameManagerRef.current) return;
    gameManagerRef.current.options.gameSpeed = gameSpeed;
  }, [gameSpeed]);

  const persistNickname = (nextNickname) => {
    try {
      localStorage.setItem(NICKNAME_STORAGE_KEY, nextNickname);
    } catch {
      // ignore
    }
  };

  const ensureNickname = () => {
    const trimmed = (nickname || '').trim();
    if (trimmed) return trimmed;

    const prompted = prompt(
      t('simulator.nickname.prompt', {
        defaultValue: 'Enter your name for the leaderboard:',
      })
    );
    const chosen = (prompted || '').trim();
    if (chosen) {
      setNickname(chosen);
      persistNickname(chosen);
      return chosen;
    }

    const fallback = `Guest-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0')}`;
    setNickname(fallback);
    persistNickname(fallback);
    return fallback;
  };

  const submitPendingScoreIfAny = async () => {
    let pendingRaw = null;
    try {
      pendingRaw = localStorage.getItem(PENDING_SCORE_STORAGE_KEY);
    } catch {
      pendingRaw = null;
    }
    if (!pendingRaw) return;

    try {
      const pending = JSON.parse(pendingRaw);
      if (!pending?.nickname || pending?.score === undefined) return;

      await submitScore(pending);
      try {
        localStorage.removeItem(PENDING_SCORE_STORAGE_KEY);
      } catch {
        // ignore
      }
      await loadLeaderboard();
    } catch (error) {
      console.error('Failed to submit pending score:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setIsLeaderboardRefreshing(true);
      const data = await getLeaderboard({ period: 'week', limit: 10 });
      startLeaderboardTransition(() => {
        setLeaderboard(data.leaderboard);
      });
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setIsLeaderboardRefreshing(false);
    }
  };

  const submitFinalScore = async (runId, finalState) => {
    if (submittedRunIdRef.current === runId) return;
    submittedRunIdRef.current = runId;

    const name = ensureNickname();
    const payload = {
      nickname: name,
      score: Math.floor(finalState.score || 0),
      cleanup_rate: 0,
      duration: Math.max(0, Math.floor(finalState.duration || 0)),
    };

    setSubmitStatus('submitting');
    setSubmitError('');

    try {
      await submitScore(payload);
      setSubmitStatus('submitted');
      await loadLeaderboard();
    } catch (error) {
      setSubmitStatus('error');
      setSubmitError(error?.message || 'Failed to submit score');
      try {
        localStorage.setItem(PENDING_SCORE_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore
      }
    }
  };

  const handleGameOver = async (runId, finalState) => {
    if (handledRunIdRef.current === runId) return;
    handledRunIdRef.current = runId;

    setLastGameOverReason(finalState.gameOverReason || null);
    setScore(Math.floor(finalState.score || 0));
    setTimeLeft(Math.floor(finalState.timeLeft || 0));
    setGameState('ended');

    await submitFinalScore(runId, finalState);
  };

  const startGame = () => {
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    handledRunIdRef.current = -1;
    submittedRunIdRef.current = -1;

    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    if (gameManagerRef.current) {
      gameManagerRef.current.destroy?.();
      gameManagerRef.current.stop('restarted');
      gameManagerRef.current = null;
    }

    setSubmitStatus('idle');
    setSubmitError('');

    const playerName = ensureNickname();

    setGameState('playing');
    setScore(0);
    setTimeLeft(300);

    setTimeout(() => {
      if (!canvasRef.current) return;
      if (botDifficulty === 'mixed') {
        const total = (botMix.easy || 0) + (botMix.normal || 0) + (botMix.hard || 0);
        if (total <= 0) {
          setBotMix({ easy: 6, normal: 6, hard: 3 });
        }
      }
      gameManagerRef.current = new GameManager(canvasRef.current, {
        collisionMode: aiCollisionEnabled ? 'bounce' : 'none',
        aiBoundaryMode: aiEdgeLeaveEnabled ? 'leave' : 'clamp',
        botDifficulty,
        initialAICount: botCount,
        aiMix: botDifficulty === 'mixed' ? botMix : null,
        gameSpeed,
        playerName,
      });
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
      const finalState = gameManagerRef.current.getGameState();
      handleGameOver(runIdRef.current, finalState);
    }
  };

  const endGame = () => {
    if (!gameManagerRef.current) return;
    gameManagerRef.current.stop('quit');
    const finalState = gameManagerRef.current.getGameState();
    handleGameOver(runIdRef.current, finalState);
  };

  return (
    <div className="min-h-screen text-gray-900 dark:text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-center text-ocean-blue-700 dark:text-blue-400">Ocean Agar.io</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
              {gameState === 'ready' && (
                <div className="text-center py-20">
                  <h2 className="mb-4 text-2xl">Ready to Clean the Ocean?</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Control your cleanup bubble.<br />
                    Eat trash and smaller bots to grow.<br />
                    Avoid larger bots!
                    <br />
                    {t('simulator.ready.advancedControls', {
                      defaultValue: 'Tip: Space = split, Shift = boost.',
                    })}
                  </p>

                  <div className="max-w-md mx-auto text-left mb-6 space-y-3">
                    <div>
                      <label className="block text-sm font-semibold mb-1">
                        {t('simulator.nickname.label', { defaultValue: 'Nickname' })}
                      </label>
                      <input
                        value={nickname}
                        onChange={(e) => {
                          const next = e.target.value;
                          setNickname(next);
                          persistNickname(next);
                        }}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder={t('simulator.nickname.placeholder', {
                          defaultValue: 'Enter a nickname',
                        })}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={aiCollisionEnabled}
                          onChange={(e) => setAiCollisionEnabled(e.target.checked)}
                        />
                        {t('simulator.modes.collision', {
                          defaultValue: 'AI collision (bounce)',
                        })}
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={aiEdgeLeaveEnabled}
                          onChange={(e) => setAiEdgeLeaveEnabled(e.target.checked)}
                        />
                        {t('simulator.modes.edgeLeave', {
                          defaultValue: 'AI can leave edges',
                        })}
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">
                        {t('simulator.difficulty.label', { defaultValue: 'Bot difficulty' })}
                      </label>
                      <select
                        value={botDifficulty}
                        onChange={(e) => setBotDifficulty(e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                      >
                        <option value="mixed">
                          {t('simulator.difficulty.mixed', { defaultValue: 'Mixed (E/N/H)' })}
                        </option>
                        <option value="easy">
                          {t('simulator.difficulty.easy', { defaultValue: 'Easy' })}
                        </option>
                        <option value="normal">
                          {t('simulator.difficulty.normal', { defaultValue: 'Normal' })}
                        </option>
                        <option value="hard">
                          {t('simulator.difficulty.hard', { defaultValue: 'Hard' })}
                        </option>
                      </select>

                      {botDifficulty === 'mixed' ? (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold mb-1">
                              {t('simulator.difficulty.easy', { defaultValue: 'Easy' })}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={botMix.easy}
                              onChange={(e) =>
                                setBotMix((prev) => ({
                                  ...prev,
                                  easy: Math.max(0, parseInt(e.target.value || '0', 10)),
                                }))
                              }
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1">
                              {t('simulator.difficulty.normal', { defaultValue: 'Normal' })}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={botMix.normal}
                              onChange={(e) =>
                                setBotMix((prev) => ({
                                  ...prev,
                                  normal: Math.max(0, parseInt(e.target.value || '0', 10)),
                                }))
                              }
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold mb-1">
                              {t('simulator.difficulty.hard', { defaultValue: 'Hard' })}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={botMix.hard}
                              onChange={(e) =>
                                setBotMix((prev) => ({
                                  ...prev,
                                  hard: Math.max(0, parseInt(e.target.value || '0', 10)),
                                }))
                              }
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              {t('simulator.difficulty.hintMixed', {
                                count: botMix.easy + botMix.normal + botMix.hard,
                                defaultValue: `Initial bots = ${
                                  botMix.easy + botMix.normal + botMix.hard
                                }. Respawns keep the same ratio over time.`,
                              })}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <label className="block text-xs font-semibold mb-1">
                            {t('simulator.bots.countLabel', {
                              defaultValue: 'Initial bot count',
                            })}
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={botCount}
                            onChange={(e) => setBotCount(Math.max(0, parseInt(e.target.value || '0', 10)))}
                            className="w-full px-4 py-2 border rounded-lg"
                          />
                          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                            {t('simulator.bots.countHint', {
                              defaultValue:
                                'Higher counts are harder but give more targets to farm.',
                            })}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-1">
                        {t('simulator.speed.label', { defaultValue: 'Game speed' })}
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0.5"
                          max="3"
                          step="0.25"
                          value={gameSpeed}
                          onChange={(e) => setGameSpeed(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <input
                          type="number"
                          min="0.25"
                          max="4"
                          step="0.25"
                          value={gameSpeed}
                          onChange={(e) => setGameSpeed(Math.max(0.25, Math.min(4, parseFloat(e.target.value || '1'))))}
                          className="w-24 px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
                        {t('simulator.speed.hint', {
                          defaultValue: 'Affects movement and timer. You can adjust mid-game.',
                        })}
                      </p>
                    </div>
                  </div>

                  <button onClick={startGame} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-xl transition">
                    Start Game
                  </button>

                  <div className="mt-10 max-w-2xl mx-auto text-left">
                    <h3 className="text-lg font-bold mb-3">
                      {t('simulator.lessons.title', { defaultValue: 'Lessons & Tips' })}
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                      {buildLessons({ gameOverReason: lastGameOverReason, botDifficulty }).slice(0, 5).map((tip) => (
                        <li key={tip} className="flex gap-2">
                          <span className="text-ocean-blue-600 dark:text-ocean-blue-300">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {gameState === 'playing' && (
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <label className="text-sm font-semibold whitespace-nowrap">
                      {t('simulator.speed.label', { defaultValue: 'Game speed' })}: {gameSpeed}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.25"
                      value={gameSpeed}
                      onChange={(e) => setGameSpeed(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={800}
                    height={600}
                    className="w-full rounded-lg cursor-crosshair border border-gray-300 dark:border-gray-700"
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

                  <div className="bg-gray-100 dark:bg-gray-700 p-6 rounded-lg max-w-md mx-auto mb-8">
                    <div className="text-5xl font-bold text-ocean-blue-700 dark:text-blue-400 mb-2">{score}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Final Score</div>
                    <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                      {submitStatus === 'submitting' &&
                        t('simulator.submit.submitting', { defaultValue: 'Saving score...' })}
                      {submitStatus === 'submitted' &&
                        t('simulator.submit.submitted', { defaultValue: 'Saved to leaderboard.' })}
                      {submitStatus === 'error' && (
                        <span className="text-red-600 dark:text-red-400">
                          {t('simulator.submit.error', { defaultValue: 'Save failed:' }) +
                            ' ' +
                            submitError}
                        </span>
                      )}
                    </div>
                  </div>

                  {submitStatus === 'error' && (
                    <div className="mb-6">
                      <button
                        onClick={() => {
                          if (!gameManagerRef.current) return;
                          const finalState = gameManagerRef.current.getGameState();
                          submitFinalScore(runIdRef.current, finalState);
                        }}
                        className="border border-ocean-blue-600 text-ocean-blue-700 hover:bg-ocean-blue-600 hover:text-white px-4 py-2 rounded transition"
                      >
                        {t('simulator.submit.retry', { defaultValue: 'Retry saving score' })}
                      </button>
                    </div>
                  )}

                  <button onClick={startGame} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full text-xl transition">
                    Play Again
                  </button>

                  <div className="mt-10 max-w-2xl mx-auto text-left">
                    <h3 className="text-lg font-bold mb-3">
                      {t('simulator.lessons.nextTitle', {
                        defaultValue: 'What to improve next run',
                      })}
                    </h3>
                    <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                      {buildLessons({ gameOverReason: lastGameOverReason, botDifficulty }).slice(0, 6).map((tip) => (
                        <li key={tip} className="flex gap-2">
                          <span className="text-earth-green-600 dark:text-earth-green-300">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Leaderboard */}
          <div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h3 className="mb-4 text-xl font-bold text-yellow-400">
                {t('simulator.sidebar.leaderboardTitle', { defaultValue: 'Global Leaderboard' })}
              </h3>
              <div className={`space-y-2 transition-opacity ${isLeaderboardRefreshing || isLeaderboardPending ? 'opacity-70' : 'opacity-100'}`}>
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.id || index}
                    className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${index < 3 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        #{entry.rank || index + 1}
                      </span>
                      <span>{entry.nickname}</span>
                    </div>
                    <span className="font-semibold text-ocean-blue-700 dark:text-blue-300">{entry.score}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg mt-6">
              <h3 className="mb-4 text-lg font-bold">
                {t('simulator.sidebar.controlsTitle', { defaultValue: 'Controls' })}
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                <li>{t('simulator.sidebar.controls.move', { defaultValue: 'Mouse: move' })}</li>
                <li>
                  {t('simulator.sidebar.controls.split', {
                    defaultValue: 'Space: split into cells (requires mass)',
                  })}
                </li>
                <li>
                  {t('simulator.sidebar.controls.boost', {
                    defaultValue: 'Shift (hold): speed boost (drains mass)',
                  })}
                </li>
                <li>
                  {t('simulator.sidebar.controls.merge', {
                    defaultValue: 'Cells can merge again after a short delay when touching',
                  })}
                </li>
                <li>
                  {t('simulator.sidebar.controls.goal', {
                    defaultValue: 'Eat trash and smaller bots; avoid bigger ones',
                  })}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
