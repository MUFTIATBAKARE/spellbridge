/**
 * WordBank.ts
 * 
 * Educational vocabulary engine for SpellBridge 3D:
 * - Curated dictionary of kid-friendly 3-to-6 letter words with emoji clues
 * - Helper functions to pick words by stage/difficulty
 * - Distractor letter generator for interactive stepping stone puzzle mechanics
 * - WordProgressTracker for letter-by-letter spelling flow
 */

export interface WordEntry {
  word: string;
  emoji: string;
  category: 'Animals' | 'Nature' | 'Food' | 'Objects' | 'Vehicles' | 'Adventure';
  stage: number; // 1: 3-letter, 2: 4-letter, 3: 5-letter, 4: 6-letter
}

export const WORD_BANK: WordEntry[] = [
  // Stage 1: 3-Letter Words
  { word: 'CAT', emoji: '🐱', category: 'Animals', stage: 1 },
  { word: 'DOG', emoji: '🐶', category: 'Animals', stage: 1 },
  { word: 'SUN', emoji: '☀️', category: 'Nature', stage: 1 },
  { word: 'FOX', emoji: '🦊', category: 'Animals', stage: 1 },
  { word: 'BEE', emoji: '🐝', category: 'Animals', stage: 1 },
  { word: 'OWL', emoji: '🦉', category: 'Animals', stage: 1 },
  { word: 'COW', emoji: '🐮', category: 'Animals', stage: 1 },
  { word: 'PIG', emoji: '🐷', category: 'Animals', stage: 1 },
  { word: 'BAT', emoji: '🦇', category: 'Animals', stage: 1 },
  { word: 'BUS', emoji: '🚌', category: 'Vehicles', stage: 1 },
  { word: 'HAT', emoji: '🎩', category: 'Objects', stage: 1 },
  { word: 'KEY', emoji: '🗝️', category: 'Objects', stage: 1 },
  { word: 'BOX', emoji: '📦', category: 'Objects', stage: 1 },
  { word: 'ICE', emoji: '🍦', category: 'Food', stage: 1 },
  { word: 'ANT', emoji: '🐜', category: 'Animals', stage: 1 },
  { word: 'GEM', emoji: '💎', category: 'Adventure', stage: 1 },

  // Stage 2: 4-Letter Words
  { word: 'FROG', emoji: '🐸', category: 'Animals', stage: 2 },
  { word: 'DUCK', emoji: '🦆', category: 'Animals', stage: 2 },
  { word: 'SHIP', emoji: '🚢', category: 'Vehicles', stage: 2 },
  { word: 'LION', emoji: '🦁', category: 'Animals', stage: 2 },
  { word: 'BEAR', emoji: '🐻', category: 'Animals', stage: 2 },
  { word: 'FISH', emoji: '🐟', category: 'Animals', stage: 2 },
  { word: 'BIRD', emoji: '🐦', category: 'Animals', stage: 2 },
  { word: 'TREE', emoji: '🌲', category: 'Nature', stage: 2 },
  { word: 'BOAT', emoji: '⛵', category: 'Vehicles', stage: 2 },
  { word: 'STAR', emoji: '⭐', category: 'Nature', stage: 2 },
  { word: 'MOON', emoji: '🌙', category: 'Nature', stage: 2 },
  { word: 'ROSE', emoji: '🌺', category: 'Nature', stage: 2 },
  { word: 'CRAB', emoji: '🦀', category: 'Animals', stage: 2 },
  { word: 'CAKE', emoji: '🎂', category: 'Food', stage: 2 },
  { word: 'KITE', emoji: '🪁', category: 'Objects', stage: 2 },
  { word: 'WOLF', emoji: '🐺', category: 'Animals', stage: 2 },
  { word: 'DEER', emoji: '🦌', category: 'Animals', stage: 2 },
  { word: 'BELL', emoji: '🔔', category: 'Objects', stage: 2 },

  // Stage 3: 5-Letter Words
  { word: 'APPLE', emoji: '🍎', category: 'Food', stage: 3 },
  { word: 'TIGER', emoji: '🐯', category: 'Animals', stage: 3 },
  { word: 'ZEBRA', emoji: '🦓', category: 'Animals', stage: 3 },
  { word: 'PANDA', emoji: '🐼', category: 'Animals', stage: 3 },
  { word: 'KOALA', emoji: '🐨', category: 'Animals', stage: 3 },
  { word: 'WHALE', emoji: '🐳', category: 'Animals', stage: 3 },
  { word: 'BERRY', emoji: '🍓', category: 'Food', stage: 3 },
  { word: 'PIZZA', emoji: '🍕', category: 'Food', stage: 3 },
  { word: 'CLOUD', emoji: '☁️', category: 'Nature', stage: 3 },
  { word: 'TRAIN', emoji: '🚂', category: 'Vehicles', stage: 3 },
  { word: 'CROWN', emoji: '👑', category: 'Adventure', stage: 3 },
  { word: 'OCEAN', emoji: '🌊', category: 'Nature', stage: 3 },
  { word: 'TOWER', emoji: '🏰', category: 'Adventure', stage: 3 },
  { word: 'LEMON', emoji: '🍋', category: 'Food', stage: 3 },
  { word: 'BREAD', emoji: '🍞', category: 'Food', stage: 3 },
  { word: 'GHOST', emoji: '👻', category: 'Adventure', stage: 3 },

  // Stage 4: 6-Letter Words
  { word: 'MONKEY', emoji: '🐵', category: 'Animals', stage: 4 },
  { word: 'DOLPHIN', emoji: '🐬', category: 'Animals', stage: 4 },
  { word: 'TURTLE', emoji: '🐢', category: 'Animals', stage: 4 },
  { word: 'RABBIT', emoji: '🐰', category: 'Animals', stage: 4 },
  { word: 'ROCKET', emoji: '🚀', category: 'Vehicles', stage: 4 },
  { word: 'BANANA', emoji: '🍌', category: 'Food', stage: 4 },
  { word: 'CASTLE', emoji: '🏰', category: 'Adventure', stage: 4 },
  { word: 'GUITAR', emoji: '🎸', category: 'Objects', stage: 4 },
  { word: 'BRIDGE', emoji: '🌉', category: 'Adventure', stage: 4 },
  { word: 'PARROT', emoji: '🦜', category: 'Animals', stage: 4 },
  { word: 'WIZARD', emoji: '🧙', category: 'Adventure', stage: 4 },
  { word: 'ISLAND', emoji: '🏝️', category: 'Nature', stage: 4 },
];

