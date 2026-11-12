import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/mysql";

export const runtime = "nodejs";

/**
 * Academic values are suggestions extracted from resume text, not verified facts.
 * Null means the resume did not provide enough explicit evidence.
 */
type ExtractedAcademicProfile = {
  degree: string | null;
  major: string | null;
  college: string | null;
  graduation_year: number | null;
  cgpa: number | null;
  tenth_percentage: number | null;
  twelfth_percentage: number | null;
  diploma_percentage: number | null;
  active_backlogs: number | null;
  current_semester: number | null;
  confidence: Record<string, "high" | "medium" | "low" | "not_found">;
  evidence: Record<string, string | null>;
};

const EMPTY_ACADEMIC_PROFILE: ExtractedAcademicProfile = {
  degree: null,
  major: null,
  college: null,
  graduation_year: null,
  cgpa: null,
  tenth_percentage: null,
  twelfth_percentage: null,
  diploma_percentage: null,
  active_backlogs: null,
  current_semester: null,
  confidence: {},
  evidence: {},
};

function extractJsonObject(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  // First try the complete response. Gemini's JSON response mode should
  // normally make this succeed.
  try {
    return JSON.parse(cleaned);
  } catch {
    // Find the first complete top-level JSON object while respecting quoted
    // strings, escaped quotes and braces that occur inside evidence text.
    const start = cleaned.indexOf("{");
    if (start < 0) {
      throw new Error("Gemini returned no JSON object for academic extraction.");
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < cleaned.length; i++) {
      const char = cleaned[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === "\\") {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(cleaned.slice(start, i + 1));
          } catch {
            break;
          }
        }
      }
    }

    console.error("Gemini academic response was not valid JSON:", cleaned.slice(0, 1200));
    throw new Error(
      "Gemini returned malformed academic data. Please try extracting the resume again."
    );
  }
}

function safeText(value: unknown, maxLength = 160): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function safeNumeric(value: unknown, min: number, max: number, integer = false): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max || (integer && !Number.isInteger(parsed))) return null;
  return parsed;
}

function normalizeAcademicExtraction(raw: any): ExtractedAcademicProfile {
  const source = raw && typeof raw === "object" ? raw : {};
  const confidence = source.confidence && typeof source.confidence === "object" ? source.confidence : {};
  const evidence = source.evidence && typeof source.evidence === "object" ? source.evidence : {};
  const keys = ["degree", "major", "college", "graduation_year", "cgpa", "tenth_percentage", "twelfth_percentage", "diploma_percentage", "active_backlogs", "current_semester"];
  const normalizedConfidence: Record<string, "high" | "medium" | "low" | "not_found"> = {};
  const normalizedEvidence: Record<string, string | null> = {};
  for (const key of keys) {
    const level = String(confidence[key] || "not_found").toLowerCase();
    normalizedConfidence[key] = ["high", "medium", "low"].includes(level) ? level as any : "not_found";
    normalizedEvidence[key] = safeText(evidence[key], 240);
  }

  return {
    degree: safeText(source.degree),
    major: safeText(source.major),
    college: safeText(source.college),
    graduation_year: safeNumeric(source.graduation_year, 2000, 2100, true),
    cgpa: safeNumeric(source.cgpa, 0, 10),
    tenth_percentage: safeNumeric(source.tenth_percentage, 0, 100),
    twelfth_percentage: safeNumeric(source.twelfth_percentage, 0, 100),
    diploma_percentage: safeNumeric(source.diploma_percentage, 0, 100),
    active_backlogs: safeNumeric(source.active_backlogs, 0, 100, true),
    current_semester: safeNumeric(source.current_semester, 1, 20, true),
    confidence: normalizedConfidence,
    evidence: normalizedEvidence,
  };
}

