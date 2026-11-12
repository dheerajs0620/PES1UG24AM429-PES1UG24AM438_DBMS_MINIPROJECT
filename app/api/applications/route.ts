
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { mysqlPool } from "@/lib/mysql";

async function getAuthenticatedStudent() {
  const token = (await cookies()).get("internhub_session")?.value;

  if (!token) {
    return { user: null, status: 401, error: "Not authenticated." };
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

    if (!userId || payload.role !== "STUDENT") {
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

    return { user: rows[0], status: 200, error: null };
  } catch {
    return {
      user: null,
      status: 401,
      error: "Invalid or expired session.",
    };
  }
}

function calculateMedian(values: number[]): number {
  if (!values.length) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

// GET: Authenticated student's applications + stipend analytics
export async function GET() {
  try {
    const auth = await getAuthenticatedStudent();

    if (!auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const [apps]: any = await mysqlPool.execute(
      `SELECT
          a.application_id,
          a.student_id,
          a.opportunity_id,
          a.applied_date,
          a.current_stage,
          a.match_score,
          a.candidate_name,
          a.candidate_email,
          a.status,
          a.extracted_skills,
          o.title,
          o.opportunity_type,
          c.name AS company_name
       FROM Applications a
       JOIN Opportunities o ON a.opportunity_id = o.opportunity_id
       JOIN Companies c ON o.company_id = c.company_id
       WHERE a.candidate_email = ?
       ORDER BY a.application_id DESC`,
      [auth.user.email]
    );

    for (const app of apps) {
      const [history]: any = await mysqlPool.execute(
        `SELECT status, notes, changed_at
         FROM Application_Status_History
         WHERE application_id = ?
         ORDER BY history_id ASC`,
        [app.application_id]
      );

      app.history = history?.length
        ? history
        : [
            {
              status: app.status || app.current_stage || "Applied",
              notes: "Application record created.",
              changed_at: app.applied_date,
            },
          ];
    }

    // Fetch opportunities for stipend analytics.
    const [oppRows]: any = await mysqlPool.execute(
      `SELECT
          title,
          opportunity_type,
          COALESCE(stipend, 0.00) AS stipend
       FROM Opportunities`
    );

    const grouped: Record<
      string,
      { total: number; count: number; values: number[] }
    > = {};

    for (const row of oppRows) {
      const key = `${row.title} (${row.opportunity_type})`;
      const value = Number(row.stipend) || 0;

      if (!grouped[key]) {
        grouped[key] = { total: 0, count: 0, values: [] };
      }

      grouped[key].total += value;
      grouped[key].count += 1;
      grouped[key].values.push(value);
    }

    const stipendAnalytics = Object.entries(grouped).map(
      ([role, item]) => ({
        role,
        count: item.count,
        average_stipend: Number(
          (item.total / item.count).toFixed(2)
        ),
        median_stipend: Number(
          calculateMedian(item.values).toFixed(2)
        ),
      })
    );

    return NextResponse.json({
      success: true,
      applications: apps || [],
      stipend_analytics: stipendAnalytics,
    });
  } catch (error: any) {
    console.error("Applications API GET Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Error fetching applications.",
      },
      { status: 500 }
    );
  }
}

// POST: Apply using the authenticated student's identity.
// Duplicate applications are prevented.
export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedStudent();

    if (!auth.user) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const opportunityId = Number(body.opportunity_id);

    if (!Number.isInteger(opportunityId) || opportunityId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "A valid opportunity ID is required.",
        },
        { status: 400 }
      );
    }

    // Verify that the opportunity exists and is open.
    const [opportunities]: any = await mysqlPool.execute(
      `SELECT opportunity_id
       FROM Opportunities
       WHERE opportunity_id = ? AND status = 'Open'
       LIMIT 1`,
      [opportunityId]
    );

    if (!opportunities.length) {
      return NextResponse.json(
        {
          success: false,
          error: "This opportunity is unavailable or closed.",
        },
        { status: 404 }
      );
    }

    const studentId = Number(auth.user.user_id);

    const candidateName =
      `${auth.user.first_name} ${auth.user.last_name}`.trim();

    const candidateEmail = auth.user.email;

    const skillsText = Array.isArray(body.extracted_skills)
      ? body.extracted_skills.join(", ")
      : "";

    // Get a dedicated connection for the transaction.
    const connection = await mysqlPool.getConnection();

    try {
      await connection.beginTransaction();

      // Insert a new application.
      // The composite UNIQUE constraint on
      // (student_id, opportunity_id) prevents duplicates.
      const [result]: any = await connection.execute(
        `INSERT INTO Applications (
            student_id,
            opportunity_id,
            applied_date,
            current_stage,
            match_score,
            notes,
            candidate_name,
            candidate_email,
            status,
            extracted_skills
         )
         VALUES (?, ?, CURDATE(), 'Applied', NULL, ?, ?, ?, 'Applied', ?)`,
        [
          studentId,
          opportunityId,
          typeof body.notes === "string"
            ? body.notes
            : "Application submitted via InternHub.",
          candidateName,
          candidateEmail,
          skillsText,
        ]
      );

      const applicationId = Number(result.insertId);

      if (!applicationId) {
        throw new Error("Application could not be created.");
      }

      // Insert the initial application status history.
      await connection.execute(
        `INSERT INTO Application_Status_History (
            application_id,
            status,
            notes
         )
         VALUES (?, 'Applied', ?)`,
        [
          applicationId,
          "Initial application submitted by the authenticated student.",
        ]
      );

      // Both inserts succeed together.
      await connection.commit();

      return NextResponse.json({
        success: true,
        message: "Application submitted successfully.",
        application_id: applicationId,
      });

    } catch (error: any) {
      // Roll back if either insert fails.
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Application transaction rollback failed:", rollbackError);
      }

      // MySQL error 1062: duplicate entry for a UNIQUE constraint.
      if (error?.code === "ER_DUP_ENTRY") {
        return NextResponse.json(
          {
            success: false,
            error: "You have already applied for this opportunity.",
          },
          { status: 409 }
        );
      }

      throw error;

    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error("Applications API POST Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to submit application.",
      },
      { status: 500 }
    );
  }
}
