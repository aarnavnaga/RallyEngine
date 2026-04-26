// Logan Mann's actual Mercor resume data, transcribed verbatim from work.mercor.com
// (with permission - Logan is the demoer). Used by /profile to render the real
// Mercor Resume tab 1:1.

export const LOGAN_PROFILE = {
  full_name: "Logan Mann",
  email: "loganmann@ucsb.edu",
  phone: "+1 (408) 595-9751",
  linkedin: "https://linkedin.com/in/logansmann",
  resume_filename: "Mann_Logan_resume.pdf",
  resume_uploaded: "04/25/26",
  summary:
    "Computer Engineering undergraduate and AI Researcher with strong proficiency in Python, PyTorch, and mechanistic interpretability.",
  education: [
    {
      degree: "Bachelor of Science",
      school: "University of California, Santa Barbara",
      start_year: 2023,
      end_year: 2027,
      major: "Computer Engineering",
      gpa: 3.78,
    },
  ],
  work_experience: [
    {
      role: "Undergraduate Researcher",
      company: "UCSB NLP Group (PocketFM Contract)",
      start_year: 2025,
      end_year: "Present",
      city: "Santa Barbara",
      country: "CA",
      description:
        "Lead author and presenter for NeurIPS 2025 and ICLR 2026 workshop papers and CogSci 2026 main on empirical VLM interpretability and reliability analysis. Built deterministic evaluation harnesses in Python (NumPy/pandas/pytest) across 50+ ablation cells and accelerated critical scoring paths via C++ + OpenMP + pybind11; reduced runtime 35% with up to 6.2× kernel speedups. Developed layer/head-level interpretability instrumentation with PyTorch forward hooks, activation caching, and token-level attribution traces; reduced manual failure triage time by 55% across error-analysis sweeps. Operationalized reproducible research with GitHub Actions, DVC, and Git-LFS (dataset/checkpoint versioning + regression tests), reducing invalid runs by 60%.",
    },
    {
      role: "Software Engineer Intern",
      company: "SnapFi",
      start_year: 2025,
      end_year: 2025,
      city: "San Jose",
      country: "CA",
      description:
        "Implemented latency-sensitive FastAPI services with Pydantic schemas, OpenAPI contract checks, and 35+ pytest integration tests for edge/failure-path coverage. Built asynchronous worker flows (Celery + Redis queues) for heavy enrichment/fraud checks with idempotency keys, retry/backoff policies, and dead-letter handling to stabilize background processing. Optimized Redis + PostgreSQL (indexing, join pruning, EXPLAIN tuning) and added OpenTelemetry/Prometheus/Grafana SLO instrumentation; reduced p95 latency 45% (920ms → 510ms) and improved incident detection 40%.",
    },
    {
      role: "Network Engineer Intern",
      company: "MacWeb",
      start_year: 2024,
      end_year: 2024,
      city: "Santa Clara",
      country: "CA",
      description:
        "Built Cisco Catalyst telemetry ingestion using OpenConfig (YANG) and gNMI; normalized CPU/memory/interface/queue metrics into Prometheus time-series pipelines. Implemented gNMI subscription backpressure and Prometheus cardinality controls (relabeling + recording rules), reducing storage growth by 38% while preserving alert fidelity. Correlated IOS-XE counters with Linux NIC telemetry and prototyped an MCP-backed ops assistant for anomaly triage, reducing mean-time-to-detection by 40%.",
    },
  ],
  projects: [
    {
      name: "RateMyGaucho",
      start_year: 2023,
      end_year: "Present",
      description:
        "Built a course selection Chrome extension used by 1,500+ UCSB students monthly; engineered PostgreSQL + Elasticsearch + Redis + Kafka ETL/search over 10k+ records with hybrid ranking (BM25 + structured heuristics + cached facets). Reduced median latency by 72% (650ms → 180ms) via Redis read-through caching, index/query tuning, and async refresh pipelines; sustained 99.9% API uptime.",
    },
    {
      name: "XPU-Fabric Simulator",
      description:
        "Developed a scalable CLOS/ECMP simulator with adaptive load-balancing, synthetic traffic generators (incast/all-to-all/elephant), and automated p50/p95/p99 throughput/drop analysis to identify bottlenecks and recommend routing-policy changes.",
    },
    {
      name: "CrowdCharge",
      start_year: 2022,
      end_year: "Present",
      description:
        "Built distributed Java/Spring electric car charger rental platform with WebSocket coordination, SQL persistence, validation + Bucket4j limits, and transactional reservation state machines (optimistic locking + heartbeats); scaled deployments from 50 to 500 chargers and sustained 2k+ req/min at <0.5% error.",
    },
  ],
  publications: [
    {
      title:
        "Visuals Lie, Consistency Speaks: Disentangling Spatial Attention from Reliability in Vision-Language Models",
      venue: "International Conference on Learning Representations 2026 (ICLR 2026)",
      date: "24 April 2026",
      link: "https://openreview.net/pdf?id=RX1WIsDl5d",
      authors: ["Logan Mann", "Ajit Saravanan", "Ishan Davé", "Saadullah Ismail", "Shikhar Shiromani", "Kevin Zhu"],
    },
    {
      title:
        "Don't Think of the White Bear: Ironic Negation in Transformer Models under Cognitive Load",
      venue: "39th Conference on Neural Information Processing Systems (NeurIPS 2025)",
      date: "20 September 2025",
      link: "https://arxiv.org/abs/2511.12381",
      authors: ["Logan Mann", "Chenhao Sun", "Savar Toteja", "Sarah Tandon", "Nayan Saxena", "Kevin Zhu"],
    },
    {
      title:
        "Dynamic Gradient Scaling: A Fine-Grained Approach to Optimizing Large Language Models in Deep Learning",
      venue:
        "International Journal for Research in Applied Science and Engineering Technology (IJRASET)",
      date: "31 May 2024",
      link: "https://www.ijraset.com/best-journal/dynamic-gradient-scaling-a-fine-grained-approach-to-optimizing-large-language-models-in-deep-learning",
      authors: ["Logan Mann"],
    },
  ],
  certifications: [
    "Cisco Certified Network Associate (CCNA)",
    "Akuna Capital Options 201",
    "Snowflake Data Warehousing",
    "Akuna Capital Options 101",
  ],
  awards: ["Dean's Honors", "Palantir Winter Tech Fellow"],
  profiles: {
    github: "itsloganmann",
    leetcode: "loganrolls123",
  },
  links: {
    portfolio: "https://x.com/loganmann0324",
  },
  skills: [
    "SQL", "Python", "C++", "Java", "Linux", "Bash", "Shell", "C", "CUDA",
    "PyTorch", "Ablations", "Robustness testing", "Reproducibility workflows",
    "Distributed Systems", "OpenMP", "pybind11", "OpenConfig", "YANG", "gNMI",
    "BGP", "CLOS", "ECN", "DCQCN", "Deterministic replay", "FastAPI",
    "Spring Boot", "REST", "OpenAPI", "Pydantic", "WebSockets", "PostgreSQL",
    "Redis", "Elasticsearch", "Kafka", "pytest", "DVC", "Git-LFS",
    "OpenTelemetry", "Prometheus", "Grafana",
  ],
  languages: ["English", "Hindi", "Spanish"],
  location: {
    country: "United States",
    state: "California",
    city: "San Jose",
    postal: "95135",
    last_verified: "03/01/2026",
  },
  date_of_birth: "03/24/2007",
  availability: {
    start: "Immediately",
    hours_per_week: 80,
    timezone: "(UTC-08:00) Pacific Standard Time (US & Canada)",
    last_updated: "04/25/26",
    weekly: [
      { day: "S", from: "12:00am", to: "11:45pm" },
      { day: "M", from: "12:00am", to: "11:45pm" },
      { day: "T", from: "12:00am", to: "11:45pm" },
      { day: "W", from: "12:00am", to: "11:45pm" },
      { day: "T", from: "12:00am", to: "11:45pm" },
      { day: "F", from: "12:00am", to: "11:45pm" },
      { day: "S", from: "12:00am", to: "11:45pm" },
    ],
  },
  // The DOMAIN_INTERESTS list is the exact Mercor set from work.mercor.com,
  // PLUS Mercor's "Creators & Influencers" addition. The selected set is what
  // Logan would pick - STEM + Creators.
  domain_interests_all: [
    { id: "software-engineering", label: "Software engineering", icon: "code" },
    { id: "other-engineering", label: "Other engineering", icon: "wrench" },
    { id: "medicine", label: "Medicine", icon: "heart" },
    { id: "law", label: "Law", icon: "scale" },
    { id: "data-analysis", label: "Data analysis", icon: "chart" },
    { id: "finance", label: "Finance", icon: "dollar" },
    { id: "business-ops", label: "Business operations", icon: "briefcase" },
    { id: "life-physical-social", label: "Life, Physical, and Social Science", icon: "atom" },
    { id: "arts-design", label: "Arts & Design", icon: "palette" },
    { id: "language-audio", label: "Language and Audio", icon: "mic" },
    { id: "humanities", label: "Humanities", icon: "book" },
    { id: "miscellaneous", label: "Miscellaneous", icon: "ellipsis" },
    // ↓ Mercor's new domain row - visually highlighted in the demo
    { id: "creators-influencers", label: "Creators & Influencers", icon: "sparkles", new: true },
  ],
  domain_interests_selected: ["software-engineering", "data-analysis", "creators-influencers"],
  // Mercor notifications dropdown content - verbatim from screenshot
  notifications: [
    { id: "n1", when: "4 days ago", title: "CUA Envs contract paused" },
    { id: "n2", when: "a month ago", title: "Next steps for SWE role" },
    { id: "n3", when: "a month ago", title: "Instant Work Offer for a role" },
    { id: "n4", when: "2 months ago", title: "Welcome to Mercor" },
  ],
  // Communications toggles defaults
  communications: {
    email: true,
    sms: true,
    fulltime: true,
    parttime: true,
    referral: true,
    job_opportunities: true,
    work_updates: true,
    unsubscribe_all: false,
  },
  payout_method: "Standard Payout",
  payout_description:
    "Funds arrive in your Stripe account quickly, then transfer to your bank within 5 business days",
  generative_profile_pictures: true,
} as const;
