
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { mysqlPool } from "@/lib/mysql";

export const runtime = "nodejs";

type LoginRole = "STUDENT" | "COMPANY" | "SUPER_ADMIN";

const VALID_ROLES: LoginRole[] = [
  "STUDENT",
  "COMPANY",
  "SUPER_ADMIN",
];

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Supports both the new identifier field and old email field.
    const identifier = String(
      body.identifier ?? body.email ?? ""
    ).trim();

    const password = String(body.password ?? "");

    const requestedRole = String(
      body.role ?? "STUDENT"
    ).toUpperCase() as LoginRole;

    if (!identifier || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email/SRN and password are required.",
        },
        { status: 400 }
      );
    }

    if (!VALID_ROLES.includes(requestedRole)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid account type.",
        },
        { status: 400 }
      );
    }

    let rows: any[];

    if (requestedRole === "STUDENT") {
      // Student login: match registered email OR PES SRN.
      const [result]: any = await mysqlPool.execute(
        `SELECT
           u.user_id,
           u.first_name,
           u.last_name,
           u.email,
           u.password_hash,
           u.role,
           s.srn
         FROM users u
         LEFT JOIN students s
           ON s.student_id = u.user_id
         WHERE
           LOWER(u.email) = LOWER(?)
           OR (
             u.role = 'STUDENT'
             AND UPPER(s.srn) = UPPER(?)
           )
         LIMIT 2`,
        [identifier, identifier]
      );

      rows = result;
    } else {
      // Company and Super Admin continue to use email.
      const [result]: any = await mysqlPool.execute(
        `SELECT
           u.user_id,
           u.first_name,
           u.last_name,
           u.email,
           u.password_hash,
           u.role,
           c.company_id,
           c.name AS company_name,
           c.approval_status
         FROM users u
         LEFT JOIN companies c
           ON c.user_id = u.user_id
         WHERE LOWER(u.email) = LOWER(?)
         LIMIT 1`,
        [identifier]
      );

      rows = result;
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email/SRN or password.",
        },
        { status: 401 }
      );
    }

    // Do not authenticate if the same identifier resolves to
    // multiple accounts.
    if (rows.length > 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This identifier matches multiple accounts. Please use your registered email.",
        },
        { status: 409 }
      );
    }

    const user = rows[0];

    if (user.role !== requestedRole) {
      const roleLabel =
        requestedRole === "STUDENT"
          ? "a student"
          : requestedRole === "COMPANY"
            ? "a company"
            : "a Super Admin";

      return NextResponse.json(
        {
          success: false,
          message: `This account is not registered as ${roleLabel}. Choose the correct login type.`,
        },
        { status: 403 }
      );
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid email/SRN or password.",
        },
        { status: 401 }
      );
    }

    if (
      requestedRole === "COMPANY" &&
      !user.company_id
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Company profile is missing. Please contact support.",
        },
        { status: 403 }
      );
    }

    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      console.error("AUTH_SECRET is not configured.");

      return NextResponse.json(
        {
          success: false,
          message:
            "Authentication is not configured on the server.",
        },
        { status: 500 }
      );
    }

    const token = await new SignJWT({
      userId: user.user_id,
      email: user.email,
      role: user.role,
      ...(user.company_id
        ? { companyId: user.company_id }
        : {}),
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(secret));

    let message = "Login successful.";

    if (
      requestedRole === "COMPANY" &&
      user.approval_status === "PENDING"
    ) {
      message =
        "Login successful. Your company account is awaiting admin approval.";
    } else if (
      requestedRole === "COMPANY" &&
      user.approval_status === "REJECTED"
    ) {
      message =
        "Login successful. Your company application was rejected. Contact the administrator.";
    }

    const response = NextResponse.json({
      success: true,
      message,
      user: {
        user_id: user.user_id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        srn: user.srn ?? null,
        company_id: user.company_id ?? null,
        company_name: user.company_name ?? null,
        approval_status: user.approval_status ?? null,
      },
    });

    response.cookies.set("internhub_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to sign in. Please try again.",
      },
      { status: 500 }
    );
  }
}
