from pathlib import Path

from app.db.models import Base
from app.db.session import engine


def upgrade() -> None:
    Base.metadata.create_all(bind=engine)
    print("schema ready")


if __name__ == "__main__":
    upgrade()
