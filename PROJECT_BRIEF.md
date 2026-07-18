# Project Brief — Addressing the Vocabulary and Foundational Literacy Crisis in the Philippines

## Executive Summary

The Philippines is facing one of the most severe foundational literacy crises in Southeast Asia. National and international assessments consistently show that most Filipino learners are unable to read and understand age-appropriate texts, with vocabulary deficiency serving as one of the primary underlying causes. While several applications exist for phonics, sight words, or language learning, none currently provide an adaptive, curriculum-aligned, multilingual platform that diagnoses vocabulary, reading comprehension, and speaking deficiencies while giving teachers actionable learning analytics. This project proposes an AI-assisted literacy platform that augments teachers by providing personalized interventions, adaptive assessments, and institution-wide performance dashboards.

## 1. National / Regional Problem

### A national literacy crisis

Reading proficiency in the Philippines has remained consistently among the lowest internationally.

**Learning Poverty.** The World Bank estimates that 91% of Filipino children suffer from learning poverty, meaning they cannot read and understand a simple age-appropriate passage by the end of primary school. This is significantly higher than both the East Asia & Pacific average and the average among lower-middle-income countries. (World Bank, 2024)

**PISA 2022.** Among 81 participating education systems:

- Philippines reading score: 347
- OECD average: 476

Only 24% of Filipino students achieved the minimum reading proficiency level (Level 2), implying that roughly three out of every four students struggle with basic reading comprehension. (OECD, PISA 2022)

**SEA-PLM.** The Southeast Asia Primary Learning Metrics assessment reported that only 10% of Grade 5 learners met the expected reading standard; approximately 27% remained at a level where they could mainly recognize isolated words rather than comprehend connected texts. (UNICEF SEA-PLM National Report)

### Why vocabulary matters

Vocabulary is one of the strongest predictors of reading comprehension. Students may successfully pronounce words yet fail to understand:

- textbooks
- examination questions
- classroom instructions
- scientific terminology
- mathematical language
- inferential questions

Vocabulary deficiencies therefore affect every academic subject, not just English or Filipino. Research consistently demonstrates strong relationships between vocabulary knowledge and reading comprehension, with meta-analyses reporting correlations of approximately 0.56–0.57 between vocabulary and comprehension performance.

### Why the problem persists

Several structural factors contribute to the crisis:

- limited exposure to books and meaningful reading
- multilingual transition between home language, Filipino, and English
- insufficient personalized intervention
- teacher workload preventing one-on-one remediation
- vocabulary often taught through memorization rather than contextual understanding
- lack of continuous diagnostics identifying each learner's specific weaknesses

Rather than lacking intelligence, many learners lack sufficient language knowledge to access the curriculum.

## 2. Review of Related Literature (RRL)

### Vocabulary as a predictor of literacy

Research consistently identifies vocabulary as a core component of language comprehension. Vocabulary supports learners by enabling them to interpret meaning, infer information, activate prior knowledge, understand academic terminology, and build deeper conceptual understanding. Without sufficient vocabulary, decoding skills alone are insufficient for comprehension.

### Adaptive vocabulary instruction

Current educational research recommends repeated exposure, contextual learning, morphology, spaced repetition, retrieval practice, adaptive difficulty, and reading within authentic contexts rather than memorization of isolated word lists. Meta-analyses show that integrated vocabulary instruction produces measurable improvements in both vocabulary acquisition and reading comprehension.

### AI in literacy

Recent advances in AI have enabled speech recognition, pronunciation assessment, adaptive questioning, personalized study plans, automated reading assessment, and teacher learning analytics. These technologies have begun appearing internationally but remain largely absent within Philippine multilingual educational settings.

## 3. Existing Competitors and Remaining Gaps

| Solution | Strengths | Remaining Gap |
|---|---|---|
| Marungko Apps | Beginning phonics and decoding | Limited adaptive assessment and analytics |
| Alpabasa | Foundational Filipino reading | Primarily instructional rather than diagnostic |
| WikaWonders | Filipino vocabulary and stories | Limited curriculum alignment and institutional deployment |
| Tobo Filipino Vocabulary | Vocabulary flashcards | Not designed for school intervention |
| Amira Learning | AI reading tutor with speech assessment | Supports mainly English/Spanish; lacks Philippine multilingual adaptation |
| DepEd ARAL Resources | Large repository of learning materials | Static resources without personalization or adaptive analytics |

### Gap in the Philippine market

No existing platform currently combines adaptive diagnostics, vocabulary assessment, reading comprehension assessment, pronunciation evaluation, personalized study planning, teacher dashboards, curriculum alignment, multilingual Philippine language support, and institution-wide analytics into a single ecosystem.

