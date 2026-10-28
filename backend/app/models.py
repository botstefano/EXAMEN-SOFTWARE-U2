import uuid
from datetime import datetime
from sqlalchemy import (BigInteger, Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text,
                        UniqueConstraint, func)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

UID = UUID(as_uuid=True)
TS = DateTime(timezone=True)


def pk():
    return mapped_column(UID, primary_key=True, default=uuid.uuid4)


class User(Base):
    __tablename__ = "users"
    id: Mapped[uuid.UUID] = pk()
    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(Text)
    full_name: Mapped[str] = mapped_column(Text)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_secret: Mapped[str | None] = mapped_column(Text)
    failed_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(TS)
    last_login_at: Mapped[datetime | None] = mapped_column(TS)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    preferences: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(TS, server_default=func.now())


class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)


class Permission(Base):
    __tablename__ = "permissions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(80), unique=True)


class UserRole(Base):
    __tablename__ = "user_roles"
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)


class RolePermission(Base):
    __tablename__ = "role_permissions"
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id: Mapped[int] = mapped_column(ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True)


class Incident(Base):
    __tablename__ = "incidents"
    id: Mapped[uuid.UUID] = pk()
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="nuevo")
    severity: Mapped[str] = mapped_column(String(20))
    channel: Mapped[str] = mapped_column(String(20))
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    sla_due_at: Mapped[datetime] = mapped_column(TS)
    closed_at: Mapped[datetime | None] = mapped_column(TS)
    summary: Mapped[dict] = mapped_column(JSONB, default=dict)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime] = mapped_column(TS, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TS, server_default=func.now(), onupdate=func.now())


class IncidentEvent(Base):
    __tablename__ = "incident_events"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.id", ondelete="CASCADE"))
    event_type: Mapped[str] = mapped_column(String(40))
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UID)
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(TS, server_default=func.now())


class Detection(Base):
    __tablename__ = "detections"
    id: Mapped[uuid.UUID] = pk()
    incident_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("incidents.id", ondelete="SET NULL"))
    verdict: Mapped[str] = mapped_column(String(20))
    confidence: Mapped[float] = mapped_column(Numeric(4, 3))
    channel: Mapped[str] = mapped_column(String(20))
    meta: Mapped[dict] = mapped_column("meta", JSONB, default=dict)
    detected_at: Mapped[datetime] = mapped_column(TS, server_default=func.now())


class Indicator(Base):
    __tablename__ = "indicators"
    __table_args__ = (UniqueConstraint("type", "value_normalized"),)
    id: Mapped[uuid.UUID] = pk()
    type: Mapped[str] = mapped_column(String(20))
    value: Mapped[str] = mapped_column(Text)
    value_normalized: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    first_seen: Mapped[datetime] = mapped_column(TS, server_default=func.now())
    last_seen: Mapped[datetime] = mapped_column(TS, server_default=func.now())
    hit_count: Mapped[int] = mapped_column(Integer, default=1)
    attrs: Mapped[dict] = mapped_column(JSONB, default=dict)


class IOCEnrichment(Base):
    __tablename__ = "ioc_enrichments"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    indicator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("indicators.id", ondelete="CASCADE"))
    provider: Mapped[str] = mapped_column(String(40))
    score: Mapped[float | None] = mapped_column(Numeric(5, 2))
    data: Mapped[dict] = mapped_column(JSONB, default=dict)
    fetched_at: Mapped[datetime] = mapped_column(TS, server_default=func.now())


class RuleList(Base):
    __tablename__ = "rule_lists"
    id: Mapped[uuid.UUID] = pk()
    name: Mapped[str] = mapped_column(String(200), unique=True)
    kind: Mapped[str] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(TS, server_default=func.now())


class RuleEntry(Base):
    __tablename__ = "rule_entries"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    list_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rule_lists.id", ondelete="CASCADE"))
    value: Mapped[str] = mapped_column(Text)
    value_normalized: Mapped[str] = mapped_column(Text)
    reason: Mapped[str | None] = mapped_column(Text)
    expires_at: Mapped[datetime | None] = mapped_column(TS)


class DatasetVersion(Base):
    __tablename__ = "dataset_versions"
    id: Mapped[uuid.UUID] = pk()
    source_name: Mapped[str] = mapped_column(String(40))
    license: Mapped[str] = mapped_column(Text)
    checksum_sha256: Mapped[str] = mapped_column(String(64))
    row_count: Mapped[int] = mapped_column(Integer)
    source_url: Mapped[str] = mapped_column(Text)
    ingested_at: Mapped[datetime] = mapped_column(TS, server_default=func.now())


class RawSample(Base):
    __tablename__ = "raw_samples"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("dataset_versions.id", ondelete="CASCADE"))
    payload: Mapped[dict] = mapped_column(JSONB)
    label: Mapped[str | None] = mapped_column(String(20))


class RagDocument(Base):
    __tablename__ = "rag_documents"
    id: Mapped[uuid.UUID] = pk()
    title: Mapped[str] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(40))
    source_url: Mapped[str | None] = mapped_column(Text)
    indexed_at: Mapped[datetime] = mapped_column(TS, server_default=func.now())


class RagChunk(Base):
    __tablename__ = "rag_chunks"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    document_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("rag_documents.id", ondelete="CASCADE"))
    chunk_index: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)


class Campaign(Base):
    __tablename__ = "phishing_campaigns"
    id: Mapped[uuid.UUID] = pk()
    name: Mapped[str] = mapped_column(Text)
    template: Mapped[dict] = mapped_column(JSONB, default=dict)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    scheduled_at: Mapped[datetime | None] = mapped_column(TS)
    launched_at: Mapped[datetime | None] = mapped_column(TS)
    created_at: Mapped[datetime] = mapped_column(TS, server_default=func.now())


class CampaignTarget(Base):
    __tablename__ = "campaign_targets"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("phishing_campaigns.id", ondelete="CASCADE"))
    user_email_hash: Mapped[str] = mapped_column(String(64))
    department: Mapped[str | None] = mapped_column(Text)
    sent_at: Mapped[datetime | None] = mapped_column(TS)
    clicked_at: Mapped[datetime | None] = mapped_column(TS)
    reported_at: Mapped[datetime | None] = mapped_column(TS)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UID)
    actor_email: Mapped[str | None] = mapped_column(String(320))
    action: Mapped[str] = mapped_column(String(80))
    resource: Mapped[str] = mapped_column(String(80))
    resource_id: Mapped[str | None] = mapped_column(Text)
    ip_address: Mapped[str | None] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(TS, server_default=func.now())
