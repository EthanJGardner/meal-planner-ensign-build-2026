from fastapi import FastAPI

app = FastAPI(title="Meal Planner API")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
