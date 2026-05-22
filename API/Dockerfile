#**********************
# API: V 1.0
#**********************
FROM python:3.11-slim

# Instalar git
RUN apt-get update && apt-get install -y curl python3-pip --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY ./API/requirements.txt /app/requirements.txt
RUN pip install -r requirements.txt

# Instalar dependencias

COPY ./API /app/api

# Ejecutar la aplicación
CMD ["uvicorn", "API.api:app", "--host", "0.0.0.0", "--port", "5000"]