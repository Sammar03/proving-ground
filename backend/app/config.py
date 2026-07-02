from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    groq_api_key: str = ""
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/proving_ground"
    frontend_origin: str = "http://localhost:3000"
    app_token: str = ""  # shared secret gating every route but /health; unset → all locked (503)
    # Free Groq models. Refresh from /openai/v1/models — IDs churn.
    # llama-4-scout replaces llama-3.1-8b-instant (Groq-announced discontinuation 2026-07-01);
    # both non-reasoning instruct models. Verified live 2026-07-01.
    models: list[str] = [
        "openai/gpt-oss-120b",
        "meta-llama/llama-4-scout-17b-16e-instruct",
    ]


settings = Settings()
