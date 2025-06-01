import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { initialInput, llmModel } = body;

    // Simulate processing and generating a script
    console.log(`Received input: ${initialInput}`);
    console.log(`Selected LLM: ${llmModel}`);

    // Mock generated Python script
    const mockPythonScript = `
# Mock Python script for ${llmModel}
# Input: ${initialInput}
print("Hello from mock Python script!")
print("This script was 'generated' based on your input.")
`;

    // Mock execution output
    const mockExecutionOutput = "Mock script execution successful: Hello from mock Python script!";

    return NextResponse.json({
      generatedScript: mockPythonScript,
      executionOutput: mockExecutionOutput,
    });

  } catch (error) {
    console.error("Error in API route:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