## 4. Proposed Technology Stack

The architecture separates three concerns: (a) **content generation** (AI-assisted, teacher-approved), (b) **psychometric measurement** (deterministic, auditable), and (c) **analytics** (aggregated, institution-facing). This separation is deliberate: schools and DepEd stakeholders can trust ability estimates produced by a standard measurement model over a calibrated item bank, while AI accelerates content creation and personalization behind a teacher-review gate.

### 4.1 Frontend

- **Web app:** Next.js (React, TypeScript) with Tailwind CSS — student, teacher, and admin portals from one codebase.
- **Progressive Web App (PWA)** with offline-first caching (service workers, IndexedDB): many Philippine public schools have intermittent connectivity; assessments must run offline and sync results when a connection returns.
- **Mobile-first, low-bandwidth design:** target low-end Android devices (the dominant device class in PH schools); aggressive asset compression, no heavy media on the student path.
- Audio capture via the MediaRecorder API for speaking assessments.

### 4.2 Backend

- **Python + FastAPI** — a single language across API, AI pipeline, and psychometrics (Python owns the IRT/NLP ecosystem).
- **Multi-tenant architecture** keyed by institution: every record is scoped to a school; dashboards aggregate by section, grade, school, and district.
- Async job queue (Celery or ARQ + Redis) for speech scoring, item generation, and analytics rollups so the student experience never blocks on AI calls.

### 4.3 Adaptive Assessment Engine (the core differentiator)

The onboarding and ongoing assessments use **Computerized Adaptive Testing (CAT) on Item Response Theory (IRT)** — the same family of methods behind established adaptive assessments:

- **Item bank:** every question (vocabulary-in-context, comprehension, listening) is an item with calibrated difficulty and discrimination parameters, tagged to curriculum competency (DepEd MELCs), language, and grade band.
- **Ability estimation:** a 2-parameter logistic (2PL) IRT model estimates each learner's ability (θ) per domain (vocabulary / comprehension / speaking) with a standard error — so the platform reports not just a level but the confidence in that level.
- **Item selection:** maximum-information selection — each next question is the one that most reduces uncertainty about the learner's true ability. This is what makes onboarding measure *true* capability rather than grade-level assumptions: the institution-provided grade level only sets the *prior* (the starting difficulty), and the learner's actual responses move the estimate up or down from there.
- **Cold start / calibration:** initial item parameters are seeded from graded word lists and readability measures, then re-calibrated from real response data as usage grows.
- **Libraries:** `catsim` / `py-irt` (or a small custom 2PL implementation — the math is compact and worth owning).

### 4.4 AI Models and LLM Integration

- **LLM (GPT-4-class or better) for content generation, not for scoring ability:**
  - generating contextual vocabulary items, passages, and plausible distractors per language and grade band;
  - generating personalized study plans and study guides from a learner's diagnostic profile;
  - producing teacher-facing summaries ("this section is weak in inferential comprehension in Filipino").
- **RAG over the DepEd curriculum:** MELCs and the school's own curriculum documents are embedded and retrieved so all generated content cites the competency it targets — this is what "curriculum-aligned" means operationally.
- **Teacher review gate:** all generated items and study materials enter a review queue; nothing reaches students unapproved. Approved items then enter the calibrated item bank.
- **Guardrails:** structured outputs (JSON schema), content filters tuned for child-appropriate material, and caching of generated items (generation is a batch/offline process, so LLM cost and latency stay off the student path).

### 4.5 Speech Recognition and Pronunciation Assessment

- **ASR:** Whisper (large-v3 or successor) — the strongest openly available option with Tagalog support — for transcribing oral reading and speaking responses.
- **Oral reading fluency:** forced alignment of the child's audio against the target passage (wav2vec2-based alignment or Montreal Forced Aligner) yields words-correct-per-minute, insertions/omissions, and hesitation patterns.
- **Pronunciation scoring:** goodness-of-pronunciation (GOP) scoring from alignment posteriors, reported per-phoneme so feedback is specific ("difficulty with /f/ vs /p/") rather than a bare score.
- **Known risk (stated honestly):** off-the-shelf pronunciation assessment (e.g., Azure) does not cover Filipino languages, and ASR accuracy for Cebuano, Ilocano, and other regional languages is materially weaker than for Tagalog/English. Mitigation: launch speaking assessment in English + Filipino; collect (consented) audio to fine-tune wav2vec2/Whisper for regional languages as a later phase. Child speech also degrades ASR accuracy — thresholds must be validated against teacher judgments before high-stakes use.

