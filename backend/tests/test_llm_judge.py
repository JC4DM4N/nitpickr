"""
Run from the backend/ directory:
    python -m tests.test_llm_judge
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.llm_judge import judge_conversation, judge_review_quality

# ---------------------------------------------------------------------------
# Test cases
# Each entry: feedback, messages, app_name, expected ("approve" | "expire")
# ---------------------------------------------------------------------------

TEST_CASES = [
    {
        "app_name": "LeadBox OutReach",
        "feedback": (
            """i checked it out and honestly i like the direction the product feels practical and the value is pretty easy to understand. the whole "one workspace for leads campaigns forms and follow up" message is clear and i immediately know what the tool does which is a good sign.

i think the biggest thing missing is differentiation tho, because at first glance it feels like another crm/lead management tool and i dont instantly see why i would pick it over the dozens of other options out there. the design is clean and the flow makes sense but i would probably push harder on a specific pain point or unique angle. also the landing page could use a bit more proof that the product works, maybe customer stories or actual results. right now it feels more focused on features than outcomes. overall its solid and looks professional but the messaging could be sharper so people instantly think "oh this is exactly what i need" instead of "another crm tool"
            """
        ),
        "messages": [
            {
                "role": "owner", 
                "body": """Thank you for taking the time to review it.

The point about differentiation is especially helpful.

The main thing I'm trying to solve is giving small teams one place to manage leads, permission-based follow-up, forms, ownership, and activity history without having to stitch together multiple tools. It sounds like the workflow itself came across, but not yet strongly enough to feel distinct from a typical CRM at first glance.

I also agree that the site could do a better job showing real examples and outcomes instead of mostly describing features. That's something I'm already adding to the backlog, along with more screenshots and concrete workflow examples.

I appreciate the honest feedback and the time you spent looking through it. It's very helpful at this stage.
"""
            },
        ],
        "expected": "approve",
    },
    {
        "app_name": "LeadBox OutReach",
        "feedback": (
            """Happy to give a first-impression read. I went point by point on your list.

1. Clear in 5-10 seconds?

Mostly yes. The headline plus the line under it told me it's permission-based email and lead follow-up for small, GDPR-conscious teams. The "not a cold outreach tool" line is doing a lot of useful work, it sets expectations fast. One small thing: "capture, follow-up, trigger next actions, opt-outs, activity history" is a lot of nouns in the first breath. I got the gist, but I had to slow down to absorb all of it.

2. Who is it for?

My read: solo consultants, freelancers, small agencies, and lean B2B teams who care about doing email the compliant way and are tired of stitching tools together. The page says this explicitly, which helps. It came across clearly.

3. What feels confusing, vague, or missing?

- "Triggered follow-up" is repeated a lot but never shown concretely. What triggers what? An example ("when a lead opens X, notify the owner") would make it land.

- No screenshots of the actual product. There's a walkthrough video, but static shots of the workspace would build confidence faster for people skimming.

- The credit-based sending model is mentioned but not explained. I wasn't sure what a credit buys or roughly what sending costs on top of the plan.

- The page tells me what it is repeatedly but rarely shows it. It leans on description over demonstration.

4. Does it make me understand the problem it solves?

Yes, this is the strongest part. The "five tools, spreadsheets, missed follow-up, messy handoffs" framing is specific and recognizable. I understood the pain before the solution, which is the right order.

5. Would I trust it enough to try the beta?

Partly. The GDPR/permission angle and the Trust page link build credibility. What holds me back is not seeing the product itself, and not knowing the real total cost once sending credits are added. I'd want one or two product screenshots and a plain-language line on sending costs before committing.

6. What I'd change to make the value clearer?

- Lead with one sharp sentence, then let the supporting nouns breathe below.

- Show the workspace. One real screenshot beats three paragraphs of description.

- Give a concrete trigger example so "triggered follow-up" stops being abstract.

- Add a short, plain explanation of how credits work alongside the plan price.

