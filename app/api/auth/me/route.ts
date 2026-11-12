import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { mysqlPool } from "@/lib/mysql";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("internhub_session")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Not authenticated." },
        { status: 401 }
      );
    }

    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      throw new Error("AUTH_SECRET is not configured.");
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    const userId = Number(payload.userId);

    if (!userId || payload.role !== "STUDENT") {
      return NextResponse.json(
        { success: false, message: "Student access required." },
        { status: 403 }
      );
    }

    const [rows]: any = await mysqlPool.execute(
      `SELECT user_id, first_name, last_name, email, role
       FROM users
       WHERE user_id = ?
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: rows[0],
    });
  } catch (error) {
    console.error("Auth me API error:", error);

    return NextResponse.json(
      { success: false, message: "Invalid or expired session." },
      { status: 401 }
    );
  }
}
