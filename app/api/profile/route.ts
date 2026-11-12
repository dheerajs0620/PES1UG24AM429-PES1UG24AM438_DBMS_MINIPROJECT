
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { mysqlPool } from "@/lib/mysql";

export const runtime = "nodejs";

// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

async function getAuthenticatedStudent() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("internhub_session")?.value;

    if (!token) {
      return {
        userId: null,
        status: 401,
        error: "Not authenticated.",
      };
    }

    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      return {
        userId: null,
        status: 500,
        error: "Authentication is not configured.",
      };
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
      return {
        userId: null,
        status: 403,
        error: "Student access required.",
      };
    }

    return {
      userId,
      status: 200,
      error: null,
    };
  } catch {
    return {
      userId: null,
      status: 401,
      error: "Invalid or expired session.",
    };
  }
}

// --------------------------------------------------
// GET: PROFILE + SAVED SKILLS
// --------------------------------------------------

export async function GET() {
  try {
    const auth = await getAuthenticatedStudent();

    if (!auth.userId) {
      return NextResponse.json(
        {
          success: false,
          message: auth.error,
        },
        { status: auth.status }
      );
    }

    // 1. Fetch student profile.
    const [rows]: any = await mysqlPool.execute(
      `SELECT
          u.user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          s.major,
          s.graduation_year,
          s.college,
          s.phone,
          s.portfolio_url,
          s.linkedin_url,
          s.github_url,
          s.portfolio_summary,
          s.updated_at
       FROM users u
       LEFT JOIN students s
          ON u.user_id = s.student_id
       WHERE u.user_id = ?
          AND u.role = 'STUDENT'
       LIMIT 1`,
      [auth.userId]
    );

    if (!rows.length) {
      return NextResponse.json(
        {
          success: false,
          message: "Student profile not found.",
        },
        { status: 404 }
      );
    }

    // 2. Fetch all saved skills.
    // Includes both RESUME and MANUAL skills.
    const [skillRows]: any = await mysqlPool.execute(
      `SELECT
          sk.skill_id,
          sk.skill_name,
          ss.source,
          ss.confidence_score
       FROM student_skills ss
       INNER JOIN skills sk
          ON ss.skill_id = sk.skill_id
       WHERE ss.student_id = ?
       ORDER BY sk.skill_name ASC`,
      [auth.userId]
    );

    // 3. Format skills.
    const skills = skillRows.map((skill: any) => ({
      skill_id: skill.skill_id,
      skill_name: skill.skill_name,
      source: skill.source,
      confidence_score: skill.confidence_score,
    }));

    // 4. Return profile and skills together.
    return NextResponse.json({
      success: true,
      profile: {
        ...rows[0],
        skills,
      },
      skills: skills.map((skill: any) => skill.skill_name),
      totalSkills: skills.length,
    });

  } catch (error) {
    console.error("Profile GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve profile.",
      },
      { status: 500 }
    );
  }
}

// --------------------------------------------------
// PUT: UPDATE STUDENT PROFILE
// --------------------------------------------------

