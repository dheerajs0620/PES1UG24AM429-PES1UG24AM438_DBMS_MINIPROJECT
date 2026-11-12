
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { mysqlPool } from "@/lib/mysql";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    // 1. Read authentication cookie
    const token = request.cookies.get("internhub_session")?.value;
    const secret = process.env.AUTH_SECRET;

    if (!token || !secret) {
      return NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      );
    }

    // 2. Verify JWT
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    // 3. Verify Super Admin role
    if (payload.role !== "SUPER_ADMIN" || !payload.userId) {
      return NextResponse.json(
        { success: false, message: "Super Admin access required." },
        { status: 403 }
      );
    }

    // 4. Convert JWT userId into a valid MySQL integer
    const userId = Number(payload.userId);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { success: false, message: "Invalid admin user ID." },
        { status: 401 }
      );
    }

    // 5. Fetch Super Admin details
    const [rows] = await mysqlPool.execute(
      `SELECT
        user_id,
        first_name,
        last_name,
        email,
        role
       FROM users
       WHERE user_id = ?
       AND role = 'SUPER_ADMIN'
       LIMIT 1`,
      [userId]
    );

    const admins = rows as any[];

    // 6. Check if account exists
    if (admins.length === 0) {
      return NextResponse.json(
        { success: false, message: "Admin account not found." },
        { status: 404 }
      );
    }

    // 7. Return admin details
    return NextResponse.json({
      success: true,
      user: admins[0],
    });

  } catch (error) {
    console.error("Admin identity GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to verify admin session.",
      },
      { status: 401 }
    );
  }
}
