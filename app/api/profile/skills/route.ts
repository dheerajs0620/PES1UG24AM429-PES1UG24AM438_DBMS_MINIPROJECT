
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { mysqlPool } from "@/lib/mysql";

export const runtime = "nodejs";

type Proficiency = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

const validProficiencies: Proficiency[] = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
];

async function getAuthenticatedStudent() {
  const token = (await cookies()).get("internhub_session")?.value;

  if (!token) {
    return {
      userId: null,
      error: "Authentication required.",
      status: 401,
    };
  }

  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    return {
      userId: null,
      error: "Authentication is not configured.",
      status: 500,
    };
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    const userId = Number(payload.userId);

    if (
      !Number.isInteger(userId) ||
      userId <= 0 ||
      payload.role !== "STUDENT"
    ) {
      return {
        userId: null,
        error: "Student access required.",
        status: 403,
      };
    }

    return {
      userId,
      error: null,
      status: 200,
    };
  } catch {
    return {
      userId: null,
      error: "Invalid or expired session.",
      status: 401,
    };
  }
}

// GET: Fetch student skills and the available skill catalogue.
export async function GET() {
  try {
    const auth = await getAuthenticatedStudent();

    if (!auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    const [skillRows]: any = await mysqlPool.execute(
      `SELECT
          s.skill_id,
          s.skill_name,
          s.skill_category,
          ss.proficiency,
          ss.source,
          ss.confidence_score,
          ss.updated_at
       FROM student_skills ss
       INNER JOIN skills s ON ss.skill_id = s.skill_id
       WHERE ss.student_id = ?
       ORDER BY s.skill_category ASC, s.skill_name ASC`,
      [auth.userId]
    );

    const [catalogueRows]: any = await mysqlPool.execute(
      `SELECT
          skill_id,
          skill_name,
          skill_category
       FROM skills
       ORDER BY skill_category ASC, skill_name ASC`
    );

    const groupedSkills = skillRows.reduce(
      (groups: Record<string, any[]>, skill: any) => {
        const category = skill.skill_category || "General";

        if (!groups[category]) {
          groups[category] = [];
        }

        groups[category].push(skill);
        return groups;
      },
      {}
    );

    return NextResponse.json({
      success: true,
      skills: skillRows,
      groupedSkills,
      availableSkills: catalogueRows,
    });
  } catch (error) {
    console.error("Get profile skills error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve skills.",
      },
      { status: 500 }
    );
  }
}

// POST: Add a skill manually.
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedStudent();

    if (!auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const skillId = Number(body.skill_id);
    const proficiency = String(
      body.proficiency || "BEGINNER"
    ).toUpperCase() as Proficiency;

    if (!Number.isInteger(skillId) || skillId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid skill is required." },
        { status: 400 }
      );
    }

    if (!validProficiencies.includes(proficiency)) {
      return NextResponse.json(
        { success: false, message: "Invalid proficiency level." },
        { status: 400 }
      );
    }

    const [studentRows]: any = await mysqlPool.execute(
      "SELECT student_id FROM students WHERE student_id = ? LIMIT 1",
      [auth.userId]
    );

    if (!studentRows.length) {
      return NextResponse.json(
        { success: false, message: "Student profile not found." },
        { status: 404 }
      );
    }

    const [skillRows]: any = await mysqlPool.execute(
      "SELECT skill_id FROM skills WHERE skill_id = ? LIMIT 1",
      [skillId]
    );

    if (!skillRows.length) {
      return NextResponse.json(
        { success: false, message: "Selected skill does not exist." },
        { status: 404 }
      );
    }

    // Do not overwrite an existing resume-derived or assessed skill.
    const [existingRows]: any = await mysqlPool.execute(
      `SELECT source
       FROM student_skills
       WHERE student_id = ? AND skill_id = ?
       LIMIT 1`,
      [auth.userId, skillId]
    );

    if (existingRows.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            existingRows[0].source === "RESUME"
              ? "This skill is already present from your resume."
              : existingRows[0].source === "ASSESSMENT"
                ? "This skill is already present from an assessment."
                : "This skill is already in your profile.",
        },
        { status: 409 }
      );
    }

    await mysqlPool.execute(
      `INSERT INTO student_skills
        (student_id, skill_id, proficiency, source, confidence_score)
       VALUES (?, ?, ?, 'MANUAL', NULL)`,
      [auth.userId, skillId, proficiency]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Skill added successfully.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Add profile skill error:", error);

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        {
          success: false,
          message: "This skill is already in your profile.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to add skill.",
      },
      { status: 500 }
    );
  }
}

// PATCH: Update a skill's proficiency.
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedStudent();

    if (!auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const skillId = Number(body.skill_id);
    const proficiency = String(
      body.proficiency || ""
    ).toUpperCase() as Proficiency;

    if (!Number.isInteger(skillId) || skillId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid skill is required." },
        { status: 400 }
      );
    }

    if (!validProficiencies.includes(proficiency)) {
      return NextResponse.json(
        { success: false, message: "Invalid proficiency level." },
        { status: 400 }
      );
    }

    const [result]: any = await mysqlPool.execute(
      `UPDATE student_skills
       SET proficiency = ?
       WHERE student_id = ? AND skill_id = ?`,
      [proficiency, auth.userId, skillId]
    );

    if (result.affectedRows === 0) {
      const [rows]: any = await mysqlPool.execute(
        `SELECT skill_id
         FROM student_skills
         WHERE student_id = ? AND skill_id = ?
         LIMIT 1`,
        [auth.userId, skillId]
      );

      if (!rows.length) {
        return NextResponse.json(
          {
            success: false,
            message: "Skill not found in your profile.",
          },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Proficiency updated successfully.",
    });
  } catch (error) {
    console.error("Update profile skill error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update skill proficiency.",
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove manually added skills only.
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedStudent();

    if (!auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error },
        { status: auth.status }
      );
    }

    const body = await request.json();
    const skillId = Number(body.skill_id);

    if (!Number.isInteger(skillId) || skillId <= 0) {
      return NextResponse.json(
        { success: false, message: "A valid skill is required." },
        { status: 400 }
      );
    }

    const [result]: any = await mysqlPool.execute(
      `DELETE FROM student_skills
       WHERE student_id = ?
         AND skill_id = ?
         AND source = 'MANUAL'`,
      [auth.userId, skillId]
    );

    if (result.affectedRows === 0) {
      const [rows]: any = await mysqlPool.execute(
        `SELECT source
         FROM student_skills
         WHERE student_id = ? AND skill_id = ?
         LIMIT 1`,
        [auth.userId, skillId]
      );

      if (!rows.length) {
        return NextResponse.json(
          {
            success: false,
            message: "Skill not found in your profile.",
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message:
            "Only manually added skills can be removed here. Resume and assessment skills are protected.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Manual skill removed successfully.",
    });
  } catch (error) {
    console.error("Delete profile skill error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to remove skill.",
      },
      { status: 500 }
    );
  }
}
