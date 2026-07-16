def test_super_admin_degree_auto_starts_and_enforces_order(super_admin):
    client = super_admin["client"]
    response = client.get("/api/university")
    assert response.status_code == 200
    catalog = response.json()
    assert catalog["activeCourse"] == "super_admin"
    course = next(item for item in catalog["courses"] if item["id"] == "super_admin")
    assert course["steps"][0]["locked"] is False
    assert course["steps"][1]["locked"] is True

    out_of_order = client.post("/api/university/super_admin/steps/set_ports/complete")
    assert out_of_order.status_code == 400

    first = client.post("/api/university/super_admin/steps/create_server/complete")
    assert first.status_code == 200
    course = next(item for item in first.json()["courses"] if item["id"] == "super_admin")
    assert course["steps"][0]["completed"] is True
    assert course["steps"][1]["locked"] is False


def test_mod_supervisor_requires_super_admin_diploma(super_admin):
    client = super_admin["client"]
    client.get("/api/university")
    response = client.post("/api/university/mod_supervisor/activate")
    assert response.status_code == 400
    assert "prerequisite" in response.json()["detail"].lower()


def test_regular_admin_gets_admin_basics_and_cannot_access_host_courses(invited_admin):
    admin = invited_admin()
    client = admin["client"]
    catalog = client.get("/api/university").json()
    assert catalog["activeCourse"] == "admin_basics"
    assert [course["id"] for course in catalog["courses"]] == ["admin_basics"]
    assert client.post("/api/university/super_admin/activate").status_code == 400


def test_graduation_awards_diploma(super_admin):
    client = super_admin["client"]
    catalog = client.get("/api/university").json()
    course = next(item for item in catalog["courses"] if item["id"] == "super_admin")
    for step in course["steps"]:
        catalog = client.post(f"/api/university/super_admin/steps/{step['id']}/complete").json()
    graduated = next(item for item in catalog["courses"] if item["id"] == "super_admin")
    assert graduated["graduatedAt"] is not None
    assert catalog["activeCourse"] is None
