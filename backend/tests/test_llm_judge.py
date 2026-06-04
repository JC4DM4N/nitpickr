"""
Run from the backend/ directory:
    python -m tests.test_llm_judge
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.llm_judge import judge_conversation

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


if __name__ == "__main__":
    sys.exit(run_tests())