### 4.6 Databases

- **PostgreSQL** (via Supabase or RDS) as the system of record: institutions, users, item bank, responses, ability estimates.
- **pgvector** extension for curriculum/content embeddings (RAG) — no separate vector DB needed at this scale.
- **Append-only response/event log** (every answer, timing, audio score) as the raw substrate for both IRT recalibration and analytics; start in Postgres, move to a columnar store (ClickHouse) only when volume demands it.
- **Object storage** (S3-compatible) for audio recordings, with strict retention and consent policies (see 4.9).

### 4.7 Cloud Infrastructure

- **Region:** Singapore (`ap-southeast-1`) for lowest latency to the Philippines.
- **Hosting:** Vercel (frontend) + containerized FastAPI on AWS/GCP (or Fly.io/Railway for the pilot); GPU inference for Whisper via a serverless GPU provider (Modal/RunPod) or managed API — speech scoring is async, so batch-friendly.
- **Offline tolerance as a first-class requirement:** the PWA queues assessment responses locally and syncs opportunistically; the IRT engine is deterministic, so a downloaded item block can run a full adaptive session offline.

### 4.8 Analytics Pipeline

- Nightly rollups from the event log into per-student, per-section, per-school aggregates: ability estimates over time, competency-level mastery, intervention flags.
- **Intervention flagging:** rules on the IRT outputs (e.g., θ more than one standard deviation below grade-band benchmark, or stagnant across N sessions) surface students needing help — explainable rules, not black-box scores, so teachers can trust and act on them.
- **Benchmarking:** ability scale anchored to national reference points (DepEd literacy levels; SEA-PLM bands where mappable) so "benchmark comparison" is a defined mapping, not a vibe.
- Dashboards: start with an embedded BI layer (Metabase) for admin views; purpose-built React dashboards for the teacher daily-use views.

### 4.9 Security, Privacy, and Authentication

- **Auth:** institution-scoped SSO/rostering; teachers and admins via email+MFA; students via school-issued credentials or class codes (young learners can't manage passwords). Role-based access control: student / teacher / school admin / platform admin.
- **Minors' data:** the platform processes children's data, including voice recordings — this is the highest-sensitivity category. Parental/guardian consent flows through the institution; audio retained only as long as needed for scoring and (opt-in) model improvement; deletion on request.
- **Compliance:** Philippine Data Privacy Act of 2012 (RA 10173) — registration with the National Privacy Commission, data sharing agreements with partner schools, breach notification procedures.
- Encryption in transit and at rest; per-tenant data isolation; audit logs on all teacher/admin access to student records.

## 5. Proposed Features

The proposed system is designed as an institution-wide AI literacy platform that supports students, teachers, and school administrators throughout the learning lifecycle.

### Student Journey

Students are onboarded through their partnered institution and complete an initial standardized assessment that measures vocabulary, reading comprehension, and speaking ability. Their performance is benchmarked against national standards to determine proficiency levels and identify learning gaps.

The onboarding assessment is **adaptive**: the institution's information (grade level, language background) sets only the starting point, and the assessment converges on the learner's *true* ability from how they actually answer — a struggling Grade 6 student is routed down to the material they need, and an advanced one is routed up, within a single short session.

The platform provides:

- Initial adaptive literacy assessment
- Vocabulary assessment through contextual questions
- Reading comprehension exercises
- AI-assisted pronunciation and speaking evaluation
- Personalized study plans aligned with the school's curriculum
- Adaptive difficulty based on learner performance

### Teacher & Administrator Features

Teachers and administrators receive comprehensive analytics that consolidate learner performance across vocabulary, reading comprehension, and speaking. These insights support data-driven curriculum refinement and enable timely interventions for students requiring additional support. AI-generated study materials remain subject to teacher review before deployment.

Core capabilities include:

- Institution-wide learning dashboards
- Student performance analytics
- Benchmark comparisons
- Curriculum adjustment recommendations
- Identification of learners requiring intervention
- AI-assisted study guide generation with teacher approval
- Performance tracking across literacy domains

## Value Proposition

Unlike existing literacy applications that focus on isolated skills such as phonics, flashcards, or reading exercises, this platform functions as an AI-assisted educational intelligence system. It continuously diagnoses learner proficiency, generates personalized interventions aligned with the curriculum, evaluates vocabulary, reading, and speaking performance, and equips teachers with actionable analytics to improve instruction at both the classroom and institutional levels. This positions the system not as a replacement for teachers, but as an intelligent augmentation tool for addressing the Philippines' foundational literacy crisis.
