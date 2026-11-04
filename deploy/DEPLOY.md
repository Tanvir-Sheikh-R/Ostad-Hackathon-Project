# ডিপ্লয় রানবুক — Backend on AWS EC2, Frontend on Vercel

```
GitHub ──▶ Vercel (https://boibondhu.vercel.app)
              │  /api/* rewrite (সার্ভার-সাইড)
              ▼
        http://13.48.12.56:8000  ──▶  FastAPI container (EC2, Docker Hub image)
```

**কেন proxy:** Vercel সাইট HTTPS-এ চলে, আর EC2-তে সার্টিফিকেট নেই। ব্রাউজার সরাসরি
`http://13.48.12.56:8000` কল করলে **mixed content** হিসেবে ব্লক করবে। তাই ব্রাউজার শুধু
নিজের অরিজিনে `/api/*` কল করে, আর Vercel-এর rewrite সার্ভার-সাইডে সেটি EC2-তে পাঠায়।
ফলে **TLS লাগে না, CORS-ও লাগে না**। (যাচাই করা হয়েছে: স্ট্রিমিং-ও এর মধ্য দিয়ে ঠিকঠাক আসে।)

---

## 0. যা লাগবে

| জিনিস | মান |
|---|---|
| EC2 instance | Ubuntu 24.04, **t3.medium** (2 vCPU / 4 GB) বা বেশি, ২০ GB gp3 |
| Elastic IP | **13.48.12.56** (instance-এ associate করা) |
| Security group | `22` আপনার IP · **`8000` → `0.0.0.0/0`** |
| Docker Hub | ইমেজ রাখার জন্য (`docker login`) |
| Vercel প্রজেক্ট | Root Directory = `web` |

> **৮০/৪৪৩ খোলার দরকার নেই** — এই সেটআপে Caddy ব্যবহৃত হচ্ছে না।
> **৮০০০ পাবলিক রাখা বাধ্যতামূলক**: Vercel-এর সার্ভার এখানেই কল করবে।

---

## 1. লোকালে ইমেজ বানিয়ে পরীক্ষা করুন

### Windows shortcut (প্রস্তাবিত)

```powershell
# বিল্ড + push একসাথে
powershell -ExecutionPolicy Bypass -File scripts\docker-build.ps1 -Tag v2 -Push

# লোকালে চালিয়ে দেখুন — ব্যস্ত পোর্ট নিজেই এড়িয়ে যায়
powershell -ExecutionPolicy Bypass -File scripts\docker-run.ps1 -Tag v2
```

`docker-run.ps1` যা করে: Windows/Hyper-V-এর reserved port range আর ব্যস্ত পোর্ট বাদ দিয়ে
একটি ফ্রি পোর্ট বেছে নেয় (৮০০০ ব্যস্ত হলে ৮০০১/৮১০০…), কন্টেইনার চালায়, healthcheck-এর জন্য
অপেক্ষা করে, তারপর URL ও `/api/health` ফলাফল দেখায়।

### হাতে (mac/linux বা কাস্টম কিছু লাগলে)

```bash
docker build -f deploy/Dockerfile.backend -t tanvirsheikh/boibondhu-hackathon-backend:v2 .

# ৮০০০ ব্যস্ত থাকলে অন্য পোর্ট দিন
docker run --rm -p 8001:8000 --env-file .env tanvirsheikh/boibondhu-hackathon-backend:v2
curl http://127.0.0.1:8001/api/health

docker push tanvirsheikh/boibondhu-hackathon-backend:v2
```

`status: ok` আর `indexed_books: 27` দেখলে ইমেজ ঠিক আছে।

> ইমেজ ~৪.৬ GB (আনপ্যাক করা), pull করতে ~১.২ GB (কম্প্রেসড)। মডেল ১.১ GB + embedding
> cache ২৬৬ MB। `model_cache/` git-এ নেই, তাই **EC2-তে বিল্ড করবেন না** — লোকালে বানিয়ে
> push করুন।

> **push সফল হয়েছে কিনা যাচাই করুন** — একবার manifest commitHub-এ ব্যর্থ হয়েও `docker push`
> digest দেখিয়েছিল। নিশ্চিত হওয়ার উপায়:
> ```bash
> docker manifest inspect tanvirsheikh/boibondhu-hackathon-backend:v2 > /dev/null && echo OK
> ```

---

## 2. EC2-তে

```bash
ssh ubuntu@13.48.12.56

# Docker (একবার)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER && newgrp docker

# শুধু deploy/ ফাইলগুলো দরকার
mkdir -p ~/boibondhu && cd ~/boibondhu
git clone https://github.com/<you>/Study-RAG.git repo
```

`~/boibondhu/.env` বানান (`.env.example` দেখে):

```ini
GROQ_API_KEY=gsk_...
DEEPSEEK_API_KEY=sk-...
LLM_PROVIDER_ORDER=groq,deepseek
FRONTEND_ORIGIN=https://boibondhu.vercel.app
```

চালু করুন (ইমেজ pull হবে, বিল্ড হবে না):

```bash
cd ~/boibondhu/repo/deploy
BACKEND_IMAGE=tanvirsheikh/boibondhu-hackathon-backend:v1 \
  docker compose -f docker-compose.aws.yml up -d

docker compose -f docker-compose.aws.yml ps      # backend (healthy) হওয়া পর্যন্ত অপেক্ষা করুন
curl http://localhost:8000/api/health
```

**EC2-তে ৮০০০ ব্যস্ত থাকলে** (`Bind for 0.0.0.0:8000 failed`):

