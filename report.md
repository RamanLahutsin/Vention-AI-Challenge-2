# Task 3 — Personal Learning Assistant Bot: Development Report

## Overview

This report documents the development of a **Personal Learning Assistant** Telegram bot built as an n8n workflow. The bot allows users to submit learning materials via URL, receive AI-generated structured summaries, take quizzes on saved content, and receive scored feedback with explanations. The workflow implements two distinct AI agent roles — **Teacher** and **Examiner** — and persists all data across sessions using n8n DataTables.

---

## Tools and Techniques Used

### Platform & Runtime

- **n8n** — Low-code workflow automation platform used as the backbone for the entire application. Chosen for its visual node-based design, native Telegram integration, built-in AI agent support, and persistent data storage via DataTables.
- **Telegram Bot API** — The user-facing interface. The workflow uses the native n8n Telegram Trigger node (listening for both `message` and `callback_query` updates) and Telegram send nodes for responses. For features requiring inline keyboards (topic selection, quiz answer buttons), direct HTTP POST requests to the Telegram Bot API are used to gain full control over `reply_markup` payloads.

### AI / LLM

- **OpenAI GPT-5-mini** — Powers the **Teacher AI** agent. Selected for its strong summarization capabilities and structured output compliance. Processes raw extracted text and produces JSON with title, key points (5–7), main concepts, and difficulty level.
- **OpenAI GPT-4o-mini** — Powers the **Examiner AI** agent. Generates exactly 5 multiple-choice quiz questions specific to the submitted material content. Uses a structured output parser to enforce the required JSON schema (materialId, id, question, options, correctAnswer, explanation).
- **n8n AI Agent nodes** (`@n8n/n8n-nodes-langchain.agent` v3.1) — Wraps LLM calls with system prompts, output parsing, and structured response handling. Both Teacher and Examiner use the `promptType: "define"` configuration with explicit system messages describing their roles and output format requirements.
- **Structured Output Parsers** (`@n8n/n8n-nodes-langchain.outputParserStructured` v1.3) — Enforce JSON schema compliance on AI outputs using `jsonSchemaExample` definitions. The Teacher parser expects `{title, keyPoints[], mainConcepts[], difficulty}`. The Examiner parser expects `[{materialId, id, question, options, correctAnswer, explanation}]`.

### Data Persistence

- **n8n DataTables** — Three tables provide persistent storage across sessions:
  - **Learning Materials** (`fcJ11nyrST5sambP`) — Stores URL, title, extracted content, key points, main concepts, difficulty, and chatId per user.
  - **Quiz** (`mJmC8KcwN3oPjDF5`) — Stores generated quiz questions with materialId, question text, options, correct answer, and explanation.
  - **Quiz State** (`K6aZz50d6ifIiee0`) — Tracks active quiz sessions per user: chatId, currentQuestion index, accumulated answers, and materialId.

### Content Processing

- **HTTP Request node** (v4.2) — Fetches raw HTML from user-submitted URLs with `responseFormat: "text"` and `onError: "continueErrorOutput"` for graceful error handling.
- **Custom JavaScript Code nodes** — Used for:
  - **HTML cleaning** — Strips `<script>`, `<style>` tags, all HTML markup, decodes HTML entities, and truncates to 100,000 words to stay within LLM context limits.
  - **Summary data preparation** — Extracts and structures Teacher AI output into a clean data object.
  - **Message formatting** — Builds HTML-formatted Telegram messages with bold headers, numbered lists, and hyperlinks.
  - **Array normalization** — Converts `keyPoints` and `mainConcepts` from arrays to comma-separated strings before DataTable storage.
  - **Score calculation** — Compares user answers against correct answers, calculates percentage score, and builds a per-question feedback message with explanations for incorrect answers.

### Routing & Flow Control

- **Switch nodes** (v3.4) — Two switch nodes handle routing:
  - **Route Command** — Matches incoming messages to `/start` (exact), `/learn` (startsWith), `/quiz` (exact), callback queries (existence check), and a fallback for unknown commands.
  - **Route Callback Type** — Distinguishes between topic selection callbacks (numeric regex `\d+`) and quiz answer callbacks (letter regex `[a-zA-Z]`), with an unknown fallback.
- **If nodes** (v2.3) — Used for conditional branching:
  - **Contains URL?** — Regex validation of URL presence in `/learn` messages.
  - **Has Materials?** / **Has Materials?1** — Check `$input.all().length > 0` before proceeding.
  - **The last question?** — Checks `currentQuestion >= 5` to determine quiz completion.
