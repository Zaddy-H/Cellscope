import os
import matplotlib
matplotlib.use("Agg")                     # draw to files, not to a window
import matplotlib.pyplot as plt
import scanpy as sc
from provenance import record

os.makedirs("out", exist_ok=True)
adata = sc.datasets.pbmc3k()
adata.var_names_make_unique()
adata.var["mt"] = adata.var_names.str.startswith("MT-")   # mitochondrial genes (human)
sc.pp.calculate_qc_metrics(adata, qc_vars=["mt"], inplace=True)

# Plot the distributions BEFORE choosing thresholds
fig, axes = plt.subplots(1, 3, figsize=(12, 3.5))
for ax, col in zip(axes, ["n_genes_by_counts", "total_counts", "pct_counts_mt"]):
    ax.hist(adata.obs[col], bins=60)
    ax.set_title(col)
fig.tight_layout()
fig.savefig("out/qc_before.png", dpi=120)

# ---- look at out/qc_before.png and decide on thresholds ----
MIN_GENES = 200            # cells with fewer detected genes are removed
MAX_GENES = 2500           # cells with more detected genes are removed (possible doublets)
MAX_PCT_MT = 5.0           # cells with a larger mitochondrial fraction are removed
MIN_CELLS_PER_GENE = 3     # genes seen in fewer cells are removed
# -----------------------------------------------------------------------

n_before = adata.n_obs
keep = (
    (adata.obs["n_genes_by_counts"] >= MIN_GENES)
    & (adata.obs["n_genes_by_counts"] <= MAX_GENES)
    & (adata.obs["pct_counts_mt"] < MAX_PCT_MT)
)
adata = adata[keep].copy()
sc.pp.filter_genes(adata, min_cells=MIN_CELLS_PER_GENE)
print(f"cells: {n_before} -> {adata.n_obs}, genes: {adata.n_vars}")
adata.write_h5ad("out/01_qc.h5ad")

record("qc", min_genes=MIN_GENES, max_genes=MAX_GENES, max_pct_mt=MAX_PCT_MT,
       min_cells_per_gene=MIN_CELLS_PER_GENE, cells_before=int(n_before),
       cells_after=int(adata.n_obs), genes_after=int(adata.n_vars))
