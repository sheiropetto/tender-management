import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Schema for Gemini Structured Output
const tenderSchema = {
  type: "object",
  properties: {
    name: { 
      type: "string",
      description: "The main project title or tender name"
    },
    shortName: { 
      type: "string",
      description: "A SHORT, concise version of the project name (max 5-7 words) used for lists/sidebars where full name is too long."
    },
    refNumber: { 
      type: "string",
      description: "The official tender reference number or file reference code (e.g. UKAS(S)12/3/4, JKR.HQ.2024/01). If there is no official reference number listed in the document, leave this field completely blank. Do NOT put document headers or titles like 'Request for Proposal' here."
    },
    clientName: { 
      type: "string",
      description: "The organization or client issuing the tender"
    },
    submissionDate: { 
      type: "string",
      description: "The closing date / deadline for submission. Format: YYYY-MM-DD"
    },
    submissionTime: { 
      type: "string",
      description: "The submission closing time. Format: HH:MM"
    },
    submissionAddress: { 
      type: "string",
      description: "The full submission address. Format it as a multi-line string using newlines (\\n) matching the standard postal address format, rather than putting it all on a single line with commas."
    },
    budget: { 
      type: "string",
      description: "Any RM amount or budget figure, bid bond value, etc."
    },
    category: { 
      type: "string",
      description: "Must be one of: infrastructure, consultancy, supply, services, other"
    },
    contactPersonName: { 
      type: "string",
      description: "Contact person's full name"
    },
    contactPersonPhone: { 
      type: "string",
      description: "Contact person's phone/mobile number"
    },
    contactPersonEmail: { 
      type: "string",
      description: "Contact person's email address"
    },
    clientRefNumber: { 
      type: "string",
      description: "Client reference number if different from refNumber"
    },
    description: { 
      type: "string",
      description: "Brief 1-2 sentence summary of the scope of works"
    },
    hasEnvelopes: { 
      type: "boolean",
      description: "True if the document lists any envelopes/sections, false otherwise"
    },
    envelopes: {
      type: "array",
      items: { type: "string" },
      description: "Array of envelope title strings found in the document (e.g. Envelope 1, Technical Proposal, etc.)"
    }
  },
  required: ["name"]
};

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || text.length < 10) {
      return NextResponse.json({ error: "Document text is too short or empty." }, { status: 400 });
    }

    // ─── OPTION A: USE GEMINI (RECOMMENDED) ─────────────────────────────────
    if (GEMINI_API_KEY) {
      console.log("[AI EXTRACT] Using Gemini API for structured extraction...");
      
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: tenderSchema as any,
          temperature: 0.1,
        }
      });

      const prompt = `You are a document analysis assistant analyzing a Malaysian government tender/RFP document.
Read the entire text below and extract all the required tender facts. Fill in all fields in the JSON response schema.

DOCUMENT TEXT:
${text}

Be thorough and exhaustive. Do not skip details. Make sure formatting for submissionDate is YYYY-MM-DD and submissionTime is HH:MM.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      console.log("[AI EXTRACT] Gemini Raw Output (first 500 chars):", responseText.slice(0, 500));
      
      const extracted = JSON.parse(responseText);
      return NextResponse.json(extracted);
    }

    // ─── OPTION B: FALLBACK TO DEEPSEEK ────────────────────────────────────
    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: "Neither Gemini nor DeepSeek API keys are configured." }, { status: 500 });
    }

    console.log("[AI EXTRACT] Gemini API key not found. Using DeepSeek fallback...");

    // Smart truncation for DeepSeek context limit
    let docText: string;
    const MAX_CHARS = 300000;
    
    if (text.length <= MAX_CHARS) {
      docText = text;
    } else {
      const firstHalf = text.slice(0, 120000);
      const lastHalf = text.slice(-180000);
      docText = firstHalf + "\n\n... [MIDDLE PAGES OMITTED TO FIT CONTEXT LIMIT] ...\n\n" + lastHalf;
    }

    // Step 1: Fact Extraction
    const step1Prompt = `You are analyzing a Malaysian government tender/RFP document.
List ALL facts you find:
DATES FOUND, TIMES FOUND, PHONE NUMBERS, EMAILS, ADDRESSES, RM/MONEY, NAMES, ORGANIZATIONS, REFERENCE NUMBERS, PROJECT TITLE.

DOCUMENT TEXT:
${docText}

Be EXHAUSTIVE.`;

    const step1Response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a document analysis assistant. Extract ALL facts from documents exhaustively. Be thorough." },
          { role: "user", content: step1Prompt },
        ],
        temperature: 0.5,
        max_tokens: 8192,
      }),
    });

    if (!step1Response.ok) {
      const errText = await step1Response.text();
      console.error("[AI EXTRACT] DeepSeek Step 1 failed:", step1Response.status, errText.slice(0, 300));
      return NextResponse.json({ error: `DeepSeek API error: ${errText.slice(0, 200)}` }, { status: step1Response.status });
    }

    const step1Data = await step1Response.json();
    const facts = step1Data.choices?.[0]?.message?.content || "";

    // Step 2: Map facts to JSON
    const step2Prompt = `You must map extracted facts to a JSON object for a tender project.
JSON FIELDS TO FILL: name, shortName, refNumber, clientName, submissionDate (YYYY-MM-DD), submissionTime (HH:MM), submissionAddress, budget, category, contactPersonName, contactPersonPhone, contactPersonEmail, clientRefNumber, description, hasEnvelopes, envelopes (array).

EXTRACTED FACTS:
${facts}

Return ONLY valid JSON.`;

    const step2Response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You map extracted facts to JSON. Return ONLY valid JSON, no markdown." },
          { role: "user", content: step2Prompt },
        ],
        temperature: 0,
        max_tokens: 8192,
      }),
    });

    if (!step2Response.ok) {
      const errText = await step2Response.text();
      console.error("[AI EXTRACT] DeepSeek Step 2 failed:", step2Response.status, errText.slice(0, 300));
      return NextResponse.json({ error: `DeepSeek API error: ${errText.slice(0, 200)}` }, { status: step2Response.status });
    }

    const step2Data = await step2Response.json();
    const content = step2Data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI response was not valid JSON." }, { status: 500 });
    }

    const extracted = JSON.parse(jsonMatch[0]);
    return NextResponse.json(extracted);

  } catch (err: any) {
    console.error("[AI EXTRACT] Exception:", err.message);
    return NextResponse.json({ error: err.message || "Failed to process document." }, { status: 500 });
  }
}