/**
 * Returns all words assigned to a given stage.
 */
export function getWordsByStage(stage: number): WordEntry[] {
  const normalizedStage = Math.max(1, Math.min(stage, 4));
  return WORD_BANK.filter((w) => w.stage === normalizedStage);
}

/**
 * Picks a random word appropriate for the stage, avoiding recently used words.
 */
export function pickWordForStage(stage: number, previousWords: string[] = []): WordEntry {
  const words = getWordsByStage(stage);
  const available = words.filter((w) => !previousWords.includes(w.word));

  const pool = available.length > 0 ? available : words;
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

/**
 * Picks any random word with optional stage/length constraint.
 */
export function getRandomWord(stage?: number): WordEntry {
  if (typeof stage === 'number') {
    return pickWordForStage(stage);
  }
  const randomIndex = Math.floor(Math.random() * WORD_BANK.length);
  return WORD_BANK[randomIndex];
}

/**
 * Generates N unique uppercase distractor letters distinct from the correct letter.
 */
export function generateDistractorLetters(
  correctLetter: string,
  count: number = 2,
  excludeLetters: string[] = []
): string[] {
  const upperCorrect = correctLetter.toUpperCase();
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  const forbidden = new Set([upperCorrect, ...excludeLetters.map((l) => l.toUpperCase())]);
  const candidates = alphabet.filter((char) => !forbidden.has(char));

  // Shuffle candidates (Fisher-Yates)
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return candidates.slice(0, count);
}

/**
 * Manages the spelling state for a single target word.
 */
export class WordProgressTracker {
  private currentWordEntry: WordEntry;
  private currentLetterIndex: number = 0;
  private totalAttempts: number = 0;
  private correctAttempts: number = 0;

  constructor(initialWord: WordEntry) {
    this.currentWordEntry = initialWord;
    this.reset(initialWord);
  }

  public get wordEntry(): WordEntry {
    return this.currentWordEntry;
  }

  public get word(): string {
    return this.currentWordEntry.word;
  }

  public get emoji(): string {
    return this.currentWordEntry.emoji;
  }

  public get currentIndex(): number {
    return this.currentLetterIndex;
  }

  public get length(): number {
    return this.currentWordEntry.word.length;
  }

  public getCurrentTargetLetter(): string {
    if (this.isWordComplete()) return '';
    return this.currentWordEntry.word[this.currentLetterIndex].toUpperCase();
  }

  /**
   * Evaluates input letter against the current target letter.
   * If correct, advances the spelling index.
   */
  public checkLetter(inputLetter: string): {
    correct: boolean;
    isComplete: boolean;
    targetLetter: string;
    nextIndex: number;
  } {
    this.totalAttempts++;
    const target = this.getCurrentTargetLetter();
    const isCorrect = inputLetter.toUpperCase() === target;

    if (isCorrect) {
      this.correctAttempts++;
      this.currentLetterIndex++;
    }

    return {
      correct: isCorrect,
      isComplete: this.isWordComplete(),
      targetLetter: target,
      nextIndex: this.currentLetterIndex,
    };
  }

  public isWordComplete(): boolean {
    return this.currentLetterIndex >= this.currentWordEntry.word.length;
  }

  public getSpelledLetters(): string[] {
    return this.currentWordEntry.word
      .slice(0, this.currentLetterIndex)
      .split('');
  }

  public getRemainingLetters(): string[] {
    return this.currentWordEntry.word
      .slice(this.currentLetterIndex)
      .split('');
  }

  /**
   * Returns array representation of slots, e.g. ['F', 'R', '_', '_']
   */
  public getMaskedSlots(): string[] {
    const result: string[] = [];
    for (let i = 0; i < this.currentWordEntry.word.length; i++) {
      if (i < this.currentLetterIndex) {
        result.push(this.currentWordEntry.word[i]);
      } else {
        result.push('_');
      }
    }
    return result;
  }

  /**
   * Calculates overall session or word spelling accuracy percentage.
   */
  public getAccuracy(): number {
    if (this.totalAttempts === 0) return 100;
    return Math.round((this.correctAttempts / this.totalAttempts) * 100);
  }

  /**
   * Resets tracker to beginning of a word (or a new word).
   */
  public reset(newWord?: WordEntry): void {
    if (newWord) {
      this.currentWordEntry = newWord;
    }
    this.currentLetterIndex = 0;
  }
}

