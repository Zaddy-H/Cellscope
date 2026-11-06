import sys
import scanpy, anndata, numpy, scipy, sklearn, umap, igraph, matplotlib

print("Python", sys.version.split()[0])
for m in (scanpy, anndata, numpy, scipy, sklearn, umap, igraph, matplotlib):
    print(f"{m.__name__:12s} {m.__version__}")
