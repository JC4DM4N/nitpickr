from . import models
from . import loops
from .routers.notifications import create_notification


def get_or_create_onboarding(db, user_id: int) -> models.Onboarding:
    ob = db.query(models.Onboarding).filter(models.Onboarding.user_id == user_id).first()
    if not ob:
        ob = models.Onboarding(user_id=user_id)
        db.add(ob)
        db.flush()
    return ob


def award_onboarding_bonus_if_eligible(db, user, ob: models.Onboarding):
    if ob.step_2_complete and ob.step_3_complete and not ob.onboarding_bonus_credit_awarded:
        ob.onboarding_bonus_credit_awarded = True
        user.onboarding_bonus_credit_awarded = True  # keep User field in sync for credits endpoint
        user.credits += 1
        create_notification(
            db, user.id, "onboarding_bonus",
            "Onboarding complete! 1 bonus credit has been added to your account.",
            action_url=f"{loops.FRONTEND_URL}/explore",
        )


def handle_onboarding_review_submitted(db, user, review):
    """
    Called on first-time review submission (not resubmissions).
    Sets step_1 on the first submitted review, step_3 on the second.
    Awards the bonus credit if steps 2 and 3 are both complete.
    """
    ob = get_or_create_onboarding(db, user.id)

    prev_submitted = db.query(models.Review).filter(
        models.Review.reviewer_id == user.id,
        models.Review.is_submitted == True,
        models.Review.is_rejected == False,
        models.Review.is_expired == False,
        models.Review.id != review.id,
    ).count()

    if prev_submitted == 0 and not ob.step_1_complete:
        ob.step_1_complete = True
    elif prev_submitted >= 1 and not ob.step_3_complete:
        ob.step_3_complete = True

    award_onboarding_bonus_if_eligible(db, user, ob)


def handle_onboarding_app_submitted(db, user):
    """
    Called on first app submission.
    Sets step_2 and awards the bonus credit if step_3 is already complete.
    """
    ob = get_or_create_onboarding(db, user.id)
    if not ob.step_2_complete:
        ob.step_2_complete = True
    award_onboarding_bonus_if_eligible(db, user, ob)
