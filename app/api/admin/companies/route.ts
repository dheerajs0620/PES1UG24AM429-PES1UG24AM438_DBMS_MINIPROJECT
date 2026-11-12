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
    return payload.role === "SUPER_ADMIN";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireSuperAdmin(request))) {
      return NextResponse.json({ success: false, message: "Super Admin access required." }, { status: 403 });
    }

    const status = (request.nextUrl.searchParams.get("status") || "ALL").toUpperCase();
    if (!["ALL", "PENDING", "APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid approval status filter." }, { status: 400 });
    }

    const whereClause = status === "ALL" ? "" : "WHERE c.approval_status = ?";
    const params = status === "ALL" ? [] : [status];
    const [companies]: any = await mysqlPool.execute(
      `SELECT c.company_id, c.name AS company_name, c.industry, c.website,
              c.location, c.approval_status, c.user_id,
              u.first_name, u.last_name, u.email, u.created_at AS registered_at
       FROM companies c
       INNER JOIN users u ON u.user_id = c.user_id
       ${whereClause}
       ORDER BY CASE c.approval_status WHEN 'PENDING' THEN 0 WHEN 'APPROVED' THEN 1 ELSE 2 END,
                u.created_at DESC`,
      params
    );
    return NextResponse.json({ success: true, companies });
  } catch (error) {
    console.error("Admin companies GET error:", error);
    return NextResponse.json({ success: false, message: "Unable to fetch company accounts." }, { status: 500 });
  }
}
