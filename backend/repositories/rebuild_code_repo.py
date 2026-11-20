from sqlmodel import Session, select
from models import RebuildCode


class RebuildCodeRepository:
    def __init__(self, session: Session):
        self.session = session

    def add_bulk(self, codes: list[RebuildCode]) -> None:
        self.session.add_all(codes)

    def get_by_code_for_update(self, code: str) -> RebuildCode | None:
        statement = (
            select(RebuildCode)
            .where(RebuildCode.code == code)
            .with_for_update()
        )
        return self.session.exec(statement).first()