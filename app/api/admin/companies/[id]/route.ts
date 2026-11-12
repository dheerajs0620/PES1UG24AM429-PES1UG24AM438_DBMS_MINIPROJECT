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

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    if (!(await requireSuperAdmin(request))) {
      return NextResponse.json({ success: false, message: "Super Admin access required." }, { status: 403 });
    }

    const { id } = await context.params;
    const companyId = Number(id);
    if (!Number.isSafeInteger(companyId) || companyId <= 0) {
      return NextResponse.json({ success: false, message: "Invalid company ID." }, { status: 400 });
    }

    const body = await request.json();
    const approvalStatus = String(body.approval_status ?? "").toUpperCase();
    if (!["APPROVED", "REJECTED"].includes(approvalStatus)) {
      return NextResponse.json({ success: false, message: "approval_status must be APPROVED or REJECTED." }, { status: 400 });
    }

    const [result]: any = await mysqlPool.execute(
      "UPDATE companies SET approval_status = ? WHERE company_id = ?",
      [approvalStatus, companyId]
    );
    if (result.affectedRows === 0) {
      const [existing]: any = await mysqlPool.execute(
        "SELECT company_id FROM companies WHERE company_id = ? LIMIT 1",
        [companyId]
      );
      if (!existing.length) {
        return NextResponse.json({ success: false, message: "Company account not found." }, { status: 404 });
      }
    }

    const [rows]: any = await mysqlPool.execute(
      "SELECT company_id, name AS company_name, approval_status FROM companies WHERE company_id = ? LIMIT 1",
      [companyId]
    );
    return NextResponse.json({
      success: true,
      message: `Company ${approvalStatus.toLowerCase()} successfully.`,
      company: rows[0],
    });
  } catch (error) {
    console.error("Admin company approval PATCH error:", error);
    return NextResponse.json({ success: false, message: "Unable to update company approval status." }, { status: 500 });
  }
}
