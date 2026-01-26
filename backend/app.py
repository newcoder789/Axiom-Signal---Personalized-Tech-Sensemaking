from fastapi import FastAPI

app = FastAPI(title="Axiom")


@app.get("/")
def health():
    return {"status": "ok"}
