"""Pruebas de integración para SPEC-02 (catalogo-service / core) contra db-catalogo."""

from fastapi.testclient import TestClient


def test_catc_t01_health_ok(client: TestClient) -> None:
    """CATC-T01: GET /health responde 200 con estado ok y db up en db-catalogo."""
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "catalogo-service",
        "db": "up",
    }


def test_catc_t02_api_health_y_error_404(client: TestClient) -> None:
    """CATC-T02: GET /api/catalogo/health responde 200 y ruta inexistente retorna 404 PRY-R07."""
    health_response = client.get("/api/catalogo/health")

    assert health_response.status_code == 200
    assert health_response.json() == {
        "status": "ok",
        "service": "catalogo-service",
        "db": "up",
    }

    not_found_response = client.get("/api/catalogo/ruta-inexistente")

    assert not_found_response.status_code == 404
    payload = not_found_response.json()
    assert set(payload.keys()) == {"error"}
    error = payload["error"]
    assert isinstance(error, dict)
    assert set(error.keys()) == {"codigo", "mensaje"}
    assert error["codigo"] == "NO_ENCONTRADO"
    assert isinstance(error["mensaje"], str)
    assert error["mensaje"].strip() != ""
