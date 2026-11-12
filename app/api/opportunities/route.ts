
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

import { mysqlPool } from '@/lib/mysql';
import { pgPool } from '@/lib/postgres';
import { generateEmbedding } from '@/lib/embeddings';

export const runtime = 'nodejs';

const EMBEDDING_DIMENSIONS = 1536;

// -----------------------------------------------------
// Authentication
// -----------------------------------------------------

async function authenticateOpportunityManager() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('internhub_session')?.value;
    const secret = process.env.AUTH_SECRET;

    if (!token || !secret) {
      return {
        authorized: false,
        status: 401,
        message: 'Authentication required.',
      };
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    const role = String(payload.role || '').toUpperCase();

    // Only company users and admins should manage opportunities.
    if (role !== 'COMPANY' && role !== 'ADMIN') {
      return {
        authorized: false,
        status: 403,
        message: 'Only company accounts and administrators can manage opportunities.',
      };
    }

    return {
      authorized: true,
      status: 200,
      message: 'Authorized.',
    };
  } catch {
    return {
      authorized: false,
      status: 401,
      message: 'Invalid or expired session.',
    };
  }
}

// -----------------------------------------------------
// Helpers
// -----------------------------------------------------

function normalizeSkills(value: unknown): string {
  if (value == null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  const raw = String(value).trim();

  // Handle JSON arrays stored as strings.
  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean)
        .join(', ');
    }

    if (parsed && typeof parsed === 'object') {
      return JSON.stringify(parsed);
    }
  } catch {
    // Ordinary text, not JSON.
  }

  return raw;
}

function normalizeSkillsForDatabase(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'string') {
    return value.trim() || null;
  }

  return JSON.stringify(value);
}

function buildEmbeddingText(data: {
  title: string;
  opportunityType: string;
  companyName: string;
  description: string;
  requiredSkills: string;
}) {
  return [
    `Opportunity Title: ${data.title}`,
    `Opportunity Type: ${data.opportunityType}`,
    `Company: ${data.companyName}`,
    `Description: ${data.description}`,
    `Required Skills: ${data.requiredSkills}`,
  ].join('\n');
}

// -----------------------------------------------------
// GET: Fetch opportunities for the company/admin UI
// -----------------------------------------------------

export async function GET() {
  try {
    const auth = await authenticateOpportunityManager();

    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: auth.message,
        },
        { status: auth.status }
      );
    }

    const [rows]: any = await mysqlPool.query(
      `SELECT
          o.opportunity_id,
          o.title,
          o.opportunity_type,
          o.description,
          o.required_skills,
          o.company_id,
          c.name AS company_name
       FROM Opportunities o
       LEFT JOIN Companies c
         ON o.company_id = c.company_id
       ORDER BY o.opportunity_id DESC`
    );

    return NextResponse.json({
      success: true,
      opportunities: rows,
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch opportunities.',
      },
      { status: 500 }
    );
  }
}