```bash
HOST_PORT=8080 BACKEND_IMAGE=tanvirsheikh/boibondhu-hackathon-backend:v1 \
  docker compose -f docker-compose.aws.yml up -d
```
তখন security group-এ ৮০৮০ খুলুন এবং Vercel-এর `API_PROXY_TARGET` হবে `http://13.48.12.56:8080`।
(ডিফল্ট ৮০০০ রেখেই সব ডকুমেন্টেশন লেখা, তাই পোর্ট না বদলানোই ভালো।)

বাইরে থেকে (আপনার মেশিনে):

```bash
curl http://13.48.12.56:8000/api/health
```

প্রথম স্টার্টে এনকোডার লোড হতে ~৬০-৯০ সেকেন্ড লাগে; `start_period: 90s` তাই।
পুল করার আগে নিশ্চিত করুন ইমেজটা সত্যিই Hub-এ আছে: `docker manifest inspect <image>`।

---

## 3. Vercel-তে

1. **Add New → Project** → GitHub রিপো ইনপোর্ট করুন।
2. **Root Directory: `web`** (রিপো রুট নয়)।
3. **Environment Variables** (Production + Preview + Development):

   | Key | Value |
   |---|---|
   | `API_PROXY_TARGET` | `http://13.48.12.56:8000` |

   `NEXT_PUBLIC_API_BASE` **সেট করবেন না** — খালি থাকলেই অ্যাপ proxy mode-এ চলে।

4. **Deploy** → https://boibondhu.vercel.app

`API_PROXY_TARGET` বিল্ডের সময় `next.config.ts`-এ বসে যায়, তাই বদলালে **Redeploy** লাগবে।

---

## 4. যাচাই

```bash
# Vercel ডোমেইন হয়ে API (এটাই ব্রাউজারের পথ)
curl -s https://boibondhu.vercel.app/api/health | head -c 200
curl -sI https://boibondhu.vercel.app/api/catalog | head -3      # 200 + etag
```

তারপর সাইটে: অধ্যায় বেছে নিন → চ্যাটে প্রশ্ন → কুইজ → প্রোগ্রেস। মোবাইলেও একবার দেখুন।

---

## 5. আপডেট

```bash
# ব্যাকএন্ড কোড বদলালে
docker build -f deploy/Dockerfile.backend -t tanvirsheikh/boibondhu-hackathon-backend:v2 .
docker push tanvirsheikh/boibondhu-hackathon-backend:v2
# EC2-তে
BACKEND_IMAGE=tanvirsheikh/boibondhu-hackathon-backend:v2 docker compose -f docker-compose.aws.yml up -d

# ফ্রন্টএন্ড: git push → Vercel নিজেই বিল্ড করে
```

---

## 6. সমস্যা হলে

| লক্ষণ | কারণ / সমাধান |
|---|---|
| `curl http://13.48.12.56:8000/api/health` টাইমআউট | security group-এ TCP **8000** খোলা নেই |
| সাইটে “Could not reach the server — (same origin — proxied /api)” | `API_PROXY_TARGET` ভুল বা সেট করা হয়নি → ঠিক করে **Redeploy** |
| `http://13.48.12.56:8000/api/health` কাজ করে কিন্তু Vercel URL-এ `404` | rewrite বিল্ডে নেই: `API_PROXY_TARGET` সেট করে আবার deploy করুন |
| কুইজ তৈরি খুব ধীর বা `504` | Vercel-এর proxy timeout; LLM ধীর হলে হয়। আবার চেষ্টা করুন — বা §৭-এর TLS পথে গেলে এই সীমা থাকে না |
| `health` = `degraded`, “No LLM API key” | `.env`-এ কী নেই → `up -d` আবার চালান |
| `409` “সূচি নেই” | ওই অধ্যায়ের embedding তৈরি হয়নি (ক্যাটালগে `indexed: false`) |
| `ModelUnavailable ... 768-d` | ভুল `EMBEDDING_MODEL_DIR`; e5-base-ই থাকতে হবে |
| OOM / container restart | `t3.medium`+ নিন, `WEB_CONCURRENCY=1` রাখুন (মডেল ~১.১ GB/প্রসেস) |

লগ দেখুন:

```bash
docker compose -f docker-compose.aws.yml logs -f backend
```

---

## 7. (ঐচ্ছিক) নিজের ডোমেইন + আসল HTTPS

Vercel proxy বাদ দিয়ে সরাসরি HTTPS চাইলে — DuckDNS বা নিজের ডোমেইনের A রেকর্ড
`13.48.12.56`-এ দিন, তারপর:

```bash
# .env
API_DOMAIN=boibondhu.duckdns.org
ACME_EMAIL=you@example.com

cd deploy
docker compose -f docker-compose.aws.yml --profile tls up -d     # Caddy + Let's Encrypt
```

Vercel-এ তখন `API_PROXY_TARGET` মুছে দিয়ে `NEXT_PUBLIC_API_BASE=https://boibondhu.duckdns.org`
সেট করুন এবং Redeploy করুন। proxy বন্ধ হয়ে যাবে, ব্রাউজার সরাসরি API কল করবে
(তখন CORS `CORS_ORIGINS` থেকে নিয়ন্ত্রিত হয়)। এই পথে proxy timeout নেই।

---

## 8. নিরাপত্তা ও ব্যাকআপ

- পোর্ট ৮০০০ পাবলিক, তাই IP জানা যে কেউ API কল করতে পারে (কোনো auth নেই)। হ্যাকাথন
  ডেমোর জন্য ঠিক আছে; আসল শিক্ষার্থীর ডেটার আগে Caddy + basic auth বা API key যোগ করুন।
- `backend_data` ভলিউমে `study.db` (কুইজ ফল) ও থ্রেড JSON থাকে — `up -d` করলেও মুছবে না।

```bash
docker run --rm -v boibondhu_backend_data:/data -v "$PWD":/out alpine \
  tar czf /out/backend-data.tgz -C /data .
```
