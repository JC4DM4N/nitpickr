import os
from typing import Literal
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

_QUALITY_SYSTEM_PROMPT = """You are a spam filter for developer app reviews on a peer-feedback platform.

App owners submit their app with a specific request describing the kind of feedback they want. Reviewers test the app and submit written feedback.

Your job: determine whether the reviewer's feedback genuinely engages with the app owner's request, or is clearly spam — for example, generic filler text, copy-pasted content, completely off-topic, AI generated responses, or making no attempt to address what was asked.

Be lenient. Imperfect, blunt, short, or critical feedback that still engages with the request should pass. Only flag obvious spam or AI replies."""


class _QualityVerdict(BaseModel):
    verdict: Literal["pass", "spam"]


def judge_review_quality(app_name: str, app_request: str, feedback: str) -> str:
    """
    Returns "pass" if the feedback genuinely engages with the owner's request,
    or "spam" if it is clearly generic/off-topic/spam.
    Defaults to "pass" on any error or if the call exceeds 10 seconds.
    """
    import concurrent.futures

    if not OPENAI_API_KEY:
        print("[llm_judge] OPENAI_API_KEY not set — defaulting to pass")
        return "pass"

    def _call() -> str:
        from agents import Agent, Runner

        user_content = (
            f"App name: {app_name}\n\n"
            f"What the developer is looking for:\n{app_request}\n\n"
            f"Reviewer's feedback:\n{feedback}\n\n"
            "Does this feedback genuinely engage with the developer's request, or is it spam?"
        )

        agent = Agent(
            name="Review Quality Judge",
            instructions=_QUALITY_SYSTEM_PROMPT,
            output_type=_QualityVerdict,
            model="gpt-4o-mini",
        )

        result = Runner.run_sync(agent, user_content)
        return result.final_output.verdict

    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(_call)
            try:
                verdict = future.result(timeout=10)
                print(f"[llm_judge] quality check for app '{app_name}': {verdict}")
                return verdict
            except concurrent.futures.TimeoutError:
                print(f"[llm_judge] quality check timed out — defaulting to pass")
                return "pass"
    except Exception as exc:
        print(f"[llm_judge] error in quality judge — defaulting to pass: {exc}")
        return "pass"

_SYSTEM_PROMPT = """You are deciding whether a software app review should be auto-approved or expired.

A reviewer submitted written feedback on an indie developer's app. After submission, the reviewer and app owner exchanged messages. The reviewer's response deadline has now expired — they did not reply to the owner's last message.

Your task: based on the review feedback and the conversation, did the app owner effectively communicate satisfaction with the review (i.e. they seem happy and simply forgot to press Approve), or were they still seeking further input from the reviewer?

Approve if: the owner's messages indicate they are satisfied, grateful, or have already acted on the feedback, and no outstanding questions remain.
Expire if: the owner is asking follow-up questions, requesting more testing, or appears unsatisfied."""


class _Verdict(BaseModel):
    verdict: Literal["approve", "expire"]


def judge_conversation(feedback: str, messages: list[dict], app_name: str) -> str:
    """
    Returns "approve" if the agent judges the owner implicitly approved the review,
    or "expire" if the reviewer deadline should expire normally.

    messages: list of {"role": "owner"|"reviewer", "body": str}, ordered chronologically.
    Defaults to "expire" if OPENAI_API_KEY is unset or the call fails.
    """
    if not OPENAI_API_KEY:
        print("[llm_judge] OPENAI_API_KEY not set — defaulting to expire")
        return "expire"

    try:
        from agents import Agent, Runner

        conversation_text = "\n".join(
            f"[{m['role'].upper()}]: {m['body']}" for m in messages
        )

        user_content = (
            f"App name: {app_name}\n\n"
            f"Original review feedback submitted by the reviewer:\n{feedback}\n\n"
            f"Conversation after the review was submitted:\n{conversation_text}\n\n"
            "The reviewer did not send a final reply before their deadline expired. "
            "Should this review be auto-approved or expired?"
        )

        agent = Agent(
            name="Review Judge",
            instructions=_SYSTEM_PROMPT,
            output_type=_Verdict,
            model="gpt-4o-mini",
        )

        result = Runner.run_sync(agent, user_content)
        verdict = result.final_output.verdict
        print(f"[llm_judge] review verdict for app '{app_name}': {verdict}")
        return verdict

    except Exception as exc:
        print(f"[llm_judge] error calling OpenAI agent — defaulting to expire: {exc}")
        return "expire"
