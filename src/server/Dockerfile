FROM python:3.12-alpine AS base

FROM base AS builder

WORKDIR /api

RUN apk update \
    && apk add --no-cache --virtual build-deps g++ \
    && apk add --no-cache libpq-dev \
#    && ln -s "/usr/lib/libcrypto.so.3" "/usr/lib/libcrypto.so" \
    && pip3 install pipenv --no-cache-dir --disable-pip-version-check --root-user-action=ignore

# Allows docker to cache installed dependencies between builds
COPY "Pipfile" "Pipfile.lock" ./
RUN pipenv install --system --deploy --ignore-pipfile \
    && pipenv --clear

# Mounts the application code to the image
COPY . ./

RUN apk del build-deps \
    && for dir in pip pipenv setuptools virtualenv docs distlib pkg_resources packaging certify; \
          do rm -rf "/usr/local/lib/python3.12/site-packages/$dir"*; done

FROM base AS runner

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

WORKDIR /api
COPY --from=builder /api ./

RUN apk update \
#    && apk add --no-cache binutils libmagic \
#    && ln -s "/usr/lib/libcrypto.so.3" "/usr/lib/libcrypto.so" \
    && pip3 install pipenv --no-cache-dir --disable-pip-version-check --root-user-action=ignore
#    && crontab /api/cron

#ARG DEBUG
#ENV DJANGO_DEBUG=${DEBUG}
ARG PORT
ENV PORT=${PORT}
#ARG UWSGI_PROTOCOL
#ENV PROTOCOL=${UWSGI_PROTOCOL}

# runs the production server
CMD ["sh", "-c", "./main.py"]
