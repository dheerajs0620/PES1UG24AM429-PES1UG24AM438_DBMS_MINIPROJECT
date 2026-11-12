
import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.embedContent({
      model: 'gemini-embedding-001',
      contents:
        'InternHub internship for a Python developer with machine learning and PostgreSQL skills.',
      config: {
        outputDimensionality: 1536,
        taskType: 'RETRIEVAL_DOCUMENT',
      },
    });

    const embedding = response.embeddings?.[0]?.values;

    if (!embedding || embedding.length !== 1536) {
      return NextResponse.json(
        {
          success: false,
          error: 'Embedding missing or dimension mismatch.',
          dimensions: embedding?.length ?? 0,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      model: 'gemini-embedding-001',
      dimensions: embedding.length,
      message: 'Embedding generated successfully.',
    });
  } catch (error) {
    console.error(
      'Embedding test failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return NextResponse.json(
      { success: false, error: 'Embedding test failed. Check server logs.' },
      { status: 500 }
    );
  }
}
