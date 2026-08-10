/**
 * Detect concrete phrases from a job description and (1) surface them in the AI prompt
 * and (2) optionally append a bullet so keywords land in experience even when the model drifts.
 */

const RAW_PHRASES = `
Amazon Web Services
Google Cloud Platform
Microsoft Azure
Azure Databricks
Databricks
Machine Learning
Artificial Intelligence
Large Language Models
Natural Language Processing
Computer Vision
Data Engineering
Site Reliability Engineering
Infrastructure as Code
Continuous Integration
Continuous Deployment
Continuous Delivery
Test-Driven Development
Behavior-Driven Development
Object-Oriented Programming
Functional Programming
Event-Driven Architecture
Domain-Driven Design
Microservices Architecture
Service-Oriented Architecture
Representational State Transfer
Application Programming Interface
Single Page Application
Progressive Web App
Cross-Functional Teams
Stakeholder Management
Incident Response
Disaster Recovery
High Availability
Load Balancing
Auto Scaling
Identity and Access Management
Role-Based Access Control
Public Key Infrastructure
Penetration Testing
Threat Modeling
Security Operations
Vulnerability Management
Compliance Framework
Payment Card Industry
Health Insurance Portability
General Data Protection
Service Level Objective
Service Level Agreement
Mean Time To Recovery
Mean Time Between Failures
Root Cause Analysis
Post-Mortem Analysis
Feature Engineering
A/B Testing
Real-Time Analytics
Stream Processing
Batch Processing
Data Pipeline
Data Warehouse
Data Lakehouse
Change Data Capture
Online Analytical Processing
Extract Transform Load
Next.js
Node.js
React.js
Vue.js
Angular.js
Three.js
D3.js
Express.js
Nest.js
Spring Boot
Spring Framework
Ruby on Rails
ASP.NET Core
Entity Framework
Hibernate ORM
Apache Kafka
Apache Spark
Apache Airflow
Apache Beam
Apache Flink
Apache Hadoop
Apache Cassandra
Apache Solr
Elastic Stack
Kubernetes
Terraform
Ansible
CloudFormation
Cloud Functions
Lambda Functions
API Gateway
Application Load Balancer
Elastic Load Balancing
Virtual Private Cloud
Relational Database Service
DynamoDB
DocumentDB
CloudFront
Route 53
CloudWatch
CloudTrail
Config Service
Secrets Manager
Parameter Store
Systems Manager
CodePipeline
CodeBuild
CodeDeploy
GitHub Actions
GitLab CI
CircleCI
TeamCity
Bamboo CI
Jenkins Pipeline
Argo CD
Flux CD
Helm Charts
Docker Compose
Docker Swarm
Podman
BuildKit
OpenTelemetry
OpenTracing
Jaeger Tracing
Zipkin Tracing
Prometheus Metrics
Grafana Dashboards
Loki Logging
Fluent Bit
Vector Aggregator
Splunk Enterprise
Datadog APM
New Relic APM
Sentry Error Tracking
LaunchDarkly
Feature Flags
Redis Cluster
Memcached
RabbitMQ
ActiveMQ
Amazon SQS
Amazon SNS
Amazon SES
Amazon Kinesis
Google Pub/Sub
Azure Service Bus
Azure Event Hubs
Confluent Kafka
Schema Registry
Protocol Buffers
Apache Avro
JSON Schema
GraphQL API
REST API
gRPC Services
WebSocket API
Server-Sent Events
OAuth 2.0
OpenID Connect
JSON Web Token
SAML 2.0
LDAP Directory
Active Directory
Kerberos Authentication
Mutual TLS
Transport Layer Security
Secure Sockets Layer
Web Application Firewall
Content Delivery Network
Distributed Denial of Service
Zero Trust Architecture
Software Bill of Materials
Supply Chain Security
Static Application Security Testing
Dynamic Application Security Testing
Interactive Application Security Testing
Dependency Scanning
Container Scanning
Image Signing
Admission Controllers
Network Policies
Pod Security Standards
Secrets Encryption
Key Management Service
Hardware Security Module
PostgreSQL
MySQL Database
MariaDB Database
Microsoft SQL Server
Oracle Database
MongoDB Atlas
Couchbase Server
Redis Enterprise
Elasticsearch
OpenSearch
ClickHouse
Snowflake Data
BigQuery Analytics
Redshift Spectrum
Databricks Lake
Delta Lake
Apache Iceberg
Apache Hudi
dbt Transformations
Airbyte Connectors
Fivetran ELT
TypeScript
JavaScript
Python 3
Java Platform
Kotlin Language
Scala Language
Go Language
Rust Language
C++ Language
C# Language
Swift Language
Objective-C
Ruby Language
PHP Language
Perl Language
R Language
MATLAB
Julia Language
Haskell Language
Clojure Language
Elixir Language
Erlang OTP
Phoenix Framework
Django Framework
FastAPI Framework
Flask Framework
Tornado Server
Fastify Framework
Laravel Framework
Symfony Framework
NestJS Framework
Remix Framework
SvelteKit
Nuxt Framework
SolidJS
Ember.js
Backbone.js
jQuery Library
Webpack Bundler
Vite Bundler
Rollup Bundler
esbuild
SWC Compiler
Babel Transpiler
ESLint Rules
Prettier Formatter
Jest Testing
Mocha Testing
Chai Assertions
Cypress Testing
Playwright Testing
Selenium WebDriver
JUnit Testing
pytest Framework
RSpec Testing
Pytest Fixtures
TestContainers
Pact Contract Testing
WireMock Server
Mountebank
Locust Load Testing
k6 Load Testing
Gatling Load Testing
JMeter Testing
Blazor WebAssembly
Xamarin Forms
Flutter SDK
React Native
SwiftUI Framework
Jetpack Compose
Android SDK
iOS Development
watchOS Development
tvOS Development
Unity Engine
Unreal Engine
Godot Engine
WebGL Graphics
WebAssembly
Service Workers
Progressive Enhancement
Responsive Design
Accessibility WCAG
Internationalization
Localization Testing
Technical Leadership
Engineering Leadership
Cross-functional Leadership
Technical Roadmap
Product Discovery
Customer Facing
Sprint Planning
Backlog Refinement
Daily Standup
Code Review
Design Review
Architecture Review
Production Support
On-call Support
Incident Management
Vendor Management
Partner Integration
`.trim();

