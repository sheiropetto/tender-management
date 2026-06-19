import { NextRequest, NextResponse } from "next/server";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || text.length < 10) {
      return NextResponse.json({ error: "Document text is too short or empty." }, { status: 400 });
    }

    if (!DEEPSEEK_API_KEY) {
      return NextResponse.json({ error: "DeepSeek API key not configured." }, { status: 500 });
    }

    // Smart truncation for large documents
    // DeepSeek 128K tokens ≈ 400K chars. Reserve 20K for prompt + output.
    // Leave ~100K tokens (≈ 300K chars) for document text.
    // For 100-200 page docs, take beginning + end (where schedules/addresses live)
    let docText: string;
    const MAX_CHARS = 300000;
    
    if (text.length <= MAX_CHARS) {
      docText = text;
    } else {
      const firstHalf = text.slice(0, 120000);
      const lastHalf = text.slice(-180000);
      docText = firstHalf + "\n\n... [MIDDLE PAGES OMITTED TO FIT CONTEXT LIMIT] ...\n\n" + lastHalf;
    }

    console.log("[AI EXTRACT] Doc length:", text.length, "→ sending:", docText.length);
    console.log("[AI EXTRACT] Doc preview:", docText.slice(0, 500));

    // ─── Step 1: Fact Extraction ─────────────────────────────────────────
    const step1Prompt = `You are analyzing a Malaysian government tender/RFP document. The text below may include ALL pages or the FIRST + LAST sections of a large document (middle omitted to fit context limits).

CRITICAL: Scan EVERY line. Look especially at LATER pages which often contain:
  - "Schedule of RFP Process" / "Jadual Proses" tables
  - "Submission Closing Date" / "Tarikh Tutup Penghantaran"
  - "Submission Address" / "Alamat Penghantaran"
  - "Contact" / "Hubungi" / "Enquiries" sections
  - "Bid Security" / "Bank Guarantee" amounts
  - **ENVELOPE TITLES** — Look for sections labeled "Envelope 1:", "Envelope 2:", "Bid Security Envelope", etc. These are listed under "Envelopes" heading with titles like:
    - "Bid Security Envelope"
    - "Envelope 1: Bidder(s) RFP Application Submission"
    - "Envelope 2: Bidder(s) Technical Proposal"
    - "Envelope 3: Bidder(s) Financial and Commercial Proposal"
    - "Envelope 4: USB Pen Drives (Softcopies)"

List ALL facts you find:

DATES FOUND (with the FULL surrounding sentence):
- [Every date with context - especially from schedule tables]

TIMES FOUND:
- [Every time with context]

PHONE NUMBERS:
- [Every phone/fax number with context]

EMAILS:
- [Every email address]

ADDRESSES:
- [Every address block - full text]

RM/MONEY:
- [Every RM amount or budget figure]

NAMES:
- [Every person name with title, phone, email]

ORGANIZATIONS:
- [Every ministry, department, agency, company]

REFERENCE NUMBERS:
- [Every tender/file reference number]

PROJECT TITLE:
- [The main project name]

DOCUMENT TEXT (all pages):
${docText}

Be EXHAUSTIVE. Do not skip anything.`;

    console.log("[AI EXTRACT] Sending Step 1 to DeepSeek...");

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
      console.error("[AI EXTRACT] Step 1 failed:", step1Response.status, errText.slice(0, 300));
      return NextResponse.json({ error: `DeepSeek API error: ${errText.slice(0, 200)}` }, { status: step1Response.status });
    }

    const step1Data = await step1Response.json();
    const facts = step1Data.choices?.[0]?.message?.content || "";

    console.log("[AI EXTRACT] Step 1 facts (first 2000):", facts.slice(0, 2000));
    console.log("[AI EXTRACT] Step 1 total length:", facts.length);

    // ─── Step 2: Map facts to JSON  ──────────────────────────────────────
    const step2Prompt = `You must map extracted facts to a JSON object for a tender project.

JSON FIELDS TO FILL:
- "name": The project title
- "shortName": A SHORT, concise version of the project name (max 5-7 words). This is used for display in lists and sidebar where the full name is too long. Extract or generate a shortened version.
- "refNumber": The tender reference number (e.g., UKAS(...))
- "clientName": The organization issuing the tender
- "submissionDate": The CLOSING/DEADLINE/SUBMISSION date. Format: YYYY-MM-DD.
- "submissionTime": The time associated with the closing date. Format: HH:MM.
- "submissionAddress": The FULL submission address. Include everything.
- "budget": Any RM amount or value (bid bond, budget, contract value)
- "category": "infrastructure" | "consultancy" | "supply" | "services" | "other"
- "contactPersonName": The contact person's full name
- "contactPersonPhone": The contact person's phone number
- "contactPersonEmail": The contact person's email address
- "clientRefNumber": Client reference if different from refNumber
- "description": Brief 1-2 sentence summary
- "hasEnvelopes": true if the document lists any envelopes/sections, false otherwise
- "envelopes": An ARRAY of envelope title strings found in the document. Look for sections under "Envelopes" heading like "Envelope 1:", "Envelope 2:", "Bid Security Envelope", etc. Extract the FULL title.

CRITICAL: Map EVERY fact to a field. Do not leave fields empty if facts exist. For addresses, use the FULL address found.

EXTRACTED FACTS:
${facts}

Return ONLY valid JSON. No markdown.`;

    console.log("[AI EXTRACT] Sending Step 2 to DeepSeek...");

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
      console.error("[AI EXTRACT] Step 2 failed:", step2Response.status, errText.slice(0, 300));
      return NextResponse.json({ error: `DeepSeek API error: ${errText.slice(0, 200)}` }, { status: step2Response.status });
    }

    const step2Data = await step2Response.json();
    const content = step2Data.choices?.[0]?.message?.content || "";
    console.log("[AI EXTRACT] Step 2 output:", content.slice(0, 500));

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[AI EXTRACT] No JSON found in:", content);
      return NextResponse.json({ error: "AI response was not valid JSON." }, { status: 500 });
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Merge with a fallback from step 1 for critical fields
    console.log("[AI EXTRACT] Final:", JSON.stringify(extracted));

    return NextResponse.json(extracted);
  } catch (err: any) {
    console.error("[AI EXTRACT] Excepton:", err.message);
    return NextResponse.json({ error: err.message || "Failed to process document." }, { status: 500 });
  }
}
