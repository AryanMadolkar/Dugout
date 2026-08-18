"""Load official FPL bootstrap + fixtures into Postgres."""

from app.db.session import session_scope
from app.services.ingestion import sync_bootstrap_and_fixtures


def main() -> None:
    from app.db.models import Base
    from app.db.session import engine

    Base.metadata.create_all(bind=engine)
    with session_scope() as db:
        run = sync_bootstrap_and_fixtures(db)
        print(
            f"ingest {run.status}: teams={run.teams_upserted} "
            f"players={run.players_upserted} fixtures={run.fixtures_upserted} "
            f"gameweeks={run.gameweeks_upserted}"
        )
        if run.error:
            print(run.error)


if __name__ == "__main__":
    main()