async function extractAcademicProfileWithGemini(cvText: string): Promise<ExtractedAcademicProfile> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Add it to your server .env.local file and restart the development server.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const academicResponseSchema = {
    type: "OBJECT",
    properties: {
      academic_profile: {
        type: "OBJECT",
        properties: {
          degree: { type: "STRING", nullable: true },
          major: { type: "STRING", nullable: true },
          college: { type: "STRING", nullable: true },
          graduation_year: { type: "INTEGER", nullable: true },
          cgpa: { type: "NUMBER", nullable: true },
          tenth_percentage: { type: "NUMBER", nullable: true },
          twelfth_percentage: { type: "NUMBER", nullable: true },
          diploma_percentage: { type: "NUMBER", nullable: true },
          active_backlogs: { type: "INTEGER", nullable: true },
          current_semester: { type: "INTEGER", nullable: true },
          confidence: {
            type: "OBJECT",
            properties: {
              degree: { type: "STRING", enum: ["high", "medium", "low", "not_found"] },
              major: { type: "STRING", enum: ["high", "medium", "low", "not_found"] },
              college: { type: "STRING", enum: ["high", "medium", "low", "not_found"] },
              graduation_year: { type: "STRING", enum: ["high", "medium", "low", "not_found"] },
              cgpa: { type: "STRING", enum: ["high", "medium", "low", "not_found"] },
              tenth_percentage: { type: "STRING", enum: ["high", "medium", "low", "not_found"] },
              twelfth_percentage: { type: "STRING", enum: ["high", "medium", "low", "not_found"] },
              diploma_percentage: { type: "STRING", enum: ["high", "medium", "low", "not_found"] },
              active_backlogs: { type: "STRING", enum: ["high", "medium", "low", "not_found"] },
              current_semester: { type: "STRING", enum: ["high", "medium", "low", "not_found"] }
            },
            required: [
              "degree", "major", "college", "graduation_year", "cgpa",
              "tenth_percentage", "twelfth_percentage", "diploma_percentage",
              "active_backlogs", "current_semester"
            ]
          },
          evidence: {
            type: "OBJECT",
            properties: {
              degree: { type: "STRING", nullable: true },
              major: { type: "STRING", nullable: true },
              college: { type: "STRING", nullable: true },
              graduation_year: { type: "STRING", nullable: true },
              cgpa: { type: "STRING", nullable: true },
              tenth_percentage: { type: "STRING", nullable: true },
              twelfth_percentage: { type: "STRING", nullable: true },
              diploma_percentage: { type: "STRING", nullable: true },
              active_backlogs: { type: "STRING", nullable: true },
              current_semester: { type: "STRING", nullable: true }
            },
            required: [
              "degree", "major", "college", "graduation_year", "cgpa",
              "tenth_percentage", "twelfth_percentage", "diploma_percentage",
              "active_backlogs", "current_semester"
            ]
          }
        },
        required: [
          "degree", "major", "college", "graduation_year", "cgpa",
          "tenth_percentage", "twelfth_percentage", "diploma_percentage",
          "active_backlogs", "current_semester", "confidence", "evidence"
        ]
      }
    },
    required: ["academic_profile"]
  };

  const prompt = `Extract academic information from the resume text below.
Only return facts explicitly stated in the resume. Do not infer, calculate, guess, or fill missing values.
Use null when a field is not explicitly present. Do not assume zero active backlogs.
Do not convert percentages to CGPA or CGPA to percentages.
Distinguish 10th/SSLC, 12th/HSC and diploma marks.
Graduation year means expected or completed graduation year.
Current semester and active backlogs must be explicitly stated.
Never treat job requirements or eligibility criteria as the student's own academic results.
For each field, provide confidence: high, medium, low, or not_found.
For evidence, provide a short exact phrase copied from the resume, or null if not found.
Return only the JSON object matching the supplied response schema.

RESUME TEXT:
${cvText.slice(0, 100000)}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: academicResponseSchema,
          maxOutputTokens: 4096
        }
      }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Gemini academic extraction error:", payload);
    const detail = payload?.error?.message;
    throw new Error(detail ? `Gemini extraction failed: ${detail}` : "Gemini academic extraction failed.");
  }

  const candidate = payload?.candidates?.[0];
  const generatedText = candidate?.content?.parts
    ?.map((part: any) => part.text || "")
    .join("");

  if (!generatedText) {
    const finishReason = candidate?.finishReason;
    throw new Error(
      finishReason === "MAX_TOKENS"
        ? "Gemini's academic response was truncated. Please try again."
        : "Gemini did not return academic extraction data."
    );
  }

  const parsed = extractJsonObject(generatedText);
  return normalizeAcademicExtraction(parsed?.academic_profile);
}

type SkillPattern = { name: string; patterns: RegExp[] };

type OpportunityRow = {
  opportunity_id: number;
  title: string;
  opportunity_type: string;
  description: string | null;
  required_skills: string | null;
  company_name: string;
  company_location: string | null;
  company_website: string | null;
  company_industry: string | null;
  stipend: number | string | null;
  deadline: string | Date | null;
  posted_at: string | Date | null;
  status: string | null;
  skill_name: string | null;
  requirement_type: string | null;
  min_cgpa: number | string | null;
  min_tenth_percentage: number | string | null;
  min_twelfth_percentage: number | string | null;
  min_diploma_percentage: number | string | null;
  max_active_backlogs: number | string | null;
  eligible_degrees: unknown;
  eligible_branches: unknown;
  eligible_graduation_years: unknown;
  min_semester: number | string | null;
  max_semester: number | string | null;
  other_requirements: string | null;
};

type OpportunityMatch = {
  opportunity_id: number;
  title: string;
  opportunity_type: string;
  description: string;
  required_skills: string | null;
  company_name: string;
  company_location: string | null;
  company_website: string | null;
  company_industry: string | null;
  stipend: number | string | null;
  deadline: string | Date | null;
  posted_at: string | Date | null;
  status: string | null;
  eligibility: Record<string, unknown>;
  requiredSkills: string[];
  preferredSkills: string[];
};

const taxonomy: SkillPattern[] = [
  { name: "Python", patterns: [/\bpython\b/i] },
  { name: "C", patterns: [/\bc programming\b/i, /\bc language\b/i, /\bbare-metal c\b/i] },
  { name: "C++", patterns: [/\bc\s*\+\s*\+/i, /\bcpp\b/i, /\bc plus plus\b/i] },
  { name: "Rust", patterns: [/\brust\b/i] },
  { name: "Java", patterns: [/\bjava\b/i] },
  { name: "JavaScript", patterns: [/\bjavascript\b/i] },
  { name: "TypeScript", patterns: [/\btypescript\b/i] },
  { name: "React", patterns: [/\breact(?:\.js|js)?\b/i] },
  { name: "Next.js", patterns: [/\bnext\.js\b/i, /\bnextjs\b/i] },
  { name: "Node.js", patterns: [/\bnode\.js\b/i, /\bnodejs\b/i] },
  { name: "Express.js", patterns: [/\bexpress(?:\.js)?\b/i] },
  { name: "FastAPI", patterns: [/\bfastapi\b/i] },
  { name: "MySQL", patterns: [/\bmysql\b/i] },
  { name: "PostgreSQL", patterns: [/\bpostgres(?:ql)?\b/i, /\bpgvector\b/i] },
  { name: "MongoDB", patterns: [/\bmongodb\b/i, /\bmongo database\b/i] },
  { name: "Neo4j", patterns: [/\bneo4j\b/i] },
  { name: "Redis", patterns: [/\bredis\b/i] },
  { name: "ChromaDB", patterns: [/\bchromadb\b/i] },
  { name: "PyTorch", patterns: [/\bpytorch\b/i] },
  { name: "TensorFlow", patterns: [/\btensorflow\b/i] },
  { name: "OpenCV", patterns: [/\bopencv\b/i] },
  { name: "Docker", patterns: [/\bdocker\b/i] },
  { name: "Kubernetes", patterns: [/\bkubernetes\b/i, /\bk8s\b/i] },
  { name: "Wazuh", patterns: [/\bwazuh\b/i] },
  { name: "Machine Learning", patterns: [/\bmachine learning\b/i, /\bml\b/i] },
  { name: "Computer Vision", patterns: [/\bcomputer vision\b/i] },
  { name: "Natural Language Processing", patterns: [/\bnatural language processing\b/i, /\bnlp\b/i, /\brag\b/i, /\blarge language models?\b/i, /\bllm\b/i, /\blangchain\b/i, /\blanggraph\b/i, /\bgenerative ai\b/i, /\bgen ai\b/i] },
  { name: "Git", patterns: [/\bgit\b/i, /\bgithub\b/i] },
  { name: "Apache Spark", patterns: [/\bapache spark\b/i, /\bspark\b/i] },
  { name: "Kafka", patterns: [/\bkafka\b/i] },
  { name: "Linux", patterns: [/\blinux\b/i] },
  { name: "Networking", patterns: [/\bnetworking\b/i, /\bcomputer networks?\b/i] },
  { name: "Security", patterns: [/\bcybersecurity\b/i, /\bsecurity\b/i] },
  { name: "SQL", patterns: [/\bsql\b/i] },
  { name: "Data Analytics", patterns: [/\bdata analytics\b/i, /\bdata analysis\b/i] },
  { name: "Data Engineering", patterns: [/\bdata engineering\b/i] },
  { name: "Microservices", patterns: [/\bmicroservices?\b/i] },
  { name: "ARM", patterns: [/\barm architecture\b/i, /\barm processor\b/i] },
  { name: "Embedded Systems", patterns: [/\bembedded systems?\b/i] },
  { name: "Socket Programming", patterns: [/\bsocket programming\b/i] },
  { name: "Reverse Engineering", patterns: [/\breverse engineering\b/i] },
  { name: "Indexing", patterns: [/\bdatabase indexing\b/i, /\bindexing\b/i] },
  { name: "Tailwind CSS", patterns: [/\btailwind(?: css)?\b/i] },
  { name: "FastAI", patterns: [/\bfastai\b/i] },
];

const aliases: Record<string, string> = {
  nlp: "Natural Language Processing",
  express: "Express.js",
  node: "Node.js",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  k8s: "Kubernetes",
  cpp: "C++",
  "c plus plus": "C++",
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  js: "JavaScript",
  ts: "TypeScript",
};

function normalizeSkill(skill: string): string {
  const cleaned = skill.trim();
  return aliases[cleaned.toLowerCase()] || cleaned;
}

function uniqueSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const skill of skills) {
    const normalized = normalizeSkill(skill);
    const key = normalized.toLowerCase();
    if (normalized && !seen.has(key)) {
      seen.add(key);
      result.push(normalized);
    }
  }
  return result;
}

function parseRequiredSkills(rawSkills: string | null): string[] {
  if (!rawSkills) return [];
  return uniqueSkills(rawSkills.split(/[,;|\n]+/).map((skill) => skill.trim()).filter(Boolean));
}

function jsonList(value: unknown): unknown {
  if (value === null || value === undefined || value === "") return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cvText = typeof body.cvText === "string" ? body.cvText : "";

    if (!cvText.trim()) {
      return NextResponse.json({ success: false, error: "No text content found in uploaded CV." }, { status: 400 });
    }
    if (cvText.length > 2_000_000) {
      return NextResponse.json({ success: false, error: "CV text is too large to process." }, { status: 413 });
    }

    // Gemini extracts academic details, but nothing is saved automatically.
    // The student reviews and confirms the suggested values in the UI.
    const academicProfile = await extractAcademicProfileWithGemini(cvText);

    const extractedSkills = uniqueSkills(
      taxonomy.filter((item) => item.patterns.some((pattern) => pattern.test(cvText))).map((item) => item.name)
    );
    const candidateSkillSet = new Set(extractedSkills.map((skill) => skill.toLowerCase()));

    // Include company, posting and academic eligibility data in the same result
    // so the detail view uses the exact opportunity record that was scored.
    const [rows] = await mysqlPool.query(
      `SELECT
         o.opportunity_id,
         o.title,
         o.opportunity_type,
         o.description,
         o.required_skills,
         o.stipend,
         o.deadline,
         o.created_at AS posted_at,
         o.status,
         c.name AS company_name,
         c.location AS company_location,
         c.website AS company_website,
         c.industry AS company_industry,
         s.skill_name,
         os.requirement_type,
         e.min_cgpa,
         e.min_tenth_percentage,
         e.min_twelfth_percentage,
         e.min_diploma_percentage,
         e.max_active_backlogs,
         e.eligible_degrees,
         e.eligible_branches,
         e.eligible_graduation_years,
         e.min_semester,
         e.max_semester,
         e.other_requirements
       FROM Opportunities o
       INNER JOIN Companies c ON c.company_id = o.company_id
       LEFT JOIN opportunity_skills os ON os.opportunity_id = o.opportunity_id
       LEFT JOIN skills s ON s.skill_id = os.skill_id
       LEFT JOIN opportunity_eligibility e ON e.opportunity_id = o.opportunity_id
       ORDER BY o.opportunity_id DESC`
    );

    const opportunityRows = rows as OpportunityRow[];
    const opportunities = new Map<number, OpportunityMatch>();

    for (const row of opportunityRows) {
      const opportunityId = Number(row.opportunity_id);
      let opportunity = opportunities.get(opportunityId);

      if (!opportunity) {
        opportunity = {
          opportunity_id: opportunityId,
          title: row.title,
          opportunity_type: row.opportunity_type,
          description: row.description || "",
          required_skills: row.required_skills,
          company_name: row.company_name,
          company_location: row.company_location,
          company_website: row.company_website,
          company_industry: row.company_industry,
          stipend: row.stipend,
          deadline: row.deadline,
          posted_at: row.posted_at,
          status: row.status,
          eligibility: {
            min_cgpa: row.min_cgpa,
            min_tenth_percentage: row.min_tenth_percentage,
            min_twelfth_percentage: row.min_twelfth_percentage,
            min_diploma_percentage: row.min_diploma_percentage,
            max_active_backlogs: row.max_active_backlogs,
            eligible_degrees: jsonList(row.eligible_degrees),
            eligible_branches: jsonList(row.eligible_branches),
            eligible_graduation_years: jsonList(row.eligible_graduation_years),
            min_semester: row.min_semester,
            max_semester: row.max_semester,
            other_requirements: row.other_requirements,
          },
          requiredSkills: [],
          preferredSkills: [],
        };
        opportunities.set(opportunityId, opportunity);
      }

      if (row.skill_name) {
        const skillName = normalizeSkill(String(row.skill_name));
        const requirementType = String(row.requirement_type || "REQUIRED").toUpperCase();
        if (requirementType === "PREFERRED") opportunity.preferredSkills.push(skillName);
        else opportunity.requiredSkills.push(skillName);
      }
    }

    const recommendations = Array.from(opportunities.values()).map((opp) => {
      let requiredSkills = uniqueSkills(opp.requiredSkills);
      const preferredSkills = uniqueSkills(opp.preferredSkills);

      // Older postings may have no rows in opportunity_skills; use the text field.
      if (requiredSkills.length === 0) requiredSkills = parseRequiredSkills(opp.required_skills);

      const matchedRequiredSkills = requiredSkills.filter((skill) => candidateSkillSet.has(skill.toLowerCase()));
      const missingRequiredSkills = requiredSkills.filter((skill) => !candidateSkillSet.has(skill.toLowerCase()));
      const matchedPreferredSkills = preferredSkills.filter((skill) => candidateSkillSet.has(skill.toLowerCase()));

      const requiredRatio = requiredSkills.length > 0 ? matchedRequiredSkills.length / requiredSkills.length : null;
      const preferredRatio = preferredSkills.length > 0 ? matchedPreferredSkills.length / preferredSkills.length : null;
      let score: number | null = null;

      // Preserve the existing scoring rule: 80% required + 20% preferred
      // when both categories exist; otherwise score the available category.
      if (requiredRatio !== null && preferredRatio !== null) score = 0.8 * requiredRatio + 0.2 * preferredRatio;
      else if (requiredRatio !== null) score = requiredRatio;
      else if (preferredRatio !== null) score = preferredRatio;

      const matchedSkills = uniqueSkills([...matchedRequiredSkills, ...matchedPreferredSkills]);

      return {
        opportunity_id: opp.opportunity_id,
        title: opp.title,
        opportunity_type: opp.opportunity_type,
        description: opp.description,
        required_skills: opp.required_skills,
        company_name: opp.company_name,
        company_location: opp.company_location,
        location: opp.company_location,
        company_website: opp.company_website,
        website: opp.company_website,
        company_industry: opp.company_industry,
        stipend: opp.stipend,
        deadline: opp.deadline,
        posted_at: opp.posted_at,
        status: opp.status,
        eligibility: opp.eligibility,
        ...opp.eligibility,
        requiredSkills,
        preferredSkills,
        required_skills_list: requiredSkills,
        preferred_skills_list: preferredSkills,
        match_score: score === null ? null : Number(score.toFixed(4)),
        has_match_data: score !== null,
        matched_skills: matchedSkills,
        matched_required_skills: matchedRequiredSkills,
        missing_required_skills: missingRequiredSkills,
        matched_preferred_skills: matchedPreferredSkills,
        score_breakdown: {
          required_matched: matchedRequiredSkills.length,
          required_total: requiredSkills.length,
          preferred_matched: matchedPreferredSkills.length,
          preferred_total: preferredSkills.length,
          required_weight: requiredRatio !== null && preferredRatio !== null ? 80 : requiredRatio !== null ? 100 : 0,
          preferred_weight: requiredRatio !== null && preferredRatio !== null ? 20 : preferredRatio !== null ? 100 : 0,
        },
      };
    });

    recommendations.sort((a, b) => {
      const scoreA = a.match_score ?? -1;
      const scoreB = b.match_score ?? -1;
      return scoreB - scoreA || a.title.localeCompare(b.title);
    });

    return NextResponse.json({
      success: true,
      extracted_skills: extractedSkills,
      academic_profile: academicProfile,
      total_opportunities: recommendations.length,
      recommendations,
    });
  } catch (error: unknown) {
    console.error("CV Extraction Error:", error);
    const message = error instanceof Error ? error.message : "Error processing CV text.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
