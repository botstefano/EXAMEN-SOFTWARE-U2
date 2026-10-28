"""Datos semilla de demostración. Se ejecuta si la tabla users está vacía."""
from datetime import datetime, timedelta, timezone
from sqlalchemy import func, select
from app.core.security import hash_password
from app.core.utils import normalize
from app.db import SessionLocal
from app.models import *  # noqa

PASSWORD = "DemoPassw0rd!2026"
PERMS = ["detection:read", "detection:write", "incident:read", "incident:write", "incident:assign", "indicator:read",
         "indicator:write", "etl:execute", "etl:read", "report:generate", "report:read", "user:manage", "role:manage",
         "audit:read", "soc:assistant", "dashboard:read"]
ROLES = {
    "admin": ("Administrador", PERMS),
    "analista_soc": ("Analista SOC", ["detection:read", "detection:write", "incident:read", "incident:write",
                                      "incident:assign", "indicator:read", "indicator:write", "etl:read",
                                      "report:read", "soc:assistant", "dashboard:read"]),
    "auditor": ("Auditor", ["detection:read", "incident:read", "report:read", "audit:read", "dashboard:read"]),
    "reportes": ("Gestor de reportes", ["detection:read", "incident:read", "report:generate", "report:read", "dashboard:read"]),
    "readonly": ("Solo lectura", ["detection:read", "incident:read", "indicator:read", "dashboard:read"]),
}
USERS = [("admin@phishguard.bank", "Elena Navarro (Admin)", "admin"), ("maria.lopez@phishguard.bank", "María López", "analista_soc"),
         ("carlos.ruiz@phishguard.bank", "Carlos Ruiz", "analista_soc"), ("ana.torres@phishguard.bank", "Ana Torres", "auditor"),
         ("javier.mendez@phishguard.bank", "Javier Méndez", "reportes"), ("audit.viewer@phishguard.bank", "Consulta Externa", "readonly")]
# (titulo, estado, severidad, canal, dias_atras, asignado, tags, resumen)
INCIDENTS = [
    ("Campaña de phishing PayPal clonado", "investigacion", "critica", "email", 12, 1, ["paypal", "credential_harvesting"], "28 correos con enlace a dominio typosquat."),
    ("Smishing BBVA con enlace fraudulento", "triage", "alta", "sms", 9, 2, ["bbva", "smishing"], "12 SMS reportados por empleados."),
    ("QR falso en sucursal Madrid", "contencion", "alta", "qr", 8, 1, ["qr", "quishing"], "QR redirige a formulario de credenciales."),
    ("Dominio typosquat santander-seguro.example", "cerrado", "media", "web", 25, 2, ["santander", "typosquat"], "Takedown exitoso en 36 horas."),
    ("Correo suplantando RRHH (nóminas)", "falso_positivo", "media", "email", 20, 1, ["rrhh"], "Comunicación interna legítima."),
    ("Llamadas de vishing suplantando al banco", "nuevo", "alta", "vishing", 1, None, ["vishing", "otp"], ""),
    ("Clon de login BBVA (credential harvesting)", "cerrado", "critica", "web", 40, 2, ["bbva", "clon_visual"], "Bloqueado en 45 minutos."),
    ("Adjunto malicioso factura_2026.pdf.exe", "investigacion", "alta", "email", 3, 1, ["malware", "doble_extension"], "Hash bloqueado en EDR."),
]
IOCS = [("dominio", "paypal-secure-login.example", 7), ("url", "https://paypal-secure-login.example/verify", 3),
        ("dominio", "bbva-seguro-online.example", 5), ("dominio", "santander-seguro.example", 2),
        ("dominio", "bbva-acceso.example", 3), ("dominio", "banco-madrid-seguro.example", 1),
        ("ip", "203.0.113.5", 4), ("ip", "198.51.100.77", 2), ("hash", "5d41402abc4b2a76b9719d911017c592", 1),
        ("telefono", "+34900000123", 7), ("email", "facturacion@proveedor-seguro.example", 1)]
DOCS = [("Playbook de respuesta ante phishing", "playbook",
         "Ante una detección de phishing: 1) confirmar el veredicto con dos señales independientes; 2) bloquear el dominio en DNS y WAF; 3) notificar al cliente afectado; 4) registrar evidencias con hash SHA-256.\n\nEl SLA de respuesta es: crítica 30 minutos, alta 2 horas, media 8 horas, baja 24 horas. Toda brecha de SLA se escala al CISO."),
        ("Guía de clones de BBVA y suplantación de marca", "playbook",
         "Ante un clon de BBVA: capturar el sitio, solicitar takedown al registrador, bloquear el dominio en el proxy y añadirlo a la blacklist de dominios typosquat. Revisar logs por accesos de clientes al dominio.\n\nLos clones suelen registrarse pocos días antes de la campaña y usar certificados gratuitos."),
        ("Política de retención de datos", "politica",
         "Los incidentes y sus evidencias se conservan 7 años. Los logs de auditoría son de solo escritura (append-only). Los datasets crudos de ETL se conservan 3 años."),
        ("Análisis de homograph attacks", "playbook",
         "Los ataques homograph usan caracteres Unicode similares (p. ej. cirílico). Normalizar a punycode y comparar contra marcas conocidas. Dominios con distancia de Levenshtein menor o igual a 2 respecto a una marca deben marcarse como sospechosos.")]


