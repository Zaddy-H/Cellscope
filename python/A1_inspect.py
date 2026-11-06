import scanpy as sc

adata = sc.datasets.pbmc3k()      # downloads on the first run, then cached in python/data/
print(adata)
print("cells x genes:", adata.n_obs, "x", adata.n_vars)
print(adata.obs.head())
print(adata.var.head())
print("type of adata.X:", type(adata.X))
print("first 5 x 5 block of counts:\n", adata.X[:5, :5].toarray())
