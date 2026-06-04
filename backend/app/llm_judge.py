import os
from typing import Literal
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

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
