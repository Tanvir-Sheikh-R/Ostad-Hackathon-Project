# বই বন্ধু / Boi Bondhu (Study-RAG)

NCTB পাঠ্যবইয়ের ওপর ভিত্তি করে একটি স্টাডি অ্যাসিস্ট্যান্ট। শিক্ষার্থী **শ্রেণি → বিষয় →
অধ্যায়** বেছে নেয়, তারপর তিনটি ট্যাব পায় (প্রতিটি ট্যাবের নিজস্ব রং):

| ট্যাব | কাজ |
|---|---|
| **চ্যাট / Chat** | নির্বাচিত অধ্যায়ের ভেতরেই hybrid retrieval (BM25 + FAISS) করে উত্তর দেয়, NDJSON স্ট্রিমে |
| **কুইজ / Quiz** | সেই অধ্যায়ের অংশ থেকে LLM ৫টি MCQ তৈরি করে; উত্তর দেওয়ার পরে স্কোর ও ব্যাখ্যা দেখায় |
| **প্রোগ্রেস / Progress** | অধ্যায়ভিত্তিক গড় স্কোর, দুর্বল টপিক, বিষয়-ফিল্টার, রিসেট, এবং LLM-লেখা অভিভাবক সারসংক্ষেপ |

প্রতিটি কুইজের ফল SQLite-এ সংরক্ষিত হয় (student, subject, chapter, topic, correct, date)।

- **UI ভাষা:** ডিফল্ট **English**, হেডারের **EN / বাংলা** টগল দিয়ে বদলানো যায় — UI লেখা,
  বিষয়ের নাম এবং AI-এর উত্তর/কুইজ/সারসংক্ষেপের ভাষা একসাথে বদলায় (বিস্তারিত নিচে)।
- **ব্যাকএন্ড:** FastAPI — Docker ইমেজ (Docker Hub) হিসেবে AWS EC2-তে, `http://13.48.12.56:8000` (`deploy/`)
- **ফ্রন্টএন্ড:** Next.js 16 — GitHub থেকে Vercel-এ, https://boibondhu.vercel.app (`web/`)

## স্থাপত্য

```
ব্রাউজার ──▶ https://boibondhu.vercel.app/api/*        (same-origin, HTTPS)
                     │  next.config.ts rewrite (সার্ভার-সাইড, TLS/CORS লাগে না)
                     ▼
              http://13.48.12.56:8000 ──▶ FastAPI container (EC2, Docker Hub image)
                                            ├── embedding_cache/   (chapters.json + FAISS)
                                            ├── model_cache/e5-base (query encoder)
                                            ├── backend/data/*.db   (SQLite: quiz results)
                                            └── backend/data/threads (chat history)
```

Vercel সাইট HTTPS-এ, EC2-তে সার্টিফিকেট নেই — তাই ব্রাউজার কখনো IP-তে সরাসরি কল করে না;
Vercel-এর rewrite সার্ভার-সাইডে `/api/*` পাঠায়। ফলে mixed-content ব্লক আর CORS দুটোই নেই।
(নিজের ডোমেইন + Caddy দিয়ে সরাসরি HTTPS-ও করা যায় — `deploy/DEPLOY.md` §7।)

## ফাইল স্ট্রাকচার

