import os
from flask import Flask
from flask_cors import CORS
from .extensions import db, migrate, jwt, ma
from .config import Config


def _load_env():
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())


def create_app(config_class=Config):
    _load_env()
    app = Flask(__name__)
    app.config.from_object(config_class)

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    ma.init_app(app)
    CORS(app, origins=app.config.get("CORS_ORIGINS", "*").split(","))

    # Register blueprints
    from .api import api_bp
    app.register_blueprint(api_bp, url_prefix="/api")

    # Health check
    @app.get("/healths")
    def health():
        return {"status": "ok"}

    return app
