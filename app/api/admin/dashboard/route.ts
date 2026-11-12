import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { mysqlPool } from "@/lib/mysql";

export const runtime = "nodejs";

async function requireSuperAdmin(request: NextRequest) {
  const token = request.cookies.get("internhub_session")?.value;
  const secret = process.env.AUTH_SECRET;
  if (!token || !secret) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload.role === "SUPER_ADMIN" && Boolean(payload.userId);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireSuperAdmin(request))) {
      return NextResponse.json({ success: false, message: "Super Admin access required." }, { status: 403 });
    }

    const [overviewRows]: any = await mysqlPool.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'STUDENT') AS student_accounts,
        (SELECT COUNT(*) FROM users WHERE role = 'COMPANY') AS company_accounts,
        (SELECT COUNT(*) FROM users WHERE role = 'SUPER_ADMIN') AS super_admin_accounts,
        (SELECT COUNT(*) FROM students) AS student_profiles,
        (SELECT COUNT(*) FROM companies) AS company_profiles,
        (SELECT COUNT(*) FROM companies WHERE approval_status = 'PENDING') AS pending_companies,
        (SELECT COUNT(*) FROM companies WHERE approval_status = 'APPROVED') AS approved_companies,
        (SELECT COUNT(*) FROM companies WHERE approval_status = 'REJECTED') AS rejected_companies,
        (SELECT COUNT(*) FROM opportunities) AS total_opportunities,
        (SELECT COUNT(*) FROM opportunities WHERE status = 'Open') AS open_opportunities,
        (SELECT COUNT(*) FROM opportunities WHERE status = 'Closed') AS closed_opportunities,
        (SELECT COUNT(*) FROM applications) AS total_applications,
        (SELECT COUNT(*) FROM resumes) AS total_resumes,
        (SELECT COUNT(*) FROM saved_opportunities) AS saved_opportunities
    `);

    const [studentRows]: any = await mysqlPool.query(`
      SELECT u.user_id, u.first_name, u.last_name, u.email, u.created_at,
             s.major, s.graduation_year, s.college, s.phone,
             (SELECT COUNT(*) FROM applications a WHERE a.student_id = s.student_id) AS application_count,
             (SELECT COUNT(*) FROM resumes r WHERE r.student_id = s.student_id) AS resume_count
      FROM users u
      LEFT JOIN students s ON s.student_id = u.user_id
      WHERE u.role = 'STUDENT'
      ORDER BY u.created_at DESC
      LIMIT 250
    `);

    // LEFT JOIN intentionally includes company profiles that have no linked user account.
    const [companyRows]: any = await mysqlPool.query(`
      SELECT c.company_id, c.name AS company_name, c.industry, c.website,
             c.location, c.approval_status, c.user_id,
             u.first_name, u.last_name, u.email, u.created_at AS registered_at
      FROM companies c
      LEFT JOIN users u ON u.user_id = c.user_id
      ORDER BY CASE c.approval_status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END,
               c.company_id DESC
      LIMIT 300
    `);

    const [opportunityRows]: any = await mysqlPool.query(`
      SELECT o.opportunity_id, o.title, o.opportunity_type, o.status,
             o.stipend, o.deadline, o.created_at, c.company_id,
             c.name AS company_name, c.approval_status,
             (SELECT COUNT(*) FROM applications a WHERE a.opportunity_id = o.opportunity_id) AS application_count
      FROM opportunities o
      INNER JOIN companies c ON c.company_id = o.company_id
      ORDER BY o.created_at DESC
      LIMIT 300
    `);

    const [applicationRows]: any = await mysqlPool.query(`
      SELECT a.application_id, a.candidate_name, a.candidate_email,
             a.applied_date, a.applied_at, a.current_stage, a.status,
             a.match_score, a.student_id, o.opportunity_id, o.title AS opportunity_title,
             c.name AS company_name
      FROM applications a
      INNER JOIN opportunities o ON o.opportunity_id = a.opportunity_id
      INNER JOIN companies c ON c.company_id = o.company_id
      ORDER BY COALESCE(a.applied_at, a.applied_date) DESC
      LIMIT 300
    `);

    const [stageRows]: any = await mysqlPool.query(`
      SELECT current_stage AS stage, COUNT(*) AS total
      FROM applications GROUP BY current_stage
      ORDER BY total DESC
    `);

    const [monthlyRows]: any = await mysqlPool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
             COUNT(*) AS total
      FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    const [opportunityTypeRows]: any = await mysqlPool.query(`
      SELECT opportunity_type AS type, COUNT(*) AS total
      FROM opportunities GROUP BY opportunity_type ORDER BY total DESC
    `);

    const [industryRows]: any = await mysqlPool.query(`
      SELECT COALESCE(NULLIF(industry, ''), 'Unspecified') AS industry,
             COUNT(*) AS total
      FROM companies GROUP BY COALESCE(NULLIF(industry, ''), 'Unspecified')
      ORDER BY total DESC LIMIT 8
    `);

    return NextResponse.json({
      success: true,
      generated_at: new Date().toISOString(),
      overview: overviewRows[0] ?? {},
      students: studentRows,
      companies: companyRows,
      opportunities: opportunityRows,
      applications: applicationRows,
      analytics: {
        application_stages: stageRows,
        monthly_registrations: monthlyRows,
        opportunity_types: opportunityTypeRows,
        company_industries: industryRows,
      },
    });
  } catch (error) {
    console.error("Admin dashboard GET error:", error);
    return NextResponse.json({ success: false, message: "Unable to load platform dashboard data." }, { status: 500 });
  }
}
