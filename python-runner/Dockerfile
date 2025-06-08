FROM ubuntu:24.04

# Set working directory
WORKDIR /workspace

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# 1. Install system dependencies including python, pip, and the venv module
RUN apt-get update && apt-get install -y --no-install-recommends \
    telnet \
    nmap \
    python3.12 \
    python3-pip \
    python3-dev \
    python3.12-venv \
    git \
    build-essential \
    vim \
    wget \
    sqlite3 \
    libsqlite3-dev && \
    # LaTeX for PDF generation (provides pdflatex)
    texlive-latex-extra \
    texlive-fonts-recommended \
    ghostscript && \
    rm -rf /var/lib/apt/lists/*

# 2. Create a virtual environment
# Using /opt/ is a standard practice for self-contained application software
ENV VENV_PATH=/opt/venv
RUN python3 -m venv $VENV_PATH

# 3. Set the PATH to use the venv's binaries first.
# This is the key step that makes the venv "active" for all subsequent commands.
ENV PATH="$VENV_PATH/bin:$PATH"

# 4. Upgrade pip and install packages into the virtual environment
# We can now use `python` and `pip` directly, and they will point to the venv's versions.
RUN python -m pip install --upgrade pip && \
    python -m pip install --no-cache-dir \
    crewai \
    crewai-tools \
    google-generativeai \
    ollama \
    pymupdf \
    pysqlite3-binary

# The container is now configured to use the venv's python by default.
# The CMD below is just an example. The command you provide in `docker run` will
# automatically use the python from the virtual environment.
# CMD ["python", "script_to_run.py"]

