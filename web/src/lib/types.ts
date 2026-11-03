/** Wire types shared with the FastAPI backend. */

export type SubChapter = {
  name: string;
  number: number | string | null;
  starting_page: number | null;
  writer_name: string | null;
};

export type Chapter = {
  name: string;
  chapter_name: string;
  number: number | string | null;
  starting_page: number | null;
  sub_chapters: SubChapter[];
  /** Set when this chapter is a sub-chapter (the vector store is keyed by sub-chapter). */
  parent?: string;
  writer_name?: string | null;
  /** False when the pipeline never embedded this chapter. */
  indexed?: boolean;
};

export type Subject = {
  subject: string;
  stream: string | null;
  label: string;
  book: string;
  indexed: boolean;
  chapters: Chapter[];
};

export type ClassNode = {
  class_id: string;
  label: string;
  nested: boolean;
  subjects: Subject[];
};

export type CatalogCounts = {
  classes: number;
  subjects: number;
  chapters: number;
  indexed_books: number;
  indexed_chapters: number;
};

export type CatalogResponse = {
  classes: ClassNode[];
  counts: CatalogCounts;
  /** Content hash of the catalog; also the ETag the backend sends. */
  version: string;
  catalog_classes: string[];
  built_at: string;
};

export type ChapterContext = {
  class_id: string;
  class_label: string;
  subject: string;
  subject_label: string;
  stream: string | null;
  book: string;
  chapter: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ThreadSummary = {
  thread_id: string;
  title: string;
  context: Partial<ChapterContext>;
  message_count: number;
  preview: string;
  created_at: string;
  updated_at: string;
};

export type ThreadGroup = {
  label: string;
  threads: ThreadSummary[];
};

export type ThreadDetail = {
  thread_id: string;
  title: string;
  context: Partial<ChapterContext>;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
};

export type Health = {
  status: "ok" | "degraded";
  embedding_model: string;
  device: string;
  dimension: number;
  llm_providers: string[];
  catalog_classes: string[];
  indexed_books: number;
  indexed_chapters: number;
  quiz_question_count: number;
  thread_retention_days: number;
  detail: string;
};

export type StreamStatus = "searching" | "answering";

export type StreamEvent =
  | { type: "status"; stage: StreamStatus; message: string }
  | { type: "delta"; text: string }
  | { type: "done"; thread_id: string; title: string; updated_at: string }
  | { type: "error"; message: string };

/** One generated MCQ. `answer` is the 0-based index of the correct option. */
export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: number;
  topic: string;
  explanation: string;
};

export type Quiz = {
  quiz_id: string;
  student: string;
  context: Partial<ChapterContext>;
  chapter: string;
  subject_label: string;
  questions: QuizQuestion[];
  generated_at: string;
};

export type QuizResultItem = {
  id: string | null;
  question: string;
  options: string[];
  topic: string;
  chosen: number | null;
  answer: number;
  correct: boolean;
  explanation: string;
};

export type QuizGrade = {
  quiz_id: string;
  student: string;
  context: Partial<ChapterContext>;
  chapter: string;
  subject_label: string;
  correct: number;
  total: number;
  score: number;
  results: QuizResultItem[];
  saved_rows: number;
};

export type ChapterStat = {
  subject: string;
  subject_label: string;
  chapter: string;
  quiz_count: number;
  questions: number;
  correct: number;
  accuracy: number;
  average_score: number;
  last_at: string | null;
};

export type TopicStat = {
  subject: string;
  subject_label: string;
  chapter: string;
  topic: string;
  questions: number;
  correct: number;
  accuracy: number;
  last_at: string | null;
};

export type OverallStats = {
  student: string;
  quiz_count: number;
  questions: number;
  correct: number;
  accuracy: number;
  first_at: string | null;
  last_at: string | null;
};

export type RecentAttempt = {
  quiz_id: string;
  subject: string;
  subject_label: string;
  chapter: string;
  questions: number;
  correct: number;
  score: number;
  created_at: string;
};

export type Progress = {
  student: string;
  overall: OverallStats;
  chapters: ChapterStat[];
  weak_topics: TopicStat[];
  recent: RecentAttempt[];
};

export type ProgressSummary = {
  student: string;
  summary: string;
  source: "llm" | "fallback";
  overall: OverallStats;
  generated_at: string;
};
