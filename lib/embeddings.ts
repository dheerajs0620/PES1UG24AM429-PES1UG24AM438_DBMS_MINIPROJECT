
import { GoogleGenAI } from '@google/genai';

const DIMENSIONS = 1536;

export type EmbeddingTask =
  | 'RETRIEVAL_DOCUMENT'
  | 'RETRIEVAL_QUERY';

export async function generateEmbedding(
  content: string,
  taskType: EmbeddingTask = 'RETRIEVAL_DOCUMENT'
): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  if (!content.trim()) {
    throw new Error('Cannot generate an embedding from empty text.');
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: content,
    config: {
      outputDimensionality: DIMENSIONS,
      taskType,
    },
  });

  const values = response.embeddings?.[0]?.values;

  if (
    !values ||
    values.length !== DIMENSIONS ||
    !values.every(Number.isFinite)
  ) {
    throw new Error(
      `Invalid embedding. Expected ${DIMENSIONS} valid dimensions.`
    );
  }

  return values;
}
