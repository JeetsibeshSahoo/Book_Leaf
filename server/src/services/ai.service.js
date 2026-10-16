import { GoogleGenAI } from '@google/genai';
import config from '../config/index.js';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  VALID_CATEGORIES,
  VALID_PRIORITIES,
} from '../constants/ticketConstants.js';
import {
  buildClassificationAndPriorityPrompt,
  buildDraftResponsePrompt,
} from './prompt.service.js';

// Initialize the Google Gen AI client if an API key is configured
let aiClient = null;
if (config.gemini.apiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  } catch (err) {
    console.warn('⚠️ Failed to initialize Google Gen AI client:', err.message);
  }
} else {
  console.log('ℹ️ GEMINI_API_KEY is not set. AI Service will operate in Graceful Degradation / Fallback mode.');
}

/**
 * Strips code fences (```json ... ```) from LLM output for safe JSON parsing.
 */
const cleanJsonOutput = (rawText) => {
  return rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
};

/**
 * Intelligent Rule-Based Fallback:
 * If the AI API is unreachable or rate-limited, this heuristic matches keywords
 * so the application degrades gracefully without breaking ticket creation.
 */
const getFallbackTriage = (subject = '', description = '') => {
  const text = `${subject} ${description}`.toLowerCase();

  let category = TICKET_CATEGORIES.GENERAL_INQUIRY;
  let priority = TICKET_PRIORITIES.MEDIUM;

  if (text.includes('royalt') || text.includes('payment') || text.includes('payout') || text.includes('bank') || text.includes('earning')) {
    category = TICKET_CATEGORIES.ROYALTY_AND_PAYMENTS;
    priority = text.includes('month') || text.includes('overdue') || text.includes('never') ? TICKET_PRIORITIES.HIGH : TICKET_PRIORITIES.MEDIUM;
  } else if (text.includes('isbn') || text.includes('barcode') || text.includes('metadata') || text.includes('imprint')) {
    category = TICKET_CATEGORIES.ISBN_AND_METADATA;
    priority = text.includes('wrong') || text.includes('different') || text.includes('mismatch') ? TICKET_PRIORITIES.HIGH : TICKET_PRIORITIES.MEDIUM;
  } else if (text.includes('print') || text.includes('paper') || text.includes('defect') || text.includes('binding') || text.includes('misprint') || text.includes('smudge')) {
    category = TICKET_CATEGORIES.PRINTING_AND_QUALITY;
    priority = text.includes('terrible') || text.includes('damaged') || text.includes('defect') ? TICKET_PRIORITIES.CRITICAL : TICKET_PRIORITIES.HIGH;
  } else if (text.includes('amazon') || text.includes('flipkart') || text.includes('unavailable') || text.includes('out of stock') || text.includes('listing')) {
    category = TICKET_CATEGORIES.DISTRIBUTION_AND_AVAILABILITY;
    priority = text.includes('unavailable') ? TICKET_PRIORITIES.HIGH : TICKET_PRIORITIES.MEDIUM;
  } else if (text.includes('typeset') || text.includes('cover') || text.includes('proof') || text.includes('editing') || text.includes('production') || text.includes('manuscript')) {
    category = TICKET_CATEGORIES.BOOK_STATUS_AND_PRODUCTION;
    priority = text.includes('week') || text.includes('delayed') ? TICKET_PRIORITIES.HIGH : TICKET_PRIORITIES.MEDIUM;
  }

  return {
    category,
    priority,
    confidence: 0.70,
    reasoning: 'Triaged via Rule-Based Heuristic (Graceful Fallback Mode)',
  };
};

/**
 * 1. AI Auto-Classification & Priority Scoring
 * Analyzes ticket content and returns category, priority score, and confidence.
 */
export const classifyAndPrioritize = async ({ subject, description, bookTitle }) => {
  // If no Gemini client is initialized, degrade gracefully
  if (!aiClient) {
    return getFallbackTriage(subject, description);
  }

  try {
    const prompt = buildClassificationAndPriorityPrompt({ subject, description, bookTitle });

    const response = await aiClient.models.generateContent({
      model: config.gemini.modelName,
      contents: prompt,
    });

    const responseText = response.text ? response.text.trim() : '';
    const cleanedJson = cleanJsonOutput(responseText);
    const parsed = JSON.parse(cleanedJson);

    // Validate and sanitize AI response
    const category = VALID_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : TICKET_CATEGORIES.GENERAL_INQUIRY;

    const priority = VALID_PRIORITIES.includes(parsed.priority)
      ? parsed.priority
      : TICKET_PRIORITIES.MEDIUM;

    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(Math.max(parsed.confidence, 0.0), 1.0)
      : 0.90;

    return {
      category,
      priority,
      confidence,
      reasoning: parsed.reasoning || 'Classified by Gemini AI',
    };
  } catch (error) {
    console.warn('⚠️ Gemini AI classification failed or rate-limited. Falling back gracefully:', error.message);
    // Graceful degradation: never crash ticket creation
    return getFallbackTriage(subject, description);
  }
};

/**
 * 2. AI Draft Response Generator
 * Generates an empathetic draft response using Knowledge Base policies and author context.
 */
export const generateDraftResponse = async ({ ticket, author, book, messages = [] }) => {
  // Fallback template if Gemini is offline
  const fallbackDraft = `Dear ${author.name.split(' ')[0]},\n\nThank you for reaching out to BookLeaf Publishing. We have received your query regarding "${ticket.subject}" and our operations team is currently reviewing your account details.\n\nWe will investigate this and get back to you with a full update within 48 hours.\n\nWarm regards,\nTeam BookLeaf`;

  if (!aiClient) {
    return {
      draft: fallbackDraft,
      isAiGenerated: false,
      modelUsed: 'Fallback Template Engine',
    };
  }

  try {
    const prompt = buildDraftResponsePrompt({ ticket, author, book, messages });

    const response = await aiClient.models.generateContent({
      model: config.gemini.modelName,
      contents: prompt,
    });

    const draftedText = response.text ? response.text.trim() : fallbackDraft;

    return {
      draft: draftedText,
      isAiGenerated: true,
      modelUsed: config.gemini.modelName,
    };
  } catch (error) {
    console.warn('⚠️ Gemini draft generation failed. Falling back to template draft:', error.message);
    return {
      draft: fallbackDraft,
      isAiGenerated: false,
      modelUsed: 'Fallback Template Engine',
    };
  }
};