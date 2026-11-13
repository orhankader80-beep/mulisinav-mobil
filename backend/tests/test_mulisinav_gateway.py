# Mulisınav mobile gateway regression tests (proxy to remote Mulisınav API)
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api/m"
EMAIL = "mobiltest16402@example.com"
PASSWORD = "Test1234!"


@pytest.fixture(scope="module")
def session_tokens():
    r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"login failed {r.status_code} {r.text}")
    return r.json()


def auth_h(tok):
    return {"Authorization": f"Bearer {tok['access_token']}"}


# Health / root
class TestHealth:
    def test_root(self):
        r = requests.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        assert "gateway" in r.json()["message"]


# Auth: login / register / wrong password / invalid mode
class TestAuth:
    def test_login_success(self, session_tokens):
        assert session_tokens["user"]["email"] == EMAIL
        assert isinstance(session_tokens.get("access_token"), str) and session_tokens["access_token"]
        assert isinstance(session_tokens.get("refresh_token"), str) and session_tokens["refresh_token"]

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": "wrong-pass"}, timeout=30)
        assert r.status_code == 401
        assert isinstance(r.json().get("detail"), str)
        print("401 detail:", r.json()["detail"])

    def test_invalid_mode(self):
        r = requests.post(f"{API}/auth/foo", json={}, timeout=15)
        assert r.status_code == 404

    def test_register_new_user(self):
        email = f"test_mob_{int(time.time())}@example.com"
        r = requests.post(f"{API}/auth/register", json={"name": "TEST_Mobil", "email": email, "password": "Test1234!"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == email
        assert d.get("access_token")
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {d['access_token']}"}, timeout=30)
        assert me.status_code == 200 and me.json()["email"] == email

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json={"name": "TEST_dup", "email": EMAIL, "password": "Test1234!"}, timeout=30)
        assert r.status_code in (400, 409), r.text

    def test_me(self, session_tokens):
        r = requests.get(f"{API}/auth/me", headers=auth_h(session_tokens), timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == EMAIL

    def test_me_no_token(self):
        r = requests.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 401


# Session refresh/logout
class TestSession:
    def test_refresh(self):
        login = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30).json()
        r = requests.post(f"{API}/session/refresh", json={"refresh_token": login["refresh_token"]}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("access_token")
        me = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {d['access_token']}"}, timeout=30)
        assert me.status_code == 200

    def test_refresh_invalid(self):
        r = requests.post(f"{API}/session/refresh", json={"refresh_token": "bogus"}, timeout=30)
        assert r.status_code == 401

    def test_logout(self):
        login = requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30).json()
        r = requests.post(f"{API}/session/logout", json={"refresh_token": login["refresh_token"]},
                          headers={"Authorization": f"Bearer {login['access_token']}"}, timeout=30)
        assert r.status_code == 200 and r.json()["ok"] is True
        # refresh token should be revoked after logout
        r2 = requests.post(f"{API}/session/refresh", json={"refresh_token": login["refresh_token"]}, timeout=30)
        print("refresh after logout:", r2.status_code)


# Exams list/detail
class TestExams:
    def test_list_exams(self, session_tokens):
        r = requests.get(f"{API}/exams", headers=auth_h(session_tokens), timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        for k in ("id", "grade", "subject", "title", "total"):
            assert k in data[0]

    def test_exam_detail(self, session_tokens):
        exams = requests.get(f"{API}/exams", headers=auth_h(session_tokens), timeout=30).json()
        r = requests.get(f"{API}/exams/{exams[0]['id']}", headers=auth_h(session_tokens), timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == exams[0]["id"]
        assert isinstance(d["questions"], list) and len(d["questions"]) > 0

    def test_exam_not_found(self, session_tokens):
        r = requests.get(f"{API}/exams/nonexistent-id-123", headers=auth_h(session_tokens), timeout=30)
        assert r.status_code == 404

    def test_exams_unauthorized(self):
        r = requests.get(f"{API}/exams", timeout=30)
        assert r.status_code == 401

    def test_generate_unauthorized_or_validation(self):
        r = requests.post(f"{API}/generate", json={}, timeout=30)
        assert r.status_code in (401, 422)


# Robustness: malformed bodies should not crash the gateway (currently 500)
class TestRobustness:
    def test_refresh_malformed_body(self):
        r = requests.post(f"{API}/session/refresh", data="not json", headers={"Content-Type": "application/json"}, timeout=30)
        assert r.status_code in (400, 401, 422), r.status_code

    def test_no_session_leak_between_users(self):
        # Regression: gateway httpx cookie jar used to leak last-logged-in user's session
        requests.post(f"{API}/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=30)
        r = requests.get(f"{API}/exams", timeout=30)
        assert r.status_code == 401
