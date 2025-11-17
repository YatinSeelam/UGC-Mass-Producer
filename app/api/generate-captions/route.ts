import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
})

const CREATOR_PERSONAS: Record<string, string> = {
  'female-hype': 'Energetic female creator with high energy, uses trending slang, very enthusiastic about products. Write captions in an excited, Gen-Z friendly tone with emojis and trending phrases.',
  'female-calm': 'Calm, aesthetic-focused female creator with minimalist style, trustworthy and soothing tone. Write captions in a peaceful, elegant, and trustworthy manner.',
  'male-gym': 'Fitness-focused male creator, direct and results-driven, uses gym/fitness terminology. Write captions in a direct, motivational, results-focused tone.',
  'neutral': 'Professional, balanced brand voice without specific persona. Write captions in a professional, clear, and brand-appropriate tone.',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      demos,
      creators,
      productDescription,
      audience,
      tone,
      captionsPerCombo,
      captionLength,
      subtitleEnabled,
      subtitleStyle,
    } = body

    // Define word count ranges for caption lengths
    const lengthGuide = {
      short: '3-6 words only',
      medium: '6-9 words',
      long: '9-15 words maximum',
    }
    const lengthInstruction = lengthGuide[captionLength as keyof typeof lengthGuide] || lengthGuide.medium

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Build all caption generation tasks
    const tasks = []

    for (const demo of demos) {
      const creatorsToUse = creators.length > 0 ? creators : ['neutral']

      for (const creatorId of creatorsToUse) {
        const persona = CREATOR_PERSONAS[creatorId] || CREATOR_PERSONAS['neutral']

        // Generate multiple captions per combo
        for (let i = 0; i < captionsPerCombo; i++) {
          tasks.push({
            demo,
            creatorId,
            persona,
            index: i,
          })
        }
      }
    }

    console.log(`Generating ${tasks.length} captions in parallel...`)

    // Generate all captions in parallel
    const results = await Promise.allSettled(
      tasks.map(async (task) => {
        const { demo, creatorId, persona, index } = task

        const prompt = `You are a UGC (User Generated Content) caption writer. Generate a VERY SHORT and CONCISE social media caption for a product demo video.

Product: ${productDescription}
Target Audience: ${audience}
Desired Tone: ${tone}
Creator Persona: ${persona}
Video transcript summary: ${demo.transcript || 'No transcript available'}

IMPORTANT CONSTRAINTS:
- Length requirement: ${lengthInstruction}
- Count every single word carefully before submitting
- Be extremely concise and punchy
- Use emojis if they fit the persona (count emojis as visual elements, not words)
- Keep it natural and conversational but SHORT

Generate a simple, engaging caption that matches the creator persona and tone. The caption MUST be ${lengthInstruction}.

Return your response as a JSON object with this exact structure:
{
  "caption": "your complete caption text here"
}

Do NOT include hashtags or call-to-action. Just write a simple, SHORT caption that is ${lengthInstruction}.`

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert UGC caption writer. Always return valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.8,
          response_format: { type: 'json_object' },
        })

        const responseText = completion.choices[0]?.message?.content || '{}'
        const captionData = JSON.parse(responseText)

        const variantId = `variant-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`

        return {
          id: variantId,
          demoId: demo.id,
          demoName: demo.name,
          creatorTemplateId: creatorId === 'neutral' ? null : creatorId,
          creatorName: creatorId === 'neutral'
            ? 'Neutral Brand Voice'
            : creatorId === 'female-hype'
              ? 'Female – Hype'
              : creatorId === 'female-calm'
                ? 'Female – Calm Aesthetic'
                : creatorId === 'male-gym'
                  ? 'Male – Gym Bro'
                  : 'Unknown',
          subtitleStyle: subtitleEnabled ? subtitleStyle : null,
          subtitleEnabled,
          hook: '',
          caption: captionData.caption || '',
          hashtags: '',
          cta: '',
          selected: true,
        }
      })
    )

    // Filter successful results
    const variants = results
      .filter((result) => result.status === 'fulfilled')
      .map((result: any) => result.value)

    const failedCount = results.filter((result) => result.status === 'rejected').length

    if (failedCount > 0) {
      console.warn(`${failedCount} captions failed to generate`)
    }

    console.log(`Successfully generated ${variants.length}/${tasks.length} captions`)

    return NextResponse.json({ variants })
  } catch (error) {
    console.error('Caption generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate captions' },
      { status: 500 }
    )
  }
}