Overall the positioning is sharp and the restraint ("not trying to be everything") is a genuine strength. The main gap is show vs tell: the page describes the product well but doesn't let me see it working apart the dhort video."""
        ),
        "messages": [
            {
                "role": "owner", 
                "body": """Thanks a lot for taking the time to go through it properly. This is genuinely useful feedback. 
What I’m taking from your review is that the positioning is mostly landing now, especially the GDPR/permission-based angle and the “not a cold outreach tool” line, but the page needs to show the product more clearly instead of describing it so much.

The points about real screenshots, concrete trigger examples, and explaining the credit model are especially helpful. Those are practical fixes I can act on right away.

I also agree with your note about the first section having a lot of nouns packed together. I’ll keep the main positioning, but make the first screen easier to absorb.

Really appreciate the honest review. This gave me a much clearer next step."""
            },
            {
                "role": "reviewer", 
                "body": """Nice, glad it was useful. Positioning was the hard part and that's already landing, the rest is just execution. Ping me when it's updated, happy to take another look :D

Btw if you're up for it, would love a second pair of eyes on what i'm building. no pressure though ;D"""
            },
            {
                "role": "reviewer", 
                "body": """I can tell you that I’ve already put together a backlog plan based on your feedback.

Once I’ve worked through it, I’ll definitely let you know and would really appreciate a second round of feedback if you have the time.

And yes, please send me the instructions. I’d be happy to return the favor."""
            },
        ],
        "expected": "approve",
    },
    {
        "app_name": "FocusBlock",
        "feedback": (
            """Landing page is clear and the tagline "collect what you're owed, keep the relationship" is strong — immediately communicates the core value.

Two suggestions: First, show a preview of what the payment reminder looks like from the client's side. The biggest objection for freelancers is "will this feel pushy to my clients?" — seeing the actual message removes that fear.

Second, the pricing page wasn't immediately visible. For a tool solving a financial pain point, transparent pricing upfront builds trust faster.

Overall solid product solving a real problem. Would love to see a quick demo video on the landing page."""
        ),
        "messages": [
            {
                "role": "owner", 
                "body": """Thank you so much for the feedback. Would you mind taking some time to create an account and use the product for 5 mins. I need some feedback on that part as well."""
            },
        ],
        "expected": "expire",
    },
    {
        "app_name": "Venn",
        "feedback": (
            """I didn't tested idea in TF, but i have crucial thoughts overall on the idea, because it is close to me. The overall idea is clear: a private social network where you choose which circles can see each post. I like the privacy-first direction, but my main concern is that “circles” currently feel very close to features people already understand from Snapchat, Instagram Close Friends, WhatsApp groups, or private chats. If the value is only “choose who sees this post,” I’m not sure that is strong enough on its own, because users can already manually choose people or groups in existing apps. I think the stronger positioning is not “circles as groups,” but “circles as different parts of your life.” For example, family, close friends, coworkers, school parents, running club, etc. The real value should be helping users keep those social contexts separate without mixing everyone into one feed. I would make this clearer in the onboarding and landing page with very specific examples: “share family updates without coworkers seeing them,” “post running updates only to your run club,” or “keep personal and work life separate.” I also think Venn should lean harder into privacy and containment: posts stay inside the selected circle, no resharing outside the circle, clear visibility rules, and maybe screenshot warnings or protection if possible. Right now I understand the mechanic, but I still need a stronger reason why I would move this behavior from Snapchat or group chats into a new app. The biggest opportunity is to make circles feel like private life contexts, not just recipient lists."""
        ),
        "messages": [
            {
                "role": "owner", 
                "body": """Thanks, this is really useful feedback, especially as you haven’t tested the TestFlight build yet.

You’ve actually hit the nail on the head with what I’m trying to build. Venn isn’t meant to be “groups” in the WhatsApp sense, it’s about the different parts of your life and keeping those contexts separate.

That’s the reason for the name Venn. Family, friends, colleagues, run clubs, etc. can overlap in real life, but they don’t always belong in the same feed.

I’d genuinely love for you to try the TestFlight build, and as it’s an open beta, feel free to share the link with a few of your own circles too. I think your feedback after actually using the invite, circles and posting flow would be really valuable."""
            },
        ],
        "expected": "expire",
    },
    {
        "app_name": "Alfred the Butler",
        "feedback": (
            """I actually liked the core idea behind Alfred quite a bit because it solves a very real problem in a simple way. Most productivity apps fail because people forget to open them consistently, but using WhatsApp as the interface feels much more natural since it’s already part of daily habits. That alone makes the concept stand out immediately.

The landing page does a good job explaining the pain points, especially the part about notes being scattered everywhere and reminders getting ignored. It felt relatable instead of sounding overly “startup corporate,” which made the product easier to connect with. The “no app or card required” part is also smart because it lowers friction for trying the product instantly.

Behaviour-wise, Alfred worked mostly how I expected. The conversational approach feels more personal than using a traditional task manager, and I liked that it didn’t feel overly robotic. It feels closer to messaging an assistant rather than filling forms into a productivity app.

One thing I think could improve is giving users slightly more visibility into their existing tasks and reminders in a structured way. Chat interfaces are convenient, but once task history grows, finding older reminders could become messy. Maybe a lightweight dashboard or weekly summary message could help without losing the simplicity of WhatsApp.

I’d also personally love features like recurring reminders, smart follow-ups when tasks are ignored, and maybe simple categorisation like “work,” “personal,” or “urgent.” Those additions could make Alfred feel even more like a real assistant over time.

Overall though, the concept feels genuinely useful because it works with existing user behaviour instead of trying to force people into another app ecosystem. That’s probably the strongest part of the product."""
        ),
        "messages": [
            {
                "role": "owner", 
                "body": """Amazing thank you for the detailed review, I'd love to ask, how do you think it would be best to make the user aware of these thing? Alfred does have a dashboard, and can do recurring reminders and list but its quite hard to let a user know with the main UI being WhatsApp."""
            },
        ],
        "expected": "expire",
    },
]

