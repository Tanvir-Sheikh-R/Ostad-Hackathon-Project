/**
 * UI language: English (default) and Bangla.
 *
 * One dictionary per language, with `bn` typed against the English keys so a missing
 * or misspelled key is a compile error rather than a blank label at runtime.
 */

export type Language = "en" | "bn";

export const DEFAULT_LANGUAGE: Language = "en";

const STORAGE_KEY = "patsomadhan.lang";

const en = {
  // --- app shell ---
  "app.title": "Path Somadhan",
  "app.description": "NCTB textbooks â€” chat, quizzes and progress",
  "app.sticker": "Built For Ostad Presents YUNet AIgnite Buildathon 2026",
  "app.bannerAlt": "Path Somadhan â€” NCTB textbook study assistant",
  "lang.label": "Language",
  "lang.en": "EN",
  "lang.bn": "à¦¬à¦¾à¦‚à¦²à¦¾",

  // --- tabs ---
  "tab.aria": "App sections",
  "tab.chat": "Chat",
  "tab.quiz": "Quiz",
  "tab.progress": "Progress",

  // --- user ---
  "user.defaultName": "Student",
  "user.menuLabel": "Profile",
  "user.edit": "Edit name",
  "user.save": "Save",
  "user.cancel": "Cancel",
  "user.placeholder": "Your name",
  "user.hint": "Saved on this device",

  // --- chapter bar ---
  "chapter.pick": "Choose class, subject and chapter",
  "chapter.switch": "Change chapter",

  // --- picker ---
  "picker.title.new": "What do you want to study?",
  "picker.title.switch": "Change chapter",
  "picker.title.select": "Choose a chapter",
  "picker.subtitle": "Pick a subject and chapter â€” answers come only from that chapter.",
  "picker.class": "Class",
  "picker.subject": "Subject",
  "picker.chapter": "Chapter",
  "picker.subjectPlaceholder": "Choose a subject",
  "picker.chapterPlaceholder": "Choose a chapter",
  "picker.chapterNeedsSubject": "Choose a subject first",
  "picker.searchChapter": "Search chaptersâ€¦",
  "picker.chapterCount": "{count} chapters",
  "picker.noIndex": "(not indexed)",
  "picker.notIndexed": "This chapter has no search index yet â€” choose another chapter.",
  "picker.page": "p. {page}",
  "picker.start": "Start",
  "picker.starting": "Startingâ€¦",
  "picker.select": "Select",
  "picker.selecting": "Selectingâ€¦",
  "picker.close": "Close",
  "picker.failed": "Could not start, please try again.",
  "picker.fixedClass": "Fixed for this app",

  // --- chat ---
  "chat.newChat": "New chat",
  "chat.greeting": "{greeting}, {name}",
  "chat.askLine": "What will you study today?",
  "chat.greetingMorning": "Good morning",
  "chat.greetingAfternoon": "Good afternoon",
  "chat.greetingEvening": "Good evening",
  "chat.greetingNight": "Good night",
  "chat.placeholder": "Ask a question or type a commandâ€¦",
  "chat.questionAria": "Type your question",
  "chat.send": "Send",
  "chat.stop": "Stop",
  "chat.stopped": "â¹ Stopped.",
  "chat.needChapter": "Choose a class, subject and chapter first.",
  "chat.newThreadFailed": "Could not start a new chat.",
  "chat.answerFailed": "Something went wrong while fetching the answer.",
  "chat.loadFailed": "Could not load the chat.",
  "chat.listFailed": "Could not load the chat list.",
  "chat.renameFailed": "Could not rename the chat.",
  "chat.deleteFailed": "Could not delete the chat.",
  "chat.busyAnswer": "An answer is streaming â€” try again when it finishes.",
  "chat.deleteTitle": "Delete this chat?",
  "chat.deleteBody": "This is permanent and cannot be undone.",
  "chat.deleteConfirm": "Delete",
  "chat.cancel": "Cancel",
  "chat.quick.summary": "Summarise",
  "chat.quick.summaryPrompt": "Summarise the key points of this chapter briefly.",
  "chat.quick.quiz": "Make a quiz",
  "chat.quick.quizPrompt": "Write 5 short questions from this chapter and give the answers at the end.",
  "chat.quick.explain": "Explain in detail",
  "chat.quick.explainPrompt": "Explain the most important idea of this chapter in detail, in simple language.",

  // --- sidebar ---
  "sidebar.search": "Search",
  "sidebar.searchAria": "Search chats",
  "sidebar.home": "Home",
  "sidebar.chats": "Chats",
  "sidebar.empty": "No chats yet â€” hit â€œNew chatâ€.",
  "sidebar.nothingFound": "Nothing found.",
  "sidebar.loading": "Loading chatsâ€¦",
  "sidebar.rename": "Rename",
  "sidebar.delete": "Delete",
  "sidebar.renameAria": "{title} â€” rename",
  "sidebar.deleteAria": "{title} â€” delete",

  // --- toast ---
  "toast.dismiss": "Dismiss message",

  // --- quiz ---
  "quiz.needChapterTitle": "Choose a chapter first",
  "quiz.needChapterBody": "The quiz comes only from that chapter â€” pick class, subject and chapter.",
  "quiz.needChapterAction": "Choose a chapter",
  "quiz.newQuiz": "New quiz",
  "quiz.progress": "Progress",
  "quiz.hint": "{count} questions Â· answered {answered}/{count} Â· answers appear after you submit",
  "quiz.generateFailed": "Could not create questions, please try again.",
  "quiz.generating": "Creating questionsâ€¦",
  "quiz.generatingHint": "Reading the chapter to write questions â€” this can take 10-20 seconds.",
  "quiz.startTitle": "Create a 5-question quiz",
  "quiz.startBody":
    "Every question comes from this chapter's textbook passages. After you answer you'll see the score, each answer and an explanation â€” and the result is saved.",
  "quiz.startButton": "Start quiz",
  "quiz.submit": "Submit and see result",
  "quiz.allAnswered": "All questions answered",
  "quiz.remaining": "{count} left",
  "quiz.saved": "Result saved",
  "quiz.submitFailed": "Could not check the result, please try again.",
  "quiz.toneGreat": "Great job!",
  "quiz.toneOk": "Good effort!",
  "quiz.toneLow": "Try again!",
  "quiz.scoreLine": "{correct}/{total} correct Â· {chapter}",
  "quiz.savedRows": "Result saved ({rows} answers) â€” see your progress in the Progress tab.",
  "quiz.another": "Another quiz",
  "quiz.correctTag": "Correct",
  "quiz.yourAnswer": "Your answer",
  "quiz.notAnswered": "This question was not answered.",
  "quiz.explanation": "Explanation: ",

  // --- progress ---
  "progress.loading": "Loading progressâ€¦",
  "progress.loadFailed": "Could not load progress, please try again.",
  "progress.retry": "Try again",
  "progress.emptyTitle": "No results yet",
  "progress.emptyBody":
    "{name} â€” take a first quiz and chapter scores, weak topics and the parent summary will appear here.",
  "progress.goQuiz": "Go to quiz",
  "progress.title": "{name} Â· progress report",
  "progress.overallAccuracy": "Overall accuracy {accuracy}%",
  "progress.stat.quizzes": "Quizzes",
  "progress.stat.questions": "Questions",
  "progress.stat.correct": "Correct",
  "progress.stat.accuracy": "Accuracy",
  "progress.perChapter": "Score by chapter",
  "progress.chapterMeta": "({correct}/{questions} Â· {quizzes} quizzes)",
  "progress.best": "Best: {chapter} ({accuracy}%)",
  "progress.weakest": "Weakest: {chapter} ({accuracy}%)",
  "progress.weakTopics": "Weak topics",
  "progress.noWeak": "No clear weak spot yet â€” keep going!",
  "progress.parentSummary": "Summary for parents",
  "progress.refreshSummary": "Refresh summary",
  "progress.summaryLoading": "Writing the summaryâ€¦",
  "progress.summaryMissing": "No summary yet â€” press â€œRefresh summaryâ€.",
  "progress.summaryFailed": "Could not fetch the parent summary.",
  "progress.aiWritten": "AI-written",
  "progress.fromNumbers": "From the numbers",
  "progress.recent": "Recent quizzes",

  // --- connection errors ---
  "error.bootTitle": "Could not reach the server",
  "error.backendBase": "Backend URL: ",
  "error.bootHelp":
    "Run locally: python -m backend.run (port 8000), then set NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000 in web/.env.local. On Vercel, set the HTTPS backend URL in the dashboard.",
  "error.retry": "Try again",
  "error.cachedNotice": "{message} (showing the saved catalog)",
  "error.bootDefault": "Could not connect to the server. Is the backend running?",
  "error.loadingBoot": "Preparing your textbooksâ€¦",
} as const;

