import json, os, shutil
import numpy as np
import scanpy as sc
from provenance import record

OUT = "../web/public/data"
os.makedirs(OUT, exist_ok=True)

CONTRACT_VERSION = "0.1"


def write_f32(path, arr):
    """Write an (N, 3) array as a flat little-endian float32 file, no header."""
    arr = np.asarray(arr)
    if arr.ndim != 2 or arr.shape[1] != 3:
        raise ValueError(f"{path}: expected shape (N, 3), got {arr.shape}")
    if not np.isfinite(arr).all():
        raise ValueError(f"{path}: contains NaN or inf")
    np.ascontiguousarray(arr, dtype="<f4").tofile(path)
    expected = arr.shape[0] * 3 * 4
    if os.path.getsize(path) != expected:
        raise IOError(f"{path}: wrote {os.path.getsize(path)} bytes, expected {expected}")


adata = sc.read_h5ad("out/02_pca.h5ad")

# First three principal components -> positions of the cells
X = adata.obsm["X_pca"][:, :3].astype(np.float64)
center = X.mean(axis=0)
X = X - center
scale = float(np.abs(X).max())        # ONE scale for all axes, so shapes are not distorted
X = X / scale                         # now every coordinate lies in [-1, 1]

write_f32(f"{OUT}/emb_pca.f32", X)    # original = X * scale + center

manifest = {
    "contract_version": CONTRACT_VERSION,
    "dataset": "pbmc3k",
    "n_cells": int(adata.n_obs),
    "embeddings": {
        "pca": {"file": "emb_pca.f32", "dtype": "float32", "byte_order": "little",
                "shape": [int(adata.n_obs), 3],
                "normalisation": {"center": center.tolist(), "scale": scale}}
    },
    "obs": {},
}
with open(f"{OUT}/manifest.json", "w") as f:
    json.dump(manifest, f, indent=2)

record("export_embedding", name="pca", n_components=3, scale=scale, center=center.tolist(),
       contract_version=CONTRACT_VERSION)
shutil.copy("out/provenance.json", f"{OUT}/provenance.json")
print("wrote", adata.n_obs, "cells to", OUT)