# ---------------------------------------------------------------------------
# Quality-check test cases
# Each entry: app_name, app_request, feedback, expected ("pass" | "spam")
# ---------------------------------------------------------------------------

QUALITY_CASES = [
    {
        "app_name": "Alfred the Butler",
        "app_request": """Does he function as you'd expect him too behaviour wise?

Is there anything you'd like him to do that he can't currently?

Does the landing page sell you on his functionality?

Please only review if you've actually tried using Alfred, or having a reason for not trying him.""",
        "feedback": (
            "Its a good concepti like that i have used it for 5-10 mins its easy explainable "
            "Its a good concepti like that i have used it for 5-10 mins its easy explainable "
            "Its a good concepti like that i have used it for 5-10 mins its easy explainable "
        ),
        "expected": "spam",
    },
    {
        "app_name": "KPWorkSpace",
        "app_request": """1. What were you trying to get done with kpworkspace, and how well did it work for you?

  2. Was there anything confusing, frustrating, or slower than you expected while using the app?

  3. Which feature did you find the most useful — and is there anything you wished it could do but couldn't?

  4. How likely are you to keep using kpworkspace (and to recommend it to someone else)? Why?""",
        "feedback": (
            """I mainly tested the website and product positioning, not a full long-term workspace setup.

1. I was trying to understand whether kpworkspace could replace some of the window switching I normally do while building projects — terminal, preview, code editor, Git, and task management. The idea is clear and useful, especially for people working with AI coding agents. Having Claude/Codex/Gemini-style terminals, browser preview, Git, editor, and Kanban in one place makes sense.

2. The main thing that was a bit unclear for me was how much this replaces my current editor versus how much it should be used next to VS Code/Cursor. The landing page explains the features, but I would like to see a stronger “typical workflow” example, maybe from opening a project to running an agent, previewing changes, committing, and shipping.

3. The most useful feature for me is the unified workspace idea: persistent terminals plus preview and Git in one place. That is the strongest part. The Kanban board also sounds useful if tasks are connected to actual project work, not just a separate todo list.

4. I could see myself trying it for smaller projects or AI-agent-heavy workflows. I would be more likely to keep using it if the app feels fast, stable, and does not fight my existing dev setup. I would recommend it to developers who already use coding agents a lot and want a cleaner way to manage terminals, previews, commits, and tasks without jumping between too many windows.

Overall, the product idea is strong. I would mainly improve the landing page with a clearer real-world workflow demo and explain more directly how it fits with existing tools like VS Code, Cursor, or GitHub Desktop."""
        ),
        "expected": "pass",
    },
    {
        "app_name": "SprintFlint",
        "app_request": """Most interested in the first-run experience. After you sign up, is it obvious how to create your first issue and move it across the board? Where do you stall or get confused? Does the empty board tell you what to do next, or leave you guessing? Honest reactions to the moment right after login are what we want most.""",
        "feedback": (
            """Tested the public web landing page only. The main promise is clear: sprint management with fast setup, velocity tracking, and AI or MCP support. The strongest part of the page is the comparison against heavier tools, because it tells small engineering teams why this is not just another task board. My main confusion is audience and first-run proof. The headline says team and velocity, but the free tier and quick start also feel appealing to solo builders. I would clarify whether the first best user is a solo founder, an engineering manager, or a small team lead. Since you asked about first-run experience, I wanted a short visible empty board preview or 3 step first sprint walkthrough before signup: create issue, move card, see velocity. The MCP angle is interesting but appears before I know the core workflow is easy. I would lead with the first sprint path, then show MCP as the power user layer. Pricing feels reasonable if the free plan truly proves the workflow before upgrade."""
        ),
        "expected": "spam",
    },
    {
        "app_name": "RetrieveIT",
        "app_request": """Looking for fresh-eyes feedback on the first 15 minutes of the product. The bar is "would a real buyer connect their actual work account and trust the answers?"

1. Signup and first-source connect — Is it obvious which integration to start with? Does the OAuth flow feel safe enough that you'd connect a real work account, not just a throwaway?

2. Indexing wait and first search — After you connect a source, indexing happens in the background. Is the wait communicated clearly, or does the page feel dead? When does your first query feel "real" vs. "still indexing"?

3. Search quality and citations — When you run a natural-language query, do the cited sources actually answer the question? Does the AI answer feel grounded in those citations or like it's hallucinating around them?

4. Workspaces and permissions — If you create a second workspace or invite a teammate, is the boundary clear? Does it feel like the permissions are being respected end-to-end?

5. Value prop clarity — Was it obvious who this is built for and why someone would pay $30/seat instead of just using SharePoint search or ChatGPT? Where does the messaging fall short?

Not looking for: typos, color preferences, "make the logo bigger." Looking for: the moment you got confused, the feature you wished existed, the thing that broke trust.""",
        "feedback": (
            """Too mnuch text in the first page itself. Better have the demo in the first page and a play button. it should be 1 liner explaination . the screen has too much information which is making me not try in the first place. you asked me for sign up without trying the product. please push the signup to last. let people experience the product first"""
        ),
        "expected": "spam",
    },
    {
        "app_name": "ABAXUS Software",
        "app_request": """Three things I want to know:
1. Problem recognition — Does the landing page describe a failure you've actually experienced, or does it feel like a solution looking for a problem? The framing I'm testing is "billing layer broke at scale" rather than "compliance risk." Does that land?
2. Clarity — After 30 seconds on the page, is it obvious what ABAXUS does, who it's for, and why self-hosted matters over just using Stripe or Metronome?
3. CTA friction — The primary call to action is "Book Architecture Review." Does that feel like a natural next step, or does it feel like committing to a sales call?
Bonus signal I'm hunting for: if you've ever changed your pricing model and broken your event collection as a result — or had a customer dispute an invoice that engineering couldn't explain — I'd genuinely love to hear what you tried.""",
        "feedback": (
            """The landing page was clear to me quite quickly. I understood that ABAXUS is for SaaS teams with usage-based billing problems, especially when event collection, invoice accuracy, pricing changes, and customer disputes become hard to manage at scale.

The “billing layer broke at scale” framing works better for me than a pure compliance angle. It feels more practical and engineering-led. The examples like double-counted events, dashboards not matching invoices, and support not being able to explain charges make the problem feel real rather than theoretical.

After around 30 seconds, I understood who it is for: technical SaaS teams, founders, or engineers dealing with metered billing and usage data. The self-hosted angle also makes sense, especially for teams that care about control, auditability, data ownership, and avoiding another external billing dependency.

One thing I would maybe make even clearer near the top is when a team should choose ABAXUS instead of Stripe Billing or Metronome. The comparison is there, but a very simple “Use ABAXUS if…” section could help first-time visitors understand the fit faster.

The CTA “Book Architecture Review” feels professional, but it does feel a bit like a sales call. For a serious B2B buyer that may be fine, but for someone still exploring, a softer CTA like “See Architecture Example” or “Check Billing Readiness” next to it would reduce friction.

Overall, the site feels credible, technical, and focused. It does not feel like a random solution looking for a problem. The problem is clear, but I would make the first-step CTA slightly less intimidating for people who are interested but not ready to talk yet."""
        ),
        "expected": "pass",
    },
    {
        "app_name": "Dealytix",
        "app_request": """If context is all clear for a first time user who sees this service and website, pricing, potential willingness to pay for this kind of service considering if in the process of buying a YouTube channel. thanks! -> Also if the YouTube video is loading and playing on your end?""",
        "feedback": (
            """Your biggest risk is will people pay this much for a report when tools like Grok can do most of it already. 


==== grok ===

**You're right — I can do a very large part of what Dealytix does**, especially for public-facing analysis.

### Here's a realistic comparison:

| Aspect                        | Dealytix                              | Grok (me)                                      | Winner          |
|-------------------------------|---------------------------------------|------------------------------------------------|-----------------|
| Speed                         | 48 hours PDF                          | Instant / few minutes                          | Me              |
| Cost                          | Paid (fixed report price)             | Free                                           | Me              |
| Standardized scoring          | Yes (Dealytix Score A–D)              | I can create one on the fly                    | Dealytix (more consistent) |
| Public data cross-checking    | Strong                                | Very strong (real-time web tools)              | Tie / Slight edge to me |
| Traffic & social proof        | Good                                  | Excellent (SocialBlade, SimilarWeb, etc.)      | Me              |
| Financial red flag detection  | Good                                  | Very good                                      | Tie             |
| Legal/IP deep dive            | Limited (public only)                 | Limited (public only)                          | Tie             |
| Owner dependency & risks      | Structured                            | I can analyze deeply                           | Me              |
| Post-acquisition plan         | Included                              | I can generate one                             | Tie             |
| Human review + proprietary data | Yes                                 | No proprietary databases                       | Dealytix        |
| Full polished PDF             | Yes                                   | I can give you a detailed markdown report      | Dealytix        |

### Bottom line:
- For **quick screening**, sanity checks, and deep public-data analysis → **I can absolutely do this** (and often faster/better because it's real-time).
- For a **professional, standardized, polished report** you can show to partners or use for serious negotiation → Dealytix has an advantage because it's a productized service with consistent methodology and human review.

I have the same core limitations they do: we both work only with **public data** + whatever the seller shares. Neither of us gets access to the seller’s Google Analytics, AdSense, bank statements, etc. without their cooperation.

---

**Want to test me?**  
Just drop a **YouTube channel URL** (or any online business listing) and I’ll give you a full diligence-style breakdown right now — including a score, risks, valuation thoughts, and questions for the seller. 

No charge, no 48-hour wait. Want to try?"""
        ),
        "expected": "spam",
    },
    {
        "app_name": "Alfred the Butler",
        "app_request": """Does he function as you'd expect him too behaviour wise?

Is there anything you'd like him to do that he can't currently?

Does the landing page sell you on his functionality?

Please only review if you've actually tried using Alfred, or having a reason for not trying him.""",
        "feedback": (
            """ I texted with Alfred on Whatsapp. I really love the way his communication is so polite and gentle ^^
For the landing page, I would prefer it to have more images or videos which would be more engaging to me.
I recorrected my location, Alfred could know my real location, not mistake it. Bravo
Alfred can remind me of making my upcoming video, but when I ask him to suggest some places for me (based on my location), it does not recommend the suitable places for me. 
Hope that you will make Alfred more interesting and amazing with these ideas ❤️ """
        ),
        "expected": "pass",
    }
]



