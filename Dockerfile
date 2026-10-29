FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml requirements-lock.txt README.md LICENSE NOTICE ./
COPY src ./src
RUN pip install --no-cache-dir -r requirements-lock.txt && pip install --no-deps -e .
COPY tools/local_server.py tools/public_server.py ./tools/
COPY web/dist ./web/dist
# A clean source checkout must not depend on ignored local research inputs.
# Calibrations/originals are acquired from pinned official sources when needed.
RUN mkdir -p data/calibration data/cache/cutouts data/investigations && useradd --system skyshift && chown -R skyshift /app
USER skyshift
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','3000')+'/healthz',timeout=3)"
CMD ["python", "tools/public_server.py"]