- **Aggregate nodes** — Consolidate multi-item outputs (material lists, question IDs, correct answers) into single items for downstream processing.
- **Split Out node** — Expands the Examiner AI's array output into individual items for per-question DataTable insertion.

---

## Architecture & Flow Walkthrough

### Command Routing

```
Telegram Trigger → Route Command
  ├── /start    → Send Welcome
  ├── /learn    → Contains URL? → [Extract URL → Fetch → Clean → Teacher AI → Save → Summary]
  ├── /quiz     → Fetch Materials → Has Materials? → [Aggregate → Send Topic List]
  ├── callback  → Route Callback Type
  │     ├── numeric (topic selected) → Get Material → Examiner AI → Send First Question
  │     ├── letter  (quiz answer)   → Update State → Last? → [Next Question | Show Results]
  │     └── unknown → Send Error
  └── unknown   → Send Unknown Command
```

### `/learn [url]` Flow (Material Processing)

1. **Validate** — The `Contains URL?` If node uses regex to verify a URL is present. If missing, sends a helpful error with usage example.
2. **Extract** — The `Extract URL` Set node parses the URL from the message text (`$json.message.text.trim().split(" ")[1]`) and captures the chatId.
3. **Fetch** — The HTTP Request node retrieves the raw HTML. On failure, the error output branch sends a fetch error message.
4. **Clean** — A Code node strips scripts, styles, HTML tags, and decodes entities. Truncates to 100,000 words to respect LLM token limits.
5. **Notify** — A "Content extracted successfully, processing..." status message is sent to keep the user informed during AI processing.
6. **Analyze** — The **Teacher AI** agent (GPT-5-mini) receives the cleaned text with a system prompt instructing it to produce a structured JSON summary with title, 5–7 key points, main concepts, and difficulty level.
7. **Parse & Prepare** — The Structured Output Parser enforces schema compliance. The `Prepare Summary Data` Code node extracts and organizes the output.
8. **Format** — The `Format Summary Message` Code node builds an HTML-formatted Telegram message with emoji, bold headers, numbered key points, comma-separated concepts, and a link to the original URL.
9. **Normalize** — The `Normalize Summary` Code node converts any array fields to comma-separated strings for DataTable compatibility.
10. **Persist** — The `Add New Learning Material` DataTable node inserts the record with title, difficulty, URL, mainConcepts, keyPoints, chatId, and content.
11. **Confirm** — The user receives a "Material saved!" confirmation followed by the formatted summary.

### `/quiz` Flow (Quiz Generation & Delivery)

1. **Fetch materials** — Queries the Learning Materials DataTable filtered by the user's chatId.
2. **Check existence** — If no materials exist, sends a helpful message directing the user to `/learn` first.
3. **Present topics** — Aggregates material id and title fields, then sends an inline keyboard via the Telegram API where each button represents a saved topic.
4. **Topic selection** (callback with numeric data) — The `Route Callback Type` switch routes to the learning material branch.
5. **Retrieve material** — Fetches the selected material from DataTable by id.
6. **Generate quiz** — The **Examiner AI** agent (GPT-4o-mini) receives the material's title, id, and content, generating exactly 5 multiple-choice questions with the enforced JSON schema.
7. **Store questions** — After splitting the array output, each question is inserted into the Quiz DataTable.
8. **Send first question** — The first question is fetched and sent with an inline keyboard where each option (A/B/C/D) is a button.
9. **Initialize state** — A Quiz State record is created with chatId, currentQuestion=0, and materialId.

### Answer Handling & Scoring

1. **Capture answer** (callback with letter data) — Routes to the quiz answer branch.
2. **Read state** — Fetches the user's current Quiz State from DataTable.
3. **Update state** — Increments `currentQuestion` and appends the selected answer letter to the `answers` string.
4. **Check completion** — If `currentQuestion >= 5`, the quiz is complete; otherwise, the next question is fetched and sent.
5. **Calculate results** — The `Aggregate Result` Code node iterates through all 5 questions, compares each user answer to the correct answer, calculates the score as a count and percentage, and builds a detailed results message.
6. **Deliver feedback** — The results message includes per-question feedback with ✅/❌ indicators, and for incorrect answers, the correct answer and explanation are shown.
7. **Cleanup** — After showing results, the Quiz State and Quiz records for this session are deleted to allow fresh quizzes in future.