# ---------------------------------------------------------------------------


def run_tests():
    passed = 0
    failed = 0

    for i, case in enumerate(TEST_CASES, 1):
        result = judge_conversation(
            feedback=case["feedback"],
            messages=case["messages"],
            app_name=case["app_name"],
        )
        ok = result == case["expected"]
        status = "PASS" if ok else "FAIL"
        print(
            f"[{status}] Case {i} — {case['app_name']}: "
            f"expected={case['expected']}, got={result}"
        )
        if ok:
            passed += 1
        else:
            failed += 1

    print(f"\n{passed}/{passed + failed} passed")
    return failed


def run_quality_tests():
    passed = 0
    failed = 0

    for i, case in enumerate(QUALITY_CASES, 1):
        result = judge_review_quality(
            app_name=case["app_name"],
            app_request=case["app_request"],
            feedback=case["feedback"],
        )
        ok = result == case["expected"]
        status = "PASS" if ok else "FAIL"
        print(
            f"[{status}] Quality case {i} — {case['app_name']}: "
            f"expected={case['expected']}, got={result}"
        )
        if ok:
            passed += 1
        else:
            failed += 1

    print(f"\n{passed}/{passed + failed} passed")
    return failed


if __name__ == "__main__":
    # failed = run_tests()
    # print()
    # print("--- Quality checks ---")
    failed = run_quality_tests()
    sys.exit(failed)
