# Dependencies package
from .auth import (
    get_current_user,
    get_current_active_user,
    require_teacher,
    require_student,
)

__all__ = [
    "get_current_user",
    "get_current_active_user",
    "require_teacher",
    "require_student",
]
