import os

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/payments", tags=["payments"])

CREDIT_PRICE_CENTS = 300  # $3.00 per credit
MAX_CREDITS_PER_PURCHASE = 5

# TODO: set these env vars when Stripe account is ready
# STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, FRONTEND_URL


def _stripe_key() -> str:
    return os.getenv("STRIPE_SECRET_KEY", "")


def _webhook_secret() -> str:
    return os.getenv("STRIPE_WEBHOOK_SECRET", "")


def _frontend_url() -> str:
    return os.getenv("FRONTEND_URL", "https://nitpickr.dev")


@router.post("/create-checkout-session", response_model=schemas.CheckoutSessionOut)
def create_checkout_session(
    payload: schemas.CreditPurchaseRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not (1 <= payload.quantity <= MAX_CREDITS_PER_PURCHASE):
        raise HTTPException(status_code=400, detail=f"Quantity must be between 1 and {MAX_CREDITS_PER_PURCHASE}")

    secret_key = _stripe_key()
    if not secret_key:
        raise HTTPException(status_code=503, detail="Payments are not yet configured")

    stripe.api_key = secret_key

    label = f"NitPickr Credit{'s' if payload.quantity > 1 else ''}"
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": CREDIT_PRICE_CENTS,
                "product_data": {
                    "name": label,
                    "description": (
                        f"{payload.quantity} credit{'s' if payload.quantity > 1 else ''} "
                        "will be added to your NitPickr account."
                    ),
                },
            },
            "quantity": payload.quantity,
        }],
        mode="payment",
        success_url=f"{_frontend_url()}/credits?purchase=success",
        cancel_url=f"{_frontend_url()}/credits/purchase",
        metadata={
            "user_id": str(current_user.id),
            "quantity": str(payload.quantity),
        },
    )

    purchase = models.CreditPurchase(
        user_id=current_user.id,
        stripe_session_id=session.id,
        quantity=payload.quantity,
        amount_cents=CREDIT_PRICE_CENTS * payload.quantity,
        status="pending",
    )
    db.add(purchase)
    db.commit()

    return schemas.CheckoutSessionOut(checkout_url=session.url)


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db),
):
    webhook_secret = _webhook_secret()
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    body = await request.body()

    try:
        stripe.api_key = _stripe_key()
        event = stripe.Webhook.construct_event(body, stripe_signature, webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    if event["type"] == "checkout.session.completed":
        session_data = event["data"]["object"]
        session_id = session_data["id"]

        purchase = (
            db.query(models.CreditPurchase)
            .filter(
                models.CreditPurchase.stripe_session_id == session_id,
                models.CreditPurchase.status == "pending",
            )
            .first()
        )
        if purchase:
            purchase.status = "completed"
            user = db.query(models.User).filter(models.User.id == purchase.user_id).first()
            if user:
                user.credits += purchase.quantity
            db.commit()

    return {"status": "ok"}
