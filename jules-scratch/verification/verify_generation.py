from playwright.sync_api import sync_playwright, Page, expect

def run_verification(page: Page):
    """
    This script verifies the new project generation workflow.
    """
    print("Navigating to the application...")
    page.goto("http://localhost:3000")

    # 1. Fill in the user instruction
    print("Filling in the initial instruction...")
    instruction_textarea = page.get_by_label("Initial User Instruction")
    expect(instruction_textarea).to_be_visible()
    instruction_textarea.fill("Create a simple crew to find and summarize the latest AI news.")

    # 2. Select a Gemini model to avoid API key errors
    print("Selecting a Gemini model...")
    model_selector = page.get_by_label("LLM Model Selection")
    expect(model_selector).to_be_visible()
    model_selector.select_option(label="Gemini 2.5 Flash")

    # 3. Click the generate button
    print("Clicking the 'Generate Full Script' button...")
    generate_button = page.get_by_role("button", name="Generate Full Script")
    expect(generate_button).to_be_enabled()
    generate_button.click()

    # 3. Wait for the generated file tabs to appear
    print("Waiting for generated files to appear...")
    # We'll wait for the 'crew.py' tab specifically, with a longer timeout
    crew_py_tab = page.get_by_role("button", name="crew.py")
    expect(crew_py_tab).to_be_visible(timeout=120000) # 2 minutes timeout for generation
    print("File tabs are visible.")

    # 4. Click the 'crew.py' tab to make sure it's active
    crew_py_tab.click()

    # 5. Take a screenshot
    print("Taking screenshot...")
    page.screenshot(path="jules-scratch/verification/verification.png")
    print("Screenshot saved to jules-scratch/verification/verification.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            run_verification(page)
        finally:
            browser.close()

if __name__ == "__main__":
    main()