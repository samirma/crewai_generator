echo "/workspace/pre_docker_run.sh is running"

rm -Rf /workspace/db

apt update
apt install -y texlive-latex-extra   texlive-fonts-recommended   ghostscript  libpango-1.0-0 libpangoft2-1.0-0 libpangocairo-1.0-0 libcairo2 libgdk-pixbuf2.0-0

pip install --upgrade pip
pip install PyPDF2 weasyprint reportlab

 