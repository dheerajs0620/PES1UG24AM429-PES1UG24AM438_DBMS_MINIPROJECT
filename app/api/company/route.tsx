// app/api/company/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { mysqlPool } from "@/lib/mysql";

type AuthResult =
  | { ok: true; userId: number }
  | { ok: false; status: number; message: string };

type EligibilityInput = {
  min_cgpa: number | null;
  min_tenth_percentage: number | null;
  min_twelfth_percentage: number | null;
  min_diploma_percentage: number | null;
  max_active_backlogs: number | null;
  min_semester: number | null;
  max_semester: number | null;
  eligible_degrees: string[];
  eligible_branches: string[];
  eligible_graduation_years: number[];
  other_requirements: string | null;
};

async function authenticateCompany(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("internhub_session")?.value;

    if (!token) {
      return { ok: false, status: 401, message: "Please sign in." };
    }

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      return {
        ok: false,
        status: 500,
        message: "Authentication is not configured.",
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
      payload.role !== "COMPANY"
    ) {
      return {
        ok: false,
        status: 403,
        message: "Company access required.",
      };
    }

    const [users]: any = await mysqlPool.execute(
      "SELECT user_id FROM users WHERE user_id = ? AND role = 'COMPANY' LIMIT 1",
      [userId]
    );

    if (!users.length) {
      return {
        ok: false,
        status: 403,
        message: "Company account not found.",
      };
    }

    return { ok: true, userId };
  } catch {
    return {
      ok: false,
      status: 401,
      message: "Your session is invalid or has expired.",
    };
  }
}

async function getCompany(userId: number) {
  const [rows]: any = await mysqlPool.execute(
    `SELECT company_id, name, industry, website, location, approval_status
     FROM companies
     WHERE user_id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] ?? null;
}

function authError(result: Extract<AuthResult, { ok: false }>) {
  return NextResponse.json(
    { success: false, message: result.message },
    { status: result.status }
  );
}

function optionalNumber(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : NaN;
}

function parseStringList(value: unknown, fieldName: string): string[] {
  if (value === null || value === undefined || value === "") return [];

  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be a list.`);
  }

  const values = value.map((item) => String(item).trim()).filter(Boolean);

  if (values.some((item) => item.length > 100)) {
    throw new Error(
      `Each ${fieldName} entry must be 100 characters or fewer.`
    );
  }

  return [...new Set(values)];
}

function parseYearList(value: unknown): number[] {
  if (value === null || value === undefined || value === "") return [];

  if (!Array.isArray(value)) {
    throw new Error("Eligible graduation years must be a list.");
  }

  const years = value.map(Number);

  if (
    years.some(
      (year) => !Number.isInteger(year) || year < 2000 || year > 2100
    )
  ) {
    throw new Error(
      "Graduation years must be valid years between 2000 and 2100."
    );
  }

  return [...new Set(years)];
}

