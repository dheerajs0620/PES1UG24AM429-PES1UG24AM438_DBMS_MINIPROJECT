import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { mysqlPool } from "@/lib/mysql";

export const runtime = "nodejs";

const aliases: Record<string, string> = {
  nlp: "Natural Language Processing",
  express: "Express.js",
};

async function getAuthenticatedStudentId(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("internhub_session")?.value;
  const secret = process.env.AUTH_SECRET;

  if (!token || !secret) return null;

  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
  const userId = Number(payload.userId);

  if (!Number.isInteger(userId) || userId <= 0 || payload.role !== "STUDENT") {
    return null;
  }

  return userId;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value !== "string") return value as T;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function authError() {
  return NextResponse.json(
    { success: false, message: "Please sign in with a student account." },
    { status: 401 }
  );
}

/**
 * GET /api/resumes
 * Returns the student's active resume, extracted skills and cached recommendations.
 */
export async function GET() {
  try {
    const studentId = await getAuthenticatedStudentId();
    if (!studentId) return authError();

    const [resumeRows]: any = await mysqlPool.execute(
      `SELECT
         resume_id,
         file_name,
         extracted_text,
         uploaded_at,
         extracted_skills_json,
         recommendations_json,
         academic_extraction_json
       FROM resumes
       WHERE student_id = ? AND is_active = 1
       ORDER BY uploaded_at DESC, resume_id DESC
       LIMIT 1`,
      [studentId]
    );

    if (!resumeRows.length) {
      return NextResponse.json({ success: true, resume: null });
    }

    const row = resumeRows[0];

    // Use the saved JSON array when available. Older resume records predate
    // this cache column, so fall back to the canonical RESUME skill links.
    let extractedSkills = parseJson<string[]>(row.extracted_skills_json, []);

    if (!Array.isArray(extractedSkills) || extractedSkills.length === 0) {
      const [skillRows]: any = await mysqlPool.execute(
        `SELECT s.skill_name
         FROM student_skills ss
         INNER JOIN skills s ON s.skill_id = ss.skill_id
         WHERE ss.student_id = ? AND ss.source = 'RESUME'
         ORDER BY s.skill_name ASC`,
        [studentId]
      );
      extractedSkills = skillRows.map((item: any) => item.skill_name);
    }

    const recommendations = parseJson<any[]>(row.recommendations_json, []);
    const academicExtraction = parseJson<any | null>(
      row.academic_extraction_json,
      null
    );

    return NextResponse.json({
      success: true,
      resume: {
        resumeId: row.resume_id,
        fileName: row.file_name,
        extractedText: row.extracted_text || "",
        uploadedAt: row.uploaded_at,
        extractedSkills,
        recommendations: Array.isArray(recommendations) ? recommendations : [],
        recommendationsCached: row.recommendations_json !== null && row.recommendations_json !== undefined,
        academicExtraction,
      },
    });
  } catch (error) {
    console.error("Resume restore error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load your saved resume." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/resumes
 * Saves a new active resume and its extracted/cache data transactionally.
 */
export async function POST(request: NextRequest) {
  let connection: any;

  try {
    const studentId = await getAuthenticatedStudentId();
    if (!studentId) return authError();

    const body = await request.json();
    const fileName = String(body.fileName || "").trim();
    const extractedText = String(body.extractedText || "");
    const rawSkills = body.extractedSkills;
    const recommendations = Array.isArray(body.recommendations)
      ? body.recommendations
      : [];
    const academicExtraction =
      body.academicExtraction && typeof body.academicExtraction === "object"
        ? body.academicExtraction
        : null;

    if (!fileName || !Array.isArray(rawSkills) || !extractedText.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "fileName, extractedText and extractedSkills are required.",
        },
        { status: 400 }
      );
    }

    if (fileName.length > 255 || extractedText.length > 2_000_000) {
      return NextResponse.json(
        { success: false, message: "Resume data exceeds the allowed size." },
        { status: 413 }
      );
    }

    const normalizedSkills = [
      ...new Set(
        rawSkills
          .filter((item: unknown): item is string => typeof item === "string")
          .map((item: string) => item.trim())
          .filter(Boolean)
          .map((item: string) => aliases[item.toLowerCase()] || item)
      ),
    ];

    connection = await mysqlPool.getConnection();
    await connection.beginTransaction();

    const [studentRows]: any = await connection.execute(
      "SELECT student_id FROM students WHERE student_id = ? FOR UPDATE",
      [studentId]
    );

    if (!studentRows.length) {
      await connection.rollback();
      return NextResponse.json(
        { success: false, message: "Student profile not found." },
        { status: 404 }
      );
    }

    let matchedSkills: any[] = [];
    if (normalizedSkills.length > 0) {
      const placeholders = normalizedSkills.map(() => "?").join(",");
      const [skillRows]: any = await connection.execute(
        `SELECT skill_id, skill_name
         FROM skills
         WHERE LOWER(skill_name) IN (${placeholders})`,
        normalizedSkills.map((skill) => skill.toLowerCase())
      );
      matchedSkills = skillRows;
    }

    await connection.execute(
      "UPDATE resumes SET is_active = 0 WHERE student_id = ?",
      [studentId]
    );

    const [resumeResult]: any = await connection.execute(
      `INSERT INTO resumes
        (
          student_id,
          file_name,
          extracted_text,
          is_active,
          extracted_skills_json,
          recommendations_json,
          academic_extraction_json
        )
       VALUES (?, ?, ?, 1, ?, ?, ?)`,
      [
        studentId,
        fileName,
        extractedText,
        JSON.stringify(normalizedSkills),
        JSON.stringify(recommendations),
        academicExtraction ? JSON.stringify(academicExtraction) : null,
      ]
    );

    await connection.execute(
      "DELETE FROM student_skills WHERE student_id = ? AND source = 'RESUME'",
      [studentId]
    );

    for (const skill of matchedSkills) {
      await connection.execute(
        `INSERT INTO student_skills
          (student_id, skill_id, source, confidence_score)
         VALUES (?, ?, 'RESUME', NULL)
         ON DUPLICATE KEY UPDATE
           source = 'RESUME',
           updated_at = CURRENT_TIMESTAMP`,
        [studentId, skill.skill_id]
      );
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: "Resume, skills and recommendations saved successfully.",
      resumeId: resumeResult.insertId,
      studentId,
      recognizedSkills: matchedSkills.map((skill) => skill.skill_name),
      unmatchedSkills: normalizedSkills.filter(
        (name) =>
          !matchedSkills.some(
            (skill) => skill.skill_name.toLowerCase() === name.toLowerCase()
          )
      ),
    });
  } catch (error) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error("Resume save error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to save resume data." },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}

