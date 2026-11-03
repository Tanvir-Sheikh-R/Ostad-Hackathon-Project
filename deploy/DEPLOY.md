# ডিপ্লয় রানবুক — Backend on AWS, Frontend on Vercel

```
GitHub repo ──▶ Vercel (web/, HTTPS)
                     │  NEXT_PUBLIC_API_BASE
                     ▼
              Caddy (TLS, Let's Encrypt) ──▶ FastAPI container (EC2, port 8000)
```

---

## 0. যা যা লাগবে

| জিনিস | কেন |
|---|---|
| Docker Desktop (লোকাল) | ইমেজ বানিয়ে push করবেন |
| Docker Hub বা ECR অ্যাকাউন্ট | EC2 শুধু ইমেজ pull করবে |
| AWS EC2 instance | বড় পছন্দ: **t3.medium** (2 vCPU / 4 GB) বা তার বেশি। e5-base CPU-তে ~1.1 GB RAM নেয় |
| Elastic IP | IP বদলালে CORS/ডোমেইন ভাঙে |
| একটি DNS নাম | Caddy এটির জন্য ফ্রি TLS সার্টিফিকেট নেবে (DuckDNS ফ্রি) |
| Vercel অ্যাকাউন্ট | `web/` ফোল্ডার হোস্ট করবে |

> **ইমেজ সাইজ:** মডেল + embedding cache মিলিয়ে ইমেজ প্রায় **1.5 GB**। পুরোনো বিল্ডে
> `model_cache` ১০.১ GB ছিল; এখন `model_cache/e5-base/` ফ্ল্যাট ডিরেক্টরি (~1.1 GB) ব্যবহার হয়,
> তাই pull অনেক দ্রুত।

---

## 1. `.env` ঠিক করুন

EC2-তে `/opt/patsomadhan/.env` ফাইল বানান (`.env.example` কপি করে):

```ini
GROQ_API_KEY=gsk_...                    # অথবা DEEPSEEK_API_KEY
LLM_PROVIDER_ORDER=groq,deepseek

# Vercel ডিপ্লয়ের পরে এই দুটো ভরুন:
CORS_ORIGINS=https://your-app.vercel.app
FRONTEND_ORIGIN=https://your-app.vercel.app

# Caddy এই ডোমেইনের TLS সার্টিফিকেট নেবে (A রেকর্ড → Elastic IP)
API_DOMAIN=api.example.com
ACME_EMAIL=you@example.com
```

---

## 2. ইমেজ বানিয়ে push করুন (লোকাল মেশিনে)

`model_cache/` ও `embedding_cache/` git-এ থাকে না — তাই ইমেজ **লোকালি** বানিয়ে push করা সবচেয়ে
সহজ পথ:

```bash
docker build -f deploy/Dockerfile.backend -t <dockerhub-user>/patsomadhan-backend:v2 .

# বিল্ড শেষে দ্রুত পরীক্ষা
docker run --rm -p 8000:8000 --env-file .env <dockerhub-user>/patsomadhan-backend:v2
curl http://127.0.0.1:8000/api/health

docker push <dockerhub-user>/patsomadhan-backend:v2
```

ECR ব্যবহার করলে:

```bash
aws ecr get-login-password --region ap-south-1 \
  | docker login --username AWS --password-stdin <acct>.dkr.ecr.ap-south-1.amazonaws.com
docker tag <dockerhub-user>/patsomadhan-backend:v2 <acct>.dkr.ecr.ap-south-1.amazonaws.com/patsomadhan-backend:v2
docker push <acct>.dkr.ecr.ap-south-1.amazonaws.com/patsomadhan-backend:v2
```

---

## 3. EC2 সেটআপ

1. **Instance:** Ubuntu 24.04, `t3.medium`, স্টোরেজ ২০ GB gp3।
2. **Security group (inbound):**
   - `22` — আপনার IP
   - `80` — `0.0.0.0/0` (ACME challenge + HTTP→HTTPS redirect)
   - `443` — `0.0.0.0/0`
   - **৮০০০ পাবলিক করবেন না** — Caddy ভেতরে `backend:8000`-এ পাঠাবে।
3. **Elastic IP** associate করুন, তারপর DNS `A` রেকর্ড ওই IP-তে দিন (`api.example.com`)।
4. Docker ইনস্টল:

```bash
ssh ubuntu@<elastic-ip>
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker
```

---

## 4. হোস্টে স্ট্যাক চালু করুন

```bash
sudo mkdir -p /opt/patsomadhan && cd /opt/patsomadhan

# শুধু ডিপ্লয় ফাইলগুলো দরকার (পুরো রিপো ক্লোন করলেও চলবে)
git clone https://github.com/<you>/Study-RAG.git repo
cd repo/deploy

cp ../../.env.example ../.env   # অথবা scp দিয়ে সঠিক .env দিন
# BACKEND_IMAGE দিয়ে ইমেজ নাম দিন (কম্পোজ আর বিল্ড করবে না)
BACKEND_IMAGE=<dockerhub-user>/patsomadhan-backend:v2 \
  docker compose -f docker-compose.aws.yml up -d
```

