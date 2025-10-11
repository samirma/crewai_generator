from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:3000")

        # Wait for the "Loading models..." text to disappear
        loading_models_locator = page.get_by_text("Loading models...")
        expect(loading_models_locator).to_be_hidden(timeout=60000)

        # Add an explicit wait
        page.wait_for_timeout(5000)

        page.get_by_text("Describe the CrewAI project you want to generate").click()
        page.get_by_role("textbox").fill("A crew to write a blog post about AI")
        page.get_by_role("combobox").select_option(index=1)
        page.get_by_role("button", name="Generate Full Script (All Phases)").click()
        page.get_by_role("button", name="Script Execution").click()
        page.screenshot(path="jules-scratch/verification/screenshot.png")
        browser.close()

run()