import os, subprocess, sys

if os.path.exists("out/provenance.json"):
    os.remove("out/provenance.json")      # start a fresh provenance log

for script in ["A2_qc.py", "A3_reduce.py", "A5_export.py"]:
    print("==>", script)
    subprocess.run([sys.executable, script], check=True)