export type StringKey = keyof typeof en;

/** Signature every component takes for translation, so none of them import the hook. */
export type TFunction = (key: StringKey, vars?: Record<string, string | number>) => string;

const bn: Record<StringKey, string> = {
  "app.title": "à¦ªà¦¾à¦  à¦¸à¦®à¦¾à¦§à¦¾à¦¨",
  "app.description": "NCTB à¦ªà¦¾à¦ à§à¦¯à¦¬à¦‡ â€” à¦šà§à¦¯à¦¾à¦Ÿ, à¦•à§à¦‡à¦œ à¦“ à¦…à¦—à§à¦°à¦—à¦¤à¦¿",
  "app.sticker": "Built For Ostad Presents YUNet AIgnite Buildathon 2026",
  "app.bannerAlt": "à¦ªà¦¾à¦  à¦¸à¦®à¦¾à¦§à¦¾à¦¨ â€” NCTB à¦ªà¦¾à¦ à§à¦¯à¦¬à¦‡ à¦¸à¦¹à¦¾à¦¯à¦¼à¦•",
  "lang.label": "à¦­à¦¾à¦·à¦¾",
  "lang.en": "EN",
  "lang.bn": "à¦¬à¦¾à¦‚à¦²à¦¾",

  "tab.aria": "à¦…à§à¦¯à¦¾à¦ªà§‡à¦° à¦¬à¦¿à¦­à¦¾à¦—",
  "tab.chat": "à¦šà§à¦¯à¦¾à¦Ÿ",
  "tab.quiz": "à¦•à§à¦‡à¦œ",
  "tab.progress": "à¦ªà§à¦°à§‹à¦—à§à¦°à§‡à¦¸",

  "user.defaultName": "à¦¶à¦¿à¦•à§à¦·à¦¾à¦°à§à¦¥à§€",
  "user.menuLabel": "à¦ªà§à¦°à§‹à¦«à¦¾à¦‡à¦²",
  "user.edit": "à¦¨à¦¾à¦® à¦¬à¦¦à¦²à¦¾à¦“",
  "user.save": "à¦¸à¦‚à¦°à¦•à§à¦·à¦£",
  "user.cancel": "à¦¬à¦¾à¦¤à¦¿à¦²",
  "user.placeholder": "à¦¤à§‹à¦®à¦¾à¦° à¦¨à¦¾à¦®",
  "user.hint": "à¦à¦‡ à¦¡à¦¿à¦­à¦¾à¦‡à¦¸à§‡ à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤",

  "chapter.pick": "à¦¶à§à¦°à§‡à¦£à¦¿, à¦¬à¦¿à¦·à¦¯à¦¼ à¦“ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¬à§‡à¦›à§‡ à¦¨à¦¾à¦“",
  "chapter.switch": "à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¬à¦¦à¦²à¦¾à¦“",

  "picker.title.new": "à¦•à§€ à¦ªà¦¡à¦¼à¦¤à§‡ à¦šà¦¾à¦“?",
  "picker.title.switch": "à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¬à¦¦à¦²à¦¾à¦“",
  "picker.title.select": "à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¬à§‡à¦›à§‡ à¦¨à¦¾à¦“",
  "picker.subtitle": "à¦¬à¦¿à¦·à¦¯à¦¼ à¦“ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¬à§‡à¦›à§‡ à¦¨à¦¾à¦“ â€” à¦‰à¦¤à§à¦¤à¦° à¦†à¦¸à¦¬à§‡ à¦ à¦¿à¦• à¦¸à§‡à¦‡ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¥à§‡à¦•à§‡à¥¤",
  "picker.class": "à¦•à§à¦²à¦¾à¦¸",
  "picker.subject": "à¦¬à¦¿à¦·à¦¯à¦¼",
  "picker.chapter": "à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼",
  "picker.subjectPlaceholder": "à¦¬à¦¿à¦·à¦¯à¦¼ à¦¬à§‡à¦›à§‡ à¦¨à¦¾à¦“",
  "picker.chapterPlaceholder": "à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¬à§‡à¦›à§‡ à¦¨à¦¾à¦“",
  "picker.chapterNeedsSubject": "à¦†à¦—à§‡ à¦¬à¦¿à¦·à¦¯à¦¼ à¦¬à§‡à¦›à§‡ à¦¨à¦¾à¦“",
  "picker.searchChapter": "à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦–à§à¦à¦œà§à¦¨...",
  "picker.chapterCount": "{count}à¦Ÿà¦¿",
  "picker.noIndex": "(à¦¸à§‚à¦šà¦¿ à¦¨à§‡à¦‡)",
  "picker.notIndexed": "à¦à¦‡ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼à§‡à¦° à¦¸à§‚à¦šà¦¿ (embedding) à¦à¦–à¦¨à§‹ à¦¤à§ˆà¦°à¦¿ à¦¹à¦¯à¦¼à¦¨à¦¿ â€” à¦…à¦¨à§à¦¯ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¬à§‡à¦›à§‡ à¦¨à¦¾à¦“à¥¤",
  "picker.page": "à¦ªà§ƒà¦·à§à¦ à¦¾ {page}",
  "picker.start": "à¦¶à§à¦°à§ à¦•à¦°à§à¦¨",
  "picker.starting": "à¦¶à§à¦°à§ à¦¹à¦šà§à¦›à§‡...",
  "picker.select": "à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨ à¦•à¦°à§‹",
  "picker.selecting": "à¦¨à§‡à¦“à¦¯à¦¼à¦¾ à¦¹à¦šà§à¦›à§‡...",
  "picker.close": "à¦¬à¦¨à§à¦§ à¦•à¦°à§‹",
  "picker.failed": "à¦¶à§à¦°à§ à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿, à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§‹à¥¤",
  "picker.fixedClass": "à¦à¦‡ à¦…à§à¦¯à¦¾à¦ªà§‡ à¦¨à¦¿à¦°à§à¦§à¦¾à¦°à¦¿à¦¤",

  "chat.newChat": "à¦¨à¦¤à§à¦¨ à¦šà§à¦¯à¦¾à¦Ÿ",
  "chat.greeting": "{greeting}, {name}",
  "chat.askLine": "à¦†à¦œ à¦•à§€ à¦¨à¦¿à¦¯à¦¼à§‡ à¦ªà¦¡à¦¼à¦¬à§‡?",
  "chat.greetingMorning": "à¦¶à§à¦­ à¦¸à¦•à¦¾à¦²",
  "chat.greetingAfternoon": "à¦¶à§à¦­ à¦¦à§à¦ªà§à¦°",
  "chat.greetingEvening": "à¦¶à§à¦­ à¦¸à¦¨à§à¦§à§à¦¯à¦¾",
  "chat.greetingNight": "à¦¶à§à¦­ à¦°à¦¾à¦¤à§à¦°à¦¿",
  "chat.placeholder": "à¦ªà§à¦°à¦¶à§à¦¨ à¦²à¦¿à¦–à§à¦¨ à¦¬à¦¾ à¦•à¦®à¦¾à¦¨à§à¦¡ à¦¦à¦¿à¦¨...",
  "chat.questionAria": "à¦ªà§à¦°à¦¶à§à¦¨ à¦²à¦¿à¦–à§à¦¨",
  "chat.send": "à¦ªà¦¾à¦ à¦¾à¦“",
  "chat.stop": "à¦¥à¦¾à¦®à¦¾à¦“",
  "chat.stopped": "â¹ à¦¥à¦¾à¦®à¦¾à¦¨à§‹ à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤",
  "chat.needChapter": "à¦†à¦—à§‡ à¦¶à§à¦°à§‡à¦£à¦¿, à¦¬à¦¿à¦·à¦¯à¦¼ à¦“ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¬à§‡à¦›à§‡ à¦¨à¦¾à¦“à¥¤",
  "chat.newThreadFailed": "à¦¨à¦¤à§à¦¨ à¦šà§à¦¯à¦¾à¦Ÿ à¦¶à§à¦°à§ à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤",
  "chat.answerFailed": "à¦‰à¦¤à§à¦¤à¦° à¦†à¦¨à¦¤à§‡ à¦¸à¦®à¦¸à§à¦¯à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡à¥¤",
  "chat.loadFailed": "à¦šà§à¦¯à¦¾à¦Ÿ à¦²à§‹à¦¡ à¦¹à¦¯à¦¼à¦¨à¦¿à¥¤",
  "chat.listFailed": "à¦šà§à¦¯à¦¾à¦Ÿ à¦¤à¦¾à¦²à¦¿à¦•à¦¾ à¦²à§‹à¦¡ à¦¹à¦¯à¦¼à¦¨à¦¿à¥¤",
  "chat.renameFailed": "à¦¨à¦¾à¦® à¦¬à¦¦à¦²à¦¾à¦¨à§‹ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤",
  "chat.deleteFailed": "à¦šà§à¦¯à¦¾à¦Ÿ à¦®à§‹à¦›à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤",
  "chat.busyAnswer": "à¦‰à¦¤à§à¦¤à¦° à¦†à¦¸à¦›à§‡ â€” à¦¶à§‡à¦· à¦¹à¦²à§‡ à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§‹à¥¤",
  "chat.deleteTitle": "à¦šà§à¦¯à¦¾à¦Ÿà¦Ÿà¦¿ à¦®à§à¦›à§‡ à¦«à§‡à¦²à¦¬à§‡à¦¨?",
  "chat.deleteBody": "à¦à¦Ÿà¦¿ à¦¸à§à¦¥à¦¾à¦¯à¦¼à§€à¦­à¦¾à¦¬à§‡ à¦®à§à¦›à§‡ à¦¯à¦¾à¦¬à§‡ à¦à¦¬à¦‚ à¦«à¦¿à¦°à¦¿à¦¯à¦¼à§‡ à¦†à¦¨à¦¾ à¦¯à¦¾à¦¬à§‡ à¦¨à¦¾à¥¤",
  "chat.deleteConfirm": "à¦®à§à¦›à§‡ à¦«à§‡à¦²à§‹",
  "chat.cancel": "à¦¬à¦¾à¦¤à¦¿à¦²",
  "chat.quick.summary": "à¦¸à¦¾à¦°à¦¾à¦‚à¦¶ à¦¦à¦¾à¦“",
  "chat.quick.summaryPrompt": "à¦à¦‡ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼à§‡à¦° à¦®à§‚à¦² à¦¬à¦¿à¦·à¦¯à¦¼à¦—à§à¦²à§‹ à¦¸à¦‚à¦•à§à¦·à§‡à¦ªà§‡ à¦¸à¦¾à¦°à¦¾à¦‚à¦¶ à¦†à¦•à¦¾à¦°à§‡ à¦¬à¦²à§‡ à¦¦à¦¾à¦“à¥¤",
  "chat.quick.quiz": "à¦•à§à¦‡à¦œ à¦¬à¦¾à¦¨à¦¾à¦“",
  "chat.quick.quizPrompt": "à¦à¦‡ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¥à§‡à¦•à§‡ à§«à¦Ÿà¦¿ à¦¸à¦‚à¦•à§à¦·à¦¿à¦ªà§à¦¤ à¦ªà§à¦°à¦¶à§à¦¨ à¦¬à¦¾à¦¨à¦¾à¦“ à¦à¦¬à¦‚ à¦¶à§‡à¦·à§‡ à¦‰à¦¤à§à¦¤à¦°à¦—à§à¦²à§‹ à¦¦à¦¾à¦“à¥¤",
  "chat.quick.explain": "à¦¬à¦¿à¦¸à§à¦¤à¦¾à¦°à¦¿à¦¤ à¦¬à§à¦¯à¦¾à¦–à§à¦¯à¦¾",
  "chat.quick.explainPrompt": "à¦à¦‡ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼à§‡à¦° à¦¸à¦¬à¦šà§‡à¦¯à¦¼à§‡ à¦—à§à¦°à§à¦¤à§à¦¬à¦ªà§‚à¦°à§à¦£ à¦¬à¦¿à¦·à¦¯à¦¼à¦Ÿà¦¿ à¦¸à¦¹à¦œ à¦­à¦¾à¦·à¦¾à¦¯à¦¼ à¦¬à¦¿à¦¸à§à¦¤à¦¾à¦°à¦¿à¦¤ à¦¬à§à¦à¦¿à¦¯à¦¼à§‡ à¦¦à¦¾à¦“à¥¤",

  "sidebar.search": "à¦–à§à¦à¦œà§à¦¨",
  "sidebar.searchAria": "à¦šà§à¦¯à¦¾à¦Ÿ à¦–à§à¦à¦œà§à¦¨",
  "sidebar.home": "à¦¹à§‹à¦®",
  "sidebar.chats": "à¦šà§à¦¯à¦¾à¦Ÿ",
  "sidebar.empty": "à¦à¦–à¦¨à§‹ à¦•à§‹à¦¨à§‹ à¦šà§à¦¯à¦¾à¦Ÿ à¦¨à§‡à¦‡ â€” â€œà¦¨à¦¤à§à¦¨ à¦šà§à¦¯à¦¾à¦Ÿâ€ à¦šà¦¾à¦ªà§‹à¥¤",
  "sidebar.nothingFound": "à¦•à¦¿à¦›à§ à¦ªà¦¾à¦“à¦¯à¦¼à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤",
  "sidebar.loading": "à¦šà§à¦¯à¦¾à¦Ÿ à¦²à§‹à¦¡ à¦¹à¦šà§à¦›à§‡...",
  "sidebar.rename": "à¦¨à¦¾à¦® à¦¬à¦¦à¦²à¦¾à¦“",
  "sidebar.delete": "à¦®à§à¦›à§‡ à¦«à§‡à¦²à§‹",
  "sidebar.renameAria": "{title} â€” à¦¨à¦¾à¦® à¦¬à¦¦à¦²à¦¾à¦“",
  "sidebar.deleteAria": "{title} â€” à¦®à§à¦›à§‡ à¦«à§‡à¦²à§‹",

  "toast.dismiss": "à¦¬à¦¾à¦°à§à¦¤à¦¾ à¦¬à¦¨à§à¦§ à¦•à¦°à§à¦¨",

  "quiz.needChapterTitle": "à¦†à¦—à§‡ à¦à¦•à¦Ÿà¦¿ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¬à§‡à¦›à§‡ à¦¨à¦¾à¦“",
  "quiz.needChapterBody": "à¦•à§à¦‡à¦œ à¦¹à¦¬à§‡ à¦ à¦¿à¦• à¦¸à§‡à¦‡ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¥à§‡à¦•à§‡à¦‡ â€” à¦¶à§à¦°à§‡à¦£à¦¿, à¦¬à¦¿à¦·à¦¯à¦¼ à¦“ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¨à¦¿à¦°à§à¦¬à¦¾à¦šà¦¨ à¦•à¦°à§‹à¥¤",
  "quiz.needChapterAction": "à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦¬à§‡à¦›à§‡ à¦¨à¦¾à¦“",
  "quiz.newQuiz": "à¦¨à¦¤à§à¦¨ à¦•à§à¦‡à¦œ",
  "quiz.progress": "à¦ªà§à¦°à§‹à¦—à§à¦°à§‡à¦¸",
  "quiz.hint": "{count}à¦Ÿà¦¿ à¦ªà§à¦°à¦¶à§à¦¨ Â· à¦‰à¦¤à§à¦¤à¦° à¦¦à§‡à¦“à¦¯à¦¼à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡ {answered}/{count} Â· à¦«à¦² à¦œà¦®à¦¾ à¦¦à§‡à¦“à¦¯à¦¼à¦¾à¦° à¦ªà¦°à§‡ à¦¦à§‡à¦–à¦¾ à¦¯à¦¾à¦¬à§‡",
  "quiz.generateFailed": "à¦ªà§à¦°à¦¶à§à¦¨ à¦¤à§ˆà¦°à¦¿ à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿, à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§‹à¥¤",
  "quiz.generating": "à¦ªà§à¦°à¦¶à§à¦¨ à¦¤à§ˆà¦°à¦¿ à¦¹à¦šà§à¦›à§‡...",
  "quiz.generatingHint": "à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼ à¦ªà¦¡à¦¼à§‡ à¦ªà§à¦°à¦¶à§à¦¨ à¦¤à§ˆà¦°à¦¿ à¦¹à¦šà§à¦›à§‡ â€” à§§à§¦-à§¨à§¦ à¦¸à§‡à¦•à§‡à¦¨à§à¦¡ à¦²à¦¾à¦—à¦¤à§‡ à¦ªà¦¾à¦°à§‡à¥¤",
  "quiz.startTitle": "à§«à¦Ÿà¦¿ à¦ªà§à¦°à¦¶à§à¦¨à§‡à¦° à¦•à§à¦‡à¦œ à¦¤à§ˆà¦°à¦¿ à¦•à¦°à§‹",
  "quiz.startBody":
    "à¦ªà§à¦°à¦¶à§à¦¨à¦—à§à¦²à§‹ à¦¹à¦¬à§‡ à¦ à¦¿à¦• à¦à¦‡ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼à§‡à¦° à¦ªà¦¾à¦ à§à¦¯à¦¬à¦‡à¦¯à¦¼à§‡à¦° à¦…à¦‚à¦¶ à¦¥à§‡à¦•à§‡à¥¤ à¦‰à¦¤à§à¦¤à¦° à¦¦à§‡à¦“à¦¯à¦¼à¦¾à¦° à¦ªà¦°à§‡ à¦¸à§à¦•à§‹à¦°, à¦ªà§à¦°à¦¤à¦¿à¦Ÿà¦¿ à¦‰à¦¤à§à¦¤à¦° à¦“ à¦¬à§à¦¯à¦¾à¦–à§à¦¯à¦¾ à¦¦à§‡à¦–à¦¤à§‡ à¦ªà¦¾à¦¬à§‡ â€” à¦«à¦²à¦¾à¦«à¦² à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦¹à¦¬à§‡à¥¤",
  "quiz.startButton": "à¦•à§à¦‡à¦œ à¦¶à§à¦°à§ à¦•à¦°à§‹",
  "quiz.submit": "à¦œà¦®à¦¾ à¦¦à¦¿à¦¯à¦¼à§‡ à¦«à¦² à¦¦à§‡à¦–à§‹",
  "quiz.allAnswered": "à¦¸à¦¬ à¦ªà§à¦°à¦¶à§à¦¨à§‡à¦° à¦‰à¦¤à§à¦¤à¦° à¦¦à§‡à¦“à¦¯à¦¼à¦¾ à¦¹à¦¯à¦¼à§‡à¦›à§‡",
  "quiz.remaining": "à¦†à¦°à¦“ {count}à¦Ÿà¦¿ à¦¬à¦¾à¦•à¦¿",
  "quiz.saved": "à¦«à¦² à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦¹à¦¯à¦¼à§‡à¦›à§‡",
  "quiz.submitFailed": "à¦«à¦² à¦¯à¦¾à¦šà¦¾à¦‡ à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿, à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§‹à¥¤",
  "quiz.toneGreat": "à¦¸à§à¦–à¦¬à¦°!",
  "quiz.toneOk": "à¦­à¦¾à¦²à§‹ à¦šà§‡à¦·à§à¦Ÿà¦¾!",
  "quiz.toneLow": "à¦†à¦°à§‡à¦•à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§‹",
  "quiz.scoreLine": "{correct}/{total} à¦¸à¦ à¦¿à¦• Â· {chapter}",
  "quiz.savedRows": "à¦«à¦²à¦¾à¦«à¦² à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦¹à¦¯à¦¼à§‡à¦›à§‡ ({rows}à¦Ÿà¦¿ à¦‰à¦¤à§à¦¤à¦°) â€” à¦ªà§à¦°à§‹à¦—à§à¦°à§‡à¦¸ à¦Ÿà§à¦¯à¦¾à¦¬à§‡ à¦…à¦—à§à¦°à¦—à¦¤à¦¿ à¦¦à§‡à¦–à§‹à¥¤",
  "quiz.another": "à¦†à¦°à§‡à¦•à¦Ÿà¦¿ à¦•à§à¦‡à¦œ",
  "quiz.correctTag": "à¦¸à¦ à¦¿à¦•",
  "quiz.yourAnswer": "à¦¤à§‹à¦®à¦¾à¦° à¦‰à¦¤à§à¦¤à¦°",
  "quiz.notAnswered": "à¦à¦‡ à¦ªà§à¦°à¦¶à§à¦¨à§‡à¦° à¦‰à¦¤à§à¦¤à¦° à¦¦à§‡à¦“à¦¯à¦¼à¦¾ à¦¹à¦¯à¦¼à¦¨à¦¿à¥¤",
  "quiz.explanation": "à¦¬à§à¦¯à¦¾à¦–à§à¦¯à¦¾: ",

  "progress.loading": "à¦…à¦—à§à¦°à¦—à¦¤à¦¿ à¦²à§‹à¦¡ à¦¹à¦šà§à¦›à§‡...",
  "progress.loadFailed": "à¦ªà§à¦°à§‹à¦—à§à¦°à§‡à¦¸ à¦†à¦¨à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿, à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§‹à¥¤",
  "progress.retry": "à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§‹",
  "progress.emptyTitle": "à¦à¦–à¦¨à§‹ à¦•à§‹à¦¨à§‹ à¦«à¦²à¦¾à¦«à¦² à¦¨à§‡à¦‡",
  "progress.emptyBody":
    "{name}-à¦à¦° à¦ªà§à¦°à¦¥à¦® à¦•à§à¦‡à¦œ à¦¦à¦¿à¦²à§‡à¦‡ à¦à¦–à¦¾à¦¨à§‡ à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼à¦­à¦¿à¦¤à§à¦¤à¦¿à¦• à¦¸à§à¦•à§‹à¦°, à¦¦à§à¦°à§à¦¬à¦² à¦¬à¦¿à¦·à¦¯à¦¼ à¦“ à¦…à¦­à¦¿à¦­à¦¾à¦¬à¦•à§‡à¦° à¦¸à¦¾à¦°à¦¸à¦‚à¦•à§à¦·à§‡à¦ª à¦¦à§‡à¦–à¦¾ à¦¯à¦¾à¦¬à§‡à¥¤",
  "progress.goQuiz": "à¦•à§à¦‡à¦œà§‡ à¦¯à¦¾à¦“",
  "progress.title": "{name} Â· à¦…à¦—à§à¦°à¦—à¦¤à¦¿ à¦°à¦¿à¦ªà§‹à¦°à§à¦Ÿ",
  "progress.overallAccuracy": "à¦®à§‹à¦Ÿ à¦¨à¦¿à¦°à§à¦­à§à¦²à¦¤à¦¾ {accuracy}%",
  "progress.stat.quizzes": "à¦•à§à¦‡à¦œ",
  "progress.stat.questions": "à¦ªà§à¦°à¦¶à§à¦¨",
  "progress.stat.correct": "à¦¸à¦ à¦¿à¦•",
  "progress.stat.accuracy": "à¦¨à¦¿à¦°à§à¦­à§à¦²à¦¤à¦¾",
  "progress.perChapter": "à¦…à¦§à§à¦¯à¦¾à¦¯à¦¼à¦­à¦¿à¦¤à§à¦¤à¦¿à¦• à¦¸à§à¦•à§‹à¦°",
  "progress.chapterMeta": "({correct}/{questions} Â· {quizzes} à¦•à§à¦‡à¦œ)",
  "progress.best": "à¦¸à¦¬à¦šà§‡à¦¯à¦¼à§‡ à¦­à¦¾à¦²à§‹: {chapter} ({accuracy}%)",
  "progress.weakest": "à¦¸à¦¬à¦šà§‡à¦¯à¦¼à§‡ à¦¦à§à¦°à§à¦¬à¦²: {chapter} ({accuracy}%)",
  "progress.weakTopics": "à¦¦à§à¦°à§à¦¬à¦² à¦¬à¦¿à¦·à¦¯à¦¼",
  "progress.noWeak": "à¦à¦–à¦¨à§‹ à¦•à§‹à¦¨à§‹ à¦¸à§à¦ªà¦·à§à¦Ÿ à¦¦à§à¦°à§à¦¬à¦²à¦¤à¦¾ à¦§à¦°à¦¾ à¦ªà¦¡à¦¼à§‡à¦¨à¦¿ â€” à¦šà¦¾à¦²à¦¿à¦¯à¦¼à§‡ à¦¯à¦¾à¦“!",
  "progress.parentSummary": "à¦…à¦­à¦¿à¦­à¦¾à¦¬à¦•à§‡à¦° à¦œà¦¨à§à¦¯ à¦¸à¦¾à¦°à¦¸à¦‚à¦•à§à¦·à§‡à¦ª",
  "progress.refreshSummary": "à¦¸à¦¾à¦°à¦¸à¦‚à¦•à§à¦·à§‡à¦ª à¦¹à¦¾à¦²à¦¨à¦¾à¦—à¦¾à¦¦",
  "progress.summaryLoading": "à¦¸à¦¾à¦°à¦¸à¦‚à¦•à§à¦·à§‡à¦ª à¦²à§‡à¦–à¦¾ à¦¹à¦šà§à¦›à§‡...",
  "progress.summaryMissing": "à¦¸à¦¾à¦°à¦¸à¦‚à¦•à§à¦·à§‡à¦ª à¦¤à§ˆà¦°à¦¿ à¦¹à¦¯à¦¼à¦¨à¦¿ â€” â€œà¦¸à¦¾à¦°à¦¸à¦‚à¦•à§à¦·à§‡à¦ª à¦¹à¦¾à¦²à¦¨à¦¾à¦—à¦¾à¦¦â€ à¦šà¦¾à¦ªà§‹à¥¤",
  "progress.summaryFailed": "à¦…à¦­à¦¿à¦­à¦¾à¦¬à¦•à§‡à¦° à¦¸à¦¾à¦°à¦¸à¦‚à¦•à§à¦·à§‡à¦ª à¦†à¦¨à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤",
  "progress.aiWritten": "AI-à¦²à¦¿à¦–à¦¿à¦¤",
  "progress.fromNumbers": "à¦¹à¦¿à¦¸à¦¾à¦¬ à¦¥à§‡à¦•à§‡",
  "progress.recent": "à¦¸à¦¾à¦®à§à¦ªà§à¦°à¦¤à¦¿à¦• à¦•à§à¦‡à¦œ",

  "error.bootTitle": "à¦¸à¦¾à¦°à§à¦­à¦¾à¦°à§‡ à¦¸à¦‚à¦¯à§‹à¦— à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿",
  "error.backendBase": "à¦¬à§à¦¯à¦¾à¦•à¦à¦¨à§à¦¡ à¦ à¦¿à¦•à¦¾à¦¨à¦¾: ",
  "error.bootHelp":
    "à¦²à§‹à¦•à¦¾à¦²à¦¿ à¦šà¦¾à¦²à¦¾à¦¤à§‡: python -m backend.run (à¦ªà§‹à¦°à§à¦Ÿ 8000), à¦¤à¦¾à¦°à¦ªà¦° web/.env.local-à¦ NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000à¥¤ Vercel-à¦ deploy à¦•à¦°à¦²à§‡ à¦¡à§à¦¯à¦¾à¦¶à¦¬à§‹à¦°à§à¦¡à§‡ HTTPS à¦ à¦¿à¦•à¦¾à¦¨à¦¾à¦Ÿà¦¿ à¦¸à§‡à¦Ÿ à¦•à¦°à¦¤à§‡ à¦¹à¦¬à§‡à¥¤",
  "error.retry": "à¦†à¦¬à¦¾à¦° à¦šà§‡à¦·à§à¦Ÿà¦¾ à¦•à¦°à§‹",
  "error.cachedNotice": "{message} (à¦¸à¦‚à¦°à¦•à§à¦·à¦¿à¦¤ à¦¸à§‚à¦šà¦¿ à¦¦à§‡à¦–à¦¾à¦¨à§‹ à¦¹à¦šà§à¦›à§‡)",
  "error.bootDefault": "à¦¸à¦¾à¦°à§à¦­à¦¾à¦°à§‡à¦° à¦¸à¦¾à¦¥à§‡ à¦¸à¦‚à¦¯à§‹à¦— à¦•à¦°à¦¾ à¦¯à¦¾à¦¯à¦¼à¦¨à¦¿à¥¤ à¦¬à§à¦¯à¦¾à¦•à¦à¦¨à§à¦¡ à¦šà¦¾à¦²à§ à¦†à¦›à§‡ à¦•à¦¿?",
  "error.loadingBoot": "à¦ªà¦¾à¦ à§à¦¯à¦¬à¦‡ à¦ªà§à¦°à¦¸à§à¦¤à§à¦¤ à¦¹à¦šà§à¦›à§‡...",
};

export const dictionary: Record<Language, Record<StringKey, string>> = { en, bn };

/** Translate `key`, substituting `{name}` placeholders from `vars`. */
export function translate(
  language: Language,
  key: StringKey,
  vars?: Record<string, string | number>,
): string {
  const table = dictionary[language] ?? dictionary[DEFAULT_LANGUAGE];
  const template = table[key] ?? dictionary[DEFAULT_LANGUAGE][key] ?? key;
  if (!vars) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "bn";
}

function readStored(): Language | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch {
    return null;
  }
}

/** The language in effect right now â€” for modules outside React (the API client). */
export function currentLanguage(): Language {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }
  return readStored() ?? DEFAULT_LANGUAGE;
}

export function storeLanguage(language: Language): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Private mode: the in-memory choice still applies for this session.
  }
}

/** Keep <html lang> in sync so screen readers and hyphenation follow the UI language. */
export function applyDocumentLanguage(language: Language): void {
  if (typeof document !== "undefined") {
    document.documentElement.lang = language === "bn" ? "bn" : "en";
  }
}