function readEligibility(value: unknown): EligibilityInput | null {
  if (value === undefined || value === null) return null;

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid eligibility details.");
  }

  const input = value as Record<string, unknown>;

  const eligibility: EligibilityInput = {
    min_cgpa: optionalNumber(input.min_cgpa),
    min_tenth_percentage: optionalNumber(input.min_tenth_percentage),
    min_twelfth_percentage: optionalNumber(input.min_twelfth_percentage),
    min_diploma_percentage: optionalNumber(input.min_diploma_percentage),
    max_active_backlogs: optionalNumber(input.max_active_backlogs),
    min_semester: optionalNumber(input.min_semester),
    max_semester: optionalNumber(input.max_semester),
    eligible_degrees: parseStringList(
      input.eligible_degrees,
      "eligible degrees"
    ),
    eligible_branches: parseStringList(
      input.eligible_branches,
      "eligible branches"
    ),
    eligible_graduation_years: parseYearList(
      input.eligible_graduation_years
    ),
    other_requirements:
      input.other_requirements == null ||
      String(input.other_requirements).trim() === ""
        ? null
        : String(input.other_requirements).trim(),
  };

  const numericRules: Array<{
    key: keyof EligibilityInput;
    label: string;
    min: number;
    max: number;
    integer?: boolean;
  }> = [
    { key: "min_cgpa", label: "Minimum CGPA", min: 0, max: 10 },
    {
      key: "min_tenth_percentage",
      label: "Minimum 10th percentage",
      min: 0,
      max: 100,
    },
    {
      key: "min_twelfth_percentage",
      label: "Minimum 12th percentage",
      min: 0,
      max: 100,
    },
    {
      key: "min_diploma_percentage",
      label: "Minimum diploma percentage",
      min: 0,
      max: 100,
    },
    {
      key: "max_active_backlogs",
      label: "Maximum active backlogs",
      min: 0,
      max: 100,
      integer: true,
    },
    {
      key: "min_semester",
      label: "Minimum semester",
      min: 1,
      max: 20,
      integer: true,
    },
    {
      key: "max_semester",
      label: "Maximum semester",
      min: 1,
      max: 20,
      integer: true,
    },
  ];

  for (const rule of numericRules) {
    const current = eligibility[rule.key];

    if (current === null) continue;

    if (
      typeof current !== "number" ||
      !Number.isFinite(current) ||
      current < rule.min ||
      current > rule.max ||
      (rule.integer && !Number.isInteger(current))
    ) {
      throw new Error(
        `${rule.label} must be between ${rule.min} and ${rule.max}${
          rule.integer ? " (whole number)" : ""
        }.`
      );
    }
  }

  if (
    eligibility.min_semester !== null &&
    eligibility.max_semester !== null &&
    eligibility.min_semester > eligibility.max_semester
  ) {
    throw new Error(
      "Minimum semester cannot be greater than maximum semester."
    );
  }

  if (
    eligibility.other_requirements &&
    eligibility.other_requirements.length > 2000
  ) {
    throw new Error(
      "Other requirements must be 2000 characters or fewer."
    );
  }

  const hasCriteria =
    eligibility.min_cgpa !== null ||
    eligibility.min_tenth_percentage !== null ||
    eligibility.min_twelfth_percentage !== null ||
    eligibility.min_diploma_percentage !== null ||
    eligibility.max_active_backlogs !== null ||
    eligibility.min_semester !== null ||
    eligibility.max_semester !== null ||
    eligibility.eligible_degrees.length > 0 ||
    eligibility.eligible_branches.length > 0 ||
    eligibility.eligible_graduation_years.length > 0 ||
    eligibility.other_requirements !== null;

  return hasCriteria ? eligibility : null;
}

/* =========================================================
   GET COMPANY DASHBOARD + APPLICANT DETAILS
========================================================= */

