import { NextResponse } from 'next/server';
import { pgPool } from '@/lib/postgres';
import { mysqlPool } from '@/lib/mysql';
import { generateEmbedding } from '@/lib/embeddings';

export const runtime = 'nodejs';

const EMBEDDING_DIMENSIONS = 1536;
const VECTOR_CANDIDATE_LIMIT = 200;
const SEMANTIC_WEIGHT = 0.7;
const KEYWORD_WEIGHT = 0.3;
const MAX_QUERY_LENGTH = 500;

type OpportunityRow = {
  opportunity_id: number;
  title: string;
  opportunity_type: string | null;
  description: string | null;
  required_skills?: string | null;
  company_name: string | null;
};

type VectorRow = {
  opportunity_id: number | string;
  cosine_distance: number | string;
};

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

// Keep the existing concept expansion as a lexical signal. This complements,
// rather than replaces, the semantic ranking performed by pgvector.
const conceptMap: Record<string, string[]> = {
  ml: ['pytorch', 'model', 'training', 'pipelines', 'vector', 'ml', 'transformer', 'llm', 'ai'],
  machine: ['pytorch', 'model', 'training', 'pipelines', 'vector'],
  learning: ['pytorch', 'model', 'training', 'pipelines'],
  python: ['pytorch', 'model', 'pipelines', 'datasets', 'opencv', 'pyspark', 'fastai'],
  llm: ['transformer', 'rlhf', 'diffusion', 'quantized', 'fine-tuning', 'openai', 'architectures'],
  transformer: ['llm', 'rlhf', 'diffusion', 'quantized', 'fine-tuning', 'openai', 'architectures'],
  nosql: ['mongodb', 'cassandra', 'redis', 'dynamodb', 'couchdb', 'document', 'key-value'],
  vision: ['opencv', 'depth', 'gait', 'colorization', 'neural', 'graphics', 'image', 'forensics', 'coreml', 'tracking'],
  web: ['nextjs', 'react', 'tailwind', 'css', 'interfaces', 'frontend', 'express', 'nodejs', 'lms'],
  data: ['sql', 'datasets', 'transactional', 'visualization', 'analyst', 'spark', 'etl', 'lake', 'pyspark', 'delta'],
  sql: ['datasets', 'transactional', 'mysql', 'databases', 'queries', 'postgres', 'postgresql', 'indexing'],
  security: ['forensics', 'malware', 'exploit', 'telemetry', 'network', 'mesh', 'packet', 'zero-trust'],
  embedded: ['arm', 'assembly', 'firmware', 'microcontrollers', 'bare-metal', 'drivers', 'iot'],
};