---

## What Worked

### Two Distinct AI Roles with Clear Separation of Concerns

The Teacher and Examiner agents have completely separate system prompts, LLM model configurations, and output parsers. The Teacher focuses on summarization (title, key points, concepts, difficulty), while the Examiner focuses on question generation (question, options, correct answer, explanation). This separation ensures each agent excels at its specific task.

### Structured Output Parsing

Using `outputParserStructured` with `jsonSchemaExample` definitions for both AI agents ensures consistent, machine-parseable responses. This eliminates fragile regex-based post-processing of free-text AI output and guarantees the downstream nodes always receive data in the expected format.

### Per-User Data Isolation via chatId Filtering

All DataTable queries filter by `chatId`, ensuring each user only sees their own materials and quiz progress. This naturally supports multi-user scenarios without additional authentication logic.

### Inline Keyboard-Based Quiz Interaction

Using Telegram inline keyboard buttons for both topic selection and answer choices provides a clean, tap-friendly experience. The `callback_data` field carries the selection value (material id for topics, option letter for answers), which the `Route Callback Type` switch node cleanly distinguishes using regex patterns (numeric vs. letter).

### Stateful Quiz Progression via DataTable

The Quiz State table tracks `currentQuestion`, `answers` (concatenated string), and `materialId` per user. This allows the workflow to handle asynchronous user responses across multiple webhook triggers without requiring in-memory state. Users can take as long as they want between questions.

### Graceful Error Handling

The workflow includes error handling at multiple levels:

- URL validation with regex before attempting to fetch.
- HTTP Request `onError: "continueErrorOutput"` routes fetch failures to an error message rather than crashing the workflow.
- Material existence checks before attempting quiz generation.
- Unknown command and unknown callback fallbacks with helpful user messages.

### Progress Status Messages

Users receive real-time status updates during processing: "Content extracted successfully, processing...", "Processing is done. Preparing short summary...", "Getting your materials...", "Successfully retrieved the topic. Preparing the quiz...". This keeps the user informed during the AI processing delays.

### HTML Content Cleaning

The custom Code node thoroughly strips scripts, styles, and markup from fetched pages, with a 100,000-word truncation limit. This ensures the Teacher AI receives clean text that stays within LLM context windows.

### Data Persistence Between Sessions

All learning materials, quiz questions, and quiz state are stored in n8n DataTables, which persist between workflow executions. Users can submit materials in one session and quiz on them days later. The workflow does not require restart between commands.

---

## What Did Not Work (Challenges Encountered)

### Telegram Node Limitations for Inline Keyboards

The native n8n Telegram node does not support dynamic inline keyboards with `reply_markup`. To work around this, three instances use direct HTTP POST requests to the Telegram Bot API (`https://api.telegram.org/bot.../sendMessage`) with manually constructed JSON bodies containing `inline_keyboard` arrays. While functional, this introduces raw API calls alongside the native node, creating inconsistency in the workflow.

### Callback Routing Ambiguity

Distinguishing between "topic selection" (numeric material id) and "quiz answer" (letter A–D) callbacks relies on regex patterns (`\d+` and `[a-zA-Z]`). This works for the current design but could fail if material IDs were non-numeric or if additional callback types were introduced. A more robust approach would prefix callback data (e.g., `topic:123`, `answer:B`).

### Array-to-String Normalization for DataTables

n8n DataTables do not natively handle array fields well. The `Normalize Summary` Code node was added specifically to convert `keyPoints` and `mainConcepts` arrays to comma-separated strings before insertion. This adds a processing step that wouldn't be necessary with a native database supporting JSON/array columns.

### Quiz State as Concatenated String

User answers are stored as a concatenated string (e.g., `"ABCDA"`) rather than a proper array or JSON. This works because there are exactly 5 single-letter answers, but it's fragile — the `Aggregate Result` Code node indexes into this string by position. A JSON array would be more robust and self-documenting.

### Token Limits on Large Pages

While the HTML cleaning step truncates to 100,000 words, extremely long or complex pages may still exceed LLM token limits after cleaning. There is no explicit token counting or chunking strategy, which could cause Teacher AI failures on very large documents.

### No Duplicate Material Detection

The workflow does not check if a URL has already been submitted by the user. Submitting the same URL twice creates duplicate entries in Learning Materials, which then both appear in the topic selection list.

