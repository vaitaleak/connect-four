import React, { useState, useCallback } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, Dimensions,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const COLS = 7;
const ROWS = 6;
const { width } = Dimensions.get('window');
const CELL = Math.floor((width - 20) / COLS);
const PIECE = CELL - 8;

type Board = (null | 'R' | 'Y')[];

function createBoard(): Board {
  return Array(COLS * ROWS).fill(null);
}

function getCell(b: Board, r: number, c: number) { return b[r * COLS + c]; }
function setCell(b: Board, r: number, c: number, v: 'R' | 'Y'): Board {
  const nb = [...b]; nb[r * COLS + c] = v; return nb;
}

function dropPiece(b: Board, col: number, player: 'R' | 'Y'): { board: Board; row: number } | null {
  for (let r = ROWS - 1; r >= 0; r--) {
    if (getCell(b, r, col) === null) return { board: setCell(b, r, col, player), row: r };
  }
  return null;
}

function checkWin(b: Board, row: number, col: number): boolean {
  const p = getCell(b, row, col);
  if (!p) return false;
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (let d = 1; d < 4; d++) {
      const nr = row + dr * d, nc = col + dc * d;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && getCell(b, nr, nc) === p) count++;
      else break;
    }
    for (let d = 1; d < 4; d++) {
      const nr = row - dr * d, nc = col - dc * d;
      if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && getCell(b, nr, nc) === p) count++;
      else break;
    }
    if (count >= 4) return true;
  }
  return false;
}

function isDraw(b: Board): boolean {
  return b.slice(0, COLS).every((_, c) => getCell(b, 0, c) !== null);
}

// Simple AI: check winning move, block, center preference
function aiMove(b: Board): number {
  // Try to win
  for (let c = 0; c < COLS; c++) {
    const r = dropPiece(b, c, 'Y');
    if (r && checkWin(r.board, r.row, c)) return c;
  }
  // Block player
  for (let c = 0; c < COLS; c++) {
    const r = dropPiece(b, c, 'R');
    if (r && checkWin(r.board, r.row, c)) return c;
  }
  // Prefer center
  const order = [3, 2, 4, 1, 5, 0, 6];
  for (const c of order) {
    if (getCell(b, 0, c) === null) return c;
  }
  return 0;
}