যাচাই:

```bash
docker compose -f docker-compose.aws.yml ps          # backend healthy?
curl https://api.example.com/api/health              # status: ok
curl -sI https://api.example.com/api/catalog | head  # HTTP/2 200, etag, cache-control
docker compose -f docker-compose.aws.yml logs -f backend
```

> কম্পোজের `backend_data` ভলিউমেই SQLite (`study.db`) ও চ্যাট থ্রেড থাকে — `up -d` আবার
> চালালেও ডেটা হারায় না। মডেল লোড হওয়ার সময় প্রথম `health` সবুজ হতে ~৬০-৯০ সেকেন্ড লাগতে পারে।

---

## 5. Vercel-এ ফ্রন্টএন্ড

1. **Add New → Project →** GitHub রিপো ইনপোর্ট করুন।
2. **Root Directory:** `web` (অত্যন্ত জরুরি — রিপো রুট নয়)।
3. Framework: Next.js (স্বয়ংক্রিয় শনাক্ত হবে)। Build: `npm run build`।
4. **Environment Variables** (Production + Preview + Development):

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_BASE` | `https://api.example.com` (শেষে `/` নয়) |

5. **Deploy**। তারপর URL পাবেন — যেমন `https://study-rag.vercel.app`।

`NEXT_PUBLIC_*` বিল্ডের সময় বান্ডলে বসে যায়, তাই env বদলালে **Redeploy** করতে হবে।

---

## 6. CORS মিলিয়ে নিন

Vercel URL পাওয়ার পরে EC2-র `.env`-এ সেটি বসিয়ে রিস্টার্ট:

```ini
CORS_ORIGINS=https://study-rag.vercel.app
FRONTEND_ORIGIN=https://study-rag.vercel.app
```

```bash
cd /opt/patsomadhan/repo/deploy
docker compose -f docker-compose.aws.yml up -d
```

প্রিভিউ ডিপ্লয় (`*.vercel.app`) ইতিমধ্যেই `CORS_ORIGIN_REGEX` দিয়ে অনুমোদিত। প্রত্যাখ্যাত
অরিজিন হলে ব্যাকএন্ড লগে নাম ধরে লেখা থাকে:
`CORS preflight rejected: Origin='...' is not allowed by ...`

---

## 7. ব্যানার ছবি

`web/public/banner.png` রাখুন (প্রস্তাবিত ১৬০০×২৮০, ~১৫০ KB)। ফাইল না থাকলে অ্যাপ গ্রেডিয়েন্ট
ব্যানার দেখায় — বিল্ড ফেল করে না। আগে থেকে ডিপ্লয় করা থাকলে ছবি যোগ করার পরে commit করলেই
Vercel নতুন করে বিল্ড করবে।

---

## 8. আপডেট প্রসেস

```bash
# কোড বদলালে (ব্যাকএন্ড)
docker build -f deploy/Dockerfile.backend -t <user>/patsomadhan-backend:v3 .
docker push <user>/patsomadhan-backend:v3
# EC2-তে
BACKEND_IMAGE=<user>/patsomadhan-backend:v3 docker compose -f docker-compose.aws.yml up -d
```

```bash
# ফ্রন্টএন্ড: শুধু git push → Vercel নিজেই বিল্ড করে
```

---

## 9. সমস্যা হলে

| লক্ষণ | কারণ / সমাধান |
|---|---|
| UI: “NEXT_PUBLIC_API_BASE সেট করা নেই” | Vercel env var নেই বা Redeploy করা হয়নি |
| ব্রাউজারে “Failed to fetch”, লগে 400 preflight | `CORS_ORIGINS`-এ Vercel origin নেই |
| `health` = `degraded`, detail-এ “No LLM API key” | `.env`-এ `GROQ_API_KEY`/`DEEPSEEK_API_KEY` নেই |
| `503` কুইজে: “LLM সেবা এখন সাড়া দিচ্ছে না” | দুটো প্রোভাইডারই ব্যর্থ — কী/কোটা দেখুন |
| `409` “সূচি নেই” | ওই অধ্যায়ের embedding তৈরি হয়নি (ক্যাটালগে `indexed: false`) |
| `ModelUnavailable: ... 768-d` | `EMBEDDING_MODEL_DIR` ভুল মডেল দেখাচ্ছে — e5-base রাখতে হবে |
| মেমরি শেষ (OOM) | `t3.medium`+ নিন; `WEB_CONCURRENCY=1` রাখুন (মডেল প্রতি প্রসেসে ~1.1 GB) |
| সার্টিফিকেট আসছে না | DNS → Elastic IP মিলছে কি? ৮০ পোর্ট খোলা কি? |

কী দেখতে হবে:

```bash
docker compose -f docker-compose.aws.yml logs -f caddy    # ACME / TLS
docker compose -f docker-compose.aws.yml logs -f backend  # CORS, LLM, retrieval
python scripts/api_smoke_test.py --base-url https://api.example.com
```
