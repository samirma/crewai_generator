echo "/workspace/pre_docker_run.sh is running"

rm -Rf /workspace/db

apt update
apt install -y texlive-latex-extra   texlive-fonts-recommended   ghostscript  

pip install --upgrade pip
pip install PyPDF2