/**
 * PUT /api/resumes
 * Updates cached recommendation/academic extraction data on the active resume.
 * Sending academicExtraction: null clears the pending review after confirmation.
 */
export async function PUT(request: NextRequest) {
  try {
    const studentId = await getAuthenticatedStudentId();
    if (!studentId) return authError();

    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];

    if (Object.prototype.hasOwnProperty.call(body, "recommendations")) {
      if (!Array.isArray(body.recommendations)) {
        return NextResponse.json(
          { success: false, message: "Recommendations must be an array." },
          { status: 400 }
        );
      }
      updates.push("recommendations_json = ?");
      values.push(JSON.stringify(body.recommendations));
    }

    if (Object.prototype.hasOwnProperty.call(body, "academicExtraction")) {
      const value = body.academicExtraction;
      if (value !== null && (typeof value !== "object" || Array.isArray(value))) {
        return NextResponse.json(
          { success: false, message: "Invalid academic extraction data." },
          { status: 400 }
        );
      }
      updates.push("academic_extraction_json = ?");
      values.push(value === null ? null : JSON.stringify(value));
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, message: "No resume cache fields were supplied." },
        { status: 400 }
      );
    }

    values.push(studentId);
    const [result]: any = await mysqlPool.execute(
      `UPDATE resumes
       SET ${updates.join(", ")}
       WHERE student_id = ? AND is_active = 1`,
      values
    );

    if (!result.affectedRows) {
      return NextResponse.json(
        { success: false, message: "No active resume was found to update." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Saved resume analysis updated.",
    });
  } catch (error) {
    console.error("Resume cache update error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update saved resume analysis." },
      { status: 500 }
    );
  }
}