// -----------------------------------------------------
// POST: Create or update an opportunity
// -----------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the company/admin.
    const auth = await authenticateOpportunityManager();

    if (!auth.authorized) {
      return NextResponse.json(
        {
          success: false,
          error: auth.message,
        },
        { status: auth.status }
      );
    }

    // 2. Parse request body.
    let body: any;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON request.',
        },
        { status: 400 }
      );
    }

    const {
      opportunity_id,
      company_name,
      title,
      opportunity_type,
      description,
      required_skills,
    } = body;

    // 3. Validate required fields.
    if (
      typeof company_name !== 'string' ||
      !company_name.trim() ||
      typeof title !== 'string' ||
      !title.trim() ||
      typeof description !== 'string' ||
      !description.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Company Name, Title, and Description are required.',
        },
        { status: 400 }
      );
    }

    const normalizedCompany = company_name.trim();
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    const normalizedType =
      typeof opportunity_type === 'string' && opportunity_type.trim()
        ? opportunity_type.trim()
        : 'Internship';

    if (
      normalizedCompany.length > 150 ||
      normalizedTitle.length > 100 ||
      normalizedDescription.length > 20000 ||
      normalizedType.length > 50
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'One or more fields exceed the allowed length.',
        },
        { status: 400 }
      );
    }

    const skillsForDatabase =
      normalizeSkillsForDatabase(required_skills);

    const skillsForEmbedding =
      normalizeSkills(required_skills);

    // Validate an optional opportunity ID.
    let targetOppId: number | null = null;

    if (
      opportunity_id !== undefined &&
      opportunity_id !== null &&
      opportunity_id !== ''
    ) {
      targetOppId = Number(opportunity_id);

      if (
        !Number.isInteger(targetOppId) ||
        targetOppId <= 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid opportunity ID.',
          },
          { status: 400 }
        );
      }
    }

    // 4. Check whether the company already exists.
    const [companyRows]: any = await mysqlPool.query(
      `SELECT company_id
       FROM Companies
       WHERE name = ?
       LIMIT 1`,
      [normalizedCompany]
    );

    let companyId: number;

    if (companyRows.length > 0) {
      companyId = Number(companyRows[0].company_id);
    } else {
      const [insertCompany]: any = await mysqlPool.query(
        `INSERT INTO Companies (name)
         VALUES (?)`,
        [normalizedCompany]
      );

      companyId = Number(insertCompany.insertId);
    }

    // 5. Create or update the MySQL opportunity.
    if (targetOppId !== null) {
      const [updateResult]: any = await mysqlPool.query(
        `UPDATE Opportunities
         SET
           company_id = ?,
           title = ?,
           opportunity_type = ?,
           description = ?,
           required_skills = ?
         WHERE opportunity_id = ?`,
        [
          companyId,
          normalizedTitle,
          normalizedType,
          normalizedDescription,
          skillsForDatabase,
          targetOppId,
        ]
      );

      if (updateResult.affectedRows === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Opportunity not found.',
          },
          { status: 404 }
        );
      }
    } else {
      const [insertResult]: any = await mysqlPool.query(
        `INSERT INTO Opportunities
          (
            company_id,
            title,
            opportunity_type,
            description,
            required_skills
          )
         VALUES (?, ?, ?, ?, ?)`,
        [
          companyId,
          normalizedTitle,
          normalizedType,
          normalizedDescription,
          skillsForDatabase,
        ]
      );

      targetOppId = Number(insertResult.insertId);
    }

    if (!targetOppId) {
      throw new Error('Unable to determine the opportunity ID.');
    }

    // 6. Build the semantic content.
    const embeddingText = buildEmbeddingText({
      title: normalizedTitle,
      opportunityType: normalizedType,
      companyName: normalizedCompany,
      description: normalizedDescription,
      requiredSkills: skillsForEmbedding,
    });

    // 7. Generate Gemini embedding.
    const embedding = await generateEmbedding(
      embeddingText,
      'RETRIEVAL_DOCUMENT'
    );

    if (
      embedding.length !== EMBEDDING_DIMENSIONS ||
      !embedding.every(Number.isFinite)
    ) {
      throw new Error(
        `Invalid embedding. Expected ${EMBEDDING_DIMENSIONS} dimensions.`
      );
    }

    // 8. Synchronize with PostgreSQL + pgvector.
    // Store the actual description here, not embeddingText.
    const vectorString = JSON.stringify(embedding);

    await pgPool.query(
      `INSERT INTO opportunity_vectors
        (
          opportunity_id,
          title,
          description,
          embedding
        )
       VALUES ($1, $2, $3, $4::vector)
       ON CONFLICT (opportunity_id)
       DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         embedding = EXCLUDED.embedding`,
      [
        targetOppId,
        normalizedTitle,
        normalizedDescription,
        vectorString,
      ]
    );

    // 9. Return successful synchronization.
    return NextResponse.json({
      success: true,
      message: 'Opportunity successfully saved and synchronized.',
      opportunity_id: targetOppId,
      synchronization: {
        mysql: true,
        postgresql: true,
        embedding: true,
        embedding_model: 'gemini-embedding-001',
        dimensions: embedding.length,
      },
    });
  } catch (error) {
    console.error('Error managing opportunity:', error);

    // MySQL may already have saved the opportunity if embedding
    // generation or PostgreSQL synchronization failed.
    return NextResponse.json(
      {
        success: false,
        error: 'The opportunity could not be fully synchronized.',
        synchronization: {
          mysql: 'The opportunity may already have been saved.',
          postgresql: 'Synchronization not confirmed.',
          embedding: 'Synchronization not confirmed.',
        },
        message:
          error instanceof Error
            ? error.message
            : 'Unknown server error.',
      },
      { status: 500 }
    );
  }
}
