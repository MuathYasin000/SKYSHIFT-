FROM python:3.12-slim@sha256:aa943ce411423c7582288f18707ff66eddcbaeb510502d747a72aeb34f30d159
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1
WORKDIR /app
COPY pyproject.toml requirements-lock.txt README.md LICENSE NOTICE ./
RUN pip install --no-cache-dir -r requirements-lock.txt
COPY src ./src
RUN pip install --no-deps -e .
COPY tools/local_server.py tools/public_server.py tools/container_start.py ./tools/
COPY web/dist ./web/dist
# A clean source checkout must not depend on ignored local research inputs.
# Calibrations/originals are acquired from pinned official sources when needed.
RUN mkdir -p data/calibration data/cache/cutouts data/investigations && useradd --system --create-home skyshift && chown -R skyshift /app/data
# Managed mounts may need a root bootstrap. HTTP always execs after dropping to
# the skyshift account; the default remains the existing nonroot container.
ARG SKYSHIFT_BOOTSTRAP_UID=skyshift
USER ${SKYSHIFT_BOOTSTRAP_UID}
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import os,urllib.request; urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('PORT','3000')+'/healthz',timeout=3)"
CMD ["python", "tools/container_start.py"]
