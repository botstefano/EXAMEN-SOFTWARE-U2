from app.modules.detection.heuristics import analyze_url, levenshtein, score_url


def test_lev():
    assert levenshtein("paypal", "paypa1") == 1


def test_typosquat_flagged():
    s, r = score_url(analyze_url("http://paypa1-login.example/verify"))
    assert s >= 0.4 and r


def test_legit_domain_clean():
    assert score_url(analyze_url("https://www.paypal.com/signin"))[0] == 0.0


def test_ip_host():
    assert analyze_url("http://203.0.113.5/login")["has_ip_host"]
