
import { loadEnvConfig } from '@next/env';

// Load environment variables BEFORE importing database modules.
loadEnvConfig(process.cwd());

const DIMENSIONS = 1536;

type OpportunityRow = {
  opportunity_id: number;
  title: string;
  opportunity_type: string | null;
  description: string | null;
  required_skills: unknown;
  company_name: string | null;
};

function formatSkills(value: unknown): string {
  if (value == null) return '';

  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  const raw = String(value).trim();

  // Handle JSON arrays stored as strings.
  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return parsed.join(', ');
    }

    if (parsed && typeof parsed === 'object') {
      return JSON.stringify(parsed);
    }
  } catch {
    // The value is ordinary text, not JSON.
  }

  return raw;
}

function buildEmbeddingText(row: OpportunityRow): string {
  const skills = formatSkills(row.required_skills);

  return [
    `Opportunity: ${row.title}`,
    `Type: ${row.opportunity_type || ''}`,
    `Company: ${row.company_name || ''}`,
    `Description: ${row.description || ''}`,
    `Required Skills: ${skills}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function main() {
  // Dynamically import these AFTER loading environment variables.
  const { mysqlPool } = await import('../lib/mysql');
  const { pgPool } = await import('../lib/postgres');
  const { generateEmbedding } = await import('../lib/embeddings');

  console.log('\n========================================');
  console.log('  InternHub Embedding Synchronization');
  console.log('========================================\n');

  // Safe environment check: never print credentials.
  console.log('Environment check:', {
    MYSQL_HOST: process.env.MYSQL_HOST || 'MISSING',
    MYSQL_USER: process.env.MYSQL_USER ? 'LOADED' : 'MISSING',
    MYSQL_DATABASE: process.env.MYSQL_DATABASE || 'MISSING',
    POSTGRES_HOST: process.env.POSTGRES_HOST || 'MISSING',
    POSTGRES_USER: process.env.POSTGRES_USER ? 'LOADED' : 'MISSING',
    POSTGRES_DB: process.env.POSTGRES_DB || 'MISSING',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? 'LOADED' : 'MISSING',
  });

  let successful = 0;
  let failed = 0;

  try {
    // 1. Fetch authoritative opportunity data from MySQL.
    const [rows] = await mysqlPool.query(
      `SELECT
         o.opportunity_id,
         o.title,
         o.opportunity_type,
         o.description,
         o.required_skills,
         c.name AS company_name
       FROM Opportunities o
       LEFT JOIN Companies c
         ON o.company_id = c.company_id
       ORDER BY o.opportunity_id ASC`
    );

    const opportunities = rows as OpportunityRow[];

    console.log(`\nFound ${opportunities.length} MySQL opportunities.\n`);

    // 2. Process sequentially to avoid unnecessary API bursts.
    for (const opportunity of opportunities) {
      const id = opportunity.opportunity_id;

      try {
        console.log(
          `[${successful + failed + 1}/${opportunities.length}] Processing ID ${id}: ${opportunity.title}`
        );

        const embeddingText = buildEmbeddingText(opportunity);

        if (!embeddingText.trim()) {
          throw new Error('No content available for embedding.');
        }

        // 3. Generate a fresh Gemini document embedding.
        const embedding = await generateEmbedding(
          embeddingText,
          'RETRIEVAL_DOCUMENT'
        );

        if (
          embedding.length !== DIMENSIONS ||
          !embedding.every(Number.isFinite)
        ) {
          throw new Error(
            `Invalid embedding. Expected ${DIMENSIONS} valid dimensions.`
          );
        }

        const vectorString = JSON.stringify(embedding);

        // 4. Insert or update PostgreSQL.
        await pgPool.query(
          `INSERT INTO opportunity_vectors
             (opportunity_id, title, description, embedding)
           VALUES ($1, $2, $3, $4::vector)
           ON CONFLICT (opportunity_id)
           DO UPDATE SET
             title = EXCLUDED.title,
             description = EXCLUDED.description,
             embedding = EXCLUDED.embedding`,
          [
            id,
            opportunity.title,
            opportunity.description,
            vectorString,
          ]
        );

        successful++;

        console.log(`   SUCCESS: ID ${id} synchronized.`);
      } catch (error) {
        failed++;

        console.error(
          `   FAILED: ID ${id}:`,
          error instanceof Error ? error.message : error
        );
      }
    }

    // 5. Summary.
    console.log('\n========================================');
    console.log('  Synchronization Summary');
    console.log('========================================');
    console.log(`Total opportunities: ${opportunities.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log('========================================\n');
  } finally {
    // Close both database pools.
    await Promise.all([
      mysqlPool.end(),
      pgPool.end(),
    ]);
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('\nSynchronization failed:', error);
  process.exitCode = 1;
});
