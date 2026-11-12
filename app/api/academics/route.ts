
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { mysqlPool } from "@/lib/mysql";

type AcademicPayload = {
  degree?: string | null;
  major?: string | null;
  graduation_year?: number | null;
  cgpa?: number | null;
  tenth_percentage?: number | null;
  twelfth_percentage?: number | null;
  diploma_percentage?: number | null;
  active_backlogs?: number | null;
  current_semester?: number | null;
};

async function getAuthenticatedStudent() {
  const token = (await cookies()).get("internhub_session")?.value;

  if (!token) {
    return {
      user: null,
      status: 401,
      error: "Not authenticated.",
    };
  }

  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    return {
      user: null,
      status: 500,
      error: "Authentication is not configured.",
    };
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    const userId = Number(payload.userId);

    if (!Number.isInteger(userId) || userId <= 0 || payload.role !== "STUDENT") {
      return {
        user: null,
        status: 403,
        error: "Student access required.",
      };
    }

    const [rows]: any = await mysqlPool.execute(
      `SELECT user_id, first_name, last_name, email, role
       FROM users
       WHERE user_id = ? AND role = 'STUDENT'
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) {
      return {
        user: null,
        status: 404,
        error: "Student account not found.",
      };
    }

    return {
      user: rows[0],
      status: 200,
      error: null,
    };
  } catch {
    return {
      user: null,
      status: 401,
      error: "Invalid or expired session.",
    };
  }
}

function validateOptionalNumber(
  value: unknown,
  field: string,
  min: number,
  max: number,
  integerOnly = false
): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return `${field} must be a valid number.`;
  }

  if (numberValue < min || numberValue > max) {
    return `${field} must be between ${min} and ${max}.`;
  }

  if (integerOnly && !Number.isInteger(numberValue)) {
    return `${field} must be a whole number.`;
  }

  return null;
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return Number(value);
}

// ============================================
// GET: Fetch logged-in student's academic data
// ============================================

export async function GET() {
  try {
    const auth = await getAuthenticatedStudent();

    if (!auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const [rows]: any = await mysqlPool.execute(
      `SELECT
          u.user_id,
          u.first_name,
          u.last_name,
          u.email,

          s.major,
          s.graduation_year,

          a.degree,
          a.cgpa,
          a.tenth_percentage,
          a.twelfth_percentage,
          a.diploma_percentage,
          a.active_backlogs,
          a.current_semester,
          a.updated_at

       FROM users u

       LEFT JOIN students s
          ON s.student_id = u.user_id

       LEFT JOIN student_academics a
          ON a.student_id = u.user_id

       WHERE u.user_id = ?
       LIMIT 1`,
      [auth.user.user_id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: "Student profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      academicProfile: rows[0],
    });
  } catch (error) {
    console.error("Academic profile GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch academic profile.",
      },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Create or update academic profile
// ============================================

export async function PUT(request: Request) {
  try {
    const auth = await getAuthenticatedStudent();

    if (!auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    let body: AcademicPayload;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const {
      degree,
      major,
      graduation_year,
      cgpa,
      tenth_percentage,
      twelfth_percentage,
      diploma_percentage,
      active_backlogs,
      current_semester,
    } = body;

    // Validate text fields
    if (
      degree !== undefined &&
      degree !== null &&
      typeof degree !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Degree must be text." },
        { status: 400 }
      );
    }

    if (
      major !== undefined &&
      major !== null &&
      typeof major !== "string"
    ) {
      return NextResponse.json(
        { success: false, error: "Branch must be text." },
        { status: 400 }
      );
    }

    // Validate numeric fields
    const validations = [
      validateOptionalNumber(cgpa, "CGPA", 0, 10),
      validateOptionalNumber(tenth_percentage, "10th percentage", 0, 100),
      validateOptionalNumber(twelfth_percentage, "12th percentage", 0, 100),
      validateOptionalNumber(diploma_percentage, "Diploma percentage", 0, 100),
      validateOptionalNumber(active_backlogs, "Active backlogs", 0, 100, true),
      validateOptionalNumber(current_semester, "Current semester", 1, 20, true),
      validateOptionalNumber(graduation_year, "Graduation year", 2000, 2100, true),
    ];

    const validationError = validations.find(Boolean);

    if (validationError) {
      return NextResponse.json(
        { success: false, error: validationError },
        { status: 400 }
      );
    }

    const userId = auth.user.user_id;

    // Ensure the corresponding student profile exists
    const [studentRows]: any = await mysqlPool.execute(
      `SELECT student_id FROM students WHERE student_id = ? LIMIT 1`,
      [userId]
    );

    if (!studentRows.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Student profile record does not exist.",
        },
        { status: 404 }
      );
    }

    const connection = await mysqlPool.getConnection();

    try {
      await connection.beginTransaction();

      // Save academic details
      await connection.execute(
        `INSERT INTO student_academics (
            student_id,
            degree,
            cgpa,
            tenth_percentage,
            twelfth_percentage,
            diploma_percentage,
            active_backlogs,
            current_semester
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)

         ON DUPLICATE KEY UPDATE
            degree = VALUES(degree),
            cgpa = VALUES(cgpa),
            tenth_percentage = VALUES(tenth_percentage),
            twelfth_percentage = VALUES(twelfth_percentage),
            diploma_percentage = VALUES(diploma_percentage),
            active_backlogs = VALUES(active_backlogs),
            current_semester = VALUES(current_semester)`,
        [
          userId,
          degree?.trim() || null,
          normalizeOptionalNumber(cgpa),
          normalizeOptionalNumber(tenth_percentage),
          normalizeOptionalNumber(twelfth_percentage),
          normalizeOptionalNumber(diploma_percentage),
          normalizeOptionalNumber(active_backlogs),
          normalizeOptionalNumber(current_semester),
        ]
      );

      // Keep existing student profile fields synchronized
      const studentUpdates: string[] = [];
      const studentValues: any[] = [];

      if (major !== undefined) {
        studentUpdates.push("major = ?");
        studentValues.push(major?.trim() || "");
      }

      if (graduation_year !== undefined) {
        studentUpdates.push("graduation_year = ?");
        studentValues.push(normalizeOptionalNumber(graduation_year));
      }

      if (studentUpdates.length > 0) {
        studentValues.push(userId);

        await connection.execute(
          `UPDATE students
           SET ${studentUpdates.join(", ")}
           WHERE student_id = ?`,
          studentValues
        );
      }

      await connection.commit();

      return NextResponse.json({
        success: true,
        message: "Academic profile saved successfully.",
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Academic profile PUT error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to save academic profile.",
      },
      { status: 500 }
    );
  }
}
