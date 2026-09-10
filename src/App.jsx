import { useCallback, useEffect, useMemo, useState } from 'react';
import { LEVELS } from './levels';

const DIRS = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  w: [-1, 0],
  s: [1, 0],
  a: [0, -1],
  d: [0, 1],
  W: [-1, 0],
  S: [1, 0],
  A: [0, -1],
  D: [0, 1],
};

function parseLevel(level) {
  const grid = level.map.map(row => row.split(''));
  let player = null;
  const boxes = [];
  const targets = new Set();

  grid.forEach((row, r) => row.forEach((cell, c) => {
    const key = `${r},${c}`;
    if (cell === '@' || cell === '+') {
      player = [r, c];
      grid[r][c] = cell === '+' ? '.' : ' ';
    }
    if (cell === '$' || cell === '*') {
      boxes.push([r, c]);
      if (cell === '*') targets.add(key);
      grid[r][c] = cell === '*' ? '.' : ' ';
    }
    if (cell === '.') targets.add(key);
  }));

  return { grid, player, boxes, targets };
}

const keyOf = ([r,c]) => `${r},${c}`;
const same = (a,b) => a[0] === b[0] && a[1] === b[1];

export default function App() {
  const [levelIndex, setLevelIndex] = useState(0);
  const [state, setState] = useState(() => parseLevel(LEVELS[0]));
  const [moves, setMoves] = useState(0);
  const [history, setHistory] = useState([]);
  const [won, setWon] = useState(false);

  const reset = useCallback((index = levelIndex) => {
    setState(parseLevel(LEVELS[index]));
    setMoves(0);
    setHistory([]);
    setWon(false);
  }, [levelIndex]);

  const loadLevel = (index) => {
    setLevelIndex(index);
    setState(parseLevel(LEVELS[index]));
    setMoves(0);
    setHistory([]);
    setWon(false);
  };

  const isWon = (boxes, targets) =>
    boxes.length === targets.size && boxes.every(box => targets.has(keyOf(box)));

  const move = useCallback((dr, dc) => {
    if (won) return;

    setState(prev => {
      const [pr, pc] = prev.player;
      const next = [pr + dr, pc + dc];
      const nr = next[0], nc = next[1];
      if (!prev.grid[nr] || prev.grid[nr][nc] === '#') return prev;

      const boxIndex = prev.boxes.findIndex(b => same(b, next));
      let nextBoxes = prev.boxes.map(b => [...b]);

      if (boxIndex >= 0) {
        const beyond = [nr + dr, nc + dc];
        if (!prev.grid[beyond[0]] || prev.grid[beyond[0]][beyond[1]] === '#') return prev;
        if (prev.boxes.some(b => same(b, beyond))) return prev;
        nextBoxes[boxIndex] = beyond;
      }

      setHistory(h => [...h, {
        player: [...prev.player],
        boxes: prev.boxes.map(b => [...b])
      }]);
      setMoves(m => m + 1);

      const nextState = { ...prev, player: next, boxes: nextBoxes };
      if (isWon(nextBoxes, prev.targets)) setWon(true);
      return nextState;
    });
  }, [won]);

  const undo = () => {
    setHistory(h => {
      if (!h.length || won) {
        if (won) setWon(false);
        return h;
      }
      const last = h[h.length - 1];
      setState(prev => ({ ...prev, player: last.player, boxes: last.boxes }));
      setMoves(m => Math.max(0, m - 1));
      return h.slice(0, -1);
    });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (DIRS[e.key]) {
        e.preventDefault();
        move(...DIRS[e.key]);
      }
      if (e.key.toLowerCase() === 'r') reset();
      if (e.key.toLowerCase() === 'z') undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, reset, history, won]);

  const rows = state.grid.length;
  const cols = Math.max(...state.grid.map(r => r.length));
  const solved = state.boxes.filter(b => state.targets.has(keyOf(b))).length;

  const cells = useMemo(() => {
    const out = [];
    for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) {
      const base = state.grid[r]?.[c] ?? '#';
      const pos = [r,c];
      const target = state.targets.has(keyOf(pos));
      const box = state.boxes.some(b => same(b,pos));
      const player = same(state.player,pos);
      let cls = base === '#' ? 'wall' : 'floor';
      if (target) cls += ' target';
      if (box) cls += target ? ' box on-target' : ' box';
      if (player) cls += target ? ' player on-target' : ' player';
      out.push(<div className={cls} key={`${r}-${c}`}>
        {box && <span>📦</span>}
        {player && <span>🙂</span>}
      </div>);
    }
    return out;
  }, [state, rows, cols]);

  return (
    <main className="app">
      <section className="game-shell">
        <header>
          <div>
            <p className="eyebrow">REACT + VITE</p>
            <h1>Sokoban</h1>
            <p className="subtitle">Push every crate onto a glowing target.</p>
          </div>
          <div className="level-pill">Level {levelIndex + 1} / {LEVELS.length}</div>
        </header>

        <div className="stats">
          <div><span>Moves</span><strong>{moves}</strong></div>
          <div><span>Crates</span><strong>{solved}/{state.boxes.length}</strong></div>
          <div><span>Best</span><strong>—</strong></div>
        </div>

        <div className="board-wrap">
          <div className="board" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {cells}
          </div>
          {won && (
            <div className="win-modal">
              <div className="trophy">🏆</div>
              <h2>Level Complete!</h2>
              <p>You solved {LEVELS[levelIndex].name} in {moves} moves.</p>
              <button onClick={() => levelIndex < LEVELS.length - 1 ? loadLevel(levelIndex + 1) : reset(0)}>
                {levelIndex < LEVELS.length - 1 ? 'Next Level →' : 'Play Again'}
              </button>
            </div>
          )}
        </div>

        <div className="controls">
          <button onClick={() => move(-1,0)}>↑</button>
          <div>
            <button onClick={() => move(0,-1)}>←</button>
            <button onClick={() => move(1,0)}>↓</button>
            <button onClick={() => move(0,1)}>→</button>
          </div>
        </div>

        <div className="actions">
          <button onClick={undo} disabled={!history.length}>↶ Undo</button>
          <button onClick={() => reset()}>↻ Restart</button>
        </div>

        <div className="level-select">
          <span>Choose level:</span>
          {LEVELS.map((level, i) => (
            <button className={i === levelIndex ? 'active' : ''} onClick={() => loadLevel(i)} key={level.name}>
              {i + 1}
            </button>
          ))}
        </div>

        <footer>Keyboard: Arrow Keys / WASD · R Restart · Z Undo</footer>
      </section>
    </main>
  );
}
