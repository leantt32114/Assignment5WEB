'use strict';

// ===== Game constants: every number of the game lives here =====
const CODE_LENGTH = 4;    // digits in the secret code
const MAX_ATTEMPTS = 8;   // attempts per game
const DIGIT_MIN = 0;      // smallest digit
const DIGIT_MAX = 9;      // largest digit

// ===== Page elements =====
const card = document.getElementById('game');
const form = document.getElementById('guess-form');
const input = document.getElementById('guess');
const guessBtn = document.getElementById('guess-btn');
const restartBtn = document.getElementById('restart');
const message = document.getElementById('message');
const attemptsLeft = document.getElementById('left');
const list = document.getElementById('history');
const emptyNote = document.getElementById('empty');

// ===== Game state =====
let secret = [];     // the secret digits, e.g. [4, 0, 7, 2]
let guesses = [];    // every accepted guess: { text, bulls, cows }
let finished = false;

// ===== Helpers =====
// Whole number from min to max, both ends included.
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// A secret code of CODE_LENGTH different digits.
function makeSecret() {
  const digits = [];
  while (digits.length < CODE_LENGTH) {
    const d = randomInt(DIGIT_MIN, DIGIT_MAX);
    if (!digits.includes(d)) digits.push(d);
  }
  return digits;
}

// Returns an error text, or '' when the guess is allowed.
function checkGuess(text) {
  if (text.length !== CODE_LENGTH) return `Enter exactly ${CODE_LENGTH} digits.`;
  if (!/^\d+$/.test(text)) return 'Use digits only.';
  for (const ch of text) {
    const d = Number(ch);
    if (d < DIGIT_MIN || d > DIGIT_MAX) return `Digits must be from ${DIGIT_MIN} to ${DIGIT_MAX}.`;
  }
  if (new Set(text).size !== CODE_LENGTH) return 'Digits must not repeat.';
  if (guesses.some((g) => g.text === text)) return 'You already tried this code.';
  return '';
}

// bulls = right digit in the right place, cows = right digit in the wrong place.
function score(text) {
  let bulls = 0;
  let cows = 0;
  for (let i = 0; i < CODE_LENGTH; i++) {
    const d = Number(text[i]);
    if (d === secret[i]) bulls++;
    else if (secret.includes(d)) cows++;
  }
  return { bulls, cows };
}

function say(text, kind) {
  message.textContent = text;
  message.className = 'msg ' + kind;
}

// ===== One valid move =====
function play(text) {
  const { bulls, cows } = score(text);
  guesses.push({ text, bulls, cows });

  const won = bulls === CODE_LENGTH;
  const lost = !won && guesses.length === MAX_ATTEMPTS;
  finished = won || lost;

  if (won) {
    say(`You win! The code is ${secret.join('')}. Attempts used: ${guesses.length}.`, 'success');
  } else if (lost) {
    say(`Game over. The code was ${secret.join('')}.`, 'error');
  } else if (bulls === 0 && cows === 0) {
    say('Nothing matches. Try different digits.', 'muted');
  } else if (bulls === CODE_LENGTH - 1 || bulls + cows === CODE_LENGTH) {
    say('Very close!', 'success');
  } else {
    say('Some digits are right. Keep going.', 'muted');
  }
}

// ===== Drawing the current state =====
function render() {
  attemptsLeft.textContent = String(MAX_ATTEMPTS - guesses.length);
  list.replaceChildren();
  for (const g of guesses) {
    const li = document.createElement('li');
    li.textContent = `${g.text}: ${g.bulls} in the right place, ${g.cows} in the wrong place`;
    list.append(li);
  }
  emptyNote.hidden = guesses.length > 0;
  input.disabled = finished;
  guessBtn.disabled = finished;
  const won = finished && guesses[guesses.length - 1].bulls === CODE_LENGTH;
  card.classList.toggle('win', won);
  card.classList.toggle('lose', finished && !won);
}

// ===== Start or restart (no page reload) =====
function start() {
  secret = makeSecret();
  guesses = [];
  finished = false;
  input.value = '';
  input.maxLength = CODE_LENGTH;
  input.placeholder = '?'.repeat(CODE_LENGTH);
  say(`I picked a code of ${CODE_LENGTH} different digits. You have ${MAX_ATTEMPTS} attempts.`, 'muted');
  render();
  input.focus();
}

// ===== Events =====
form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (finished) return;
  const text = input.value.trim();
  const error = checkGuess(text);
  if (error !== '') {          // invalid move: only a message, the game state stays the same
    say(error, 'error');
    input.focus();
    return;
  }
  play(text);
  input.value = '';
  render();
  if (finished) restartBtn.focus();
  else input.focus();
});

restartBtn.addEventListener('click', start);

start();
