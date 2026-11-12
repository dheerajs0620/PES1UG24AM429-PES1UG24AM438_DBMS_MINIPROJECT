
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { mysqlPool } from "@/lib/mysql";

export const runtime = "nodejs";

export async function GET() {
  try {
    // 1. Authenticate the student.
    const cookieStore = await cookies();
    const token = cookieStore.get("internhub_session")?.value;
    const secret = process.env.AUTH_SECRET;

    if (!token || !secret) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    const userId = Number(payload.userId);

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      payload.role !== "STUDENT"
    ) {
      return NextResponse.json(
        { success: false, message: "Student access required." },
        { status: 403 }
      );
    }

    // 2. Retrieve all resume versions belonging to this student.
    const [rows]: any = await mysqlPool.execute(
      `SELECT
          resume_id,
          file_name,
          uploaded_at,
          is_active
       FROM resumes
       WHERE student_id = ?
       ORDER BY uploaded_at DESC, resume_id DESC`,
      [userId]
    );

    // 3. Identify the active resume.
    const activeResume = rows.find(
      (resume: any) => Number(resume.is_active) === 1
    ) || null;

    return NextResponse.json({
      success: true,
      totalResumes: rows.length,
      activeResumeId: activeResume?.resume_id ?? null,
      resumes: rows.map((resume: any) => ({
        resume_id: resume.resume_id,
        file_name: resume.file_name,
        uploaded_at: resume.uploaded_at,
        is_active: Boolean(Number(resume.is_active)),
      })),
    });
  } catch (error) {
    console.error("Resume history error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to fetch resume history." },
      { status: 500 }
    );
  }
}
