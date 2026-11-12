
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { mysqlPool } from "@/lib/mysql";

export const runtime = "nodejs";

type SignupBody = {
  accountType?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  srn?: string;
  companyName?: string;
  industry?: string;
  website?: string;
  location?: string;
};

const SRN_REGEX = /^PES1UG\d{2}[A-Z]{2}\d{3}$/;

function validOptionalUrl(value: string): boolean {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  let connection: any;

  try {
    const body = (await request.json()) as SignupBody;

    const accountType = String(
      body.accountType ?? "STUDENT"
    ).toUpperCase();

    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const srn = String(body.srn ?? "").trim().toUpperCase();

    // Public signup cannot create privileged accounts.
    if (
      accountType === "SUPER_ADMIN" ||
      !["STUDENT", "COMPANY"].includes(accountType)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This account type cannot be created through public signup.",
        },
        { status: 403 }
      );
    }

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Please fill in all required fields.",
        },
        { status: 400 }
      );
    }

    if (
      firstName.length > 50 ||
      lastName.length > 50 ||
      email.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "One or more fields exceed the allowed length.",
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: "Password must contain at least 8 characters.",
        },
        { status: 400 }
      );
    }

    // SRN is mandatory for students.
    if (accountType === "STUDENT") {
      if (!srn) {
        return NextResponse.json(
          {
            success: false,
            message: "Please enter your PES University SRN.",
          },
          { status: 400 }
        );
      }

      if (!SRN_REGEX.test(srn)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Invalid SRN format. Use the format PES1UG24AM438.",
          },
          { status: 400 }
        );
      }
    }

    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      console.error("AUTH_SECRET is not configured.");

      return NextResponse.json(
        {
          success: false,
          message: "Authentication is not configured on the server.",
        },
        { status: 500 }
      );
    }

    let companyName = "";
    let industry = "";
    let website = "";
    let location = "";

    if (accountType === "COMPANY") {
      companyName = String(body.companyName ?? "").trim();
      industry = String(body.industry ?? "").trim();
      website = String(body.website ?? "").trim();
      location = String(body.location ?? "").trim();

      if (!companyName || companyName.length > 100) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Enter a company name (maximum 100 characters).",
          },
          { status: 400 }
        );
      }

      if (
        industry.length > 100 ||
        website.length > 150 ||
        location.length > 100
      ) {
        return NextResponse.json(
          {
            success: false,
            message:
              "One or more company details exceed the allowed length.",
          },
          { status: 400 }
        );
      }

      if (!validOptionalUrl(website)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Enter a valid company website beginning with http:// or https://.",
          },
          { status: 400 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    connection = await mysqlPool.getConnection();
    await connection.beginTransaction();

    // Check duplicate email.
    const [existingEmail]: any = await connection.execute(
      `SELECT user_id
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (existingEmail.length > 0) {
      await connection.rollback();

      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    // Check duplicate SRN.
    if (accountType === "STUDENT") {
      const [existingSrn]: any = await connection.execute(
        `SELECT student_id
         FROM students
         WHERE UPPER(srn) = ?
         LIMIT 1`,
        [srn]
      );

      if (existingSrn.length > 0) {
        await connection.rollback();

        return NextResponse.json(
          {
            success: false,
            message:
              "This SRN is already registered. Please sign in or contact support.",
          },
          { status: 409 }
        );
      }
    }

    // Create user account.
    const [userResult]: any = await connection.execute(
      `INSERT INTO users
         (first_name, last_name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?)`,
      [firstName, lastName, email, passwordHash, accountType]
    );

    const userId = userResult.insertId;

    if (accountType === "STUDENT") {
      // Create student profile with SRN.
      await connection.execute(
        `INSERT INTO students
           (student_id, srn, major, graduation_year, college)
         VALUES (?, ?, ?, ?, ?)`,
        [
          userId,
          srn,
          "Not specified",
          0,
          "PES University",
        ]
      );
    } else {
      // Preserve existing company registration.
      await connection.execute(
        `INSERT INTO companies
           (name, industry, website, location, user_id, approval_status)
         VALUES (?, ?, ?, ?, ?, 'PENDING')`,
        [
          companyName,
          industry || null,
          website || null,
          location || null,
          userId,
        ]
      );
    }

    // Create session token.
    const token = await new SignJWT({
      userId,
      email,
      role: accountType,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(secret));

    await connection.commit();

    const response = NextResponse.json(
      {
        success: true,
        message:
          accountType === "COMPANY"
            ? "Company account created. Your account is pending Super Admin approval."
            : "Student account created successfully.",
        user: {
          user_id: userId,
          first_name: firstName,
          last_name: lastName,
          email,
          srn: accountType === "STUDENT" ? srn : null,
          role: accountType,
          approval_status:
            accountType === "COMPANY" ? "PENDING" : null,
        },
      },
      { status: 201 }
    );

    response.cookies.set("internhub_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error: any) {
    if (connection) {
      await connection.rollback().catch(() => {});
    }

    console.error("Signup API error:", error);

    if (error?.code === "ER_DUP_ENTRY") {
      const duplicateMessage = String(
        error?.sqlMessage ?? error?.message ?? ""
      ).toLowerCase();

      if (duplicateMessage.includes("srn")) {
        return NextResponse.json(
          {
            success: false,
            message:
              "This SRN is already registered. Please sign in or contact support.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to create your account. Please try again.",
      },
      { status: 500 }
    );
  } finally {
    connection?.release();
  }
}