function uniqLongestFirst(phrases) {
  const seen = new Set();
  const out = [];
  for (const p of phrases) {
    const k = p.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p.trim());
  }
  return out.sort((a, b) => b.length - a.length);
}

const SORTED_PHRASES = uniqLongestFirst(
  RAW_PHRASES.split(/\n+/).map((s) => s.trim()).filter(Boolean)
);

function isWordChar(c) {
  return /[a-z0-9]/i.test(c);
}

/**
 * True if `needle` appears in `haystack` with non-alphanumeric (or edge) boundaries.
 */
function includesAtTokenBoundary(haystack, needle) {
  const h = haystack;
  const n = needle;
  if (!n) return false;
  const hl = h.toLowerCase();
  const nl = n.toLowerCase();
  let pos = 0;
  while (pos < hl.length) {
    const i = hl.indexOf(nl, pos);
    if (i === -1) return false;
    const before = i === 0 ? " " : hl[i - 1];
    const after = i + nl.length >= hl.length ? " " : hl[i + nl.length];
    if (!isWordChar(before) && !isWordChar(after)) return true;
    pos = i + 1;
  }
  return false;
}

function extensionTokens(jd) {
  const re =
    /\b[A-Za-z][A-Za-z0-9-]{0,28}\.(?:js|ts|tsx|jsx|mjs|cjs|cs|py|rb|go|sql|yaml|yml|json|sh|kt|swift|rs|php)\b/g;
  const m = jd.match(re);
  return m ? [...new Set(m)] : [];
}

/**
 * @param {string} jd
 * @param {{ max?: number }} [opts]
 * @returns {string[]}
 */