```
.
├── backend/                     # FastAPI (AWS)
│   ├── app.py                   # app factory: CORS, gzip, lifespan, router mounting
│   ├── run.py                   # python -m backend.run
│   ├── config.py                # paths, models, tunables (env-overridable)
│   ├── schemas.py               # Pydantic request/response models
│   ├── store.py                 # thread persistence (one JSON file per chat)
│   ├── api/                     # thin HTTP layer
│   │   ├── catalog.py           # GET  /api/catalog   (ETag + cache headers)
│   │   ├── chat.py              # threads CRUD + POST /api/threads/{id}/chat (NDJSON)
│   │   ├── quiz.py              # POST /api/quiz/generate | /api/quiz/submit
│   │   ├── progress.py          # GET  /api/progress | /api/progress/summary
│   │   ├── health.py            # GET  /api/health | POST /api/health/warmup
│   │   └── deps.py              # client id, language, chapter verification
│   ├── db/                      # SQLite
│   │   ├── database.py          # connection + schema (WAL)
│   │   └── quiz_results.py      # sessions, results, chapter/topic statistics
│   └── rag/
│       ├── retriever.py         # ★ hybrid BM25 + FAISS search over one chapter
│       ├── chapters.py          # chapters.json access + catalog (BN + EN labels)
│       ├── embeddings.py        # e5-base loaded from a flat local directory
│       ├── i18n.py              # EN/BN prompts + user-facing API messages
│       ├── llm.py               # Groq → DeepSeek fallback, JSON repair
│       ├── answer.py            # chat prompt + streaming answer
│       ├── quiz.py              # MCQ generation + grading
│       └── summary.py           # parent summary (+ deterministic fallback)
│
├── web/                         # Next.js (Vercel)
│   ├── public/banner.png        # শীর্ষ ব্যানার (নিজের ছবি এখানে রাখুন)
│   └── src/
│       ├── app/page.tsx         # হেডার + ট্যাব শেল
│       ├── components/          # app-header, chapter-bar, tab-nav, language-toggle,
│       │                        # user-menu, quiz-panel, progress-panel, banner, ...
│       └── lib/                 # api.ts, types.ts, cache.ts, i18n.ts, use-language.ts
│
├── deploy/                      # AWS deployment
│   ├── Dockerfile.backend
│   ├── docker-compose.aws.yml   # backend + Caddy (HTTPS)
│   ├── Caddyfile
│   └── DEPLOY.md                # ধাপে ধাপে রানবুক
│
├── pipeline/                    # ডেটা তৈরির নোটবুক (chapters.json + embedding_cache)
├── scripts/
│   ├── api_smoke_test.py        # এন্ড-টু-এন্ড পরীক্ষা (--lang en|bn)
│   └── translate_chapters.py    # অধ্যায়ের শিরোনামের ইংরেজি অনুবাদ তৈরি করে
├── chapters.json                # অধ্যায় সূচি
├── chapter_titles_en.json       # ইংরেজি অধ্যায়-শিরোনাম (book::chapter → title)
├── embedding_cache/             # প্রতি অধ্যায়ের chunks.json + FAISS index
├── model_cache/e5-base/         # ~1.1 GB (git-এ নেই, ইমেজে বেক করা)
└── docker-compose.yml           # লোকাল ডেভেলপমেন্ট (শুধু API)
```

## ভাষা (English / বাংলা)

- ডিফল্ট UI ভাষা **English**; হেডারের `EN | বাংলা` টগল দিয়ে বদলানো যায়। পছন্দ
  `localStorage`-এ থাকে (`patsomadhan.lang`) এবং `<html lang>` আপডেট হয়।
- টগল বদলালে একসাথে বদলায়: সব UI লেবেল, বিষয়ের নাম (ক্যাটালগ BN+EN দুটোই পাঠায়),
  চ্যাটের উত্তর, কুইজের প্রশ্ন/ব্যাখ্যা, এবং অভিভাবক সারসংক্ষেপ।
- প্রতি রিকোয়েস্টে ভাষা যায় দুইভাবে: `X-Client-Lang` হেডার (এরর/স্ট্যাটাস মেসেজের জন্য)
  এবং `context.language` (প্রম্পটের জন্য, থ্রেডে সংরক্ষিত থাকে)।
- **অধ্যায়ের নাম:** `chapter_titles_en.json`-এ ইংরেজি শিরোনাম থাকে (কী: `book::chapter`)।
  ফাইলটি `scripts/translate_chapters.py` দিয়ে একবার তৈরি হয় (LLM, resumable) এবং ইমেজে বেক করা
  হয়। অনুবাদ না থাকলে ইংরেজি UI-তে মূল শিরোনামই দেখায় — কিছুই ভাঙে না। নতুন বই যোগ করলে
  `python scripts/translate_chapters.py` আবার চালালেই বাকিগুলো যোগ হয়।
  **গুরুত্বপূর্ণ:** `chapter` (ডেটার কী) সবসময় বাংলাতেই থাকে — ভেক্টর স্টোর সেই নামে indexed;
  শুধু দেখানোর লেবেল (`chapter_label`) বদলায়।
- শিক্ষার্থীর নাম: ডিফল্ট `Student` / `শিক্ষার্থী`; হেডারের ইউজার আইকনে ক্লিক → পেন্সিল
  আইকন → নাম লিখে সেভ (`localStorage`: `patsomadhan.name`)।

## লোকালি চালানো

```bash
# 1) ব্যাকএন্ড
python -m backend.run                 # http://127.0.0.1:8000  (docs: /api/docs)

# অথবা Docker
docker compose up -d --build

# 2) ফ্রন্টএন্ড
cd web
cp .env.example .env.local            # API_PROXY_TARGET=http://127.0.0.1:8000
npm install
npm run dev                           # http://localhost:3000
```

লোকালেও প্রোডাকশনের মতোই চলে: ব্রাউজার `/api/*` কল করে, Next সেটি `API_PROXY_TARGET`-এ
forward করে — তাই লোকালে CORS লাগে না।

`.env` তৈরি করতে `.env.example` দেখুন — অন্তত `GROQ_API_KEY` (বা `DEEPSEEK_API_KEY`) দরকার।

## API

