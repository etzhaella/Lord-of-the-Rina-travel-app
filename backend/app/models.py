from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


class Member(Base):
    __tablename__ = "members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    emoji: Mapped[str] = mapped_column(String(16), default="🙂")
    color: Mapped[str] = mapped_column(String(16), default="#C8553D")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (UniqueConstraint("member_id", "place_id", name="uq_fav_member_place"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    member_id: Mapped[int] = mapped_column(ForeignKey("members.id", ondelete="CASCADE"), index=True)
    place_id: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    user_ratings_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    price_level: Mapped[int | None] = mapped_column(Integer, nullable=True)
    photo_name: Mapped[str | None] = mapped_column(String(600), nullable=True)
    category: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Hotel(Base):
    """Where the family is staying. Several hotels are allowed (multi-city
    trip); exactly one is 'active' and used as the home base."""

    __tablename__ = "hotels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    place_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(60), nullable=True)
    check_in: Mapped[date | None] = mapped_column(Date, nullable=True)
    check_out: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Expense(Base):
    """A trip expense logged by a family member."""

    __tablename__ = "expenses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    amount: Mapped[float] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(3), default="EUR")
    category: Mapped[str] = mapped_column(String(30), default="other")
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    place_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    paid_by: Mapped[int | None] = mapped_column(
        ForeignKey("members.id", ondelete="SET NULL"), nullable=True, index=True
    )
    spent_on: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Destination(Base):
    """A place the family chose to visit on this trip (shared by everyone)."""

    __tablename__ = "destinations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    place_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_name: Mapped[str | None] = mapped_column(String(600), nullable=True)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    category: Mapped[str | None] = mapped_column(String(40), nullable=True)
    planned_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    visited: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    added_by: Mapped[int | None] = mapped_column(
        ForeignKey("members.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