async def seed_if_empty():
    async with SessionLocal() as db:
        if (await db.execute(select(func.count()).select_from(User))).scalar_one():
            return
        now = datetime.now(timezone.utc)
        perms = {c: Permission(code=c) for c in PERMS}
        db.add_all(perms.values())
        roles = {}
        for i, (code, (name, ps)) in enumerate(ROLES.items(), 1):
            roles[code] = Role(id=i, code=code, name=name, description=f"Rol {name}")
        db.add_all(roles.values())
        await db.flush()
        for code, (_, ps) in ROLES.items():
            for p in ps:
                db.add(RolePermission(role_id=roles[code].id, permission_id=perms[p].id))
        h = hash_password(PASSWORD)
        users = []
        for email, name, role in USERS:
            u = User(email=email, full_name=name, password_hash=h, preferences={})
            db.add(u)
            users.append(u)
        await db.flush()
        for u, (_, _, role) in zip(users, USERS):
            db.add(UserRole(user_id=u.id, role_id=roles[role].id))
        sla = {"critica": 0.5, "alta": 2, "media": 8, "baja": 24}
        incs = []
        for t, st, sev, ch, days, asg, tags, summ in INCIDENTS:
            created = now - timedelta(days=days)
            closed = created + timedelta(hours=3) if st in ("cerrado", "falso_positivo") else None
            i = Incident(title=t, description=t, status=st, severity=sev, channel=ch, tags=tags,
                         assignee_id=users[asg].id if asg is not None else None, sla_due_at=created + timedelta(hours=sla[sev]),
                         closed_at=closed, created_at=created, updated_at=created, summary={"executive_summary": summ})
            db.add(i)
            incs.append(i)
        await db.flush()
        for i in incs:
            db.add(IncidentEvent(incident_id=i.id, event_type="creado", payload={"source": "seed"}, created_at=i.created_at))
            if i.status not in ("nuevo",):
                db.add(IncidentEvent(incident_id=i.id, event_type="cambio_estado", actor_id=users[1].id,
                                     payload={"to": i.status}, created_at=i.created_at + timedelta(hours=1)))
        for k, i in enumerate(incs):
            for n in range(3 if i.severity in ("critica", "alta") else 1):
                db.add(Detection(incident_id=i.id, verdict="phishing", confidence=0.85 + 0.01 * n, channel=i.channel,
                                 detected_at=i.created_at + timedelta(minutes=5 * n), meta={"url": IOCS[k % len(IOCS)][1], "reasons": ["seed"]}))
        for d in range(1, 29):
            db.add(Detection(verdict="benigno", confidence=0.97, channel=["email", "web", "sms"][d % 3],
                             detected_at=now - timedelta(days=d, hours=2), meta={"url": "www.banco.example"}))
            if d % 4 == 0:
                db.add(Detection(verdict="sospechoso", confidence=0.55, channel="email", detected_at=now - timedelta(days=d), meta={}))
        for t, v, hits in IOCS:
            db.add(Indicator(type=t, value=v, value_normalized=normalize(v), hit_count=hits, attrs={"source": "seed"}))
        bl = RuleList(name="Dominios typosquat activos", kind="blacklist")
        wl = RuleList(name="Dominios corporativos banco", kind="whitelist")
        db.add_all([bl, wl])
        await db.flush()
        for v in ["paypal-secure-login.example", "bbva-seguro-online.example", "santander-seguro.example"]:
            db.add(RuleEntry(list_id=bl.id, value=v, value_normalized=normalize(v), reason="Suplantación de marca"))
        for v in ["banco.example", "sso.banco.example", "phishguard.bank"]:
            db.add(RuleEntry(list_id=wl.id, value=v, value_normalized=normalize(v), reason="Dominio corporativo"))
        for title, cat, content in DOCS:
            doc = RagDocument(title=title, category=cat)
            db.add(doc)
            await db.flush()
            for n, c in enumerate(content.split("\n\n")):
                db.add(RagChunk(document_id=doc.id, chunk_index=n, content=c))
        db.add(DatasetVersion(source_name="sample", license="Demo", checksum_sha256="0" * 64, row_count=5, source_url="builtin://seed"))
        camp = Campaign(name="Concientización Q1 — Phishing genérico", status="completed", launched_at=now - timedelta(days=30),
                        template={"subject": "Actualiza tu contraseña", "body": "Haz clic para actualizar..."})
        db.add(camp)
        await db.flush()
        import hashlib
        for n in range(6):
            db.add(CampaignTarget(campaign_id=camp.id, user_email_hash=hashlib.sha256(f"emp{n}@banco.example".encode()).hexdigest(),
                                  department="Retail", sent_at=now - timedelta(days=30),
                                  clicked_at=now - timedelta(days=30) if n < 2 else None,
                                  reported_at=now - timedelta(days=30) if n in (3, 4) else None))
        for a in ["auth.login", "incident.update", "etl.execute", "rule_entry.create"]:
            db.add(AuditLog(actor_id=users[0].id, actor_email=users[0].email, action=a, resource="seed", payload={}))
        await db.commit()