export async function PUT(request: Request) {
  const auth = await getAuthenticatedStudent();

  if (!auth.userId) {
    return NextResponse.json(
      {
        success: false,
        message: auth.error,
      },
      { status: auth.status }
    );
  }

  let body: any;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid JSON request.",
      },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid profile data.",
      },
      { status: 400 }
    );
  }

  // Normalize incoming values.
  const firstName = String(body.first_name ?? "").trim();
  const lastName = String(body.last_name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  const major = String(body.major ?? "").trim();
  const college = String(body.college ?? "").trim();

  const graduationYear = Number(body.graduation_year);

  const phone = String(body.phone ?? "").trim();

  const portfolioUrl = String(body.portfolio_url ?? "").trim();
  const linkedinUrl = String(body.linkedin_url ?? "").trim();
  const githubUrl = String(body.github_url ?? "").trim();

  const portfolioSummary = String(
    body.portfolio_summary ?? ""
  ).trim();

  // Required-field validation.
  if (
    !firstName ||
    !lastName ||
    !email ||
    !major ||
    !college
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Please fill in all required fields.",
      },
      { status: 400 }
    );
  }

  // Field-length validation.
  if (
    firstName.length > 50 ||
    lastName.length > 50 ||
    email.length > 100 ||
    major.length > 100 ||
    college.length > 150 ||
    phone.length > 20 ||
    portfolioUrl.length > 255 ||
    linkedinUrl.length > 255 ||
    githubUrl.length > 255
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "One or more fields exceed the allowed length.",
      },
      { status: 400 }
    );
  }

  // Email validation.
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email)) {
    return NextResponse.json(
      {
        success: false,
        message: "Please enter a valid email address.",
      },
      { status: 400 }
    );
  }

  // Graduation-year validation.
  if (
    !Number.isInteger(graduationYear) ||
    graduationYear < 2000 ||
    graduationYear > 2100
  ) {
    return NextResponse.json(
      {
        success: false,
        message: "Please enter a valid graduation year.",
      },
      { status: 400 }
    );
  }

  // Portfolio summary validation.
  if (portfolioSummary.length > 5000) {
    return NextResponse.json(
      {
        success: false,
        message: "Portfolio summary is too long.",
      },
      { status: 400 }
    );
  }

  // Validate optional URLs.
  const validateOptionalUrl = (value: string) => {
    if (!value) {
      return true;
    }

    try {
      const parsed = new URL(value);

      return (
        (parsed.protocol === "http:" ||
          parsed.protocol === "https:") &&
        Boolean(parsed.hostname)
      );
    } catch {
      return false;
    }
  };

  if (
    !validateOptionalUrl(portfolioUrl) ||
    !validateOptionalUrl(linkedinUrl) ||
    !validateOptionalUrl(githubUrl)
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Please enter valid URLs beginning with http:// or https://.",
      },
      { status: 400 }
    );
  }

  let connection: any;

  try {
    connection = await mysqlPool.getConnection();

    await connection.beginTransaction();

    // 1. Update account details.
    await connection.execute(
      `UPDATE users
       SET first_name = ?,
           last_name = ?,
           email = ?
       WHERE user_id = ?
          AND role = 'STUDENT'`,
      [
        firstName,
        lastName,
        email,
        auth.userId,
      ]
    );

    // 2. Insert or update student profile.
    await connection.execute(
      `INSERT INTO students (
          student_id,
          major,
          graduation_year,
          college,
          phone,
          portfolio_url,
          linkedin_url,
          github_url,
          portfolio_summary
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
          major = VALUES(major),
          graduation_year = VALUES(graduation_year),
          college = VALUES(college),
          phone = VALUES(phone),
          portfolio_url = VALUES(portfolio_url),
          linkedin_url = VALUES(linkedin_url),
          github_url = VALUES(github_url),
          portfolio_summary = VALUES(portfolio_summary)`,
      [
        auth.userId,
        major,
        graduationYear,
        college,
        phone || null,
        portfolioUrl || null,
        linkedinUrl || null,
        githubUrl || null,
        portfolioSummary || null,
      ]
    );

    await connection.commit();

    // 3. Fetch updated profile.
    const [rows]: any = await connection.execute(
      `SELECT
          u.user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          s.major,
          s.graduation_year,
          s.college,
          s.phone,
          s.portfolio_url,
          s.linkedin_url,
          s.github_url,
          s.portfolio_summary,
          s.updated_at
       FROM users u
       LEFT JOIN students s
          ON u.user_id = s.student_id
       WHERE u.user_id = ?
          AND u.role = 'STUDENT'
       LIMIT 1`,
      [auth.userId]
    );

    // 4. Fetch saved skills without modifying them.
    const [skillRows]: any = await connection.execute(
      `SELECT
          sk.skill_id,
          sk.skill_name,
          ss.source,
          ss.confidence_score
       FROM student_skills ss
       INNER JOIN skills sk
          ON ss.skill_id = sk.skill_id
       WHERE ss.student_id = ?
       ORDER BY sk.skill_name ASC`,
      [auth.userId]
    );

    const skills = skillRows.map((skill: any) => ({
      skill_id: skill.skill_id,
      skill_name: skill.skill_name,
      source: skill.source,
      confidence_score: skill.confidence_score,
    }));

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully.",
      profile: {
        ...rows[0],
        skills,
      },
      skills: skills.map((skill: any) => skill.skill_name),
      totalSkills: skills.length,
    });

  } catch (error: any) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error("Profile PUT error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          message: "This email address is already registered.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to update profile.",
      },
      { status: 500 }
    );

  } finally {
    if (connection) {
      connection.release();
    }
  }
}
