FROM python:3.12-slim AS base

FROM base AS builder

WORKDIR /api

RUN apt update \
    && apt install -y build-essential libpq-dev \
    && pip3 install pipenv --no-cache-dir --disable-pip-version-check --root-user-action=ignore

# Allows docker to cache installed dependencies between builds
COPY "Pipfile" "Pipfile.lock" ./
RUN pipenv install --system --deploy --ignore-pipfile \
    && pipenv --clear

RUN apt remove -y build-essential \
    && apt autoremove -y \
    && apt clean \
    && for dir in pip pipenv setuptools virtualenv docs distlib pkg_resources packaging certify; \
          do rm -rf "/usr/local/lib/python3.12/site-packages/$dir"*; done

FROM base AS runner

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

WORKDIR /api
COPY --from=builder /api ./

RUN apt update \
    && apt install -y libpq-dev
#    && ln -s "/usr/lib/libcrypto.so.3" "/usr/lib/libcrypto.so" \
#    && pip3 install pipenv --no-cache-dir --disable-pip-version-check --root-user-action=ignore
#    && crontab /api/cron

# Mounts the application code to the image
COPY . ./

ARG PORT
ENV PORT=${PORT}
ENV PYTHONUNBUFFERED=1

# runs the production server
CMD ["sh", "-c", "./main.py"]
