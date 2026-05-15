# Personal Learning Assistant Bot

A Telegram bot that helps you learn from web articles. Submit a URL, get an AI-generated summary, then quiz yourself on the material.

**Bot:** [@raman_ai_learning_assistant_bot](https://t.me/raman_ai_learning_assistant_bot)

---

## Getting Started

1. Open Telegram and search for `@raman_ai_learning_assistant_bot`, or tap the link above.
2. Press **Start** or send `/start` to see the welcome message and available commands.

---

## Commands

| Command        | Description                                      |
| -------------- | ------------------------------------------------ |
| `/start`       | Show the welcome message with available commands |
| `/learn [url]` | Submit a web page to study                       |
| `/quiz`        | Take a quiz on your saved materials              |

---

## How to Use

### Step 1 — Save a learning material

Send `/learn` followed by a URL:

```
/learn https://react.dev/reference/react/useState
```

The bot will:

1. Fetch and extract the page content.
2. Send status updates while processing.
3. Return a structured summary with a title, difficulty level, key points, and main concepts.
4. Save the material for future quizzes.

### Step 2 — Take a quiz

Send `/quiz` to start a quiz.

1. The bot shows a list of your saved topics as buttons — tap one to select it.
2. Five multiple-choice questions are generated from the selected material.
3. Each question appears with **A/B/C/D** answer buttons — tap your choice.
4. After all 5 questions, you receive your score and per-question feedback:
   - ✅ for correct answers
   - ❌ for incorrect answers, with the correct answer and an explanation

### Step 3 — Keep learning

You can submit as many materials as you like with `/learn` and quiz yourself on any of them at any time. Your saved materials persist between sessions.

---

## Tips

- Make sure the URL points to a readable web page (articles, documentation, blog posts work best).
- Each quiz generates fresh questions, so you can retake quizzes to reinforce your knowledge.
- The bot works in private chat only — no group support.
