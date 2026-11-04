/**
 * UI language: English (default) and Bangla.
 *
 * One dictionary per language, with `bn` typed against the English keys so a missing
 * or misspelled key is a compile error rather than a blank label at runtime.
 *
 * This file must stay UTF-8 encoded. Do not rewrite it through a PowerShell
 * `Get-Content | Set-Content` round-trip: that reads UTF-8 as the system codepage and
 * silently destroys every Bangla string in it. Use the editor/`write` tool instead.
 */

export type Language = "en" | "bn";

export const DEFAULT_LANGUAGE: Language = "en";

const STORAGE_KEY = "patsomadhan.lang";

const en = {
  // --- app shell ---
  "app.title": "Boi Bondhu",
  "app.description": "NCTB textbooks — chat, quizzes and progress",
  "app.sticker": "Built For Ostad Presents YUNet AIgnite Buildathon 2026",
  "app.bannerAlt": "Boi Bondhu — NCTB textbook study assistant",
  "lang.label": "Language",
  "lang.en": "EN",
  "lang.bn": "বাংলা",

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
  "picker.subtitle": "Pick a subject and chapter — answers come only from that chapter.",
  "picker.class": "Class",
  "picker.subject": "Subject",
  "picker.chapter": "Chapter",
  "picker.subjectPlaceholder": "Choose a subject",
  "picker.chapterPlaceholder": "Choose a chapter",
  "picker.chapterNeedsSubject": "Choose a subject first",
  "picker.searchChapter": "Search chapters…",
  "picker.chapterCount": "{count} chapters",
  "picker.noIndex": "(not indexed)",
  "picker.notIndexed": "This chapter has no search index yet — choose another chapter.",
  "picker.page": "p. {page}",
  "picker.start": "Start",
  "picker.starting": "Starting…",
  "picker.select": "Select",
  "picker.selecting": "Selecting…",
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
  "chat.greetingNight": "Studying late",
  "chat.placeholder": "Ask a question or type a command…",
  "chat.questionAria": "Type your question",
  "chat.send": "Send",
  "chat.stop": "Stop",
  "chat.stopped": "⏹ Stopped.",
  "chat.needChapter": "Choose a class, subject and chapter first.",
  "chat.newThreadFailed": "Could not start a new chat.",
  "chat.answerFailed": "Something went wrong while fetching the answer.",
  "chat.loadFailed": "Could not load the chat.",
  "chat.listFailed": "Could not load the chat list.",
  "chat.renameFailed": "Could not rename the chat.",
  "chat.deleteFailed": "Could not delete the chat.",
  "chat.busyAnswer": "An answer is streaming — try again when it finishes.",
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
  "sidebar.empty": "No chats yet — hit “New chat”.",
  "sidebar.nothingFound": "Nothing found.",
  "sidebar.loading": "Loading chats…",
  "sidebar.rename": "Rename",
  "sidebar.delete": "Delete",
  "sidebar.renameAria": "{title} — rename",
  "sidebar.deleteAria": "{title} — delete",

  // --- toast ---
  "toast.dismiss": "Dismiss message",

  // --- quiz ---
  "quiz.needChapterTitle": "Choose a chapter first",
  "quiz.needChapterBody": "The quiz comes only from that chapter — pick class, subject and chapter.",
  "quiz.needChapterAction": "Choose a chapter",
  "quiz.newQuiz": "New quiz",
  "quiz.progress": "Progress",
  "quiz.hint": "{count} questions · answered {answered}/{count} · answers appear after you submit",
  "quiz.generateFailed": "Could not create questions, please try again.",
  "quiz.generating": "Creating questions…",
  "quiz.generatingHint": "Reading the chapter to write questions — this can take 10-20 seconds.",
  "quiz.startTitle": "Create a 5-question quiz",
  "quiz.startBody":
    "Every question comes from this chapter's textbook passages. After you answer you'll see the score, each answer and an explanation — and the result is saved.",
  "quiz.startButton": "Start quiz",
  "quiz.submit": "Submit and see result",
  "quiz.allAnswered": "All questions answered",
  "quiz.remaining": "{count} left",
  "quiz.saved": "Result saved",
  "quiz.submitFailed": "Could not check the result, please try again.",
  "quiz.toneGreat": "Great job!",
  "quiz.toneOk": "Good effort!",
  "quiz.toneLow": "Try again!",
  "quiz.scoreLine": "{correct}/{total} correct · {chapter}",
  "quiz.savedRows": "Result saved ({rows} answers) — see your progress in the Progress tab.",
  "quiz.another": "Another quiz",
  "quiz.correctTag": "Correct",
  "quiz.yourAnswer": "Your answer",
  "quiz.notAnswered": "This question was not answered.",
  "quiz.explanation": "Explanation: ",

  // --- progress ---
  "progress.loading": "Loading progress…",
  "progress.loadFailed": "Could not load progress, please try again.",
  "progress.retry": "Try again",
  "progress.emptyTitle": "No results yet",
  "progress.emptyBody":
    "{name} — take a first quiz and chapter scores, weak topics and the parent summary will appear here.",
  "progress.goQuiz": "Go to quiz",
  "progress.title": "{name} · progress report",
  "progress.overallAccuracy": "Overall accuracy {accuracy}%",
  "progress.stat.quizzes": "Quizzes",
  "progress.stat.questions": "Questions",
  "progress.stat.correct": "Correct",
  "progress.stat.accuracy": "Accuracy",
  "progress.perChapter": "Score by chapter",
  "progress.chapterMeta": "({correct}/{questions} · {quizzes} quizzes)",
  "progress.best": "Best: {chapter} ({accuracy}%)",
  "progress.weakest": "Weakest: {chapter} ({accuracy}%)",
  "progress.weakTopics": "Weak topics",
  "progress.noWeak": "No clear weak spot yet — keep going!",
  "progress.parentSummary": "Summary for parents",
  "progress.refreshSummary": "Refresh summary",
  "progress.summaryLoading": "Writing the summary…",
  "progress.summaryMissing": "No summary yet — press “Refresh summary”.",
  "progress.summaryFailed": "Could not fetch the parent summary.",
  "progress.aiWritten": "AI-written",
  "progress.fromNumbers": "From the numbers",
  "progress.recent": "Recent quizzes",
  "progress.subjectFilter": "Filter by subject",
  "progress.allSubjects": "All subjects",
  "progress.subjectChipTitle": "{label} — {quizzes} quizzes, {questions} questions",
  "progress.resetChapter": "Reset",
  "progress.resetChapterAria": "{chapter} — reset its progress",
  "progress.resetAll": "Reset all progress",
  "progress.resetTitleChapter": "Reset this chapter's progress?",
  "progress.resetTitleAll": "Reset all progress?",
  "progress.resetBody":
    "Every saved answer for {target} will be deleted permanently. This cannot be undone.",
  "progress.resetConfirm": "Reset",
  "progress.cancel": "Cancel",
  "progress.resetDone": "Progress reset — {count} answers deleted",
  "progress.resetFailed": "Could not reset progress.",
  "progress.resetAllTarget": "all chapters and subjects",

  // --- connection errors ---
  "error.bootTitle": "Could not reach the server",
  "error.backendBase": "Backend URL: ",
  "error.bootHelp":
    "Run locally: python -m backend.run (port 8000), then set NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000 in web/.env.local. On Vercel, set the HTTPS backend URL in the dashboard.",
  "error.retry": "Try again",
  "error.cachedNotice": "{message} (showing the saved catalog)",
  "error.bootDefault": "Could not connect to the server. Is the backend running?",
  "error.loadingBoot": "Preparing your textbooks…",
} as const;

