"use strict";

// ── Word List ─────────────────────────────────────────────────────────────────
const WORDS = [
  "Castle",
  "Farm",
  "Library",
  "Playground",
  "Swimming pool",
  "School",
  "Museum",
  "Porcupine",
  "Brush",
  "Wake up",
  "Wash face",
  "Clean",
  "Dirty",
  "Heavy",
  "Light",
  "Square",
  "Angry",
  "Friendly",
  "Funny",
  "Young",
  "Naughty",
  "Nut",
  "Dig",
  "Bin",
  "Clap",
  "Brick",
  "Owl",
  "Tower",
  "Put on",
  "Night",
  "Month",
  "Year",
  "Breakfast",
  "Liquid",
  "Solid",
  "Shape",
  "Donkey",
  "Earth",
  "Hour",
  "Space",
  "Thing",
  "Theirs",
  "His",
  "Hers",
  "Mine",
  "Experiment",
  "Portrait",
  "Ours",
  "Maths",
  "Dance",
];

// ── Constants ─────────────────────────────────────────────────────────────────
const ROUND_TIME = 60; // seconds per word
const CIRCUMFERENCE = 2 * Math.PI * 44; // matches SVG r="44"

// ── DOM refs ─────────────────────────────────────────────────────────────────
const screens = {
  start: document.getElementById("screen-start"),
  game: document.getElementById("screen-game"),
  results: document.getElementById("screen-results"),
};

const wordIndexEl = document.getElementById("word-index");
const wordTotalEl = document.getElementById("word-total");
const timerRing = document.getElementById("timer-ring");
const timerCount = document.getElementById("timer-count");
const answerInput = document.getElementById("answer-input");
const feedbackEl = document.getElementById("feedback");
const scoreDisplay = document.getElementById("score-display");
const scoreSub = document.getElementById("score-sub");
const scoreMessage = document.getElementById("score-message");
const card = document.querySelector("#screen-game .card");

const btnStart = document.getElementById("btn-start");
const btnHear = document.getElementById("btn-hear");
const btnSubmit = document.getElementById("btn-submit");
const btnFinish = document.getElementById("btn-finish");
const btnPlayAgain = document.getElementById("btn-play-again");
const optShowWord = document.getElementById("opt-show-word");
const optNoTimer = document.getElementById("opt-no-timer");
const revealBanner = document.getElementById("reveal-banner");
const revealWordEl = document.getElementById("reveal-word");
const revealCountdownEl = document.getElementById("reveal-countdown");

// ── Game State ────────────────────────────────────────────────────────────────
let currentIndex = 0;
let score = 0;
let timeLeft = ROUND_TIME;
let timerInterval = null;
let roundLocked = false; // prevents double-submit
let showCorrectWord = false;
let noTimeLimit = false;

