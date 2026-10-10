import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';

export function requireDevelopmentAi() {
  if (env.NODE_ENV === 'production') {
    throw new AppError(503, 'AI_UNAVAILABLE', 'AI generation is unavailable.');
  }
}

export interface AiProvider {
  respond(input: {
    prompt: string;
    feature: string;
    context: { subjectNames: string[] };
  }): Promise<string>;
}
export class DevelopmentAiProvider implements AiProvider {
  async respond(input: { prompt: string; feature: string; context: { subjectNames: string[] } }) {
    requireDevelopmentAi();
    return `Development AI response for ${input.feature}: Based on the records available${input.context.subjectNames.length ? ` (${input.context.subjectNames.join(', ')})` : ''}, one helpful next step is to break “${input.prompt.slice(0, 160)}” into a small, reviewable plan. This is guidance only; no records were changed.`;
  }
}
