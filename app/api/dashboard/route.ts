import { NextResponse } from "next/server";
import { mysqlPool } from "@/lib/mysql";

// GET: Fetch currently open opportunities and their company details.
export async function GET() {
  try {
    const [rows]: any = await mysqlPool.query(`
      SELECT
        o.opportunity_id,
        o.title,
        o.opportunity_type,
        o.description,
        o.required_skills,
        o.stipend,
        o.deadline,
        o.status,
        c.company_id,
        c.name AS company_name,
        c.industry AS company_industry,
        c.website AS company_website,
        c.location AS company_location
      FROM Opportunities o
      JOIN Companies c
        ON o.company_id = c.company_id
      WHERE o.status = 'Open'
      ORDER BY o.opportunity_id DESC
    `);

    return NextResponse.json({
      success: true,
      opportunities: rows || [],
    });
  } catch (error: any) {
    console.error("Dashboard GET error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch available opportunities.",
      },
      { status: 500 }
    );
  }
}

// POST: Add a new opportunity. Existing behavior is retained.
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      company_name,
      title,
      opportunity_type,
      required_skills,
      description,
    } = body;

    if (
      typeof title !== "string" ||
      !title.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      typeof required_skills !== "string" ||
      !required_skills.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Title, required skills, and description are mandatory.",
        },
        { status: 400 }
      );
    }

    const targetCompany =
      typeof company_name === "string" && company_name.trim()
        ? company_name.trim()
        : "XYZ Corp";

    const [existingCompanies]: any = await mysqlPool.query(
      `SELECT company_id
       FROM Companies
       WHERE LOWER(name) = LOWER(?)
       LIMIT 1`,
      [targetCompany]
    );

    let companyId: number;

    if (existingCompanies.length > 0) {
      companyId = existingCompanies[0].company_id;
    } else {
      const [companyResult]: any = await mysqlPool.query(
        `INSERT INTO Companies (name)
         VALUES (?)`,
        [targetCompany]
      );

      companyId = companyResult.insertId;
    }

    const validTypes = ["Internship", "Project", "Full-Time"];

    const selectedType =
      typeof opportunity_type === "string" &&
      validTypes.includes(opportunity_type.trim())
        ? opportunity_type.trim()
        : "Internship";

    const [result]: any = await mysqlPool.query(
      `INSERT INTO Opportunities (
          company_id,
          title,
          opportunity_type,
          description,
          required_skills
       )
       VALUES (?, ?, ?, ?, ?)`,
      [
        companyId,
        title.trim(),
        selectedType,
        description.trim(),
        required_skills.trim(),
      ]
    );

    return NextResponse.json(
      {
        success: true,
        opportunity_id: result.insertId,
        message: "Opportunity successfully posted!",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Dashboard POST error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to save opportunity.",
      },
      { status: 500 }
    );
  }
}
