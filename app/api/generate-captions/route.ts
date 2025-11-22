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

        // Different angle/approach for each caption to ensure uniqueness
        const captionAngles = [
          'Focus on the PROBLEM the product solves - start with a pain point',
          'Focus on the TRANSFORMATION or result - what happens after using it',
          'Use a QUESTION to hook the viewer and create curiosity',
          'Make a BOLD CLAIM or statement that grabs attention',
          'Use HUMOR or a playful tone to stand out',
          'Create URGENCY or FOMO (fear of missing out)',
          'Tell a MINI STORY or personal experience angle',
          'Use a COMPARISON or "before vs after" angle',
          'Appeal to EMOTIONS - how it makes you feel',
          'Use a SURPRISING FACT or statistic angle',
        ]
        const angleForThisCaption = captionAngles[index % captionAngles.length]

        const prompt = `You are a UGC (User Generated Content) caption writer. Generate a UNIQUE social media caption for a product demo video.

Product: ${productDescription}
Target Audience: ${audience || 'General audience'}
Desired Tone: ${tone || 'Engaging and natural'}
Creator Persona: ${persona}
Video transcript summary: ${demo.transcript || 'No transcript available'}

**CRITICAL - UNIQUE ANGLE FOR THIS CAPTION:**
${angleForThisCaption}

IMPORTANT CONSTRAINTS:
- Length requirement: ${lengthInstruction}
- This is caption #${index + 1} - it MUST be completely different from other captions
- DO NOT start with generic phrases like "Meet your new..." or "Say goodbye to..."
- Be creative and use the specific angle above
- Use 1-2 emojis maximum, placed naturally
- Make it scroll-stopping and memorable

Return your response as a JSON object:
{
  "caption": "your unique caption text here"
}

Remember: Each caption should feel completely fresh and different!`

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert UGC caption writer who creates unique, creative captions. Each caption must be distinctly different. Always return valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 1.0, // Higher temperature for more variety
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

