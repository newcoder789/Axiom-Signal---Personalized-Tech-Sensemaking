FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Install system dependencies for psycopg2 and other tools
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --upgrade pip setuptools && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create a placeholder for the SQLite DB if it doesn't exist
RUN touch user_memory.db

# Expose port (Render uses $PORT, but we'll default to 10000)
ENV PORT=10000
EXPOSE 10000

# Run the application
# We use -w 1 because Render Free tier (512MB RAM) can't handle multiple workers loading transformers
CMD gunicorn -w 1 -k uvicorn.workers.UvicornWorker app:app --bind 0.0.0.0:$PORT