export default function App() {
  const [board, setBoard] = useState<Board>(createBoard);
  const [player, setPlayer] = useState<'R' | 'Y'>('R');
  const [winner, setWinner] = useState<null | 'R' | 'Y' | 'D'>(null);
  const [scoreR, setScoreR] = useState(0);
  const [scoreY, setScoreY] = useState(0);
  const [mode, setMode] = useState<'1P' | '2P'>('1P');
  const [winCells, setWinCells] = useState<Set<number>>(new Set());

  const handleCol = useCallback((col: number) => {
    if (winner) return;
    const current = player;
    const result = dropPiece(board, col, current);
    if (!result) return;

    const { board: newBoard, row } = result;
    if (checkWin(newBoard, row, col)) {
      setBoard(newBoard);
      setWinner(current);
      if (current === 'R') setScoreR(s => s + 1);
      else setScoreY(s => s + 1);
      return;
    }
    if (isDraw(newBoard)) {
      setBoard(newBoard);
      setWinner('D');
      return;
    }

    const next = current === 'R' ? 'Y' : 'R';
    setBoard(newBoard);
    setPlayer(next);

    // AI move
    if (mode === '1P' && next === 'Y') {
      setTimeout(() => {
        const aiCol = aiMove(newBoard);
        const aiResult = dropPiece(newBoard, aiCol, 'Y');
        if (!aiResult) return;
        if (checkWin(aiResult.board, aiResult.row, aiCol)) {
          setBoard(aiResult.board);
          setWinner('Y');
          setScoreY(s => s + 1);
        } else if (isDraw(aiResult.board)) {
          setBoard(aiResult.board);
          setWinner('D');
        } else {
          setBoard(aiResult.board);
          setPlayer('R');
        }
      }, 400);
    }
  }, [board, player, winner, mode]);

  const newGame = useCallback(() => {
    setBoard(createBoard());
    setPlayer('R');
    setWinner(null);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Connect Four</Text>

      <View style={styles.modeRow}>
        {(['1P', '2P'] as const).map(m => (
          <TouchableOpacity key={m} style={[styles.modeBtn, mode === m && styles.modeActive]} onPress={() => { setMode(m); newGame(); }}>
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{m === '1P' ? '🤖 vs AI' : '👥 2P'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.scoreRow}>
        <View style={[styles.scoreBox, { borderColor: '#e74c3c' }]}>
          <Text style={styles.scoreLabel}>🔴 You</Text>
          <Text style={styles.scoreValue}>{scoreR}</Text>
        </View>
        <TouchableOpacity style={styles.newGameBtn} onPress={newGame}>
          <Text style={styles.newGameText}>New</Text>
        </TouchableOpacity>
        <View style={[styles.scoreBox, { borderColor: '#f1c40f' }]}>
          <Text style={styles.scoreLabel}>🟡 {mode === '1P' ? 'AI' : 'P2'}</Text>
          <Text style={styles.scoreValue}>{scoreY}</Text>
        </View>
      </View>

      <Text style={styles.turn}>{winner ? (winner === 'D' ? 'Draw!' : (winner === 'R' ? '🔴 Wins!' : '🟡 Wins!')) : (player === 'R' ? '🔴 Your turn' : '🟡 ' + (mode === '1P' ? 'AI...' : 'P2'))}</Text>

      {/* Drop indicators */}
      <View style={styles.dropRow}>
        {Array.from({ length: COLS }, (_, c) => (
          <TouchableOpacity key={c} style={styles.dropZone} onPress={() => handleCol(c)} disabled={winner !== null || (mode === '1P' && player === 'Y')}>
            <View style={[styles.dropIndicator, winner === null && { borderColor: player === 'R' ? '#e74c3c' : '#f1c40f' }]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Board */}
      <View style={styles.boardOuter}>
        <View style={styles.board}>
          {Array.from({ length: ROWS * COLS }, (_, i) => {
            const r = Math.floor(i / COLS), c = i % COLS;
            const cell = getCell(board, r, c);
            return (
              <View key={i} style={styles.cell}>
                {cell && <View style={[styles.piece, cell === 'R' ? styles.red : styles.yellow]} />}
              </View>
            );
          })}
        </View>
      </View>

      {winner && (
        <View style={styles.overlay}>
          <Text style={styles.winnerText}>{winner === 'D' ? '🤝 Draw!' : (winner === 'R' ? '🔴 Red Wins!' : '🟡 Yellow Wins!')}</Text>
          <TouchableOpacity style={styles.playBtn} onPress={newGame}>
            <Text style={styles.playBtnText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', paddingTop: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  modeBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 15, backgroundColor: '#16213e' },
  modeActive: { backgroundColor: '#3498db' },
  modeText: { color: '#888', fontWeight: 'bold' },
  modeTextActive: { color: '#fff' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 8 },
  scoreBox: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center' },
  scoreLabel: { color: '#aaa', fontSize: 13 },
  scoreValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  newGameBtn: { backgroundColor: '#27ae60', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 15 },
  newGameText: { color: '#fff', fontWeight: 'bold' },
  turn: { color: '#ccc', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  dropRow: { flexDirection: 'row', width: COLS * CELL },
  dropZone: { width: CELL, height: 30, justifyContent: 'center', alignItems: 'center' },
  dropIndicator: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: 'transparent' },
  boardOuter: { backgroundColor: '#2980b9', borderRadius: 12, padding: 6 },
  board: { flexDirection: 'row', flexWrap: 'wrap', width: COLS * CELL, height: ROWS * CELL },
  cell: { width: CELL, height: CELL, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2471a3', margin: 1, borderRadius: CELL / 2 },
  piece: { width: PIECE, height: PIECE, borderRadius: PIECE / 2 },
  red: { backgroundColor: '#e74c3c' },
  yellow: { backgroundColor: '#f1c40f' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  winnerText: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
  playBtn: { backgroundColor: '#27ae60', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  playBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
});
