import os, subprocess, sys

if os.path.exists("out/provenance.json"):
    os.remove("out/provenance.json")      # start a fresh provenance log

for script in ["02_qc.py", "03_reduce.py", "04_export.py"]:
    print("==>", script)
    subprocess.run([sys.executable, script], check=True)
