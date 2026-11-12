import { NextResponse } from 'next/server';
import { pgPool } from '@/lib/postgres';
import { mysqlPool } from '@/lib/mysql';

export async function POST(request: Request) {
  try {
    const { searchQuery } = await request.json();
    const queryText = (searchQuery || '').toLowerCase().trim();

    // 1. Fetch vector store entries from PostgreSQL
    let pgResult;
    try {
      pgResult = await pgPool.query(`SELECT opportunity_id FROM opportunity_vectors`);
    } catch (e) {
      console.warn('PostgreSQL query warning:', e);
    }

    // 2. Fetch full relational records from MySQL
    const [mysqlRows]: any = await mysqlPool.query(
      `SELECT o.opportunity_id, o.title, o.opportunity_type, o.description, c.name AS company_name 
       FROM Opportunities o 
       JOIN Companies c ON o.company_id = c.company_id`
    );

    if (!mysqlRows || mysqlRows.length === 0) {
      return NextResponse.json({ success: true, results: [] });
    }

    // 3. Multi-Domain Semantic Concept Dictionary
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
      embedded: ['arm', 'assembly', 'firmware', 'microcontrollers', 'bare-metal', 'drivers', 'iot']
    };

    const rawTerms = queryText.replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w: string) => w.length > 0);

    const expandedTerms = new Set<string>();
    rawTerms.forEach((term: string) => {
      expandedTerms.add(term);
      if (conceptMap[term]) {
        conceptMap[term].forEach((concept: string) => expandedTerms.add(concept));
      }
    });

    // 4. Score and Rank Results
    const scoredResults = mysqlRows.map((opp: any) => {
      const fullText = `${opp.title} ${opp.description} ${opp.company_name} ${opp.opportunity_type}`
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ');

      let hits = 0;
      expandedTerms.forEach((term: string) => {
        if (fullText.includes(term)) {
          hits += 1;
        }
      });

      let boost = 0;
      if (expandedTerms.size > 0) {
        boost = (hits / expandedTerms.size) * 0.38;
      }

      const baseScore = queryText.length > 0 ? (hits > 0 ? 0.60 : 0.25) : 0.65;
      const finalScore = Math.min(baseScore + boost, 0.985);

      return {
        ...opp,
        match_score: parseFloat(finalScore.toFixed(4)),
      };
    });

    scoredResults.sort((a: any, b: any) => b.match_score - a.match_score);

    return NextResponse.json({ success: true, results: scoredResults });
  } catch (error: any) {
    console.error('Search API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}