function calculateKeywordScore(opportunity: OpportunityRow, queryText: string): number {
  const rawTerms = queryText
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0);

  const expandedTerms = new Set<string>();
  rawTerms.forEach((term) => {
    expandedTerms.add(term);
    conceptMap[term]?.forEach((concept) => expandedTerms.add(concept));
  });

  const fullText = [
    opportunity.title,
    opportunity.description,
    opportunity.company_name,
    opportunity.opportunity_type,
    opportunity.required_skills,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ');

  let hits = 0;
  expandedTerms.forEach((term) => {
    if (fullText.includes(term)) hits += 1;
  });

  const boost = expandedTerms.size > 0 ? (hits / expandedTerms.size) * 0.38 : 0;
  const baseScore = queryText.length > 0 ? (hits > 0 ? 0.60 : 0.25) : 0.65;
  return clamp(Math.min(baseScore + boost, 0.985));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const searchQuery = body?.searchQuery;

    if (searchQuery !== undefined && typeof searchQuery !== 'string') {
      return NextResponse.json(
        { success: false, error: 'searchQuery must be a string.' },
        { status: 400 }
      );
    }

    const queryText = (searchQuery ?? '').trim().slice(0, MAX_QUERY_LENGTH);

    // MySQL remains the source of truth for opportunity details.
    const [mysqlRows]: any = await mysqlPool.query(
      `SELECT
          o.opportunity_id,
          o.title,
          o.opportunity_type,
          o.description,
          o.required_skills,
          c.name AS company_name
       FROM Opportunities o
       JOIN Companies c ON o.company_id = c.company_id`
    );

    const opportunities = mysqlRows as OpportunityRow[];
    if (!opportunities?.length) {
      return NextResponse.json({
        success: true,
        results: [],
        search_mode: queryText ? 'hybrid' : 'keyword',
      });
    }

    // Empty searches preserve the existing browse behaviour and do not call Gemini.
    if (!queryText) {
      const results = opportunities
        .map((opportunity) => ({
          ...opportunity,
          match_score: calculateKeywordScore(opportunity, queryText),
          semantic_score: null,
          keyword_score: calculateKeywordScore(opportunity, queryText),
          cosine_distance: null,
        }))
        .sort((a, b) => b.match_score - a.match_score);

      return NextResponse.json({
        success: true,
        search_mode: 'keyword',
        results,
      });
    }

    let vectorScores = new Map<number, { semanticScore: number; cosineDistance: number }>();
    let searchMode: 'hybrid' | 'keyword_fallback' = 'keyword_fallback';
    let fallbackReason: string | undefined;

    try {
      // Embed the user's query using Gemini's retrieval-query task type.
      const queryEmbedding = await generateEmbedding(queryText, 'RETRIEVAL_QUERY');
      if (
        queryEmbedding.length !== EMBEDDING_DIMENSIONS ||
        !queryEmbedding.every(Number.isFinite)
      ) {
        throw new Error(`Query embedding must contain ${EMBEDDING_DIMENSIONS} finite values.`);
      }

      // pgvector cosine distance: lower is more similar. ORDER BY + LIMIT
      // allows PostgreSQL to use the HNSW vector_cosine_ops index when chosen.
      const vectorLiteral = JSON.stringify(queryEmbedding);
      const { rows } = await pgPool.query(
        `SELECT
            opportunity_id,
            embedding <=> $1::vector AS cosine_distance
         FROM opportunity_vectors
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [vectorLiteral, VECTOR_CANDIDATE_LIMIT]
      );

      vectorScores = new Map<number, { semanticScore: number; cosineDistance: number }>();
      (rows as VectorRow[]).forEach((row) => {
        const opportunityId = Number(row.opportunity_id);
        const cosineDistance = Number(row.cosine_distance);
        // cosine similarity = 1 - cosine distance. Clamp to [0, 1]
        // for a non-negative relevance component in the hybrid score.
        const semanticScore = clamp(1 - cosineDistance);
        vectorScores.set(opportunityId, { semanticScore, cosineDistance });
      });
      searchMode = 'hybrid';
    } catch (error) {
      // Keep search available if Gemini or PostgreSQL vector retrieval is down.
      fallbackReason = error instanceof Error ? error.message : 'Semantic search unavailable.';
      console.error('Semantic search unavailable; using keyword fallback:', fallbackReason);
    }

    const scoredResults = opportunities.map((opportunity) => {
      const opportunityId = Number(opportunity.opportunity_id);
      const keywordScore = calculateKeywordScore(opportunity, queryText);
      const vectorMatch = vectorScores.get(opportunityId);
      const semanticScore = vectorMatch?.semanticScore ?? null;

      // If a vector exists, combine semantic relevance (70%) and lexical
      // relevance (30%). If this opportunity has no vector, retain its
      // keyword score rather than silently assigning a fabricated semantic score.
      const finalScore =
        searchMode === 'hybrid' && semanticScore !== null
          ? SEMANTIC_WEIGHT * semanticScore + KEYWORD_WEIGHT * keywordScore
          : keywordScore;

      return {
        ...opportunity,
        match_score: Number(clamp(finalScore).toFixed(4)),
        semantic_score: semanticScore === null ? null : Number(semanticScore.toFixed(4)),
        keyword_score: Number(keywordScore.toFixed(4)),
        cosine_distance: vectorMatch
          ? Number(vectorMatch.cosineDistance.toFixed(4))
          : null,
      };
    });

    scoredResults.sort((a, b) => {
      if (b.match_score !== a.match_score) return b.match_score - a.match_score;
      return b.keyword_score - a.keyword_score;
    });

    return NextResponse.json({
      success: true,
      search_mode: searchMode,
      ...(fallbackReason ? { semantic_search_warning: fallbackReason } : {}),
      ranking_weights: searchMode === 'hybrid'
        ? { semantic: SEMANTIC_WEIGHT, keyword: KEYWORD_WEIGHT }
        : { keyword: 1 },
      results: scoredResults,
    });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed.',
      },
      { status: 500 }
    );
  }
}