export function extractJdKeywords(jd, opts = {}) {
  const max = opts.max ?? 40;
  if (!jd || typeof jd !== "string") return [];

  const hl = jd;
  const candidates = [];

  for (const phrase of SORTED_PHRASES) {
    if (phrase.length < 2) continue;
    if (!includesAtTokenBoundary(hl, phrase)) continue;
    const idx = hl.toLowerCase().indexOf(phrase.toLowerCase());
    candidates.push({ phrase, idx });
  }

  for (const tok of extensionTokens(jd)) {
    if (tok.length < 4) continue;
    const idx = hl.toLowerCase().indexOf(tok.toLowerCase());
    if (idx === -1) continue;
    candidates.push({ phrase: tok, idx });
  }

  // Prefer longer phrases first so overlaps resolve toward full names (e.g. REST API before API).
  candidates.sort(
    (a, b) => b.phrase.length - a.phrase.length || a.idx - b.idx
  );

  const spans = [];
  function overlaps(start, end) {
    return spans.some((s) => !(end <= s.start || start >= s.end));
  }

  const out = [];
  const seen = new Set();
  for (const { phrase, idx } of candidates) {
    const pl = phrase.toLowerCase();
    if (seen.has(pl)) continue;
    const end = idx + phrase.length;
    if (overlaps(idx, end)) continue;
    out.push(phrase);
    seen.add(pl);
    spans.push({ start: idx, end });
    if (out.length >= max) break;
  }

  out.sort(
    (a, b) =>
      hl.toLowerCase().indexOf(a.toLowerCase()) -
      hl.toLowerCase().indexOf(b.toLowerCase())
  );
  return out;
}

/**
 * Markdown block injected after the JD in the resume prompt.
 * @param {string} jd
 * @param {{ max?: number }} [opts]
 * @returns {string}
 */
/**
 * @param {string} jd
 * @param {{ profileData?: object; max?: number }} [opts]
 */
export function formatJdExperienceKeywordsBlock(jd, opts = {}) {
  const max = opts.max ?? 45;
  const rawList = extractJdKeywords(jd, { max });
  const cred = profileCredibilityBlob(opts.profileData);
  const list =
    cred.length > 0
      ? rawList.filter((p) => cred.includes(p.toLowerCase()))
      : rawList;
  if (list.length === 0) return "";

  const lines = list.map((p) => `- ${p}`).join("\n");
  return (
    "\n---\n\n" +
    "## AUTOMATED JD PHRASES (also in profile — must appear in `experience`)\n\n" +
    "These strings appear in the **job description** and were **found in the candidate profile JSON** (skills, bullets, titles, education). " +
    "**Each** must appear as plain text inside **`experience[].details`** for at least one appropriate role (strongly prefer **`experience[0]`**). " +
    "Listing them only in **`summary`** or **`skills` is invalid** for this checklist. " +
    "When the **JD REQUIREMENTS NOT SUPPORTED BY PROFILE DATA** section appears in this prompt, **never** claim those items as hands-on experience.\n\n" +
    `${lines}\n`
  );
}

/**
 * Split "Must have A, B, and C experience." style clauses.
 * @param {string} clause
 * @returns {string[]}
 */
function splitRequirementClause(clause) {
  return clause
    .replace(/\s+experience\s*\.?\s*$/i, "")
    .split(/\s*(?:,|;|\band\b)\s*/i)
    .map((s) => s.trim().replace(/^[\s\-•*]+/, ""))
    .filter((s) => s.length > 1);
}

/**
 * Lines like "Must have Azure, and Azure Databricks experience."
 * @param {string} jd
 * @returns {string[]}
 */
