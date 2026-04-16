from antigravity.core import Skill

class SubstackAutomator(Skill):
    def execute(self, payload):
        diff = payload.get("diff", "")
        # The refined summary you liked - we pass this as context
        context_summary = payload.get("summary", "Privacy-first curation ecosystem updates.")
        
        # 1. Generate the Branded Header (Nano Banana 2)
        # We explicitly ask for a high-res asset
        art_prompt = (
            "A high-end 3D isometric icon representing 'Data Privacy and Hierarchical Systems'. "
            "Style: Deep navy background (#0B1622), vibrant neon purple to teal gradient. "
            "Clean, professional, vector-inspired. 16:9 aspect ratio."
        )
        hero = self.agent.tools.image_generation(prompt=art_prompt, aspect_ratio="16:9")

        # 2. Browser Operations
        browser = self.agent.browser
        
        # Access Dev Environment (Assumes you are logged in via the Extension once)
        browser.open("https://folio-app-v2-dev-413677609906.us-central1.run.app")
        browser.wait_for_load_state()
        screenshot = browser.screenshot(full_page=True)

        # 3. Content Engineering (Instructional & Informative)
        blog_prompt = f"""
        Act as the Lead Product Advocate for Folio V2. 
        Write a deep-dive instructional blog post for 'Fun Size Data Bytes' based on these changes:
        {diff}
        
        Structure:
        - Catchy H1 Title.
        - The 'Big Picture' (Why privacy-first curation matters).
        - Deep Dive: Hierarchical Albums & 'Loose Leaves'.
        - How-To: Managing Public vs. Personal visibility.
        - Security Corner: Sharing Tokens & UUIDs.
        - CTA: Tell users to sign up for the waitlist to get early access and learn about updates and new features. Instruct them to sign up at the live app at curateyourfolio.com.
        
        Tone: Professional, instructional, and visionary. Use H2 and H3 headers.
        """
        full_blog_markdown = self.agent.ask(blog_prompt)

        # 4. The Substack 'Hack' for Images
        # We tell the agent to use the 'Insert Image by URL' feature if possible, 
        # or paste the markdown which Substack's editor often parses.
        browser.open("https://funsizedatabytes.substack.com/publish/post/new")
        browser.do(f"Set the title to: 'Evolution of Folio: The Privacy-First Curation Update'")
        
        # We combine everything into a payload
        # Note: We include the Hero and the Screenshot URLs
        final_payload = (
            f"![Branded Header]({hero.url})\n\n"
            f"{full_blog_markdown}\n\n"
            f"### Feature Preview\n![Folio V2 Interface]({screenshot.url})"
        )

        browser.do(f"Paste this entire formatted markdown into the editor body: {final_payload}")
        
        return "✅ Detailed draft pushed. Remember to check image renders in the Substack preview!"