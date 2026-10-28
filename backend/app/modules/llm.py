import httpx
from app.core.config import get_settings


async def generate(prompt: str) -> str | None:
    s = get_settings()
    if s.llm_provider != "ollama":
        return None
    try:
        async with httpx.AsyncClient(timeout=60) as c:
            r = await c.post(f"{s.ollama_url}/api/generate",
                             json={"model": s.ollama_model, "prompt": prompt, "stream": False})
            r.raise_for_status()
            return r.json().get("response")
    except Exception:
        return None
