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


def test_create_server_step_auto_completes_once_an_instance_exists(super_admin, tmp_path):
    client = super_admin["client"]
    catalog = client.get("/api/university").json()
    course = next(item for item in catalog["courses"] if item["id"] == "super_admin")
    assert course["steps"][0]["completed"] is False

    from app.services import instance_store

    server_path = tmp_path / "Server1"
    server_path.mkdir()
    instance_store.create_instance(name="Server 1", server_path=str(server_path), source="manual")

    catalog = client.get("/api/university").json()
    course = next(item for item in catalog["courses"] if item["id"] == "super_admin")
    assert course["steps"][0]["id"] == "create_server"
    assert course["steps"][0]["completed"] is True
    assert course["steps"][1]["locked"] is False


def test_mod_supervisor_has_five_restructured_steps(super_admin):
    client = super_admin["client"]
    catalog = client.get("/api/university").json()
    course = next(item for item in catalog["courses"] if item["id"] == "super_admin")
    for step in course["steps"]:
        catalog = client.post(f"/api/university/super_admin/steps/{step['id']}/complete").json()
    catalog = client.post("/api/university/mod_supervisor/activate").json()
    course = next(item for item in catalog["courses"] if item["id"] == "mod_supervisor")
    assert [step["id"] for step in course["steps"]] == [
        "install_ue4ss",
        "wishlist_one",
        "approve_one",
        "reorder",
        "disable_all",
    ]


def test_retake_resets_a_graduated_course(super_admin):
    client = super_admin["client"]
    catalog = client.get("/api/university").json()
    course = next(item for item in catalog["courses"] if item["id"] == "super_admin")
    for step in course["steps"]:
        catalog = client.post(f"/api/university/super_admin/steps/{step['id']}/complete").json()
    graduated = next(item for item in catalog["courses"] if item["id"] == "super_admin")
    assert graduated["graduatedAt"] is not None

    retaken = client.post("/api/university/super_admin/retake").json()
    assert retaken["activeCourse"] == "super_admin"
    course = next(item for item in retaken["courses"] if item["id"] == "super_admin")
    assert course["graduatedAt"] is None
    assert all(not step["completed"] for step in course["steps"])


def test_admin_basics_status_is_super_admin_only_and_shows_graduation(super_admin, invited_admin):
    admin = invited_admin()
    regular_client = admin["client"]
    forbidden = regular_client.get("/api/university/admin-basics-status")
    assert forbidden.status_code == 403

    super_client = super_admin["client"]
    before = super_client.get("/api/university/admin-basics-status").json()
    entry = next(item for item in before if item["userId"] == admin["user"]["id"])
    assert entry["graduatedAt"] is None

    catalog = regular_client.get("/api/university").json()
    course = next(item for item in catalog["courses"] if item["id"] == "admin_basics")
    for step in course["steps"]:
        catalog = regular_client.post(f"/api/university/admin_basics/steps/{step['id']}/complete").json()

    after = super_client.get("/api/university/admin-basics-status").json()
    entry = next(item for item in after if item["userId"] == admin["user"]["id"])
    assert entry["graduatedAt"] is not None
