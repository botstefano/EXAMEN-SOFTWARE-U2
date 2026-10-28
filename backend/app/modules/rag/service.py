import re
from sqlalchemy import select
from app.models import RagChunk, RagDocument
from app.modules.llm import generate


def _tok(s):
    return {w for w in re.findall(r"\w{3,}", s.lower())}


async def answer(db, question: str, top_k: int = 5) -> dict:
    rows = (await db.execute(select(RagChunk.id, RagChunk.content, RagDocument.title)
                             .join(RagDocument, RagDocument.id == RagChunk.document_id))).all()
    q = _tok(question)
    scored = sorted(((len(q & _tok(r.content + " " + r.title)), r) for r in rows), key=lambda x: -x[0])
    top = [(s, r) for s, r in scored[:top_k] if s > 0]
    if not top:
        return {"answer": "No encontré información relevante en la base de conocimiento.", "sources": []}
    ctx = "\n\n".join(f"[{r.id}] ({r.title}): {r.content}" for _, r in top)
    out = await generate("Responde como asistente SOC usando solo este contexto y cita [id].\n\n"
                         f"Contexto:\n{ctx}\n\nPregunta: {question}")
    if not out:
        out = "Según la base de conocimiento:\n\n" + "\n\n".join(f"• {r.content} [{r.id}]" for _, r in top[:3])
    mx = max(s for s, _ in top)
    return {"answer": out, "sources": [{"chunk_id": r.id, "document": r.title, "score": round(s / mx, 2)}
                                       for s, r in top]}


async def index_document(db, title, content, category, source_url=None) -> dict:
    doc = RagDocument(title=title, category=category, source_url=source_url)
    db.add(doc)
    await db.flush()
    chunks = [c.strip() for c in content.split("\n\n") if c.strip()][:50]
    for i, c in enumerate(chunks):
        db.add(RagChunk(document_id=doc.id, chunk_index=i, content=c))
    return {"document_id": str(doc.id), "chunks": len(chunks)}