export async function GET() {
  try {
    const auth = await authenticateCompany();
    if (!auth.ok) return authError(auth);

    const company = await getCompany(auth.userId);

    if (!company) {
      return NextResponse.json(
        {
          success: false,
          message: "No company profile is linked to this account.",
        },
        { status: 404 }
      );
    }

    const [postingRows]: any = await mysqlPool.execute(
      `SELECT
         o.opportunity_id,
         o.title,
         o.opportunity_type,
         o.description,
         o.required_skills,
         o.deadline,
         o.status,
         o.stipend,
         o.created_at,
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
       FROM opportunities o
       LEFT JOIN opportunity_eligibility e
         ON e.opportunity_id = o.opportunity_id
       WHERE o.company_id = ?
       ORDER BY o.created_at DESC, o.opportunity_id DESC`,
      [company.company_id]
    );

    const [statsRows]: any = await mysqlPool.execute(
      `SELECT
         (SELECT COUNT(*)
          FROM opportunities
          WHERE company_id = ?) AS total_postings,

         (SELECT COUNT(*)
          FROM opportunities
          WHERE company_id = ? AND status = 'Open') AS active_postings,

         (SELECT COUNT(*)
          FROM applications a
          INNER JOIN opportunities o
            ON o.opportunity_id = a.opportunity_id
          WHERE o.company_id = ?) AS total_applications,

         (SELECT COUNT(*)
          FROM applications a
          INNER JOIN opportunities o
            ON o.opportunity_id = a.opportunity_id
          WHERE o.company_id = ?
            AND LOWER(a.status) = 'shortlisted') AS shortlisted,

         (SELECT COUNT(*)
          FROM applications a
          INNER JOIN opportunities o
            ON o.opportunity_id = a.opportunity_id
          WHERE o.company_id = ?
            AND (
              LOWER(a.status) IN ('selected', 'hired')
              OR a.current_stage = 'Offer'
            )
         ) AS hired`,
      [
        company.company_id,
        company.company_id,
        company.company_id,
        company.company_id,
        company.company_id,
      ]
    );

    /*
      Applicant details are joined using the verified schema:
      applications.student_id -> students.student_id
      students.student_id -> users.user_id

      Recommendation score and skill breakdown come from the latest
      recommendation_history record for the same student and opportunity.
      applications.match_score is used only as a fallback.
    */

    const [allApplicationRows]: any = await mysqlPool.execute(
      `SELECT
         a.application_id,
         a.student_id,
         a.candidate_name,
         a.candidate_email,
         COALESCE(rh.match_score, a.match_score) AS match_score,
         a.status,
         a.current_stage,
         a.applied_at,
         a.applied_date,
         a.extracted_skills,

         o.opportunity_id,
         o.title AS opportunity_title,
         o.opportunity_type,
         o.description AS opportunity_description,
         o.required_skills,
         o.deadline,
         o.stipend,

         u.first_name,
         u.last_name,
         u.email AS student_email,

         s.srn,
         s.major,
         s.graduation_year,
         s.portfolio_summary,
         s.college,
         s.phone,
         s.portfolio_url,
         s.linkedin_url,
         s.github_url,

         sa.degree,
         sa.cgpa,
         sa.tenth_percentage,
         sa.twelfth_percentage,
         sa.diploma_percentage,
         sa.active_backlogs,
         sa.current_semester,

         skill_summary.skills,

         rh.matched_skills,
         rh.missing_skills,
         rh.generated_at AS recommendation_generated_at

       FROM applications a

       INNER JOIN opportunities o
         ON o.opportunity_id = a.opportunity_id

       LEFT JOIN students s
         ON s.student_id = a.student_id

       LEFT JOIN users u
         ON u.user_id = s.student_id

       LEFT JOIN student_academics sa
         ON sa.student_id = s.student_id

       LEFT JOIN (
         SELECT
           ss.student_id,
           GROUP_CONCAT(
             CONCAT(
               sk.skill_name,
               CASE
                 WHEN ss.proficiency IS NOT NULL
                 THEN CONCAT(' (', ss.proficiency, ')')
                 ELSE ''
               END
             )
             ORDER BY sk.skill_name
             SEPARATOR ', '
           ) AS skills
         FROM student_skills ss
         INNER JOIN skills sk
           ON sk.skill_id = ss.skill_id
         GROUP BY ss.student_id
       ) skill_summary
         ON skill_summary.student_id = s.student_id

       LEFT JOIN recommendation_history rh
         ON rh.recommendation_id = (
           SELECT rh2.recommendation_id
           FROM recommendation_history rh2
           WHERE rh2.student_id = a.student_id
             AND rh2.opportunity_id = a.opportunity_id
           ORDER BY
             rh2.generated_at DESC,
             rh2.recommendation_id DESC
           LIMIT 1
         )

       WHERE o.company_id = ?

       ORDER BY
         COALESCE(a.applied_at, a.applied_date) DESC,
         a.application_id DESC`,
      [company.company_id]
    );

    const [trendRows]: any = await mysqlPool.execute(
      `SELECT
         DATE(COALESCE(a.applied_at, a.applied_date)) AS day,
         COUNT(*) AS applications
       FROM applications a
       INNER JOIN opportunities o
         ON o.opportunity_id = a.opportunity_id
       WHERE o.company_id = ?
         AND DATE(COALESCE(a.applied_at, a.applied_date))
             >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
       GROUP BY DATE(COALESCE(a.applied_at, a.applied_date))
       ORDER BY day ASC`,
      [company.company_id]
    );

    const [roleRows]: any = await mysqlPool.execute(
      `SELECT
         o.opportunity_type AS role,
         COUNT(a.application_id) AS applications
       FROM opportunities o
       LEFT JOIN applications a
         ON a.opportunity_id = o.opportunity_id
       WHERE o.company_id = ?
       GROUP BY o.opportunity_type
       ORDER BY applications DESC`,
      [company.company_id]
    );

    const allApplications = allApplicationRows ?? [];

    return NextResponse.json({
      success: true,
      company,

      stats: statsRows[0] ?? {
        total_postings: 0,
        active_postings: 0,
        total_applications: 0,
        shortlisted: 0,
        hired: 0,
      },

      opportunities: postingRows ?? [],
      recentApplications: allApplications.slice(0, 12),
      applications: allApplications,
      applicationTrend: trendRows ?? [],
      applicationsByType: roleRows ?? [],
    });
  } catch (error) {
    console.error("Company dashboard GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load company dashboard.",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
   POST NEW INTERNSHIP
========================================================= */

export async function POST(request: Request) {
  let connection: any;

  try {
    const auth = await authenticateCompany();
    if (!auth.ok) return authError(auth);

    const company = await getCompany(auth.userId);

    if (!company) {
      return NextResponse.json(
        { success: false, message: "Company profile not found." },
        { status: 404 }
      );
    }

    if (company.approval_status !== "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          message:
            company.approval_status === "REJECTED"
              ? "Your company account was rejected. Contact the platform administrator."
              : "Your company account is awaiting Super Admin approval. You can prepare your profile, but cannot publish internships yet.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const title = String(body.title ?? "").trim();
    const opportunityType = String(
      body.opportunity_type ?? "Internship"
    ).trim();
    const description = String(body.description ?? "").trim();
    const requiredSkills = String(body.required_skills ?? "").trim();
    const deadline = body.deadline ? String(body.deadline).trim() : null;

    const stipend =
      body.stipend === "" || body.stipend == null
        ? 0
        : Number(body.stipend);

    if (!title || !description || !requiredSkills) {
      return NextResponse.json(
        {
          success: false,
          message: "Title, description and required skills are mandatory.",
        },
        { status: 400 }
      );
    }

    if (title.length > 100) {
      return NextResponse.json(
        { success: false, message: "Title must be 100 characters or fewer." },
        { status: 400 }
      );
    }

    if (!["Internship", "Project", "Full-Time"].includes(opportunityType)) {
      return NextResponse.json(
        { success: false, message: "Choose a valid opportunity type." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(stipend) ||
      stipend < 0 ||
      stipend > 99999999
    ) {
      return NextResponse.json(
        { success: false, message: "Enter a valid non-negative stipend." },
        { status: 400 }
      );
    }

    if (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      return NextResponse.json(
        { success: false, message: "Enter a valid application deadline." },
        { status: 400 }
      );
    }

    let eligibility: EligibilityInput | null;

    try {
      eligibility = readEligibility(body.eligibility);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Invalid eligibility details.",
        },
        { status: 400 }
      );
    }

    connection = await mysqlPool.getConnection();
    await connection.beginTransaction();

    const [result]: any = await connection.execute(
      `INSERT INTO opportunities
       (
         company_id,
         title,
         opportunity_type,
         description,
         required_skills,
         deadline,
         stipend,
         status
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Open')`,
      [
        company.company_id,
        title,
        opportunityType,
        description,
        requiredSkills,
        deadline,
        stipend,
      ]
    );

    const opportunityId = Number(result.insertId);

    if (eligibility) {
      await connection.execute(
        `INSERT INTO opportunity_eligibility
         (
           opportunity_id,
           min_cgpa,
           min_tenth_percentage,
           min_twelfth_percentage,
           min_diploma_percentage,
           max_active_backlogs,
           eligible_degrees,
           eligible_branches,
           eligible_graduation_years,
           min_semester,
           max_semester,
           other_requirements
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          opportunityId,
          eligibility.min_cgpa,
          eligibility.min_tenth_percentage,
          eligibility.min_twelfth_percentage,
          eligibility.min_diploma_percentage,
          eligibility.max_active_backlogs,
          JSON.stringify(eligibility.eligible_degrees),
          JSON.stringify(eligibility.eligible_branches),
          JSON.stringify(eligibility.eligible_graduation_years),
          eligibility.min_semester,
          eligibility.max_semester,
          eligibility.other_requirements,
        ]
      );
    }

    await connection.commit();

    return NextResponse.json(
      {
        success: true,
        message: "Internship posted successfully.",
        opportunity_id: opportunityId,
        eligibility_saved: Boolean(eligibility),
      },
      { status: 201 }
    );
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Company opportunity rollback error:", rollbackError);
      }
    }

    console.error("Company opportunity POST error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to create the internship.",
      },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

/* =========================================================
   PATCH APPLICATION / OPPORTUNITY STATUS
========================================================= */

export async function PATCH(request: Request) {
  try {
    const auth = await authenticateCompany();
    if (!auth.ok) return authError(auth);

    const company = await getCompany(auth.userId);

    if (!company) {
      return NextResponse.json(
        { success: false, message: "Company profile not found." },
        { status: 404 }
      );
    }

    const body = await request.json();

    if (body.action === "update_application") {
      const applicationId = Number(body.application_id);
      const status = String(body.status ?? "");

      const stageMap: Record<string, string> = {
        Applied: "Applied",
        "Under Review": "Applied",
        Shortlisted: "Assessment",
        Interview: "Interview",
        Selected: "Offer",
        Rejected: "Rejected",
      };

      if (
        !Number.isInteger(applicationId) ||
        applicationId <= 0 ||
        !stageMap[status]
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid application update." },
          { status: 400 }
        );
      }

      const [result]: any = await mysqlPool.execute(
        `UPDATE applications a
         INNER JOIN opportunities o
           ON o.opportunity_id = a.opportunity_id
         SET
           a.status = ?,
           a.current_stage = ?
         WHERE
           a.application_id = ?
           AND o.company_id = ?`,
        [
          status,
          stageMap[status],
          applicationId,
          company.company_id,
        ]
      );

      if (!result.affectedRows) {
        return NextResponse.json(
          {
            success: false,
            message: "Application not found for this company.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Application status updated.",
      });
    }

    if (body.action === "update_opportunity") {
      const opportunityId = Number(body.opportunity_id);
      const status = String(body.status ?? "");

      if (
        !Number.isInteger(opportunityId) ||
        opportunityId <= 0 ||
        !["Open", "Closed"].includes(status)
      ) {
        return NextResponse.json(
          { success: false, message: "Invalid internship update." },
          { status: 400 }
        );
      }

      const [result]: any = await mysqlPool.execute(
        `UPDATE opportunities
         SET status = ?
         WHERE opportunity_id = ?
           AND company_id = ?`,
        [status, opportunityId, company.company_id]
      );

      if (!result.affectedRows) {
        return NextResponse.json(
          {
            success: false,
            message: "Internship not found for this company.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Internship status updated.",
      });
    }

    return NextResponse.json(
      { success: false, message: "Unknown company action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Company dashboard PATCH error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update the requested item.",
      },
      { status: 500 }
    );
  }
}