export type StringKey = keyof typeof en;

/** Signature every component takes for translation, so none of them import the hook. */
export type TFunction = (key: StringKey, vars?: Record<string, string | number>) => string;

const bn: Record<StringKey, string> = {
  "app.title": "বই বন্ধু",
  "app.description": "NCTB পাঠ্যবই — চ্যাট, কুইজ ও অগ্রগতি",
  "app.sticker": "Built For Ostad Presents YUNet AIgnite Buildathon 2026",
  "app.bannerAlt": "বই বন্ধু — NCTB পাঠ্যবই সহায়ক",
  "lang.label": "ভাষা",
  "lang.en": "EN",
  "lang.bn": "বাংলা",

  "tab.aria": "অ্যাপের বিভাগ",
  "tab.chat": "চ্যাট",
  "tab.quiz": "কুইজ",
  "tab.progress": "প্রোগ্রেস",

  "user.defaultName": "শিক্ষার্থী",
  "user.menuLabel": "প্রোফাইল",
  "user.edit": "নাম বদলাও",
  "user.save": "সংরক্ষণ",
  "user.cancel": "বাতিল",
  "user.placeholder": "তোমার নাম",
  "user.hint": "এই ডিভাইসে সংরক্ষিত",

  "chapter.pick": "শ্রেণি, বিষয় ও অধ্যায় বেছে নাও",
  "chapter.switch": "অধ্যায় বদলাও",

  "picker.title.new": "কী পড়তে চাও?",
  "picker.title.switch": "অধ্যায় বদলাও",
  "picker.title.select": "অধ্যায় বেছে নাও",
  "picker.subtitle": "বিষয় ও অধ্যায় বেছে নাও — উত্তর আসবে ঠিক সেই অধ্যায় থেকে।",
  "picker.class": "ক্লাস",
  "picker.subject": "বিষয়",
  "picker.chapter": "অধ্যায়",
  "picker.subjectPlaceholder": "বিষয় বেছে নাও",
  "picker.chapterPlaceholder": "অধ্যায় বেছে নাও",
  "picker.chapterNeedsSubject": "আগে বিষয় বেছে নাও",
  "picker.searchChapter": "অধ্যায় খুঁজুন...",
  "picker.chapterCount": "{count}টি",
  "picker.noIndex": "(সূচি নেই)",
  "picker.notIndexed": "এই অধ্যায়ের সূচি (embedding) এখনো তৈরি হয়নি — অন্য অধ্যায় বেছে নাও।",
  "picker.page": "পৃষ্ঠা {page}",
  "picker.start": "শুরু করুন",
  "picker.starting": "শুরু হচ্ছে...",
  "picker.select": "নির্বাচন করো",
  "picker.selecting": "নেওয়া হচ্ছে...",
  "picker.close": "বন্ধ করো",
  "picker.failed": "শুরু করা যায়নি, আবার চেষ্টা করো।",
  "picker.fixedClass": "এই অ্যাপে নির্ধারিত",

  "chat.newChat": "নতুন চ্যাট",
  "chat.greeting": "{greeting}, {name}",
  "chat.askLine": "আজ কী নিয়ে পড়বে?",
  "chat.greetingMorning": "শুভ সকাল",
  "chat.greetingAfternoon": "শুভ দুপুর",
  "chat.greetingEvening": "শুভ সন্ধ্যা",
  "chat.greetingNight": "এত রাতে পড়ছো",
  "chat.placeholder": "প্রশ্ন লিখুন বা কমান্ড দিন...",
  "chat.questionAria": "প্রশ্ন লিখুন",
  "chat.send": "পাঠাও",
  "chat.stop": "থামাও",
  "chat.stopped": "⏹ থামানো হয়েছে।",
  "chat.needChapter": "আগে শ্রেণি, বিষয় ও অধ্যায় বেছে নাও।",
  "chat.newThreadFailed": "নতুন চ্যাট শুরু করা যায়নি।",
  "chat.answerFailed": "উত্তর আনতে সমস্যা হয়েছে।",
  "chat.loadFailed": "চ্যাট লোড হয়নি।",
  "chat.listFailed": "চ্যাট তালিকা লোড হয়নি।",
  "chat.renameFailed": "নাম বদলানো যায়নি।",
  "chat.deleteFailed": "চ্যাট মোছা যায়নি।",
  "chat.busyAnswer": "উত্তর আসছে — শেষ হলে আবার চেষ্টা করো।",
  "chat.deleteTitle": "চ্যাটটি মুছে ফেলবেন?",
  "chat.deleteBody": "এটি স্থায়ীভাবে মুছে যাবে এবং ফিরিয়ে আনা যাবে না।",
  "chat.deleteConfirm": "মুছে ফেলো",
  "chat.cancel": "বাতিল",
  "chat.quick.summary": "সারাংশ দাও",
  "chat.quick.summaryPrompt": "এই অধ্যায়ের মূল বিষয়গুলো সংক্ষেপে সারাংশ আকারে বলে দাও।",
  "chat.quick.quiz": "কুইজ বানাও",
  "chat.quick.quizPrompt": "এই অধ্যায় থেকে ৫টি সংক্ষিপ্ত প্রশ্ন বানাও এবং শেষে উত্তরগুলো দাও।",
  "chat.quick.explain": "বিস্তারিত ব্যাখ্যা",
  "chat.quick.explainPrompt": "এই অধ্যায়ের সবচেয়ে গুরুত্বপূর্ণ বিষয়টি সহজ ভাষায় বিস্তারিত বুঝিয়ে দাও।",

  "sidebar.search": "খুঁজুন",
  "sidebar.searchAria": "চ্যাট খুঁজুন",
  "sidebar.home": "হোম",
  "sidebar.chats": "চ্যাট",
  "sidebar.empty": "এখনো কোনো চ্যাট নেই — “নতুন চ্যাট” চাপো।",
  "sidebar.nothingFound": "কিছু পাওয়া যায়নি।",
  "sidebar.loading": "চ্যাট লোড হচ্ছে...",
  "sidebar.rename": "নাম বদলাও",
  "sidebar.delete": "মুছে ফেলো",
  "sidebar.renameAria": "{title} — নাম বদলাও",
  "sidebar.deleteAria": "{title} — মুছে ফেলো",

  "toast.dismiss": "বার্তা বন্ধ করুন",

  "quiz.needChapterTitle": "আগে একটি অধ্যায় বেছে নাও",
  "quiz.needChapterBody": "কুইজ হবে ঠিক সেই অধ্যায় থেকেই — শ্রেণি, বিষয় ও অধ্যায় নির্বাচন করো।",
  "quiz.needChapterAction": "অধ্যায় বেছে নাও",
  "quiz.newQuiz": "নতুন কুইজ",
  "quiz.progress": "প্রোগ্রেস",
  "quiz.hint": "{count}টি প্রশ্ন · উত্তর দেওয়া হয়েছে {answered}/{count} · ফল জমা দেওয়ার পরে দেখা যাবে",
  "quiz.generateFailed": "প্রশ্ন তৈরি করা যায়নি, আবার চেষ্টা করো।",
  "quiz.generating": "প্রশ্ন তৈরি হচ্ছে...",
  "quiz.generatingHint": "অধ্যায় পড়ে প্রশ্ন তৈরি হচ্ছে — ১০-২০ সেকেন্ড লাগতে পারে।",
  "quiz.startTitle": "৫টি প্রশ্নের কুইজ তৈরি করো",
  "quiz.startBody":
    "প্রশ্নগুলো হবে ঠিক এই অধ্যায়ের পাঠ্যবইয়ের অংশ থেকে। উত্তর দেওয়ার পরে স্কোর, প্রতিটি উত্তর ও ব্যাখ্যা দেখতে পাবে — ফলাফল সংরক্ষিত হবে।",
  "quiz.startButton": "কুইজ শুরু করো",
  "quiz.submit": "জমা দিয়ে ফল দেখো",
  "quiz.allAnswered": "সব প্রশ্নের উত্তর দেওয়া হয়েছে",
  "quiz.remaining": "আরও {count}টি বাকি",
  "quiz.saved": "ফল সংরক্ষিত হয়েছে",
  "quiz.submitFailed": "ফল যাচাই করা যায়নি, আবার চেষ্টা করো।",
  "quiz.toneGreat": "সুখবর!",
  "quiz.toneOk": "ভালো চেষ্টা!",
  "quiz.toneLow": "আরেকবার চেষ্টা করো",
  "quiz.scoreLine": "{correct}/{total} সঠিক · {chapter}",
  "quiz.savedRows": "ফলাফল সংরক্ষিত হয়েছে ({rows}টি উত্তর) — প্রোগ্রেস ট্যাবে অগ্রগতি দেখো।",
  "quiz.another": "আরেকটি কুইজ",
  "quiz.correctTag": "সঠিক",
  "quiz.yourAnswer": "তোমার উত্তর",
  "quiz.notAnswered": "এই প্রশ্নের উত্তর দেওয়া হয়নি।",
  "quiz.explanation": "ব্যাখ্যা: ",

  "progress.loading": "অগ্রগতি লোড হচ্ছে...",
  "progress.loadFailed": "প্রোগ্রেস আনা যায়নি, আবার চেষ্টা করো।",
  "progress.retry": "আবার চেষ্টা করো",
  "progress.emptyTitle": "এখনো কোনো ফলাফল নেই",
  "progress.emptyBody":
    "{name}-এর প্রথম কুইজ দিলেই এখানে অধ্যায়ভিত্তিক স্কোর, দুর্বল বিষয় ও অভিভাবকের সারসংক্ষেপ দেখা যাবে।",
  "progress.goQuiz": "কুইজে যাও",
  "progress.title": "{name} · অগ্রগতি রিপোর্ট",
  "progress.overallAccuracy": "মোট নির্ভুলতা {accuracy}%",
  "progress.stat.quizzes": "কুইজ",
  "progress.stat.questions": "প্রশ্ন",
  "progress.stat.correct": "সঠিক",
  "progress.stat.accuracy": "নির্ভুলতা",
  "progress.perChapter": "অধ্যায়ভিত্তিক স্কোর",
  "progress.chapterMeta": "({correct}/{questions} · {quizzes} কুইজ)",
  "progress.best": "সবচেয়ে ভালো: {chapter} ({accuracy}%)",
  "progress.weakest": "সবচেয়ে দুর্বল: {chapter} ({accuracy}%)",
  "progress.weakTopics": "দুর্বল বিষয়",
  "progress.noWeak": "এখনো কোনো স্পষ্ট দুর্বলতা ধরা পড়েনি — চালিয়ে যাও!",
  "progress.parentSummary": "অভিভাবকের জন্য সারসংক্ষেপ",
  "progress.refreshSummary": "সারসংক্ষেপ হালনাগাদ",
  "progress.summaryLoading": "সারসংক্ষেপ লেখা হচ্ছে...",
  "progress.summaryMissing": "সারসংক্ষেপ তৈরি হয়নি — “সারসংক্ষেপ হালনাগাদ” চাপো।",
  "progress.summaryFailed": "অভিভাবকের সারসংক্ষেপ আনা যায়নি।",
  "progress.aiWritten": "AI-লিখিত",
  "progress.fromNumbers": "হিসাব থেকে",
  "progress.recent": "সাম্প্রতিক কুইজ",
  "progress.subjectFilter": "বিষয় অনুযায়ী ফিল্টার",
  "progress.allSubjects": "সব বিষয়",
  "progress.subjectChipTitle": "{label} — {quizzes} কুইজ, {questions} প্রশ্ন",
  "progress.resetChapter": "রিসেট",
  "progress.resetChapterAria": "{chapter} — এর অগ্রগতি রিসেট করো",
  "progress.resetAll": "সব অগ্রগতি রিসেট",
  "progress.resetTitleChapter": "এই অধ্যায়ের অগ্রগতি রিসেট করবেন?",
  "progress.resetTitleAll": "সব অগ্রগতি রিসেট করবেন?",
  "progress.resetBody":
    "{target}-এর সব সংরক্ষিত উত্তর স্থায়ীভাবে মুছে যাবে। এটি ফিরিয়ে আনা যাবে না।",
  "progress.resetConfirm": "রিসেট করো",
  "progress.cancel": "বাতিল",
  "progress.resetDone": "অগ্রগতি রিসেট হয়েছে — {count}টি উত্তর মুছে ফেলা হয়েছে",
  "progress.resetFailed": "অগ্রগতি রিসেট করা যায়নি।",
  "progress.resetAllTarget": "সব অধ্যায় ও বিষয়",

  "error.bootTitle": "সার্ভারে সংযোগ করা যায়নি",
  "error.backendBase": "ব্যাকএন্ড ঠিকানা: ",
  "error.bootHelp":
    "লোকালি চালাতে: python -m backend.run (পোর্ট 8000), তারপর web/.env.local-এ NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000। Vercel-এ deploy করলে ড্যাশবোর্ডে HTTPS ঠিকানাটি সেট করতে হবে।",
  "error.retry": "আবার চেষ্টা করো",
  "error.cachedNotice": "{message} (সংরক্ষিত সূচি দেখানো হচ্ছে)",
  "error.bootDefault": "সার্ভারের সাথে সংযোগ করা যায়নি। ব্যাকএন্ড চালু আছে কি?",
  "error.loadingBoot": "পাঠ্যবই প্রস্তুত হচ্ছে...",
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

/** The language in effect right now — for modules outside React (the API client). */
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
