import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  let tempVideoPath: string | null = null
  
  try {
    const formData = await request.formData()
    const videoFile = formData.get('video') as File

    if (!videoFile) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    // Save uploaded file to temp directory
    const bytes = await videoFile.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    const tempDir = tmpdir()
    const fileName = `${Date.now()}-${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    tempVideoPath = join(tempDir, fileName)
    
    await writeFile(tempVideoPath, buffer)

    // Get Python script path
    const scriptPath = join(process.cwd(), 'scripts', 'clip_video.py')
    
    // Check if Python script exists
    try {
      const { access } = await import('fs/promises')
      await access(scriptPath)
    } catch {
      return NextResponse.json(
        { error: 'Clips AI script not found. Please ensure scripts/clip_video.py exists.' },
        { status: 500 }
      )
    }

    // Execute Python script
    const pythonCommand = process.env.PYTHON_COMMAND || 'python3'
    const command = `${pythonCommand} "${scriptPath}" "${tempVideoPath}"`
    
    console.log(`Executing: ${command}`)
    
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 300000, // 5 minute timeout
    })

    if (stderr) {
      console.error('Python script stderr:', stderr)
    }

    // Parse JSON output from Python script
    let result
    try {
      result = JSON.parse(stdout)
    } catch (parseError) {
      console.error('Failed to parse Python output:', stdout)
      return NextResponse.json(
        { error: 'Failed to parse clipping results', details: stdout },
        { status: 500 }
      )
    }

    // Check for errors in result
    if (result.error) {
      return NextResponse.json(
        { error: result.error, error_type: result.error_type },
        { status: 500 }
      )
    }

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Video clipping error:', error)
    
    // Provide helpful error messages
    if (error.code === 'ENOENT') {
      return NextResponse.json(
        { error: 'Python not found. Please install Python 3 and ensure it is in your PATH.' },
        { status: 500 }
      )
    }
    
    if (error.killed || error.signal) {
      return NextResponse.json(
        { error: 'Clipping process timed out or was killed. The video may be too long.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to clip video', details: error.message },
      { status: 500 }
    )
  } finally {
    // Clean up temp file
    if (tempVideoPath) {
      try {
        await unlink(tempVideoPath)
      } catch (cleanupError) {
        console.error('Failed to cleanup temp file:', cleanupError)
      }
    }
  }
}




