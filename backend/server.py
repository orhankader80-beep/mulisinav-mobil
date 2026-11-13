"""Mulisınav mobile gateway.

The mobile app talks to the existing Mulisınav backend through this thin proxy.
The web backend keeps its session in HttpOnly cookies; phones work better with
tokens, so this gateway turns the Set-Cookie tokens into JSON and sends them
back to the web backend as a Bearer header / refresh cookie. No data is stored here.
"""
import logging
import os
from http.cookiejar import CookieJar, DefaultCookiePolicy
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import JSONResponse, Response, StreamingResponse
from starlette.background import BackgroundTask
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

REMOTE = os.environ["MULISINAV_API_URL"].rstrip("/")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("mulisinav-gateway")

app = FastAPI()
# Never persist remote Set-Cookie tokens in the shared client: otherwise every
# caller would silently reuse the last logged-in user's session.
_no_cookies = CookieJar(policy=DefaultCookiePolicy(allowed_domains=[]))
http = httpx.AsyncClient(timeout=httpx.Timeout(180.0, connect=15.0), cookies=_no_cookies)


@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


api = APIRouter(prefix="/api")


def _headers(request: Request) -> dict:
    h = {"Content-Type": "application/json"}
    auth = request.headers.get("authorization")
    if auth:
        h["Authorization"] = auth
    guest = request.headers.get("x-guest-id")
    if guest:
        h["X-Guest-Id"] = guest
    return h


def _tokens(resp: httpx.Response) -> dict:
    out = {}
    for raw in resp.headers.get_list("set-cookie"):
        name, _, rest = raw.partition("=")
        name = name.strip()
        if name in ("access_token", "refresh_token"):
            out[name] = rest.split(";", 1)[0]
    return out


def _json(resp: httpx.Response):
    try:
        return resp.json()
    except ValueError:
        return {"detail": "Sunucudan beklenmeyen yanıt geldi."}


async def _remote_error(exc: Exception) -> JSONResponse:
    logger.error("Remote call failed: %s", exc)
    return JSONResponse({"detail": "Mulisınav sunucusuna ulaşılamıyor, tekrar dene."}, status_code=502)


async def _refresh_from(request: Request) -> str:
    try:
        payload = await request.json()
    except ValueError:
        return ""
    return str(payload.get("refresh_token") or "") if isinstance(payload, dict) else ""


@api.get("/")
async def root():
    return {"message": "Mulisınav mobile gateway"}


@api.post("/m/auth/{mode}")
async def auth_login_register(mode: str, request: Request):
    if mode not in ("login", "register"):
        return JSONResponse({"detail": "Bulunamadı"}, status_code=404)
    body = await request.body()
    try:
        resp = await http.post(f"{REMOTE}/auth/{mode}", content=body, headers=_headers(request))
    except httpx.HTTPError as exc:
        return await _remote_error(exc)
    data = _json(resp)
    if resp.status_code >= 400:
        return JSONResponse(data, status_code=resp.status_code)
    return {"user": data, **_tokens(resp)}


@api.post("/m/session/refresh")
async def auth_refresh(request: Request):
    rt = await _refresh_from(request)
    try:
        resp = await http.post(f"{REMOTE}/auth/refresh", headers={"Cookie": f"refresh_token={rt}"})
    except httpx.HTTPError as exc:
        return await _remote_error(exc)
    data = _json(resp)
    if resp.status_code >= 400:
        return JSONResponse(data, status_code=resp.status_code)
    tokens = _tokens(resp)
    tokens.setdefault("refresh_token", rt)
    return {"user": data, **tokens}


@api.post("/m/session/logout")
async def auth_logout(request: Request):
    rt = await _refresh_from(request)
    h = _headers(request)
    h["Cookie"] = f"refresh_token={rt}"
    try:
        await http.post(f"{REMOTE}/auth/logout", headers=h)
    except httpx.HTTPError as exc:
        logger.warning("Logout forward failed: %s", exc)
    return {"ok": True}


@api.post("/m/generate")
async def generate(request: Request):
    """Pass the AI exam stream (Server-Sent Events) straight through."""
    body = await request.body()
    req = http.build_request("POST", f"{REMOTE}/generate", content=body, headers=_headers(request))
    try:
        resp = await http.send(req, stream=True)
    except httpx.HTTPError as exc:
        return await _remote_error(exc)
    if resp.status_code >= 400:
        raw = await resp.aread()
        await resp.aclose()
        return Response(raw, status_code=resp.status_code, media_type="application/json")
    return StreamingResponse(
        resp.aiter_raw(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        background=BackgroundTask(resp.aclose),
    )


@api.api_route("/m/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def passthrough(path: str, request: Request):
    body = await request.body()
    try:
        resp = await http.request(
            request.method,
            f"{REMOTE}/{path}",
            content=body or None,
            params=dict(request.query_params),
            headers=_headers(request),
        )
    except httpx.HTTPError as exc:
        return await _remote_error(exc)
    return Response(resp.content, status_code=resp.status_code, media_type=resp.headers.get("content-type", "application/json"))


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    await http.aclose()