export function extractJdMustHavePhrases(jd) {
  if (!jd || typeof jd !== "string") return [];
  const out = [];
  const seen = new Set();
  const add = (s) => {
    const t = s.trim();
    if (t.length < 2) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };

  for (const raw of jd.split(/\r?\n/)) {
    const line = raw
      .trim()
      .replace(/^\*+\s*/, "")
      .replace(/^#+\s*/, "")
      .replace(/^[-•\s]+/, "");
    if (!line) continue;
    let rest = null;
    if (/^must[\s-]have\b/i.test(line)) {
      rest = line.replace(/^must[\s-]have\b\s*:?\s*/i, "");
    } else if (/^required(?:\s+qualifications)?\b/i.test(line)) {
      rest = line.replace(/^required(?:\s+qualifications)?\b\s*:?\s*/i, "");
    }
    if (rest) {
      for (const p of splitRequirementClause(rest)) add(p);
    }
  }

  const inline = jd.matchAll(/\bmust[\s-]have\b\s*:?\s*([^\n]+)/gi);
  for (const m of inline) {
    const chunk = String(m[1] ?? "")
      .replace(/\*\*/g, "")
      .trim();
    for (const p of splitRequirementClause(chunk)) add(p);
  }

  return out;
}

/**
 * "Hands-on experience ... in Databricks" style bullets.
 * @param {string} jd
 * @returns {string[]}
 */
export function extractHandsOnExperiencePhrases(jd) {
  if (!jd || typeof jd !== "string") return [];
  const out = [];
  const seen = new Set();
  const add = (chunk) => {
    const t = chunk.trim().replace(/\s+experience\s*$/i, "");
    if (t.length < 2) return;
    const k = t.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };

  const patterns = [
    /\bhands[-\s]?on\s+experience\s+(?:with|in|using|on)\s+([A-Za-z0-9][A-Za-z0-9 +.\-]{1,72})/gi,
    /\bhands[-\s]?on\s+experience\s+working\s+in\s+([A-Za-z0-9][A-Za-z0-9 +.\-]{1,72})/gi,
    /\bhands[-\s]?on\s+experience\s+working\s+with\s+([A-Za-z0-9][A-Za-z0-9 +.\-]{1,72})/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(jd)) !== null) add(m[1]);
  }
  return out;
}

/**
 * JD asks for tools/themes the profile does not contain — model must not fabricate.
 * @param {string} jd
 * @param {object} profileData
 * @returns {string}
 */
export function formatJdCredibilityGuardBlock(jd, profileData) {
  const cred = profileCredibilityBlob(profileData);
  if (!cred) return "";

  const candidates = new Set([
    ...extractJdMustHavePhrases(jd),
    ...extractHandsOnExperiencePhrases(jd),
    ...extractJdKeywords(jd, { max: 22 }).filter(
      (p) =>
        p.includes(" ") ||
        p.length >= 8 ||
        /^(aws|gcp|sql|api|etl|ml|ai)$/i.test(p)
    ),
  ]);

  const seenAbsent = new Set();
  const absent = [];
  for (const p of candidates) {
    const pl = p.toLowerCase();
    if (pl.length < 2 || cred.includes(pl)) continue;
    if (seenAbsent.has(pl)) continue;
    seenAbsent.add(pl);
    absent.push(p);
  }
  if (absent.length === 0) return "";

  absent.sort((a, b) => b.length - a.length);
  const lines = absent.map((p) => `- ${p}`).join("\n");
  return (
    "\n---\n\n" +
    "## JD REQUIREMENTS NOT SUPPORTED BY PROFILE DATA\n\n" +
    "The posting emphasizes the items below (from **must-have** / **required** / **hands-on experience** language and high-signal JD phrases). " +
    "They do **not** appear anywhere in the candidate’s **profile JSON**, **`base_bullets`**, **`base_skills`**, **WORK HISTORY**, or **EDUCATION** text.\n\n" +
    `${lines}\n\n` +
    "**Hard rule:** Do **not** state or imply **employment**, **hands-on production**, or **ownership** of these tools/methods in **`experience`**, **`summary`**, or **`skills`**. " +
    "Do **not** add them to the **AUTOMATED JD PHRASES** checklist block above (that list is profile-filtered). " +
    "You may only describe **honestly documented** adjacent work (e.g. generic Spark notebooks on another vendor) **without** renaming it into a missing platform. " +
    "Silence on unsupported must-haves is **better** than a false match.\n"
  );
}

