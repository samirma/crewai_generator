from playwright.sync_api import sync_playwright, expect
import time
import re

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Give the server a moment to start up
        time.sleep(5)

        page.goto("http://localhost:3000")

        # Wait for the main heading to be visible
        expect(page.get_by_role("heading", name="CrewAI Studio")).to_be_visible()

        # Fill in the initial instruction
        page.fill("textarea#initialInstruction", "A crew to write a blog post about AI in healthcare")

        # Wait for the model dropdown to be populated and enabled
        model_select = page.locator("select#llmModelSelect")
        expect(model_select).to_be_enabled(timeout=10000)
        expect(model_select).to_have_value(re.compile(r".+"), timeout=10000)

        # Wait for the button to be enabled and then click it
        generate_button = page.get_by_role("button", name="Generate Full Script (All Phases)")
        expect(generate_button).to_be_enabled(timeout=10000)
        generate_button.click()

        # Switch to the execution tab
        page.get_by_role("button", name="Script Execution").click()

        # Wait for the "Run This Script" button to be enabled
        expect(page.get_by_role("button", name="Run This Script (Locally via API)")).to_be_enabled(timeout=120000)

        # Check if the generated files are displayed
        expect(page.get_by_text("Generated Project Files")).to_be_visible()
        expect(page.get_by_role("button", name="main.py")).to_be_visible()
        expect(page.get_by_role("button", name="README.md")).to_be_visible()

        # Take a screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")

        browser.close()

if __name__ == "__main__":
    run_verification()