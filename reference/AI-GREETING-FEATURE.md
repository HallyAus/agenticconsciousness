# AI Greeting Feature — Claude Code Instructions

## Overview

Add a dynamic, AI-generated greeting to the hero section that uses Claude to write a unique, time-aware message for every visitor. The greeting types itself out with a red cursor, proving the site is AI-powered the moment someone lands on it.

-----

## Step 1: Create the API route

Create `src/app/api/greeting/route.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Simple in-memory cache to reduce API calls
// Key: timeOfDay-hour, Value: { greeting, timestamp }
const cache = new Map<string, { greeting: string; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function POST(req: NextRequest) {
  try {
    const { timeOfDay, dayOfWeek, hour } = await req.json();

    // Check cache first
    const cacheKey = `${timeOfDay}-${hour}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ greeting: cached.greeting });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 150,
      system: `You write short, punchy greetings for Agentic Consciousness, an AI consulting company.

Rules:
- Maximum 2 sentences
- Reference the time of day naturally
- Mention AI or automation in a way that's relevant to the time
- Tone: direct, confident, no corporate fluff
- Australian English spelling
- Never use greetings like "G'day" or stereotypical Australian phrases
- Make the visitor curious about what AI can do for their business
- Each greeting should feel unique and slightly different`,
      messages: [
        {
          role: "user",
          content: `Write a homepage greeting for a visitor arriving on a ${dayOfWeek} ${timeOfDay} (${hour}:00). One to two sentences max.`,
        },
      ],
    });

    const greeting = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .replace(/^["']|["']$/g, ""); // Strip any wrapping quotes

    // Cache it
    cache.set(cacheKey, { greeting, timestamp: Date.now() });

    return NextResponse.json({ greeting });
  } catch (error) {
    console.error("Greeting API error:", error);
    return NextResponse.json(
      { error: "Failed to generate greeting" },
      { status: 500 }
    );
  }
}
```

-----

## Step 2: Create the AiGreeting component

Create `src/components/AiGreeting.tsx`

-----

## Step 3: Style the component

Add styles to globals.css

-----

## Step 4: Replace the static hero description

Replace the static paragraph in Hero with the AiGreeting component.

-----

## Step 5: Add "AI-generated" indicator

Below the greeting, add a subtle label.

-----

## Design rules

- Zero rounded corners
- Red (#ff3d00) cursor and left border
- 30ms per character typewriter speed
- "Initialising AI..." placeholder
- Fallback greetings if API fails
- min-height: 3.5rem to prevent layout shift

-----

## Token cost estimate

~$0.001/hour even with heavy traffic. Negligible.