---

## Notable Decisions

### Choice of Different Models for Each AI Role

The **Teacher AI** uses **GPT-5-mini** while the **Examiner AI** uses **GPT-4o-mini**. This is a deliberate decision — the Teacher needs strong text comprehension and summarization capabilities for processing diverse web content, warranting the more capable model. The Examiner generates questions from already-structured content (title + extracted text), making the faster and more cost-efficient GPT-4o-mini sufficient.

### DataTables Over External Database

Using n8n's built-in DataTables instead of an external database (e.g., PostgreSQL, Supabase) simplifies deployment and eliminates external dependencies. All data stays within the n8n ecosystem, making the workflow fully self-contained and portable via JSON export.

### Quiz Cleanup After Completion

After a quiz is completed and results are shown, both the Quiz State and Quiz question records are deleted. This is a deliberate design choice to keep the data tables clean and prevent stale quiz data from accumulating. The trade-off is that quiz history is not preserved for review — but it ensures a fresh quiz is generated each time, which better tests knowledge retention.

### Webhook-Based Architecture (No Polling)

The Telegram Trigger uses webhook mode rather than polling, which means the workflow responds instantly to user messages without constant polling overhead. This is more efficient and provides a more responsive user experience.

### Five Questions Per Quiz (Fixed Count)

The Examiner AI is instructed to generate exactly 5 questions. This is enforced in the system prompt and validated by the `The last question?` node checking `currentQuestion >= 5`. The fixed count simplifies state management and provides a consistent quiz experience.

### Inline Keyboards Over Reply Keyboards

Using inline keyboards (buttons attached to messages) rather than reply keyboards (persistent button rows) for quiz answers was chosen because:

- Each question message carries its own answer buttons, creating a clear visual association.
- It prevents button state leaking across different workflow steps.
- It generates `callback_query` events that are easier to route than text messages.

### Regex URL Validation

The `Contains URL?` node uses a comprehensive regex pattern to validate URLs before attempting to fetch. This catches malformed inputs early and provides immediate feedback, avoiding unnecessary HTTP requests.

### Processing Status Messages as User Feedback

Multiple status messages ("processing...", "preparing summary...", "preparing quiz...") are sent during long AI operations. This was a deliberate UX decision — AI processing can take several seconds, and without status messages, the user would have no indication that the bot is working.

---

## Compliance Summary

| Requirement                                       | Status | Implementation                                                 |
| ------------------------------------------------- | ------ | -------------------------------------------------------------- |
| `/start` command responds correctly               | ✅     | Route Command → Send Welcome with all available commands       |
| `/learn [url]` processes content                  | ✅     | HTTP fetch → HTML clean → Teacher AI → DataTable storage       |
| `/quiz` generates quiz from saved material        | ✅     | Fetch materials → topic selection → Examiner AI → 5 questions  |
| Teacher AI produces structured summary            | ✅     | 5–7 key points, main concepts, difficulty level via GPT-5-mini |
| Examiner AI generates material-specific questions | ✅     | Dynamic generation from stored content; not hardcoded          |
| Answer validation with feedback                   | ✅     | Score calculation with per-question ✅/❌ and explanations     |
| Data persists between sessions                    | ✅     | n8n DataTables for materials, quizzes, and state               |
| Topic selection from saved materials              | ✅     | Inline keyboard with aggregated material titles                |
| No workflow restart needed between commands       | ✅     | Webhook-based trigger with stateless execution per event       |
| Two distinct AI roles (Teacher + Examiner)        | ✅     | Separate agents, models, system prompts, and output parsers    |
| Real content extraction (not generic)             | ✅     | HTTP fetch + HTML cleaning; AI processes actual page content   |
| Intelligent answer validation                     | ✅     | Letter-based matching (A/B/C/D) via callback data comparison   |

---

## Workflow Statistics

- **Total nodes:** 46
- **Telegram interaction nodes:** 14
- **AI agent nodes:** 2 (Teacher AI, Examiner AI)
- **LLM model nodes:** 2 (GPT-5-mini, GPT-4o-mini)
- **DataTable operations:** 9 (3 inserts, 4 reads, 1 update, 2 deletes)
- **Code nodes:** 6 (HTML clean, summary prep, message format, normalize, score calc, split)
- **Routing nodes:** 2 switches + 4 if/condition nodes
- **Data tables used:** 3 (Learning Materials, Quiz, Quiz State)