| Method | Path | কাজ |
|---|---|---|
| GET | `/api/health` · POST `/api/health/warmup` | অবস্থা / এনকোডার প্রি-লোড |
| GET | `/api/catalog` | শ্রেণি → বিষয় → অধ্যায় (ETag, `indexed` ফ্ল্যাগ সহ) |
| GET/POST/PATCH/DELETE | `/api/threads[/{id}]` | চ্যাট থ্রেড |
| POST | `/api/threads/{id}/chat` | প্রশ্ন → NDJSON স্ট্রিম (status/delta/done/error) |
| POST | `/api/quiz/generate` | অধ্যায় থেকে ৫টি MCQ (answer key সার্ভারে সংরক্ষিত) |
| POST | `/api/quiz/submit` | স্কোর + ব্যাখ্যা, SQLite-এ সংরক্ষণ |
| GET | `/api/progress?student=&subject=` | অধ্যায়ভিত্তিক স্কোর, দুর্বল টপিক, সাম্প্রতিক কুইজ + বিষয়-ফিল্টার |
| GET | `/api/progress/summary?student=&subject=` | অভিভাবকের সারসংক্ষেপ (LLM, টাইমআউটে হিসাবভিত্তিক ফলব্যাক) |
| DELETE | `/api/progress/chapter?student=&subject=&chapter=` | এক অধ্যায়ের সংরক্ষিত ফল মুছে ফেলা (রিসেট) |
| DELETE | `/api/progress/all?student=` | সব অধ্যায়/বিষয়ের ফল মুছে ফেলা (রিসেট) |

### অগ্রগতি রিপোর্ট কীভাবে কাজ করে

- রিপোর্ট **শিক্ষার্থীর নাম ধরে** সংরক্ষিত — তাই সব চ্যাট থ্রেডে একই রিপোর্ট দেখায় (এটি ইচ্ছাকৃত:
  পড়া সব অধ্যায়ের মিলিত অগ্রগতি)। থ্রেড আলাদা করলে ফল আলাদা হয় না।
- `subjects` লিস্টে কেবল সেই বিষয়গুলো আসে যেগুলোর কুইজ দেওয়া হয়েছে; ওই চিপে ক্লিক করলে সব
  সংখ্যা (overall, অধ্যায়, দুর্বল টপিক, সাম্প্রতিক) সেই বিষয়ে সীমাবদ্ধ হয় — সারসংক্ষেপও।
- **রিসেট:** প্রতিটি অধ্যায়ের পাশে ↺ বাটন (এক অধ্যায়) এবং হেডারে “সব অগ্রগতি রিসেট” বাটন।
  দুটোই কনফার্ম করার পরে স্থায়ীভাবে ডেটা মোছে এবং সারসংক্ষেপ ক্যাশ বাতিল করে।

## পরীক্ষা

```bash
python scripts/api_smoke_test.py                     # in-process, English run
python scripts/api_smoke_test.py --lang bn           # same checks in Bangla
python scripts/api_smoke_test.py --base-url https://api.example.com
cd web && npm run typecheck && npm run build
```

## ডিপ্লয়

AWS + Vercel-এর পূর্ণ রানবুক: [`deploy/DEPLOY.md`](deploy/DEPLOY.md)

Docker ইমেজ বানানো/push সহজ করতে দুটি স্ক্রিপ্ট (Windows PowerShell 5.1):

```powershell
# ১) বিল্ড + Docker Hub-এ push
powershell -ExecutionPolicy Bypass -File scripts\docker-build.ps1 -Tag v2 -Push

# ২) লোকালে চালাও — ব্যস্ত/রিজার্ভড পোর্ট নিজেই এড়িয়ে ফ্রি পোর্ট বেছে নেয়
powershell -ExecutionPolicy Bypass -File scripts\docker-run.ps1 -Tag v2
```

ইমেজ: `tanvirsheikh/boibondhu-hackathon-backend` (public)। পোর্ট বদলাতে `HOST_PORT` env ভেরিয়েবল
কাজ করে — compose ফাইল দুটোই `${HOST_PORT:-8000}` ব্যবহার করে।

## নোট

- **e5-base কেন:** `index.faiss` ফাইলগুলো ৭৬৮-মাত্রার (e5-base দিয়ে তৈরি)। কোয়েরি এনকোডার
  বদলালে FAISS মাত্রা-অমিল ত্রুটি দেবে — ছোট মডেলে যেতে চাইলে পুরো কর্পাস আবার embed করতে হবে।
  গতি বাড়ানোর আসল উপায় এখানে ইমেজ/ক্যাশ: `model_cache` একসময় ১০.১ GB ছিল (একই ওজনের পাঁচটি
  কপি), এখন ফ্ল্যাট `e5-base/` ডিরেক্টরি ~১.১ GB এবং সরাসরি পাথ থেকে লোড হয়।
- কুইজের `answer` ক্লায়েন্টেও যায় (স্পেক অনুযায়ী), কিন্তু গ্রেডিং সবসময় সার্ভারের সংরক্ষিত
  কপি থেকে হয় — তাই টেম্পারিং করেও স্কোর বদলানো যায় না।