// ── Screen Helpers ────────────────────────────────────────────────────────────
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// ── TTS ───────────────────────────────────────────────────────────────────────
function speak(word) {
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.rate = 0.85;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
  timeLeft = ROUND_TIME;
  updateTimerUI(timeLeft);

  timerInterval = setInterval(() => {
    timeLeft -= 1;
    updateTimerUI(timeLeft);

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      handleTimeout();
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function updateTimerUI(seconds) {
  timerCount.textContent = seconds;

  const fraction = seconds / ROUND_TIME;
  const offset = CIRCUMFERENCE * (1 - fraction);
  timerRing.style.strokeDashoffset = offset;

  const warning = seconds <= 10;
  timerRing.classList.toggle("warning", warning);
  timerCount.classList.toggle("warning", warning);
}

// ── Round Logic ───────────────────────────────────────────────────────────────
function startRound(index) {
  if (index >= WORDS.length) {
    showResults();
    return;
  }

  currentIndex = index;
  roundLocked = false;

  wordIndexEl.textContent = index + 1;
  wordTotalEl.textContent = WORDS.length;
  answerInput.value = "";
  answerInput.className = "answer-input";
  answerInput.disabled = false;

  hideFeedback();
  revealBanner.classList.add("hidden");
  setControls(true);

  const timerWrap = document.querySelector(".timer-wrap");
  if (noTimeLimit) {
    timerWrap.classList.add("hidden");
  } else {
    timerWrap.classList.remove("hidden");
    startTimer();
  }
  speak(WORDS[index]);

  // Focus input after a short delay (speech may steal focus on some browsers)
  setTimeout(() => answerInput.focus(), 300);
}

function handleSubmit() {
  if (roundLocked) return;

  const raw = answerInput.value.trim().toLowerCase();
  const correct = WORDS[currentIndex].toLowerCase();

  if (!raw) return; // ignore empty submit

  roundLocked = true;
  stopTimer();
  setControls(false);

  if (raw === correct) {
    score++;
    showFeedback("✓ Correct!", "correct-msg");
    answerInput.classList.add("correct");
    card.classList.add("flash-correct");
    card.addEventListener(
      "animationend",
      () => card.classList.remove("flash-correct"),
      { once: true },
    );
    setTimeout(() => startRound(currentIndex + 1), 800);
  } else {
    showFeedback("✗ Incorrect — moving on", "wrong-msg");
    answerInput.classList.add("wrong");
    if (showCorrectWord) {
      revealWord(WORDS[currentIndex], () => startRound(currentIndex + 1));
    } else {
      setTimeout(() => startRound(currentIndex + 1), 1000);
    }
  }
}

function handleTimeout() {
  if (roundLocked) return;
  roundLocked = true;
  setControls(false);
  showFeedback(`⏱ Time's up — moving on`, "wrong-msg");
  answerInput.classList.add("wrong");
  if (showCorrectWord) {
    revealWord(WORDS[currentIndex], () => startRound(currentIndex + 1));
  } else {
    setTimeout(() => startRound(currentIndex + 1), 1000);
  }
}

// ── Reveal correct word for 5 s ──────────────────────────────────────────────
function revealWord(word, callback) {
  const REVEAL_TIME = 8;
  let remaining = REVEAL_TIME;

  revealWordEl.textContent = word;
  revealCountdownEl.textContent = `Moving on in ${remaining}…`;
  revealBanner.classList.remove("hidden");

  const tick = setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      clearInterval(tick);
      revealBanner.classList.add("hidden");
      callback();
    } else {
      revealCountdownEl.textContent = `Moving on in ${remaining}…`;
    }
  }, 1000);
}

function showFeedback(text, cls) {
  feedbackEl.textContent = text;
  feedbackEl.className = `feedback ${cls}`;
}
function hideFeedback() {
  feedbackEl.textContent = "";
  feedbackEl.className = "feedback hidden";
}

// ── Controls ─────────────────────────────────────────────────────────────────
function setControls(enabled) {
  btnSubmit.disabled = !enabled;
  btnHear.disabled = !enabled;
  answerInput.disabled = !enabled;
}

// ── Results ───────────────────────────────────────────────────────────────────
function showResults(attempted) {
  attempted = attempted ?? WORDS.length;
  scoreDisplay.textContent = `${score} / ${attempted}`;

  if (attempted < WORDS.length) {
    scoreSub.textContent = `Finished after ${attempted} of ${WORDS.length} words`;
  } else {
    scoreSub.textContent = "";
  }

  const pct = attempted > 0 ? score / attempted : 0;
  let msg;
  if (pct === 1) msg = "🏆 Perfect score — you're a spelling champion!";
  else if (pct >= 0.8) msg = "🌟 Excellent work! Almost flawless.";
  else if (pct >= 0.6) msg = "👍 Good effort! Keep practising.";
  else if (pct >= 0.4) msg = "📚 Not bad — more practice will help!";
  else msg = "✏️ Keep at it — you'll improve with practice!";

  scoreMessage.textContent = msg;
  showScreen("results");
}

// ── Event Listeners ───────────────────────────────────────────────────────────
btnStart.addEventListener("click", () => {
  score = 0;
  showCorrectWord = optShowWord.checked;
  noTimeLimit = optNoTimer.checked;
  showScreen("game");
  startRound(0);
});

btnHear.addEventListener("click", () => {
  speak(WORDS[currentIndex]);
});

btnSubmit.addEventListener("click", handleSubmit);

btnFinish.addEventListener("click", () => {
  stopTimer();
  window.speechSynthesis.cancel();
  // currentIndex = words completed so far (current word not yet answered)
  showResults(currentIndex);
});

answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSubmit();
});

btnPlayAgain.addEventListener("click", () => {
  score = 0;
  showCorrectWord = optShowWord.checked;
  noTimeLimit = optNoTimer.checked;
  showScreen("game");
  startRound(0);
});