/**
 * Descending word count (fallback when no JD is available for ordering).
 * @param {string[]} details
 * @returns {string[]}
 */
export function sortDetailsLongestFirst(details) {
  if (!Array.isArray(details) || details.length < 2) return details;
  return [...details].sort(
    (a, b) =>
      String(b).trim().split(/\s+/).filter(Boolean).length -
      String(a).trim().split(/\s+/).filter(Boolean).length
  );
}

function jdOverlapScore(bullet, jdTerms) {
  const b = String(bullet ?? "").toLowerCase();
  let n = 0;
  for (const t of jdTerms) {
    const tl = String(t).toLowerCase();
    if (tl.length < 3) continue;
    if (b.includes(tl)) n += 1;
  }
  return n;
}

/**
 * JD-tailored bullets first (substring hits on extracted JD phrases), then longest.
 * @param {string[]} details
 * @param {string} jd
 * @returns {string[]}
 */
export function sortDetailsJdFirstThenLength(details, jd) {
  if (!Array.isArray(details) || details.length < 2) return details;
  if (!jd || typeof jd !== "string" || !jd.trim()) {
    return sortDetailsLongestFirst(details);
  }
  const terms = extractJdKeywords(jd, { max: 60 });
  return [...details].sort((a, b) => {
    const ja = jdOverlapScore(a, terms);
    const jb = jdOverlapScore(b, terms);
    if (jb !== ja) return jb - ja;
    const wa = String(a).trim().split(/\s+/).filter(Boolean).length;
    const wb = String(b).trim().split(/\s+/).filter(Boolean).length;
    return wb - wa;
  });
}

/**
 * For **each** role, order bullets JD-first (then length). Manual mode without JD falls back to longest-first.
 * @param {string[][]} mergedDetailsPerJob
 * @param {string | null | undefined} jd
 * @returns {string[][]}
 */
export function orderAllExperienceBulletsJdFirst(mergedDetailsPerJob, jd) {
  if (!Array.isArray(mergedDetailsPerJob)) return mergedDetailsPerJob;
  return mergedDetailsPerJob.map((details) =>
    Array.isArray(details) ? sortDetailsJdFirstThenLength(details, jd) : details
  );
}

/** @deprecated Use {@link orderAllExperienceBulletsJdFirst} */
export function orderFlagshipBulletsLongestFirst(mergedDetailsPerJob) {
  return orderAllExperienceBulletsJdFirst(mergedDetailsPerJob, null);
}

function profileCredibilityBlob(profileData) {
  if (!profileData || typeof profileData !== "object") return "";
  const chunks = [];
  try {
    chunks.push(JSON.stringify(profileData));
  } catch {
    chunks.push(String(profileData));
  }
  return chunks.join(" ").toLowerCase();
}

/**
 * If JD-derived terms are missing from the first role's bullets but appear in the profile,
 * append one bullet so exports still contain those keywords.
 * @param {string[]} firstJobDetails
 * @param {string} jd
 * @param {object} profileData
 * @returns {string[]}
 */
export function injectJdKeywordsIntoFirstRoleDetails(
  firstJobDetails,
  jd,
  profileData
) {
  if (!Array.isArray(firstJobDetails) || firstJobDetails.length === 0) {
    return firstJobDetails;
  }
  const terms = extractJdKeywords(jd, { max: 35 });
  if (terms.length === 0) return firstJobDetails;

  const joined = firstJobDetails.map((d) => String(d)).join(" ").toLowerCase();
  const cred = profileCredibilityBlob(profileData);

  const missing = terms.filter((t) => {
    const tl = t.toLowerCase();
    return !joined.includes(tl) && cred.includes(tl);
  });
  if (missing.length === 0) return firstJobDetails;

  const list = missing.slice(0, 14).join(", ");
  const bullet =
    `Prior responsibilities and stack adjacent to this posting included ${list}, matching documented background while aligning with the role’s stated tools and scope.`
      .replace(/\s+/g, " ")
      .trim();

  return [...firstJobDetails.map((d) => String(d)), bullet];
}
