import json, os, time
import numpy, scanpy

PATH = "out/provenance.json"

def record(step, **params):
    """Append one processing step (with its parameters) to out/provenance.json."""
    os.makedirs("out", exist_ok=True)
    if os.path.exists(PATH):
        with open(PATH) as f:
            log = json.load(f)
    else:
        log = {"software": {"numpy": numpy.__version__, "scanpy": scanpy.__version__}, "steps": []}
    log["steps"].append({"step": step, "params": params, "time": time.strftime("%Y-%m-%dT%H:%M:%S")})
    with open(PATH, "w") as f:
        json.dump(log, f, indent=2)
